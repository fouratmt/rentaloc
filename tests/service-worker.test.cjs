const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { URL } = require("node:url");
const { Response } = globalThis;

const source = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");

function createWorker({ failedUrls = [] } = {}) {
  const handlers = new Map();
  const stores = new Map();
  const deleted = [];
  let skipWaitingCalls = 0;
  let claimCalls = 0;
  const scope = "https://example.test/tools/rentaloc/";
  const failed = new Set(failedUrls.map((url) => new URL(url, scope).toString()));
  const cacheFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      put: async (key, response) => entries.set(typeof key === "string" ? key : key.url, response),
    };
  };
  const caches = {
    open: async (name) => cacheFor(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => {
      deleted.push(name);
      return stores.delete(name);
    },
    match: async (key) => {
      const normalized = typeof key === "string" ? key : key.url;
      for (const entries of stores.values()) {
        if (entries.has(normalized)) return entries.get(normalized);
      }
      return undefined;
    },
  };
  const self = {
    registration: { scope },
    clients: { claim: async () => claimCalls++ },
    addEventListener: (type, handler) => handlers.set(type, handler),
    skipWaiting: async () => skipWaitingCalls++,
  };
  const fetch = async (request) => {
    const url = typeof request === "string" ? request : request.url;
    if (failed.has(url)) throw new Error("offline");
    return new Response(url, { status: 200 });
  };
  vm.runInNewContext(source, {
    URL,
    Response,
    Set,
    Error,
    Promise,
    caches,
    fetch,
    self,
  });
  return {
    handlers,
    stores,
    deleted,
    scope,
    caches,
    counts: () => ({ skipWaitingCalls, claimCalls }),
  };
}

function lifecycleEvent() {
  let pending;
  return {
    event: { waitUntil: (promise) => (pending = promise) },
    done: () => pending,
  };
}

test("precache tolerates optional failures but requires both offline documents", async () => {
  const optionalFailure = createWorker({ failedUrls: ["assets/icons/icon-512.png"] });
  const install = lifecycleEvent();
  optionalFailure.handlers.get("install")(install.event);
  await install.done();
  const cached = optionalFailure.stores.get("rentaloc-v20");
  assert.ok(cached.has(`${optionalFailure.scope}index.html`));
  assert.ok(cached.has(`${optionalFailure.scope}app.html`));
  assert.equal(optionalFailure.counts().skipWaitingCalls, 0);

  const requiredFailure = createWorker({ failedUrls: ["app.html"] });
  const failedInstall = lifecycleEvent();
  requiredFailure.handlers.get("install")(failedInstall.event);
  await assert.rejects(failedInstall.done(), /Required offline document unavailable/);
});

test("activation removes only obsolete owned caches and claims clients", async () => {
  const worker = createWorker();
  worker.stores.set("rentaloc-v18", new Map());
  worker.stores.set("rentaloc-v19", new Map());
  worker.stores.set("rentaloc-v20", new Map());
  worker.stores.set("other-app-v1", new Map());
  const activate = lifecycleEvent();
  worker.handlers.get("activate")(activate.event);
  await activate.done();
  assert.deepEqual(worker.deleted, ["rentaloc-v18", "rentaloc-v19"]);
  assert.equal(worker.counts().claimCalls, 1);
});

test("updates activate only after an explicit message", () => {
  const worker = createWorker();
  worker.handlers.get("message")({ data: { type: "OTHER" } });
  assert.equal(worker.counts().skipWaitingCalls, 0);
  worker.handlers.get("message")({ data: { type: "SKIP_WAITING" } });
  assert.equal(worker.counts().skipWaitingCalls, 1);
});

test("same-scope uncached offline requests receive a deterministic 503", async () => {
  const worker = createWorker({ failedUrls: ["src/missing.js"] });
  let responsePromise;
  worker.handlers.get("fetch")({
    request: { method: "GET", mode: "cors", url: `${worker.scope}src/missing.js` },
    respondWith: (promise) => (responsePromise = promise),
  });
  const response = await responsePromise;
  assert.equal(response.status, 503);
  assert.match(await response.text(), /hors connexion/);
});

test("offline navigation preserves simulator route intent under a subpath", async () => {
  const worker = createWorker({ failedUrls: ["app.html?draft=1"] });
  const cachedApp = new Response("simulator shell", { status: 200 });
  worker.stores.set("rentaloc-v19", new Map([[`${worker.scope}app.html`, cachedApp]]));
  let responsePromise;
  worker.handlers.get("fetch")({
    request: { method: "GET", mode: "navigate", url: `${worker.scope}app.html?draft=1` },
    respondWith: (promise) => (responsePromise = promise),
  });
  const response = await responsePromise;
  assert.equal(await response.text(), "simulator shell");
});

test("requests outside the registration scope are ignored", () => {
  const worker = createWorker();
  let responded = false;
  worker.handlers.get("fetch")({
    request: { method: "GET", mode: "cors", url: "https://example.test/other/file.js" },
    respondWith: () => (responded = true),
  });
  assert.equal(responded, false);
});
