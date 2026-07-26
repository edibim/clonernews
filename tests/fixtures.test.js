import { assert, assertEqual, test } from "./runner.js";

import {
  deadItemFixture,
  deletedItemFixture,
  directCommentFixture,
  jobFixture,
  maxItemFixture,
  nestedReplyFixture,
  nullApiResponseFixture,
  pollFixture,
  pollOptionFixture,
  storyFixture,
  updatesFixture,
} from "./fixtures.js";

test("story fixture represents a valid story", () => {
  assertEqual(storyFixture.type, "story");
  assertEqual(storyFixture.id, 1001);
  assert(Array.isArray(storyFixture.kids));
});

test("job fixture represents a valid job", () => {
  assertEqual(jobFixture.type, "job");
  assertEqual(jobFixture.id, 1002);
});

test("poll fixture contains poll option IDs", () => {
  assertEqual(pollFixture.type, "poll");
  assert(Array.isArray(pollFixture.parts));
  assertEqual(pollFixture.parts.length, 2);
});

test("poll option points to the correct poll", () => {
  assertEqual(pollOptionFixture.type, "pollopt");
  assertEqual(pollOptionFixture.poll, pollFixture.id);
});

test("direct comment points to the story", () => {
  assertEqual(directCommentFixture.type, "comment");
  assertEqual(directCommentFixture.parent, storyFixture.id);
});

test("nested reply points to the direct comment", () => {
  assertEqual(nestedReplyFixture.parent, directCommentFixture.id);
});

test("deleted fixture is marked deleted", () => {
  assertEqual(deletedItemFixture.deleted, true);
});

test("dead fixture is marked dead", () => {
  assertEqual(deadItemFixture.dead, true);
});

test("null API response fixture is null", () => {
  assertEqual(nullApiResponseFixture, null);
});

test("updates fixture contains changed item IDs", () => {
  assert(Array.isArray(updatesFixture.items));
  assertEqual(updatesFixture.items[0], storyFixture.id);
});

test("max item fixture is a positive integer", () => {
  assert(Number.isSafeInteger(maxItemFixture));
  assert(maxItemFixture > 0);
});