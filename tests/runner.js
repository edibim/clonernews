const tests = [];

export function test(name, callback) {
  tests.push({
    name,
    callback,
  });
}

export function assert(condition, message = "Assertion failed") {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message ??
        `Expected ${JSON.stringify(expected)}, but received ${JSON.stringify(actual)}`,
    );
  }
}

export async function runTests() {
  const resultsContainer = document.querySelector("#test-results");

  if (!resultsContainer) {
    throw new Error("Test results container was not found");
  }

  let passed = 0;
  let failed = 0;

  for (const currentTest of tests) {
    const resultElement = document.createElement("p");

    try {
      await currentTest.callback();

      passed += 1;

      resultElement.className = "test-pass";
      resultElement.textContent = `✓ ${currentTest.name}`;
    } catch (error) {
      failed += 1;

      resultElement.className = "test-fail";
      resultElement.textContent = `✗ ${currentTest.name}: ${error.message}`;

      console.error(error);
    }

    resultsContainer.append(resultElement);
  }

  const summaryElement = document.createElement("p");

  summaryElement.className = "test-summary";
  summaryElement.textContent = `${passed} passed, ${failed} failed`;

  resultsContainer.append(summaryElement);
}
test("assert passes for a truthy condition", () => {
  assert(true);
});

test("assertEqual compares equal values", () => {
  assertEqual(2 + 2, 4);
});

test("async tests are awaited", async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 20);
  });

  assertEqual("done", "done");
});

test("tests continue after a failure", () => {
  assertEqual("still running", "still running");
});
