import { assertEqual, test } from "./runner.js";

import {
  getFeedUrl,
  getItemUrl,
  getMaxItemUrl,
  getUpdatesUrl,
} from "../js/api/endpoints.js";

test("getItemUrl builds the official item URL", () => {
  assertEqual(
    getItemUrl(8863),
    "https://hacker-news.firebaseio.com/v0/item/8863.json",
  );
});

test("getItemUrl rejects invalid item IDs", () => {
  const invalidIds = [0, -1, 1.5, "8863", Number.NaN];

  for (const id of invalidIds) {
    let receivedError = null;

    try {
      getItemUrl(id);
    } catch (error) {
      receivedError = error;
    }

    assertEqual(receivedError instanceof Error, true);
  }
});

test("getFeedUrl builds the stories feed URL", () => {
  assertEqual(
    getFeedUrl("stories"),
    "https://hacker-news.firebaseio.com/v0/newstories.json",
  );
});

test("getFeedUrl builds the jobs feed URL", () => {
  assertEqual(
    getFeedUrl("jobs"),
    "https://hacker-news.firebaseio.com/v0/jobstories.json",
  );
});

test("getFeedUrl rejects unsupported feed categories", () => {
  let receivedError = null;

  try {
    getFeedUrl("polls");
  } catch (error) {
    receivedError = error;
  }

  assertEqual(receivedError instanceof Error, true);
});

test("getMaxItemUrl builds the max item URL", () => {
  assertEqual(
    getMaxItemUrl(),
    "https://hacker-news.firebaseio.com/v0/maxitem.json",
  );
});

test("getUpdatesUrl builds the updates URL", () => {
  assertEqual(
    getUpdatesUrl(),
    "https://hacker-news.firebaseio.com/v0/updates.json",
  );
});
