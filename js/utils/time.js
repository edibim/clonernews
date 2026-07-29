/**
 * Sorts items by numeric time from newest to oldest.
 *
 * @param {Array<{ time?: number }>} items
 * @returns {Array<{ time?: number }>}
 */
export function sortNewestFirst(items) {
  const sortedItems = [...items];

  sortedItems.sort((a, b) => {
    const aHasTime = Number.isFinite(a.time);
    const bHasTime = Number.isFinite(b.time);

    if (!aHasTime && !bHasTime) {
      return 0;
    }

    if (!aHasTime) {
      return 1;
    }

    if (!bHasTime) {
      return -1;
    }

    if (a.time === b.time) {
      return 0;
    }

    return b.time - a.time;
  });

  return sortedItems;
}

/**
 * Formats a Unix timestamp as relative time.
 *
 * @param {number} unixSeconds
 * @param {number} nowSeconds
 * @returns {string}
 */
export function formatRelativeTime(unixSeconds, nowSeconds) {
  if (!Number.isFinite(unixSeconds) || !Number.isFinite(nowSeconds)) {
    return "unknown time";
  }

  const elapsedSeconds = Math.max(0, Math.floor(nowSeconds - unixSeconds));

  if (elapsedSeconds < 60) {
    return formatUnit(elapsedSeconds, "second");
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return formatUnit(elapsedMinutes, "minute");
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return formatUnit(elapsedHours, "hour");
  }

  return formatUnit(Math.floor(elapsedHours / 24), "day");
}

function formatUnit(value, unit) {
  const suffix = value === 1 ? unit : `${unit}s`;

  return `${value} ${suffix} ago`;
}
