import { assertEqual, test } from "./runner.js";

import {
  clearItemCache,
  deleteCachedItem,
  getCachedItem,
  setCachedItem,
} from "../js/services/itemCache.js";

test("getCachedItem returns undefined for an unknown item ID", () => {
  clearItemCache();

  assertEqual(getCachedItem(9999), undefined);
});

test("setCachedItem stores and returns an item by ID", () => {
  clearItemCache();

  const item = {
    id: 1001,
    type: "story",
    title: "Cached story",
  };

  setCachedItem(1001, item);

  assertEqual(getCachedItem(1001), item);
});

test("deleteCachedItem removes a stored item", () => {
  clearItemCache();

  const item = {
    id: 1002,
    type: "job",
  };

  setCachedItem(1002, item);
  deleteCachedItem(1002);

  assertEqual(getCachedItem(1002), undefined);
});

test("clearItemCache removes every stored item", () => {
  clearItemCache();

  setCachedItem(1001, { id: 1001, type: "story" });
  setCachedItem(1002, { id: 1002, type: "job" });

  clearItemCache();

  assertEqual(getCachedItem(1001), undefined);
  assertEqual(getCachedItem(1002), undefined);
});
