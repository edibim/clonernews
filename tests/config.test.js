import { assertEqual, test } from "./runner.js";

import {
  API_BASE_URL,
  CATEGORIES,
  COMMENT_BATCH_SIZE,
  KNOWN_POLL_IDS,
  LIVE_INTERVAL_MS,
  LIVE_NEW_ITEM_FETCH_CAP,
  MAX_CONCURRENT_REQUESTS,
  POLL_SCAN_BUDGET,
  POLL_TARGET_COUNT,
  POST_BATCH_SIZE,
  REPLY_BATCH_SIZE,
} from "../js/config.js";


test("config uses the official Hacker News API URL", () => {
  assertEqual(
    API_BASE_URL,
    "https://hacker-news.firebaseio.com/v0",
  );
});

test("config uses the documented post batch size", () => {
  assertEqual(POST_BATCH_SIZE, 15);
});

test("config uses the documented comment batch size", () => {
  assertEqual(COMMENT_BATCH_SIZE, 20);
});

test("config uses the documented reply batch size", () => {
  assertEqual(REPLY_BATCH_SIZE, 10);
});

test("config limits concurrent requests to six", () => {
  assertEqual(MAX_CONCURRENT_REQUESTS, 6);
});

test("config checks live updates every five seconds", () => {
  assertEqual(LIVE_INTERVAL_MS, 5000);
});

test("config limits poll discovery to sixty inspected items", () => {
  assertEqual(POLL_SCAN_BUDGET, 60);
});

test("config targets six discovered polls", () => {
  assertEqual(POLL_TARGET_COUNT, 6);
});

test("config inspects at most twenty new live items", () => {
  assertEqual(LIVE_NEW_ITEM_FETCH_CAP, 20);
});

test("config contains the documented fallback poll IDs", () => {
  assertEqual(KNOWN_POLL_IDS.length, 2);
  assertEqual(KNOWN_POLL_IDS[0], 160704);
  assertEqual(KNOWN_POLL_IDS[1], 126809);
});

test("config exposes the three supported categories", () => {
  assertEqual(CATEGORIES.length, 3);
  assertEqual(CATEGORIES[0], "stories");
  assertEqual(CATEGORIES[1], "jobs");
  assertEqual(CATEGORIES[2], "polls");
});

test("configuration collections are frozen", () => {
  assertEqual(Object.isFrozen(KNOWN_POLL_IDS), true);
  assertEqual(Object.isFrozen(CATEGORIES), true);
});