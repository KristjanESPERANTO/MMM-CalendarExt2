const assert = require("node:assert/strict");
const {afterEach, beforeEach, describe, it, mock} = require("node:test");
const Module = require("module");

// ---------------------------------------------------------------------------
// Mock 'logger' – CalendarFetcher does require("logger") which only resolves
// inside the MagicMirror runtime. We intercept Module._load to return a no-op.
// ---------------------------------------------------------------------------
const loggerMock = {
  log: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
  debug: mock.fn(),
  info: mock.fn()
};

/* eslint-disable no-underscore-dangle */
const originalLoad = Module._load.bind(Module);
Module._load = (request, parent, isMain) => {
  if (request === "logger") {
    return loggerMock;
  }

  return originalLoad(request, parent, isMain);
};
/* eslint-enable no-underscore-dangle */

const CalendarFetcher = require("../lib/calendar-fetcher");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal CalendarFetcher whose callbacks are recorded.
 */
const makeFetcher = (overrides = {}) => {
  const onSuccess = mock.fn();
  const onError = mock.fn();

  const instance = new CalendarFetcher(
    "https://example.com/cal.ics",
    60_000,
    null,
    {
      userAgent: "TestAgent/1.0",
      authFailureCooldown: 7_200_000, // 2 h
      rateLimitCooldown: 900_000, // 15 min
      clientErrorCooldown: 3_600_000, // 1 h
      onSuccess,
      onError,
      ...overrides
    }
  );

  return {instance,
    onSuccess,
    onError};
};

/**
 * Build a minimal Response-like object for handleHttpError.
 */
const makeResponse = (status, statusText = "Error", retryAfter = null) => ({
  status,
  statusText,
  headers: {
    get: (name) => (name.toLowerCase() === "retry-after" ? retryAfter : null)
  }
});

// ---------------------------------------------------------------------------
// handleHttpError – pure method, no network involved
// ---------------------------------------------------------------------------

describe("CalendarFetcher.handleHttpError", () => {
  it("401 → uses authFailureCooldown and sets suspendUntil", () => {
    const {instance} = makeFetcher();
    const before = Date.now();
    const result = instance.handleHttpError(makeResponse(401, "Unauthorized"));

    assert.ok(result.error instanceof Error);
    assert.match(result.error.message, /401/u);
    assert.ok(instance.suspendUntil >= before + 7_200_000 - 50);
    assert.equal(result.delay, Math.max(7_200_000, 60_000));
  });

  it("403 → uses authFailureCooldown", () => {
    const {instance} = makeFetcher();
    const result = instance.handleHttpError(makeResponse(403, "Forbidden"));

    assert.ok(result.error instanceof Error);
    assert.equal(result.delay, 7_200_000);
    assert.equal(instance.suspendReason, "auth error (403)");
  });

  it("429 without Retry-After → uses rateLimitCooldown", () => {
    const {instance} = makeFetcher();
    const result = instance.handleHttpError(makeResponse(429, "Too Many Requests"));

    assert.equal(result.delay, Math.max(900_000, 60_000));
    assert.equal(instance.suspendReason, "rate limit");
  });

  it("429 with Retry-After as seconds number → uses that duration", () => {
    const {instance} = makeFetcher();
    const result = instance.handleHttpError(makeResponse(429, "Too Many Requests", "120"));

    assert.equal(result.delay, Math.max(120_000, 60_000));
  });

  it("429 with Retry-After as future date string → computes remaining ms", () => {
    const {instance} = makeFetcher();
    const futureDate = new Date(Date.now() + 300_000).toUTCString(); // 5 min
    const result = instance.handleHttpError(makeResponse(429, "Too Many Requests", futureDate));

    // Should be close to 300 000 ms (±500 ms for test execution)
    assert.ok(result.delay >= 299_000);
    assert.ok(result.delay <= 301_000);
  });

  it("429 with Retry-After as past date → falls back to rateLimitCooldown (max 0 guard)", () => {
    const {instance} = makeFetcher();
    const pastDate = new Date(Date.now() - 60_000).toUTCString();
    const result = instance.handleHttpError(makeResponse(429, "Too Many Requests", pastDate));

    // Math.max(0, pastDate - now) = 0 → cooldown stays at 0, delay = max(0, reloadInterval)
    assert.equal(result.delay, Math.max(0, 60_000));
  });

  it("404 → uses clientErrorCooldown", () => {
    const {instance} = makeFetcher();
    const result = instance.handleHttpError(makeResponse(404, "Not Found"));

    assert.equal(result.delay, Math.max(3_600_000, 60_000));
    assert.match(instance.suspendReason, /client error/u);
  });

  it("408 → uses clientErrorCooldown", () => {
    const {instance} = makeFetcher();
    const result = instance.handleHttpError(makeResponse(408, "Request Timeout"));

    assert.equal(result.delay, 3_600_000);
  });

  it("500 → no suspend, delay = reloadInterval", () => {
    const {instance} = makeFetcher();
    const result = instance.handleHttpError(makeResponse(500, "Internal Server Error"));

    assert.equal(instance.suspendUntil, null);
    assert.equal(result.delay, 60_000);
  });

  it("503 → no suspend, delay = reloadInterval", () => {
    const {instance} = makeFetcher();
    const result = instance.handleHttpError(makeResponse(503, "Service Unavailable"));

    assert.equal(instance.suspendUntil, null);
    assert.equal(result.delay, 60_000);
  });

  it("unexpected status (302) → no suspend, delay = reloadInterval", () => {
    const {instance} = makeFetcher();
    const result = instance.handleHttpError(makeResponse(302, "Found"));

    assert.equal(instance.suspendUntil, null);
    assert.equal(result.delay, 60_000);
  });
});

// ---------------------------------------------------------------------------
// fetch() – uses mocked global.fetch
// ---------------------------------------------------------------------------

describe("CalendarFetcher.fetch", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    loggerMock.log.mock.resetCalls();
    loggerMock.warn.mock.resetCalls();
    loggerMock.error.mock.resetCalls();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls onSuccess with response text on HTTP 200", async () => {
    const {instance, onSuccess, onError} = makeFetcher();
    instance.stop(); // prevent automatic retry timer

    global.fetch = mock.fn(() => ({
      ok: true,
      text: () => "BEGIN:VCALENDAR\nEND:VCALENDAR"
    }));

    await instance.fetch();
    instance.stop();

    assert.equal(onSuccess.mock.calls.length, 1);
    assert.equal(onSuccess.mock.calls[0].arguments[0], "BEGIN:VCALENDAR\nEND:VCALENDAR");
    assert.equal(onError.mock.calls.length, 0);
  });

  it("calls onError on HTTP 500", async () => {
    const {instance, onSuccess, onError} = makeFetcher();

    global.fetch = mock.fn(() => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: {get: () => null}
    }));

    await instance.fetch();
    instance.stop();

    assert.equal(onError.mock.calls.length, 1);
    assert.ok(onError.mock.calls[0].arguments[0] instanceof Error);
    assert.equal(onSuccess.mock.calls.length, 0);
  });

  it("calls onError on network-level failure", async () => {
    const {instance, onSuccess, onError} = makeFetcher();

    global.fetch = mock.fn(() => {
      throw new Error("ECONNREFUSED");
    });

    await instance.fetch();
    instance.stop();

    assert.equal(onError.mock.calls.length, 1);
    assert.match(onError.mock.calls[0].arguments[0].message, /ECONNREFUSED/u);
    assert.equal(onSuccess.mock.calls.length, 0);
  });

  it("skips fetch and reschedules when suspended", async () => {
    const {instance, onSuccess, onError} = makeFetcher();

    instance.suspendUntil = Date.now() + 60_000;
    instance.suspendReason = "auth error (401)";

    const fetchSpy = mock.fn(() => ({ok: true,
      text: () => ""}));
    global.fetch = fetchSpy;

    await instance.fetch();
    instance.stop();

    assert.equal(fetchSpy.mock.calls.length, 0);
    assert.equal(onSuccess.mock.calls.length, 0);
    assert.equal(onError.mock.calls.length, 0);
  });

  it("clears suspension after suspend period has passed", async () => {
    const {instance, onSuccess} = makeFetcher();

    // suspend in the past
    instance.suspendUntil = Date.now() - 1;
    instance.suspendReason = "auth error (401)";

    global.fetch = mock.fn(() => ({
      ok: true,
      text: () => "BEGIN:VCALENDAR\nEND:VCALENDAR"
    }));

    await instance.fetch();
    instance.stop();

    assert.equal(instance.suspendUntil, null);
    assert.equal(instance.suspendReason, null);
    assert.equal(onSuccess.mock.calls.length, 1);
  });

  it("sets basic auth header when auth method is basic", async () => {
    const {instance} = makeFetcher();

    let capturedHeaders;
    global.fetch = mock.fn((url, opts) => {
      capturedHeaders = opts.headers;
      return {ok: true,
        text: () => ""};
    });

    instance.auth = {method: "basic",
      user: "alice",
      pass: "s3cr3t"};
    await instance.fetch();
    instance.stop();

    const expected = `Basic ${Buffer.from("alice:s3cr3t").toString("base64")}`;
    assert.equal(capturedHeaders.Authorization, expected);
  });

  it("sets Bearer auth header when auth method is bearer", async () => {
    const {instance} = makeFetcher();

    let capturedHeaders;
    global.fetch = mock.fn((url, opts) => {
      capturedHeaders = opts.headers;
      return {ok: true,
        text: () => ""};
    });

    instance.auth = {method: "bearer",
      pass: "mytoken"};
    await instance.fetch();
    instance.stop();

    assert.equal(capturedHeaders.Authorization, "Bearer mytoken");
  });
});
