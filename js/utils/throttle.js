/**
 * Creates a throttled function.
 * Runs immediately, then keeps the latest call for the trailing run.
 *
 * @param {Function} fn
 * @param {number} waitMs
 * @returns {Function}
 */
export function throttle(fn, waitMs) {
  let lastInvokedAt = 0;
  let trailingTimer = null;
  let trailingArgs = null;
  let trailingThis = null;

  return function throttled(...args) {
    const now = Date.now();
    const remainingMs = waitMs - (now - lastInvokedAt);

    // The first call runs immediately so user actions feel responsive.
    if (remainingMs <= 0 || lastInvokedAt === 0) {
      if (trailingTimer) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }

      trailingArgs = null;
      trailingThis = null;
      lastInvokedAt = now;

      return fn.apply(this, args);
    }

    // Calls inside the wait window update the trailing call with the latest data.
    trailingArgs = args;
    trailingThis = this;

    if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        trailingTimer = null;
        lastInvokedAt = Date.now();

        fn.apply(trailingThis, trailingArgs);

        trailingArgs = null;
        trailingThis = null;
      }, remainingMs);
    }

    return undefined;
  };
}
