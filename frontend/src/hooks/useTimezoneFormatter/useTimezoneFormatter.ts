import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useCallback, useEffect, useMemo } from 'react';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Types
export type TimestampInput = string | number | Date;
interface CacheEntry {
	value: string;
	timestamp: number;
}

//

// Constants
const CACHE_SIZE_LIMIT = 1000;
const CACHE_CLEANUP_PERCENTAGE = 0.5; // Remove 50% when limit is reached

function useTimezoneFormatter({
	userTimezone,
}: {
	userTimezone: Timezone;
}): {
	formatTimezoneAdjustedTimestamp: (
		input: TimestampInput,
		format?: string,
	) => string;
} {
	// Initialize cache using useMemo to persist between renders
	const cache = useMemo(() => new Map<string, CacheEntry>(), []);

	// Clear cache when timezone changes
	useEffect(() => {
		cache.clear();
	}, [cache, userTimezone]);

	const clearExpiredEntries = useCallback(() => {
		if (cache.size <= CACHE_SIZE_LIMIT) return;

		// Sort entries by timestamp (oldest first)
		const sortedEntries = Array.from(cache.entries()).sort(
			(a, b) => a[1].timestamp - b[1].timestamp,
		);

		// Calculate how many entries to remove
		const entriesToRemove = Math.floor(cache.size * CACHE_CLEANUP_PERCENTAGE);

		// Remove oldest entries
		sortedEntries.slice(0, entriesToRemove).forEach(([key]) => cache.delete(key));
	}, [cache]);

	const formatTimezoneAdjustedTimestamp = useCallback(
		(input: TimestampInput, format = 'YYYY-MM-DD HH:mm:ss'): string => {
			const cacheKey = `${input}_${format}_${userTimezone?.value}`;

			// Check cache first
			const cachedValue = cache.get(cacheKey);
			if (cachedValue) {
				return cachedValue.value;
			}
			// Format timestamp
			const formattedValue = dayjs(input).tz(userTimezone?.value).format(format);

			// Update cache
			cache.set(cacheKey, {
				value: formattedValue,
				timestamp: Date.now(),
			});

			// Clear expired entries and enforce size limit
			if (cache.size > CACHE_SIZE_LIMIT) {
				clearExpiredEntries();

				// If still over limit, remove oldest entries
				const entriesToDelete = cache.size - CACHE_SIZE_LIMIT;
				if (entriesToDelete > 0) {
					const entries = Array.from(cache.entries());
					entries
						.sort((a, b) => a[1].timestamp - b[1].timestamp)
						.slice(0, entriesToDelete)
						.forEach(([key]) => cache.delete(key));
				}
			}

			return formattedValue;
		},
		[cache, clearExpiredEntries, userTimezone],
	);

	return { formatTimezoneAdjustedTimestamp };
}

export default useTimezoneFormatter;
