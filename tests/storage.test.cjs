const assert = require("node:assert/strict");
const test = require("node:test");

const { defaults } = require("../src/schema.js");
const {
  MAX_PROJECTS,
  PROJECTS_STORAGE_KEY,
  RECOVERY_STORAGE_KEY,
  createProjectRepository,
} = require("../src/storage.js");

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
    this.failWrites = false;
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    if (this.failWrites) throw new Error("quota");
    this.values.set(key, String(value));
  }
}

const project = (id, overrides = {}) => ({
  id,
  name: `Projet ${id}`,
  values: { ...defaults, ...overrides },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
});

test("legacy project arrays are migrated and receive new schema defaults", () => {
  const storage = new MemoryStorage({
    [PROJECTS_STORAGE_KEY]: JSON.stringify([project("legacy")]),
  });
  const repository = createProjectRepository(storage);
  const result = repository.load();

  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].values.priorYearGrossRentalReceipts, 0);
  assert.equal(result.shouldPersist, true);
  assert.match(result.message, /migrées/);
});

test("malformed JSON is preserved under the recovery key", () => {
  const storage = new MemoryStorage({ [PROJECTS_STORAGE_KEY]: "{broken" });
  const result = createProjectRepository(storage).load();

  assert.deepEqual(result.projects, []);
  assert.match(result.message, /récupération/);
  const recovery = JSON.parse(storage.getItem(RECOVERY_STORAGE_KEY));
  assert.equal(recovery.raw, "{broken");
  assert.equal(recovery.reason, "invalid-json");
});

test("invalid and excess projects are excluded while the original is preserved", () => {
  const source = Array.from({ length: MAX_PROJECTS + 2 }, (_, index) => project(String(index)));
  source[1].values.purchasePrice = "not-a-number";
  const raw = JSON.stringify(source);
  const storage = new MemoryStorage({ [PROJECTS_STORAGE_KEY]: raw });
  const result = createProjectRepository(storage).load();

  assert.equal(result.projects.length, MAX_PROJECTS - 1);
  assert.match(result.message, /3 sauvegarde/);
  assert.equal(JSON.parse(storage.getItem(RECOVERY_STORAGE_KEY)).raw, raw);
});

test("quota failures return an actionable error without throwing", () => {
  const storage = new MemoryStorage();
  storage.failWrites = true;
  const result = createProjectRepository(storage).save([project("one")]);

  assert.equal(result.ok, false);
  assert.match(result.message, /quota|indisponible/);
});
