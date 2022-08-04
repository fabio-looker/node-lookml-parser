# Objects within an object should be merged deeply
view: deep_merging {
	dimension: dim { sql: ${TABLE}.dim ;; }
	}

view: +deep_merging {
	dimension: dim { label: "My Dim" }
	}

# array example?

# filters/hashmap example

# SUPER example?