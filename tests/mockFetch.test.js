import { assert, assertEqual, test } from "./runner.js";
import { createMockFetch } from "./mockFetch.js";

test("mock fetch returns configured JSON data", async () => {
  const mockFetch = createMockFetch([
    {
      body: {
        id: 123,
        type: "story",
        title: "Test story",
      },
    },
  ]);

  const response = await mockFetch("/item/123.json");
  const data = await response.json();

  assertEqual(response.ok, true);
  assertEqual(response.status, 200);
  assertEqual(data.id, 123);
  assertEqual(data.title, "Test story");
});

test("mock fetch records URL and options", async () => {
  const mockFetch = createMockFetch([
    {
      body: null,
    },
  ]);

  await mockFetch("/item/123.json", {
    method: "GET",
  });

  assertEqual(mockFetch.calls.length, 1);
  assertEqual(mockFetch.calls[0].url, "/item/123.json");
  assertEqual(mockFetch.calls[0].options.method, "GET");
});

test("mock fetch can return null JSON", async () => {
  const mockFetch = createMockFetch([
    {
      body: null,
    },
  ]);

  const response = await mockFetch("/item/999.json");
  const data = await response.json();

  assertEqual(data, null);
});

test("mock fetch can return an HTTP error response", async () => {
  const mockFetch = createMockFetch([
    {
      body: {
        error: "Not found",
      },
      status: 404,
      statusText: "Not Found",
    },
  ]);

  const response = await mockFetch("/item/404.json");

  assertEqual(response.ok, false);
  assertEqual(response.status, 404);
  assertEqual(response.statusText, "Not Found");
});

test("mock fetch can reject with a network error", async () => {
  const mockFetch = createMockFetch([
    {
      reject: new Error("Network unavailable"),
    },
  ]);

  let receivedError = null;

  try {
    await mockFetch("/item/123.json");
  } catch (error) {
    receivedError = error;
  }

  assert(receivedError instanceof Error);
  assertEqual(receivedError.message, "Network unavailable");
});

test("mock response can fail while parsing JSON", async () => {
  const mockFetch = createMockFetch([
    {
      jsonError: new SyntaxError("Invalid JSON"),
    },
  ]);

  const response = await mockFetch("/broken.json");

  let receivedError = null;

  try {
    await response.json();
  } catch (error) {
    receivedError = error;
  }

  assert(receivedError instanceof SyntaxError);
  assertEqual(receivedError.message, "Invalid JSON");
});