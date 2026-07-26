export function createMockResponse({
  body = null,
  status = 200,
  statusText = "OK",
  jsonError = null,
} = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,

    async json() {
      if (jsonError) {
        throw jsonError;
      }

      return body;
    },
  };
}

export function createMockFetch(responses = []) {
  const calls = [];
  let responseIndex = 0;

  async function mockFetch(url, options = {}) {
    calls.push({
      url,
      options,
    });

    const currentResponse = responses[responseIndex];
    responseIndex += 1;

    if (!currentResponse) {
      throw new Error(`No mock response configured for request: ${url}`);
    }

    if (currentResponse.reject) {
      throw currentResponse.reject;
    }

    return createMockResponse({
      body: currentResponse.body,
      status: currentResponse.status ?? 200,
      statusText: currentResponse.statusText ?? "OK",
      jsonError: currentResponse.jsonError ?? null,
    });
  }

  mockFetch.calls = calls;

  mockFetch.reset = function reset() {
    calls.length = 0;
    responseIndex = 0;
  };

  return mockFetch;
}