/**
 * Sorts items by numeric time from newest to oldest.
 *
 * @param {Array<{ time?: number }>} items
 * @returns {Array<{ time?: number }>}
 */
export function sortNewestFirst(items) {
  return [...items].sort((a, b) => {
    if (a.time === undefined && b.time === undefined) return 0
    if (a.time === undefined) return 1
    if (b.time === undefined) return -1
    if (a.time === b.time) return 0

    return b.time - a.time
  })
}
/**
 * Formats a Unix timestamp as relative time.
 *
 * @param {number} unixSeconds
 * @param {number} nowSeconds
 * @returns {string}
 */
export function formatRelativeTime(unixSeconds, nowSeconds) {}
