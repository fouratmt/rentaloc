const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { setImmediate } = require("node:timers");
const { JSDOM } = require("jsdom");
const { defaults } = require("../src/schema.js");
const { MAX_PROJECTS } = require("../src/storage.js");

const root = path.join(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const appHtml = read("app.html");
const appScripts = ["src/rules.js", "src/schema.js", "src/domain.js", "src/storage.js", "src/app.js"];

function createApp({ storage = {}, confirm = true, failStorageWrites = false } = {}) {
  const dom = new JSDOM(appHtml, {
    url: "https://rentaloc.test/app.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  Object.entries(storage).forEach(([key, value]) => window.localStorage.setItem(key, value));
  if (failStorageWrites) {
    Object.getPrototypeOf(window.localStorage).setItem = () => {
      throw new Error("quota");
    };
  }
  window.HTMLElement.prototype.scrollIntoView = () => {};
  const confirmMessages = [];
  window.confirm = (message) => {
    confirmMessages.push(message);
    return typeof confirm === "function" ? confirm(message) : confirm;
  };
  const clipboardWrites = [];
  const downloads = [];
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (text) => clipboardWrites.push(text) },
  });
  window.URL.createObjectURL = () => "blob:rentaloc-export";
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function recordDownload() {
    downloads.push({ href: this.href, download: this.download });
  };
  appScripts.forEach((script) => window.eval(`${read(script)}\n//# sourceURL=${script}`));
  return { dom, window, document: window.document, clipboardWrites, confirmMessages, downloads };
}

function savedProject(id) {
  return {
    id,
    name: `Projet ${id}`,
    values: { ...defaults },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function projectEnvelope(projects) {
  return JSON.stringify({
    version: 2,
    simulationSchemaVersion: 2,
    savedAt: "2026-01-02T00:00:00.000Z",
    projects,
  });
}

function field(document, name) {
  return document.querySelector(`[data-field="${name}"]`);
}

function change(window, control, value, eventName = "input") {
  control.value = value;
  control.dispatchEvent(new window.Event(eventName, { bubbles: true }));
}

test("invalid form values render linked errors and disable save/copy", () => {
  const { dom, window, document } = createApp();
  const purchasePrice = field(document, "purchasePrice");
  change(window, purchasePrice, "0");

  assert.equal(purchasePrice.getAttribute("aria-invalid"), "true");
  assert.match(purchasePrice.getAttribute("aria-describedby"), /field-error-purchasePrice/);
  assert.equal(document.querySelector("#saveProjectButton").getAttribute("aria-disabled"), "true");
  assert.equal(document.querySelector("#copyButton").disabled, true);
  assert.equal(document.querySelector("#validationPanel").hidden, false);
  dom.window.close();
});

test("advanced values remain active while their disclosures summarize them", () => {
  const { dom, window, document } = createApp();
  assert.match(document.querySelector("#advancedChargesSummary").textContent, /2 postes/);
  change(window, field(document, "managementFeeRate"), "7");
  assert.match(document.querySelector("#advancedChargesSummary").textContent, /3 postes/);
  assert.match(document.querySelector("#advancedTaxSummary").textContent, /2 paramètres/);

  const taxDetails = field(document, "depreciationDeduction").closest("details");
  assert.equal(taxDetails.open, false);
  change(window, field(document, "depreciationDeduction"), "-1");
  document.querySelector("#saveProjectButton").click();
  assert.equal(taxDetails.open, true);
  assert.equal(document.activeElement, field(document, "depreciationDeduction"));
  dom.window.close();
});

test("saved projects can be loaded and deleted through the DOM", () => {
  const { dom, window, document } = createApp();
  change(window, document.querySelector("#projectName"), "Projet DOM");
  document.querySelector("#saveProjectButton").click();

  assert.match(document.querySelector("#projectList").textContent, /Projet DOM/);
  change(window, field(document, "monthlyRent"), "999");
  document.querySelector('[data-project-action="load"]').click();
  assert.equal(field(document, "monthlyRent").value, "650");

  document.querySelector('[data-project-action="delete"]').click();
  assert.match(document.querySelector("#projectList").textContent, /Aucune simulation/);
  assert.equal(JSON.parse(window.localStorage.getItem("rentaloc-projects-v1")).projects.length, 0);
  dom.window.close();
});

test("saved projects can be exported, strictly imported, and deleted in bulk", async () => {
  const { dom, window, document, downloads, confirmMessages } = createApp();
  change(window, document.querySelector("#projectName"), "Projet portable");
  document.querySelector("#saveProjectButton").click();

  document.querySelector("#exportProjectsButton").click();
  assert.equal(downloads.length, 1);
  assert.match(downloads[0].download, /^rentaloc-simulations-\d{4}-\d{2}-\d{2}\.json$/);

  const importedProject = savedProject("imported");
  const file = {
    size: 500,
    text: async () => projectEnvelope([importedProject]),
  };
  const input = document.querySelector("#importProjectsInput");
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(document.querySelector("#projectList").textContent, /Projet imported/);
  assert.equal(JSON.parse(window.localStorage.getItem("rentaloc-projects-v1")).projects[0].id, "imported");
  assert.match(confirmMessages.at(-1), /remplacera/);

  document.querySelector("#deleteAllProjectsButton").click();
  assert.match(document.querySelector("#projectList").textContent, /Aucune simulation/);
  assert.equal(JSON.parse(window.localStorage.getItem("rentaloc-projects-v1")).projects.length, 0);
  dom.window.close();
});

test("an invalid import never replaces existing projects", async () => {
  const { dom, window, document, confirmMessages } = createApp({
    storage: { "rentaloc-projects-v1": projectEnvelope([savedProject("safe")]) },
  });
  const input = document.querySelector("#importProjectsInput");
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [{ size: 20, text: async () => "{broken" }],
  });
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(JSON.parse(window.localStorage.getItem("rentaloc-projects-v1")).projects[0].id, "safe");
  assert.equal(confirmMessages.length, 0);
  assert.match(document.querySelector("#projectStatus").textContent, /JSON valide/);
  dom.window.close();
});

test("the project limit refuses a new save without evicting existing data", () => {
  const existing = Array.from({ length: MAX_PROJECTS }, (_, index) => savedProject(String(index)));
  const raw = projectEnvelope(existing);
  const { dom, window, document } = createApp({ storage: { "rentaloc-projects-v1": raw } });

  change(window, document.querySelector("#projectName"), "Projet 51");
  document.querySelector("#saveProjectButton").click();

  const persisted = JSON.parse(window.localStorage.getItem("rentaloc-projects-v1"));
  assert.equal(persisted.projects.length, MAX_PROJECTS);
  assert.equal(persisted.projects.at(-1).id, existing.at(-1).id);
  assert.match(document.querySelector("#projectStatus").textContent, /limite de 50/);
  assert.equal(document.querySelector("#dirtyIndicator").hidden, false);
  dom.window.close();
});

test("failed deletion keeps the project and reports the storage error", () => {
  const existing = [savedProject("one")];
  const { dom, document } = createApp({
    storage: { "rentaloc-projects-v1": projectEnvelope(existing) },
    failStorageWrites: true,
  });

  document.querySelector('[data-project-action="delete"]').click();

  assert.equal(document.querySelectorAll(".project-item").length, 1);
  assert.match(document.querySelector("#projectStatus").textContent, /n'ont pas été modifiées/);
  dom.window.close();
});

test("saved projects render a sortable comparison with a selectable baseline", () => {
  const { dom, window, document } = createApp();
  change(window, document.querySelector("#projectName"), "Projet prudent");
  document.querySelector("#saveProjectButton").click();
  document.querySelector("#newProjectButton").click();
  change(window, document.querySelector("#projectName"), "Projet rentable");
  change(window, field(document, "monthlyRent"), "1100");
  document.querySelector("#saveProjectButton").click();

  const comparison = document.querySelector("#projectComparison");
  assert.equal(comparison.hidden, false);
  assert.equal(document.querySelectorAll("#comparisonRows tr").length, 2);
  assert.match(document.querySelector("#comparisonRows").textContent, /Crédit · Meublé · LMNP réel/);
  assert.match(document.querySelector("#comparisonNote").textContent, /Projet rentable/);

  const prudentBaseline = [...document.querySelectorAll('[name="comparison-baseline"]')].find((control) =>
    control.getAttribute("aria-label").includes("Projet prudent"),
  );
  prudentBaseline.checked = true;
  prudentBaseline.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.match(document.querySelector("#comparisonNote").textContent, /Projet prudent/);

  change(window, document.querySelector("#comparisonSort"), "cashflow", "change");
  assert.match(document.querySelector("#comparisonRows tr:first-child").textContent, /Projet rentable/);
  dom.window.close();
});

test("editing a loaded save exposes dirty state", () => {
  const { dom, window, document } = createApp();
  document.querySelector("#saveProjectButton").click();
  change(window, field(document, "monthlyRent"), "700");
  assert.match(document.querySelector("#projectStatus").textContent, /Modifications non enregistrées/);
  assert.equal(document.querySelector("#dirtyIndicator").hidden, false);
  document.querySelector("#saveProjectButton").click();
  assert.equal(document.querySelector("#dirtyIndicator").hidden, true);
  dom.window.close();
});

test("copied summaries include warnings and the fiscal disclaimer", async () => {
  const { dom, document, clipboardWrites } = createApp();
  document.querySelector("#copyButton").click();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(clipboardWrites.length, 1);
  assert.match(clipboardWrites[0], /Estimation fiscale simplifiée/);
  assert.match(clipboardWrites[0], /Points d'attention/);
  assert.match(clipboardWrites[0], /TEOM récupérable non renseignée/);
  dom.window.close();
});

test("malformed storage is recovered and reported in the UI", () => {
  const { dom, window, document } = createApp({ storage: { "rentaloc-projects-v1": "{broken" } });
  assert.match(document.querySelector("#projectStatus").textContent, /récupération/);
  const recovery = JSON.parse(window.localStorage.getItem("rentaloc-projects-v1-recovery"));
  assert.equal(recovery.reason, "invalid-json");
  dom.window.close();
});

test("cash financing hides and disables every ignored loan field", () => {
  const { dom, window, document } = createApp();
  change(window, field(document, "financingMethod"), "cash", "change");

  ["downPayment", "interestRate", "loanDurationYears", "borrowerInsuranceRate", "bankFees", "loanYear"].forEach(
    (name) => {
      assert.equal(field(document, name).disabled, true);
      assert.equal(field(document, name).closest("label").hidden, true);
    },
  );
  assert.equal(document.querySelector("#validationPanel").hidden, true);
  dom.window.close();
});

test("rental type constrains use, tax modes, and tax-specific fields", () => {
  const { dom, window, document } = createApp();
  change(window, field(document, "rentalUse"), "tourist-classified", "change");
  change(window, field(document, "rentalType"), "unfurnished", "change");

  assert.equal(field(document, "rentalUse").value, "long-term");
  assert.equal(field(document, "rentalUse").querySelector('[value="tourist-classified"]').disabled, true);
  assert.equal(field(document, "taxMode").value, "foncier-real");
  assert.equal(field(document, "taxMode").querySelector('[value="lmnp-real"]').disabled, true);
  assert.equal(field(document, "depreciationDeduction").disabled, true);
  assert.match(document.querySelector("#projectStatus").textContent, /régime réel foncier/);

  change(window, field(document, "taxMode"), "manual", "change");
  assert.equal(field(document, "manualAnnualTax").disabled, false);
  assert.equal(field(document, "socialContributionsRate").disabled, false);
  assert.equal(field(document, "depreciationDeduction").disabled, true);
  dom.window.close();
});

test("field and metric help is visible and semantically connected", () => {
  const { dom, document } = createApp();
  const purchasePrice = field(document, "purchasePrice");
  const fieldHelper = document.querySelector("#field-help-purchasePrice");
  assert.equal(purchasePrice.getAttribute("aria-describedby"), fieldHelper.id);
  assert.equal(fieldHelper.hidden, false);
  assert.match(fieldHelper.textContent, /prix affiché/);

  const metric = document.querySelector('[aria-describedby="metric-help-totalProjectCost"]');
  assert.ok(metric);
  assert.match(document.querySelector("#metric-help-totalProjectCost").textContent, /Somme du prix/);
  assert.match(document.querySelector("[data-tooltip]").getAttribute("aria-describedby"), /tooltip-description-/);
  dom.window.close();
});

test("destructive transitions can be cancelled while work is dirty", () => {
  const { dom, window, document, confirmMessages } = createApp({ confirm: false });
  change(window, field(document, "monthlyRent"), "700");
  document.querySelector("#newProjectButton").click();
  assert.equal(field(document, "monthlyRent").value, "700");
  document.querySelector("#resetButton").click();
  assert.equal(field(document, "monthlyRent").value, "700");
  assert.equal(confirmMessages.length, 2);
  assert.match(confirmMessages.join(" "), /modifications ne sont pas enregistrées/);
  dom.window.close();
});

test("dirty state guards navigation and controlled app updates", () => {
  const { dom, window, document, confirmMessages } = createApp({ confirm: false });
  change(window, field(document, "monthlyRent"), "700");

  const navigation = new window.Event("beforeunload", { cancelable: true });
  window.dispatchEvent(navigation);
  assert.equal(navigation.defaultPrevented, true);

  const update = new window.CustomEvent("rentaloc:before-update", { cancelable: true });
  window.dispatchEvent(update);
  assert.equal(update.defaultPrevented, true);
  assert.match(confirmMessages.at(-1), /installer la nouvelle version/);
  dom.window.close();
});

test("loading another project or deleting can be cancelled", () => {
  const { dom, window, document, confirmMessages } = createApp({ confirm: false });
  change(window, document.querySelector("#projectName"), "Projet A");
  document.querySelector("#saveProjectButton").click();
  document.querySelector("#newProjectButton").click();
  change(window, document.querySelector("#projectName"), "Projet B");
  change(window, field(document, "monthlyRent"), "800");
  document.querySelector("#saveProjectButton").click();
  change(window, field(document, "monthlyRent"), "900");

  const projectA = [...document.querySelectorAll('[data-project-action="load"]')].find((button) =>
    button.textContent.includes("Projet A"),
  );
  projectA.click();
  assert.equal(field(document, "monthlyRent").value, "900");

  projectA.closest(".project-item").querySelector('[data-project-action="delete"]').click();
  assert.equal(document.querySelectorAll(".project-item").length, 2);
  assert.equal(confirmMessages.length, 2);
  dom.window.close();
});
