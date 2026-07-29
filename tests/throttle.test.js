import { assertEqual, test } from "./runner.js";

import { throttle } from "../js/utils/throttle.js";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

test("throttle invokes immediately and blocks calls inside the window", async () => {
  let callCount = 0;
  const throttled = throttle(() => {
    callCount += 1;
  }, 30);

  throttled();
  throttled();

  assertEqual(callCount, 1);

  await wait(40);

  assertEqual(callCount, 2);
});

test("throttle uses the latest trailing arguments", async () => {
  const receivedValues = [];
  const throttled = throttle((value) => {
    receivedValues.push(value);
  }, 30);

  throttled("first");
  throttled("second");
  throttled("third");

  await wait(40);

  assertEqual(receivedValues.length, 2);
  assertEqual(receivedValues[0], "first");
  assertEqual(receivedValues[1], "third");
});

test("throttle preserves this for immediate and trailing calls", async () => {
  const receivedValues = [];
  const context = {
    label: "context",
    throttled: throttle(function record(value) {
      receivedValues.push(`${this.label}:${value}`);
    }, 30),
  };

  context.throttled("first");
  context.throttled("second");

  await wait(40);

  assertEqual(receivedValues[0], "context:first");
  assertEqual(receivedValues[1], "context:second");
});
