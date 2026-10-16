const TestRunner = require('test-runner')
const runner = new TestRunner()
const path = require('path')
const fs = require('fs')
const lookmlParser = require('../index.js')
const { FileCache, hashContent, isCacheableError } = require('../lib/cache')

console.log("\n### file-level caching ###")

runner.test("FileCache initializes and manages in-memory entries", () => {
	const cache = new FileCache()
	if (!cache.enabled) throw new Error("Expected cache to be enabled by default")

	const filePath = "views/users.view.lkml"
	const stat = { size: 100, mtimeMs: 123456 }
	const content = "view: users { dimension: id {} }"
	const sha = hashContent(content)
	const parsed = { view: { users: { dimension: { id: {} } } } }

	cache.set(filePath, { stat, contentHash: sha, parsed })

	// Fast key lookup
	const hitFast = cache.get(filePath, stat)
	if (!hitFast || !hitFast.view || !hitFast.view.users) {
		throw new Error("Expected fast cache hit with stat")
	}

	// Full key lookup (fallback when mtime changes)
	const modifiedStat = { size: 100, mtimeMs: 999999 }
	const hitFull = cache.getByHash(filePath, sha, modifiedStat)
	if (!hitFull || !hitFull.view || !hitFull.view.users) {
		throw new Error("Expected full cache hit with content hash")
	}

	// Subsequent fast key lookup should now hit because modifiedStat was indexed
	const hitNewFast = cache.get(filePath, modifiedStat)
	if (!hitNewFast) {
		throw new Error("Expected fast key to be updated after fallback hit")
	}

	return "ok"
})

runner.test("FileCache ignores non-deterministic errors but caches SyntaxErrors", () => {
	const syntaxErr = { name: 'SyntaxError', message: 'Unexpected token', line: 10, column: 5 }
	const sysErr = new Error("EACCES: permission denied")

	if (!isCacheableError(syntaxErr)) throw new Error("Expected SyntaxError to be cacheable")
	if (isCacheableError(sysErr)) throw new Error("Expected generic error not to be cacheable")

	return "ok"
})

runner.test("FileCache persists to and restores from disk", () => {
	const tmpDir = path.join(__dirname, 'tmp_disk_cache')
	if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })

	try {
		const cache1 = new FileCache({ cacheDir: tmpDir })
		const filePath = "views/orders.view.lkml"
		const stat = { size: 250, mtimeMs: 55555 }
		const sha = hashContent("view: orders {}")
		const parsed = { view: { orders: {} } }

		cache1.set(filePath, { stat, contentHash: sha, parsed })
		cache1.saveDiskCache()

		const cacheFile = path.join(tmpDir, 'cache.json')
		if (!fs.existsSync(cacheFile)) throw new Error("Expected cache.json on disk")

		// Load into a new cache instance pointing to same directory
		const cache2 = new FileCache({ cacheDir: tmpDir })
		const hit = cache2.get(filePath, stat)
		if (!hit || !hit.view || !hit.view.orders) {
			throw new Error("Expected cached result to be restored from disk")
		}
	} finally {
		if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
	}

	return "ok"
})

runner.test("FileCache evicts oldest entries using size-capped low-watermark LRU", () => {
	const cache = new FileCache({ cacheMaxMb: 0.0001 }) // very small ceiling (~100 bytes)
	cache.store.clear()

	// Insert 10 entries of ~300 bytes each
	for (let i = 0; i < 10; i++) {
		const fp = `file_${i}.view.lkml`
		const content = `view: v_${i} { dimension: d_${i} { sql: \${TABLE}.d_${i} ;; } }`
		const sha = hashContent(content)
		const parsed = { view: { [`v_${i}`]: { dimension: { [`d_${i}`]: {} } } } }
		cache.set(fp, { contentHash: sha, parsed })
	}

	const initialCount = cache.store.size
	if (initialCount < 8) throw new Error(`Expected at least 8 entries before eviction, got ${initialCount}`)

	// Trigger eviction check
	cache.evictIfNeeded()

	const prunedCount = cache.store.size
	if (prunedCount >= initialCount) {
		throw new Error(`Expected entries to be pruned, initial: ${initialCount}, pruned: ${prunedCount}`)
	}

	return "ok"
})

runner.test("parseFiles uses cache across repeated invocations", async () => {
	const testFile = "test-projects/001-simple-model/*.lkml"

	// First run
	const res1 = await lookmlParser.parseFiles({
		input: testFile,
		cache: true
	})
	if (!res1.file || !res1.model) throw new Error("Expected project.file and project.model in res1")

	// Second run (hits in-memory cache)
	const res2 = await lookmlParser.parseFiles({
		input: testFile,
		cache: true
	})
	if (!res2.file || !res2.model) throw new Error("Expected project.file and project.model in res2")
	if (Object.keys(res1.file).length !== Object.keys(res2.file).length) {
		throw new Error("Mismatched file count between cold and cached runs")
	}

	return "ok"
})

runner.test("parseFiles separates caches by options fingerprint", async () => {
	const testFile = "test-projects/001-simple-model/simple.model.lkml"

	// Run with strings: false
	const resNoStrings = await lookmlParser.parseFiles({
		input: testFile,
		strings: false
	})
	const fileNoStrings = Object.values(resNoStrings.file)[0]
	if (fileNoStrings.$strings !== undefined) {
		throw new Error("Expected $strings to be undefined when strings: false")
	}

	// Run with strings: true
	const resWithStrings = await lookmlParser.parseFiles({
		input: testFile,
		strings: true
	})
	const fileWithStrings = Object.values(resWithStrings.file)[0]
	if (!fileWithStrings.$strings) {
		throw new Error("Expected $strings to be present when strings: true")
	}

	return "ok"
})

runner.test("parseFiles with cache: false bypasses in-memory caching", async () => {
	const testFile = "test-projects/001-simple-model/simple.model.lkml"
	const res = await lookmlParser.parseFiles({
		input: testFile,
		cache: false
	})
	if (!res.file) throw new Error("Expected project.file in result")
	return "ok"
})

