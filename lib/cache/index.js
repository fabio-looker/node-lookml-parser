const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const packageJson = require('../../package.json')

const PARSER_VERSION = packageJson.version || '9.2.0'

// Module-level in-memory cache store: Map<string, CacheEntry>
const inMemoryCache = new Map()

/**
 * Creates a deterministic options fingerprint string
 */
function computeOptionsFingerprint(options = {}) {
	const buildStrings = Boolean(options.strings || options.positions)
	const wantAst = Boolean(options.ast || options.includeAst)
	const conditionalCommentString = options.conditionalCommentString || ''
	
	const payload = `v:${PARSER_VERSION}|s:${buildStrings}|a:${wantAst}|cc:${conditionalCommentString}`
	return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 12)
}

/**
 * Fast cache key using path, file size, mtime and options fingerprint
 */
function getFastCacheKey(filePath, stat, fingerprint) {
	if (!stat || stat.size === undefined || stat.mtimeMs === undefined) return null
	return `${filePath}:${stat.size}:${stat.mtimeMs}:${fingerprint}`
}

/**
 * Full cache key using path, SHA-256 of file content, and options fingerprint
 */
function getFullCacheKey(filePath, contentHash, fingerprint) {
	return `${filePath}:${contentHash}:${fingerprint}`
}

/**
 * Computes SHA-256 hex digest of content
 */
function hashContent(content) {
	return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Determines whether a file-level error is deterministic and cacheable
 */
function isCacheableError(err) {
	if (!err) return false
	// Syntax errors and location-attributed parse errors from PEG.js
	if (err.name === 'SyntaxError' || err.type === 'syntax_error') return true
	if (typeof err.line === 'number' || typeof err.column === 'number') return true
	if (typeof err.message === 'string' && err.message.includes('SyntaxError')) return true
	return false
}

/**
 * Fast deep clone for cached objects to protect against in-memory mutations
 */
function safeClone(obj) {
	if (obj === null || typeof obj !== 'object') return obj
	if (Array.isArray(obj)) return obj.map(safeClone)
	const copy = {}
	for (const k of Object.keys(obj)) {
		copy[k] = safeClone(obj[k])
	}
	return copy
}

class FileCache {
	constructor(options = {}) {
		this.enabled = options.cache !== false
		this.cacheDir = options.cacheDir || null
		this.cacheMaxMb = Number(options.cacheMaxMb) || 20
		this.fingerprint = computeOptionsFingerprint(options)
		this.store = this.cacheDir ? new Map() : inMemoryCache
		this.diskLoaded = false
		this.dirty = false

		if (this.enabled && this.cacheDir) {
			this.loadDiskCache()
		}
	}

	getCacheFilePath() {
		return path.join(this.cacheDir, 'cache.json')
	}

	loadDiskCache() {
		if (!this.cacheDir) return
		const filePath = this.getCacheFilePath()
		try {
			if (fs.existsSync(filePath)) {
				const raw = fs.readFileSync(filePath, 'utf8')
				const parsed = JSON.parse(raw)
				if (parsed && typeof parsed.entries === 'object') {
					for (const [key, entry] of Object.entries(parsed.entries)) {
						this.store.set(key, entry)
					}
				}
				this.diskLoaded = true
			}
		} catch (e) {
			// Corrupt or unreadable cache file - initialize empty
			this.store.clear()
		}
	}

	saveDiskCache() {
		if (!this.enabled || !this.cacheDir || !this.dirty) return
		const filePath = this.getCacheFilePath()
		try {
			const dir = path.dirname(filePath)
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true })
			}

			this.evictIfNeeded()

			const entriesObj = {}
			for (const [key, entry] of this.store.entries()) {
				entriesObj[key] = entry
			}

			const payload = JSON.stringify({
				version: PARSER_VERSION,
				savedAt: Date.now(),
				entries: entriesObj
			})

			fs.writeFileSync(filePath, payload, 'utf8')
			this.dirty = false
		} catch (e) {
			// Non-blocking disk write failure (e.g. read-only filesystem)
		}
	}

	evictIfNeeded() {
		const maxBytes = this.cacheMaxMb * 1024 * 1024
		let totalBytes = 0
		for (const entry of this.store.values()) {
			totalBytes += entry.sizeBytes || 512
		}

		if (totalBytes > maxBytes) {
			// Low-water mark: prune down to 75% of limit with 20% overshoot
			const targetBytes = maxBytes * 0.75
			const excessBytes = totalBytes - targetBytes
			const avgEntrySize = totalBytes / (this.store.size || 1)
			const pruneCount = Math.ceil((excessBytes / avgEntrySize) * 1.2)

			// JS Map iterator order is LRU (oldest touched items first)
			let deleted = 0
			for (const key of this.store.keys()) {
				this.store.delete(key)
				if (++deleted >= pruneCount) break
			}
		}
	}

	touchEntry(key, entry) {
		// O(1) move to tail in Map for zero-cost LRU
		entry.lastAccessed = Date.now()
		this.store.delete(key)
		this.store.set(key, entry)
	}

	get(filePath, stat) {
		if (!this.enabled) return null
		const fastKey = getFastCacheKey(filePath, stat, this.fingerprint)
		if (!fastKey) return null

		const entry = this.store.get(fastKey)
		if (entry && entry.parsed) {
			this.touchEntry(fastKey, entry)
			return safeClone(entry.parsed)
		}
		return null
	}

	getByHash(filePath, contentHash, stat) {
		if (!this.enabled) return null
		const fullKey = getFullCacheKey(filePath, contentHash, this.fingerprint)
		const entry = this.store.get(fullKey)
		if (entry && entry.parsed) {
			// If stat is now available, also index fastKey for future runs
			if (stat) {
				const fastKey = getFastCacheKey(filePath, stat, this.fingerprint)
				if (fastKey && fastKey !== fullKey) {
					this.store.set(fastKey, entry)
				}
			}
			this.touchEntry(fullKey, entry)
			return safeClone(entry.parsed)
		}
		return null
	}

	set(filePath, { stat, contentHash, parsed }) {
		if (!this.enabled || !parsed) return

		// If parsed object has an error, verify if it's cacheable
		if (parsed.error && !isCacheableError(parsed.error)) {
			return
		}

		const fullKey = getFullCacheKey(filePath, contentHash, this.fingerprint)
		const fastKey = getFastCacheKey(filePath, stat, this.fingerprint)

		// Estimate serialized size in bytes
		let estimatedSize = 512
		try {
			estimatedSize = Buffer.byteLength(JSON.stringify(parsed), 'utf8')
		} catch (e) {}

		const entry = {
			fullCacheKey: fullKey,
			fastCacheKey: fastKey,
			lastAccessed: Date.now(),
			sizeBytes: estimatedSize,
			parsed: safeClone(parsed)
		}

		// Store under fullKey
		this.touchEntry(fullKey, entry)
		// Also store under fastKey if available
		if (fastKey && fastKey !== fullKey) {
			this.store.set(fastKey, entry)
		}

		this.dirty = true
	}

	clear() {
		this.store.clear()
		this.dirty = false
		if (this.cacheDir) {
			const filePath = this.getCacheFilePath()
			try {
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath)
				}
			} catch (e) {}
		}
	}
}

module.exports = {
	FileCache,
	computeOptionsFingerprint,
	getFastCacheKey,
	getFullCacheKey,
	hashContent,
	isCacheableError,
	safeClone,
	PARSER_VERSION
}
