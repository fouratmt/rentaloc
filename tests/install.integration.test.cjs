const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { setImmediate } = require("node:timers");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const installSource = fs.readFileSync(path.join(root, "src/install.js"), "utf8");

async function createInstallApp({ cancelUpdate = false } = {}) {
  const dom = new JSDOM(html, {
    url: "https://rentaloc.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const messages = [];
  const waiting = { postMessage: (message) => messages.push(message) };
  const registration = new window.EventTarget();
  registration.waiting = waiting;
  registration.installing = null;
  registration.update = async () => {};
  const serviceWorker = new window.EventTarget();
  serviceWorker.controller = {};
  serviceWorker.register = async () => registration;
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(window.navigator, "serviceWorker", { configurable: true, value: serviceWorker });
  Object.defineProperty(window.navigator, "onLine", { configurable: true, writable: true, value: true });
  window.matchMedia = () => ({ matches: false });
  if (cancelUpdate) window.addEventListener("rentaloc:before-update", (event) => event.preventDefault());
  window.eval(`${installSource}\n//# sourceURL=src/install.js`);
  window.dispatchEvent(new window.Event("load"));
  await new Promise((resolve) => setImmediate(resolve));
  return { dom, window, document: window.document, registration, serviceWorker, messages };
}

test("online and offline state is announced", async () => {
  const { dom, window, document } = await createInstallApp();
  assert.equal(document.querySelector("#networkStatus").textContent, "En ligne");
  window.navigator.onLine = false;
  window.dispatchEvent(new window.Event("offline"));
  assert.match(document.querySelector("#networkStatus").textContent, /Hors connexion/);
  assert.equal(document.body.classList.contains("is-offline"), true);
  dom.window.close();
});

test("a waiting worker is exposed and activates only after approval", async () => {
  const accepted = await createInstallApp();
  assert.equal(accepted.document.querySelector("#updateButton").hidden, false);
  accepted.document.querySelector("#updateButton").click();
  assert.equal(accepted.messages.length, 1);
  assert.equal(accepted.messages[0].type, "SKIP_WAITING");
  assert.equal(accepted.document.querySelector("#updateButton").disabled, true);
  accepted.dom.window.close();

  const cancelled = await createInstallApp({ cancelUpdate: true });
  cancelled.document.querySelector("#updateButton").click();
  assert.deepEqual(cancelled.messages, []);
  assert.equal(cancelled.document.querySelector("#updateButton").disabled, false);
  cancelled.dom.window.close();
});
