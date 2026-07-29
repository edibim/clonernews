import { MAX_CONCURRENT_REQUESTS } from "../config.js";

const queue = [];
let activeCount = 0;

function createAbortError() {
  if (typeof DOMException === "function") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";

  return error;
}

function processQueue() {
  while (activeCount < MAX_CONCURRENT_REQUESTS && queue.length > 0) {
    const entry = queue.shift();

    if (!entry) {
      return;
    }

    if (entry.signal?.aborted) {
      entry.reject(createAbortError());
      continue;
    }

    entry.started = true;
    activeCount += 1;

    let requestPromise;

    try {
      requestPromise = Promise.resolve(entry.loader());
    } catch (error) {
      requestPromise = Promise.reject(error);
    }

    requestPromise.then(
      (value) => {
        activeCount = Math.max(0, activeCount - 1);

        if (entry.signal && entry.abortHandler) {
          entry.signal.removeEventListener("abort", entry.abortHandler);
        }

        processQueue();

        entry.resolve(value);
      },
      (error) => {
        activeCount = Math.max(0, activeCount - 1);

        if (entry.signal && entry.abortHandler) {
          entry.signal.removeEventListener("abort", entry.abortHandler);
        }

        processQueue();

        entry.reject(error);
      },
    );
  }
}

/**
 * Enqueues a request loader with concurrency control.
 *
 * @param {() => Promise<unknown>} loader
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>}
 */
export function enqueueRequest(loader, { signal } = {}) {
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise((resolve, reject) => {
    const entry = {
      abortHandler: null,
      loader,
      reject,
      resolve,
      signal,
      started: false,
    };

    if (signal) {
      entry.abortHandler = () => {
        if (entry.started) {
          return;
        }

        const queueIndex = queue.indexOf(entry);

        if (queueIndex !== -1) {
          queue.splice(queueIndex, 1);
        }

        reject(createAbortError());
      };

      signal.addEventListener("abort", entry.abortHandler, {
        once: true,
      });
    }

    queue.push(entry);
    processQueue();
  });
}

/**
 * Returns current queue statistics.
 *
 * @returns {{ activeCount: number, queuedCount: number }}
 */
export function getQueueStats() {
  return {
    activeCount,
    queuedCount: queue.length,
  };
}

/**
 * Resets all queue bookkeeping.
 */
export function resetRequestQueue() {
  while (queue.length > 0) {
    const entry = queue.shift();

    if (entry?.signal && entry.abortHandler) {
      entry.signal.removeEventListener("abort", entry.abortHandler);
    }
  }

  activeCount = 0;
}
