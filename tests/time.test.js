import { assertEqual, test } from "./runner.js";

import {
  formatRelativeTime,
  sortNewestFirst,
} from "../js/utils/time.js";

test("sortNewestFirst returns items by numeric time from newest to oldest", () => {
  const items = [
    { id: 1, time: 100 },
    { id: 2, time: 300 },
    { id: 3, time: 200 },
  ];

  const sortedItems = sortNewestFirst(items);

  assertEqual(sortedItems[0].id, 2);
  assertEqual(sortedItems[1].id, 3);
  assertEqual(sortedItems[2].id, 1);
});

test("sortNewestFirst leaves missing times last and preserves equal order", () => {
  const firstUntimed = { id: 1 };
  const firstTimed = { id: 2, time: 100 };
  const secondTimed = { id: 3, time: 100 };
  const secondUntimed = { id: 4 };

  const sortedItems = sortNewestFirst([
    firstUntimed,
    firstTimed,
    secondTimed,
    secondUntimed,
  ]);

  assertEqual(sortedItems[0], firstTimed);
  assertEqual(sortedItems[1], secondTimed);
  assertEqual(sortedItems[2], firstUntimed);
  assertEqual(sortedItems[3], secondUntimed);
});

test("sortNewestFirst does not mutate the source array", () => {
  const items = [
    { id: 1, time: 100 },
    { id: 2, time: 300 },
  ];

  const sortedItems = sortNewestFirst(items);

  assertEqual(sortedItems === items, false);
  assertEqual(items[0].id, 1);
  assertEqual(items[1].id, 2);
});

test("formatRelativeTime covers seconds, minutes, hours, and days", () => {
  const nowSeconds = 10_000;

  assertEqual(formatRelativeTime(9_970, nowSeconds), "30 seconds ago");
  assertEqual(formatRelativeTime(9_880, nowSeconds), "2 minutes ago");
  assertEqual(formatRelativeTime(2_800, nowSeconds), "2 hours ago");
  assertEqual(formatRelativeTime(10_000 - 172_800, nowSeconds), "2 days ago");
});

test("formatRelativeTime handles singular units", () => {
  const nowSeconds = 10_000;

  assertEqual(formatRelativeTime(9_999, nowSeconds), "1 second ago");
  assertEqual(formatRelativeTime(9_940, nowSeconds), "1 minute ago");
  assertEqual(formatRelativeTime(6_400, nowSeconds), "1 hour ago");
  assertEqual(formatRelativeTime(10_000 - 86_400, nowSeconds), "1 day ago");
});

test("formatRelativeTime returns unknown time for invalid input", () => {
  assertEqual(formatRelativeTime(undefined, 10_000), "unknown time");
  assertEqual(formatRelativeTime(10_000, undefined), "unknown time");
  assertEqual(formatRelativeTime(Number.NaN, 10_000), "unknown time");
});
