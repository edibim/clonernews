export const storyFixture = Object.freeze({
  id: 1001,
  type: "story",
  by: "alice",
  time: 1_700_000_000,
  title: "Test story",
  url: "https://example.com/story",
  score: 120,
  descendants: 2,
  kids: [3001, 3002],
});

export const jobFixture = Object.freeze({
  id: 1002,
  type: "job",
  by: "example-company",
  time: 1_700_000_100,
  title: "Frontend Developer",
  url: "https://example.com/jobs/frontend-developer",
  text: "<p>Remote role with JavaScript experience.</p>",
});

export const pollFixture = Object.freeze({
  id: 1003,
  type: "poll",
  by: "bob",
  time: 1_700_000_200,
  title: "Which language do you prefer?",
  text: "<p>Choose one option.</p>",
  score: 42,
  descendants: 1,
  parts: [2001, 2002],
  kids: [3003],
});

export const pollOptionFixture = Object.freeze({
  id: 2001,
  type: "pollopt",
  poll: 1003,
  text: "JavaScript",
  score: 25,
});

export const secondPollOptionFixture = Object.freeze({
  id: 2002,
  type: "pollopt",
  poll: 1003,
  text: "Go",
  score: 17,
});

export const directCommentFixture = Object.freeze({
  id: 3001,
  type: "comment",
  by: "charlie",
  time: 1_700_000_300,
  parent: 1001,
  text: "<p>This is a direct comment.</p>",
  kids: [4001],
});

export const secondDirectCommentFixture = Object.freeze({
  id: 3002,
  type: "comment",
  by: "diana",
  time: 1_700_000_250,
  parent: 1001,
  text: "<p>This is another direct comment.</p>",
});

export const nestedReplyFixture = Object.freeze({
  id: 4001,
  type: "comment",
  by: "eve",
  time: 1_700_000_400,
  parent: 3001,
  text: "<p>This is a nested reply.</p>",
});

export const deletedItemFixture = Object.freeze({
  id: 5001,
  type: "comment",
  deleted: true,
  parent: 1001,
  kids: [5002],
});

export const deadItemFixture = Object.freeze({
  id: 5002,
  type: "story",
  dead: true,
  by: "unknown",
  time: 1_700_000_500,
  title: "Dead story",
});

export const nullApiResponseFixture = null;

export const storyIdsFixture = Object.freeze([
  1001,
  1010,
  1011,
  1012,
]);

export const jobIdsFixture = Object.freeze([
  1002,
  1020,
  1021,
]);

export const updatesFixture = Object.freeze({
  items: [1001, 3001],
  profiles: ["alice"],
});

export const maxItemFixture = 6000; 