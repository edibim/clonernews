export const API_BASE_URL =
  "https://hacker-news.firebaseio.com/v0";

export const POST_BATCH_SIZE = 15;
export const COMMENT_BATCH_SIZE = 20;
export const REPLY_BATCH_SIZE = 10;

export const MAX_CONCURRENT_REQUESTS = 6;
export const LIVE_INTERVAL_MS = 5000;

export const POLL_SCAN_BUDGET = 60;
export const POLL_TARGET_COUNT = 6;
export const LIVE_NEW_ITEM_FETCH_CAP = 20;

export const ALGOLIA_POLL_SEARCH_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=poll";
export const ALGOLIA_POLL_CANDIDATE_LIMIT = 18;

export const KNOWN_POLL_IDS = Object.freeze([
  160704,
  126809,
]);

export const CATEGORIES = Object.freeze([
  "stories",
  "jobs",
  "polls",
]);