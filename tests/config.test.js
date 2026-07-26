import { assertEqual, test } from "./runner.js";

import {
  API_BASE_URL,
  COMMENT_BATCH_SIZE,
  LIVE_INTERVAL_MS,
  MAX_CONCURRENT_REQUESTS,
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