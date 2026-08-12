const assert = require("node:assert/strict");
const test = require("node:test");

const { defaults } = require("../src/schema.js");
const {
  MAX_IMPORT_BYTES,
  MAX_PROJECTS,
  PROJECTS_ENVELOPE_VERSION,
  PROJECTS_STORAGE_KEY,
  RECOVERY_STORAGE_KEY,
  createProjectRepository,
  parseProjectImport,
  serializeProjectExport,
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

test("unsupported simulation schemas are preserved instead of loaded", () => {
  const raw = JSON.stringify({
    version: PROJECTS_ENVELOPE_VERSION,
    simulationSchemaVersion: 999,
    projects: [project("future")],
  });
  const storage = new MemoryStorage({ [PROJECTS_STORAGE_KEY]: raw });
  const result = createProjectRepository(storage).load();

  assert.deepEqual(result.projects, []);
  assert.equal(result.shouldPersist, false);
  assert.equal(JSON.parse(storage.getItem(RECOVERY_STORAGE_KEY)).raw, raw);
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
  assert.match(result.message, /n'ont pas été modifiées/);
  assert.doesNotMatch(result.message, /export/i);
});

test("saving beyond the project limit is rejected without writing or truncating", () => {
  const storage = new MemoryStorage();
  const source = Array.from({ length: MAX_PROJECTS + 1 }, (_, index) => project(String(index)));
  const result = createProjectRepository(storage).save(source);

  assert.equal(result.ok, false);
  assert.equal(result.projects.length, MAX_PROJECTS + 1);
  assert.match(result.message, /limite de 50/);
  assert.equal(storage.getItem(PROJECTS_STORAGE_KEY), null);
});

test("malicious persisted strings remain bounded inert data", () => {
  const hostile = project("id-onmouseover=alert(1)");
  hostile.name = '<img src=x onerror="alert(1)">';
  hostile.values.__protoPollution = "ignored";
  const storage = new MemoryStorage({
    [PROJECTS_STORAGE_KEY]: JSON.stringify([hostile]),
  });

  const [loaded] = createProjectRepository(storage).load().projects;
  assert.equal(loaded.name, hostile.name);
  assert.equal(loaded.id, hostile.id);
  assert.equal(Object.hasOwn(loaded.values, "__protoPollution"), false);
});

test("project exports round-trip through the strict import parser", () => {
  const exported = serializeProjectExport([project("one")], () => new Date("2026-08-12T10:00:00.000Z"));
  assert.equal(exported.ok, true);

  const parsed = parseProjectImport(exported.value);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.projects.length, 1);
  assert.equal(parsed.projects[0].id, "one");
  assert.equal(JSON.parse(exported.value).savedAt, "2026-08-12T10:00:00.000Z");
});

test("imports reject malformed, oversized, incompatible, and partially invalid files", () => {
  assert.equal(parseProjectImport("{broken").ok, false);
  assert.match(parseProjectImport("x".repeat(MAX_IMPORT_BYTES + 1)).message, /1 Mo/);

  const incompatible = serializeProjectExport([project("one")]);
  const incompatibleEnvelope = JSON.parse(incompatible.value);
  incompatibleEnvelope.simulationSchemaVersion = 999;
  assert.match(parseProjectImport(JSON.stringify(incompatibleEnvelope)).message, /schéma/);

  const invalid = JSON.parse(incompatible.value);
  invalid.projects.push({ id: "bad", name: "Bad", values: { purchasePrice: "oops" } });
  assert.match(parseProjectImport(JSON.stringify(invalid)).message, /invalide/);
});
