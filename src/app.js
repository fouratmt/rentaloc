const { defaults, mergeWithDefaults } = window.RentaLocSchema;
const {
  buildSummaryText,
  calculate,
  getFixedOperatingExpenses,
  getRecoverableTaxeOrdures,
  getVariableExpenseRate,
  validateDetails,
  validateValues,
  vacancyRateFromDays,
  warnings,
} = window.RentaLocDomain;
const {
  MAX_IMPORT_BYTES,
  MAX_PROJECTS,
  PROJECTS_STORAGE_KEY,
  createProjectRepository,
  parseProjectImport,
  serializeProjectExport,
} = window.RentaLocStorage;

const form = document.querySelector("#simulatorForm");
const fields = [...document.querySelectorAll("[data-field]")];
const projectNameInput = document.querySelector("#projectName");
const projectList = document.querySelector("#projectList");
const projectStatus = document.querySelector("#projectStatus");
const dirtyIndicator = document.querySelector("#dirtyIndicator");
const exportProjectsButton = document.querySelector("#exportProjectsButton");
const importProjectsButton = document.querySelector("#importProjectsButton");
const importProjectsInput = document.querySelector("#importProjectsInput");
const deleteAllProjectsButton = document.querySelector("#deleteAllProjectsButton");
const projectComparison = document.querySelector("#projectComparison");
const comparisonRows = document.querySelector("#comparisonRows");
const comparisonSort = document.querySelector("#comparisonSort");
const comparisonNote = document.querySelector("#comparisonNote");
const helpButton = document.querySelector("#helpButton");
const helpOverlay = document.querySelector("#helpOverlay");
const helpCloseButton = document.querySelector("#helpCloseButton");
let activeProjectId = null;
let comparisonBaselineId = null;
let committedSnapshot = "";

const formatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const ratioFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const money = (value) => formatter.format(Number.isFinite(value) ? value : 0);
const percent = (value) => percentFormatter.format(Number.isFinite(value) ? value : 0);
const rate = (value) => value / 100;
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const projectRepository = createProjectRepository(localStorage, { key: PROJECTS_STORAGE_KEY });

function persistProjects(candidateProjects) {
  const result = projectRepository.save(candidateProjects);
  if (result.ok) projects = result.projects;
  if (!result.ok || result.message) setStatus(result.message);
  return result;
}

function setStatus(message) {
  projectStatus.textContent = message;
}

function openModal(dialog, closeButton) {
  document.body.classList.add("modal-open");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  closeButton.focus();
}

function closeModal(dialog) {
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function openHelpOverlay() {
  openModal(helpOverlay, helpCloseButton);
}

function closeHelpOverlay() {
  closeModal(helpOverlay);
}

const storedProjects = projectRepository.load();
let projects = storedProjects.projects;
if (storedProjects.shouldPersist) projectRepository.save(projects);

const fieldHelp = {
  purchasePrice: "Montant total du prix affiché, hors frais de notaire et hors coûts annexes.",
  notaryRate: "Taux estimé appliqué au prix d'achat pour calculer les frais d'acquisition.",
  agencyFees: "Montant total des frais d'agence à ajouter si le prix annoncé ne les inclut pas.",
  renovationWorks: "Budget total des travaux initiaux avant mise en location.",
  furnitureCost: "Budget total de mobilier et équipements, surtout utile en location meublée.",
  otherUpfrontCosts: "Montant total des frais initiaux divers : courtier, garantie, diagnostics ou dossiers.",
  monthlyRent: "Loyer mensuel hors charges utilisé pour calculer les rendements.",
  tenantCharges:
    "Provisions mensuelles refacturées au locataire, hors TEOM. Elles compensent les dépenses récupérables selon l'occupation.",
  vacancyDays: "Nombre estimé de jours par an sans locataire ou sans loyer encaissé.",
  recoverableOperatingExpenses:
    "Dépenses récupérables annuelles payées par le bailleur, hors TEOM. La vacance laisse une partie à sa charge.",
  nonRecoverableCharges: "Montant annuel des charges de copropriété qui reste à la charge du bailleur.",
  taxeFonciere: "Taxe foncière annuelle estimée pour le bien.",
  recoverableTaxeOrdures: "Montant annuel de taxe d'enlèvement des ordures ménagères récupérable auprès du locataire.",
  landlordInsurance: "Assurance propriétaire non occupant annuelle.",
  maintenanceReserve: "Réserve annuelle pour réparations, entretien et petits remplacements.",
  managementFeeRate: "Pourcentage des loyers encaissés versé à une agence de gestion.",
  gliRate: "Assurance loyers impayés calculée en pourcentage des loyers encaissés.",
  accountingCost: "Coût annuel de comptabilité, notamment utile en LMNP réel.",
  cfe: "Cotisation foncière des entreprises ou frais fiscaux récurrents, surtout utile en location meublée.",
  relocationReserve: "Budget annuel prudent pour diagnostics, annonces, état des lieux ou remise en location.",
  otherAnnualCosts: "Autres coûts récurrents non classés ailleurs.",
  financingMethod: "Permet de comparer un achat comptant et un achat financé par crédit.",
  downPayment: "Montant initial de cash injecté au départ dans le projet financé.",
  interestRate: "Taux nominal annuel du crédit immobilier.",
  loanDurationYears: "Durée de remboursement utilisée pour calculer la mensualité.",
  borrowerInsuranceRate: "Taux annuel d'assurance emprunteur appliqué au capital emprunté.",
  bankFees: "Montant initial des frais de dossier, courtage ou banque payés au démarrage.",
  loanYear:
    "Année du tableau d'amortissement utilisée pour calculer précisément intérêts, capital remboursé et solde du prêt.",
  rentalType: "Une location vide relève des revenus fonciers ; une location meublée relève en principe des BIC.",
  rentalUse: "Le seuil et l'abattement micro-BIC diffèrent pour un meublé de tourisme non classé.",
  taxMode: "Régime fiscal utilisé pour estimer la base taxable.",
  marginalTaxRate: "Taux marginal d'imposition utilisé dans le calcul fiscal simplifié.",
  socialContributionsRate:
    "Taux de prélèvements sociaux utilisé en mode manuel. Les autres régimes appliquent le taux 2026 correspondant.",
  depreciationDeduction:
    "Montant annuel estimé de déduction, par exemple amortissement LMNP réel. Ignoré en régime micro.",
  deductibleReserveExpenses:
    "Part des réserves d'entretien/relocation réellement dépensée et fiscalement déductible cette année. Une simple provision de trésorerie n'est pas déduite.",
  otherHouseholdRentalReceipts:
    "Autres recettes locatives brutes du foyer relevant de la même catégorie, utilisées pour vérifier les seuils de régime.",
  priorYearGrossRentalReceipts:
    "Recettes meublées brutes de tout le foyer en 2025. Avec 2024, elles déterminent l'éligibilité micro-BIC des revenus 2026 à partir de la troisième année d'activité.",
  twoYearsAgoGrossRentalReceipts:
    "Recettes meublées brutes de tout le foyer en 2024. Deux dépassements consécutifs en 2024 et 2025 excluent le micro-BIC pour 2026.",
  householdActivityIncome:
    "Autres revenus professionnels nets du foyer, nécessaires pour repérer un possible passage de LMNP à LMP.",
  rentalActivityYear:
    "Année d'activité de location meublée. La première année bénéficie en principe de l'exonération de CFE liée à la création.",
  manualAnnualTax: "Montant annuel d'impôt saisi directement quand le régime fiscal manuel est choisi.",
  dpeRating: "Classe énergie du logement, utilisée dans le score de risque.",
  rentalDemand: "Niveau de demande locative locale, utilisé dans le score qualitatif.",
  buildingCondition: "État général de l'immeuble et risque de dépenses futures.",
  majorWorksRisk: "Probabilité de gros travaux de copropriété à financer.",
  resaleLiquidity: "Facilité probable de revente du bien.",
};

const metricHelp = {
  totalProjectCost: "Somme du prix, des frais d'acquisition, travaux, mobilier et autres frais initiaux.",
  grossAnnualRent: "Loyer hors charges multiplié par 12, avant vacance et charges.",
  vacancyCost: "Loyer annuel perdu à cause des jours de vacance renseignés.",
  effectiveAnnualRent: "Loyer annuel après déduction de la vacance locative.",
  effectiveTenantCharges:
    "Charges récupérables estimées après vacance, exclues des rendements mais incluses dans certaines bases fiscales.",
  unrecoveredCharges:
    "Part des dépenses récupérables et de la TEOM restant au bailleur à cause de la vacance ou d'une provision insuffisante.",
  grossYieldPrice: "Loyer annuel brut divisé par le prix d'achat seul.",
  grossYieldTotalCost: "Loyer annuel brut divisé par le coût total du projet.",
  annualOperatingExpenses: "Total annuel des charges propriétaire, assurances, entretien, gestion et coûts récurrents.",
  netOperatingIncome: "Loyer effectif moins charges d'exploitation, avant crédit et impôt.",
  netYieldBeforeTax: "Revenu net d'exploitation divisé par le coût total du projet.",
  monthlyCashFlowBeforeTax: "Cash mensuel après charges et dette, avant impôt estimé.",
  monthlyCashFlowAfterTax: "Cash mensuel après charges, dette et impôt estimé.",
  estimatedTax: "Impôt annuel simplifié calculé sur le profit taxable estimé.",
  taxableProfit: "Base taxable estimée selon le régime fiscal choisi.",
  cashInvested: "Cash immobilisé au départ : apport et frais non financés, ou coût total en achat comptant.",
  loanAmount: "Montant financé par le crédit selon le coût total et l'apport.",
  monthlyDebtService: "Mensualité de crédit plus assurance emprunteur.",
  annualInterest:
    "Intérêts réellement payés pendant l'année du prêt sélectionnée, issus du tableau d'amortissement mensuel.",
  annualPrincipalRepaid:
    "Capital remboursé pendant l'année sélectionnée ; il augmente votre patrimoine mais n'entre pas dans le cash-flow.",
  loanBalanceEnd: "Capital restant dû à la fin de l'année de prêt sélectionnée.",
  debtCoverageRatio:
    "Rapport entre revenu net d'exploitation et dette annuelle. Au-dessus de 1, le bien couvre la dette.",
  breakEvenRentBeforeTax: "Loyer mensuel nécessaire pour atteindre un cash-flow avant impôt égal à zéro.",
  breakEvenRentAfterTax: "Loyer mensuel nécessaire pour atteindre un cash-flow après impôt estimé égal à zéro.",
  appliedDepreciation: "Amortissement utilisé cette année, plafonné pour ne pas créer de déficit LMNP.",
  deferredDepreciation: "Amortissement non utilisé cette année, à suivre séparément comme report potentiel.",
};

function readValues() {
  return fields.reduce((values, field) => {
    const key = field.dataset.field;
    values[key] = field.disabled ? defaults[key] : field.tagName === "SELECT" ? field.value : Number(field.value || 0);
    return values;
  }, {});
}

const mortgageFieldNames = [
  "downPayment",
  "interestRate",
  "loanDurationYears",
  "borrowerInsuranceRate",
  "bankFees",
  "loanYear",
];
const taxModesByRentalType = {
  furnished: ["lmnp-real", "micro-bic", "manual"],
  unfurnished: ["micro-foncier", "foncier-real", "manual"],
};

function setFieldVisible(fieldName, visible) {
  const control = fields.find((candidate) => candidate.dataset.field === fieldName);
  const label = control?.closest("label");
  if (!control || !label) return;
  control.disabled = !visible;
  label.hidden = !visible;
}

function setCompatibleOptions(select, compatibleValues) {
  [...select.options].forEach((option) => {
    const compatible = compatibleValues.includes(option.value);
    option.disabled = !compatible;
    option.hidden = !compatible;
  });
}

function applyContextualFields() {
  const financingMethod = fields.find((field) => field.dataset.field === "financingMethod").value;
  const rentalType = fields.find((field) => field.dataset.field === "rentalType").value;
  const rentalUse = fields.find((field) => field.dataset.field === "rentalUse");
  const taxMode = fields.find((field) => field.dataset.field === "taxMode");
  const changes = [];

  mortgageFieldNames.forEach((fieldName) => setFieldVisible(fieldName, financingMethod === "mortgage"));

  const compatibleUses =
    rentalType === "furnished" ? ["long-term", "tourist-classified", "tourist-unclassified"] : ["long-term"];
  setCompatibleOptions(rentalUse, compatibleUses);
  if (!compatibleUses.includes(rentalUse.value)) {
    rentalUse.value = "long-term";
    changes.push("L'usage a été ramené à la location longue durée, seule option compatible avec une location vide.");
  }

  const compatibleTaxModes = taxModesByRentalType[rentalType];
  setCompatibleOptions(taxMode, compatibleTaxModes);
  if (!compatibleTaxModes.includes(taxMode.value)) {
    taxMode.value = rentalType === "furnished" ? "lmnp-real" : "foncier-real";
    changes.push(
      rentalType === "furnished"
        ? "Le régime fiscal a été ajusté au LMNP réel, compatible avec une location meublée."
        : "Le régime fiscal a été ajusté au régime réel foncier, compatible avec une location vide.",
    );
  }

  setFieldVisible("manualAnnualTax", taxMode.value === "manual");
  setFieldVisible("socialContributionsRate", taxMode.value === "manual");
  setFieldVisible("depreciationDeduction", taxMode.value === "lmnp-real");
  return changes;
}

function setFormValues(values) {
  const nextValues = mergeWithDefaults(values);
  fields.forEach((field) => {
    const value = nextValues[field.dataset.field];
    if (value !== undefined) field.value = value;
  });
}

function updateDisclosureSummaries(values) {
  const chargeFields = [
    "recoverableOperatingExpenses",
    "recoverableTaxeOrdures",
    "managementFeeRate",
    "gliRate",
    "accountingCost",
    "cfe",
    "relocationReserve",
    "otherAnnualCosts",
  ];
  const taxFields = [
    "socialContributionsRate",
    "depreciationDeduction",
    "deductibleReserveExpenses",
    "otherHouseholdRentalReceipts",
    "priorYearGrossRentalReceipts",
    "twoYearsAgoGrossRentalReceipts",
    "householdActivityIncome",
    "rentalActivityYear",
    "manualAnnualTax",
  ];
  const isActiveField = (fieldName) => {
    const control = fields.find((field) => field.dataset.field === fieldName);
    return control && !control.disabled && Number(values[fieldName]) > 0;
  };
  const activeCharges = chargeFields.filter(isActiveField).length;
  const activeTax = taxFields.filter(isActiveField).length;
  document.querySelector("#advancedChargesSummary").textContent =
    activeCharges > 0
      ? `${activeCharges} poste${activeCharges > 1 ? "s" : ""} non nul${activeCharges > 1 ? "s" : ""} pris en compte`
      : "Aucun poste complémentaire renseigné";
  document.querySelector("#advancedTaxSummary").textContent =
    activeTax > 0
      ? `${activeTax} paramètre${activeTax > 1 ? "s" : ""} actif${activeTax > 1 ? "s" : ""} pris en compte`
      : "Aucun paramètre avancé renseigné";
}

function projectNameOrDefault() {
  const requestedName = projectNameInput.value.trim();
  return requestedName || `Projet ${projects.length + 1}`;
}

function currentSnapshot() {
  return JSON.stringify({
    activeProjectId,
    name: projectNameInput.value,
    values: readValues(),
  });
}

function setDirtyState(dirty) {
  dirtyIndicator.hidden = !dirty;
  document.body.classList.toggle("has-unsaved-changes", dirty);
}

function commitCurrentState() {
  committedSnapshot = currentSnapshot();
  setDirtyState(false);
}

function hasUnsavedChanges() {
  return committedSnapshot !== "" && currentSnapshot() !== committedSnapshot;
}

function refreshDirtyState() {
  const dirty = hasUnsavedChanges();
  setDirtyState(dirty);
  if (dirty) setStatus("Modifications non enregistrées.");
  return dirty;
}

function confirmDiscard(action) {
  if (!hasUnsavedChanges()) return true;
  return window.confirm(`Des modifications ne sont pas enregistrées. Les abandonner pour ${action} ?`);
}

function getValidationDetails(values, result = calculate(values)) {
  return [...validateDetails(values), ...(result.calculationIssues || [])];
}

function renderFieldErrors(validationDetails) {
  fields.forEach((field) => {
    field.removeAttribute("aria-invalid");
    const helpId = fieldHelp[field.dataset.field] ? `field-help-${field.dataset.field}` : "";
    if (helpId) field.setAttribute("aria-describedby", helpId);
    else field.removeAttribute("aria-describedby");
    field.closest("label")?.querySelector(".field-error")?.remove();
  });

  const byField = new Map();
  validationDetails.forEach((detail) => {
    if (!detail.field) return;
    if (!byField.has(detail.field)) byField.set(detail.field, []);
    byField.get(detail.field).push(detail.message);
  });
  byField.forEach((messages, fieldName) => {
    const field = fields.find((candidate) => candidate.dataset.field === fieldName);
    const label = field?.closest("label");
    if (!field || !label) return;
    const error = document.createElement("span");
    error.className = "field-error";
    error.id = `field-error-${fieldName}`;
    error.textContent = [...new Set(messages)].join(" ");
    label.appendChild(error);
    field.setAttribute("aria-invalid", "true");
    const helpId = fieldHelp[fieldName] ? `field-help-${fieldName}` : "";
    field.setAttribute("aria-describedby", [helpId, error.id].filter(Boolean).join(" "));
  });
}

function focusFirstInvalid(validationDetails) {
  const firstFieldName = validationDetails.find((detail) => detail.field)?.field;
  const firstField = fields.find((field) => field.dataset.field === firstFieldName);
  if (firstField) {
    let container = firstField.closest("details");
    while (container) {
      container.open = true;
      container = container.parentElement?.closest("details");
    }
    firstField.focus();
    firstField.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    document.querySelector("#validationPanel").focus();
  }
}

function saveCurrentProject() {
  const now = new Date().toISOString();
  const values = readValues();
  const validationDetails = getValidationDetails(values);
  if (validationDetails.length > 0) {
    setStatus("Corrigez les paramètres signalés avant d'enregistrer.");
    focusFirstInvalid(validationDetails);
    return;
  }
  const name = projectNameOrDefault();
  const existingIndex = projects.findIndex((project) => project.id === activeProjectId);
  if (existingIndex < 0 && projects.length >= MAX_PROJECTS) {
    setStatus(
      `La limite de ${MAX_PROJECTS} simulations est atteinte. Supprimez une simulation avant d'en enregistrer une nouvelle.`,
    );
    return;
  }

  let candidateProjects;
  let candidateActiveProjectId = activeProjectId;
  if (existingIndex >= 0) {
    candidateProjects = projects.map((project, index) =>
      index === existingIndex ? { ...project, name, values, updatedAt: now } : project,
    );
  } else {
    const project = {
      id: createId(),
      name,
      values,
      createdAt: now,
      updatedAt: now,
    };
    candidateProjects = [project, ...projects];
    candidateActiveProjectId = project.id;
  }

  const persisted = persistProjects(candidateProjects);
  if (persisted.ok) {
    activeProjectId = candidateActiveProjectId;
    projectNameInput.value = name;
    renderProjectList();
    commitCurrentState();
    setStatus(existingIndex >= 0 ? "Simulation mise à jour." : "Simulation enregistrée.");
  } else {
    setDirtyState(hasUnsavedChanges());
  }
}

function startNewProject() {
  if (!confirmDiscard("commencer une nouvelle simulation")) return;
  activeProjectId = null;
  projectNameInput.value = "";
  setFormValues(defaults);
  render();
  renderProjectList();
  commitCurrentState();
  setStatus("Nouvelle simulation prête.");
}

function loadProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  if (!confirmDiscard(`charger « ${project.name} »`)) return;
  activeProjectId = project.id;
  projectNameInput.value = project.name;
  setFormValues(project.values);
  render();
  renderProjectList();
  commitCurrentState();
  setStatus(`Simulation chargée : ${project.name}.`);
}

function deleteProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  const shouldDelete = window.confirm(`Supprimer la simulation "${project.name}" ?`);
  if (!shouldDelete) return;
  const candidateProjects = projects.filter((item) => item.id !== projectId);
  const persisted = persistProjects(candidateProjects);
  if (!persisted.ok) {
    renderProjectList();
    setDirtyState(hasUnsavedChanges());
    return;
  }
  if (comparisonBaselineId === projectId) comparisonBaselineId = projects[0]?.id || null;
  if (activeProjectId === projectId) {
    activeProjectId = null;
    projectNameInput.value = "";
  }
  renderProjectList();
  refreshDirtyState();
  setStatus("Simulation supprimée.");
}

function exportSavedProjects() {
  if (projects.length === 0) {
    setStatus("Aucune simulation à exporter.");
    return;
  }
  const exported = serializeProjectExport(projects);
  if (!exported.ok) {
    setStatus(exported.message);
    return;
  }

  const url = window.URL.createObjectURL(new Blob([exported.value], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `rentaloc-simulations-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  setStatus(
    `${projects.length} simulation${projects.length > 1 ? "s" : ""} exportée${projects.length > 1 ? "s" : ""}.`,
  );
}

async function importSavedProjects(file) {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) {
    setStatus("Le fichier dépasse la limite de 1 Mo.");
    return;
  }

  let raw;
  try {
    raw = await file.text();
  } catch {
    setStatus("Le fichier de sauvegarde est illisible.");
    return;
  }
  const imported = parseProjectImport(raw);
  if (!imported.ok) {
    setStatus(imported.message);
    return;
  }

  const shouldImport = window.confirm(
    `Importer ${imported.projects.length} simulation${imported.projects.length > 1 ? "s" : ""} remplacera les ${projects.length} sauvegardes locales actuelles. Continuer ?`,
  );
  if (!shouldImport) {
    setStatus("Import annulé. Les sauvegardes locales n’ont pas été modifiées.");
    return;
  }

  const persisted = persistProjects(imported.projects);
  if (!persisted.ok) return;
  activeProjectId = null;
  comparisonBaselineId = null;
  projectNameInput.value = "";
  renderProjectList();
  refreshDirtyState();
  setStatus(
    `${projects.length} simulation${projects.length > 1 ? "s" : ""} importée${projects.length > 1 ? "s" : ""}.`,
  );
}

function deleteAllProjects() {
  if (projects.length === 0) return;
  if (!window.confirm(`Supprimer définitivement les ${projects.length} simulations sauvegardées sur cet appareil ?`)) {
    return;
  }
  const persisted = persistProjects([]);
  if (!persisted.ok) return;
  activeProjectId = null;
  comparisonBaselineId = null;
  projectNameInput.value = "";
  renderProjectList();
  refreshDirtyState();
  setStatus("Toutes les simulations sauvegardées ont été supprimées.");
}

function renderProjectList() {
  exportProjectsButton.disabled = projects.length === 0;
  deleteAllProjectsButton.disabled = projects.length === 0;
  if (projects.length === 0) {
    projectList.innerHTML = '<p class="empty-projects">Aucune simulation sauvegardée pour le moment.</p>';
    renderProjectComparison();
    return;
  }

  projectList.innerHTML = projects
    .map((project) => {
      const values = mergeWithDefaults(project.values);
      const { metrics, rating } = calculate(values);
      const displayedRating = validateValues(values).length === 0 ? rating : "À corriger";
      const updatedAt = project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("fr-FR") : "date inconnue";
      const isActive = project.id === activeProjectId;
      return `<article class="project-item${isActive ? " active" : ""}">
        <button class="project-item-main" type="button" data-project-action="load" data-project-id="${escapeHtml(project.id)}">
          <strong>${escapeHtml(project.name)}</strong>
          <span>${displayedRating} · ${money(metrics.monthlyCashFlowAfterTax)} / mois · ${updatedAt}</span>
        </button>
        <button class="project-item-delete" type="button" data-project-action="delete" data-project-id="${escapeHtml(project.id)}">Supprimer</button>
      </article>`;
    })
    .join("");
  renderProjectComparison();
}

const financingLabels = { mortgage: "Crédit", cash: "Comptant" };
const rentalTypeLabels = { furnished: "Meublé", unfurnished: "Vide" };
const taxModeLabels = {
  "lmnp-real": "LMNP réel",
  "micro-bic": "Micro-BIC",
  "micro-foncier": "Micro-foncier",
  "foncier-real": "Réel foncier",
  manual: "Impôt manuel",
};

function comparableProject(project) {
  const values = mergeWithDefaults(project.values);
  const result = calculate(values);
  const validationCount = getValidationDetails(values, result).length;
  return {
    project,
    values,
    result,
    validationCount,
    warningCount: warnings(values, result.metrics).length,
  };
}

function comparisonSortValue(item, sort) {
  if (sort === "cashflow") return item.result.metrics.monthlyCashFlowAfterTax;
  if (sort === "yield") return item.result.metrics.netYieldBeforeTax;
  if (sort === "score") return item.result.score;
  return item.project.name.toLocaleLowerCase("fr-FR");
}

function comparisonDelta(value, baselineValue, format) {
  if (!Number.isFinite(value) || !Number.isFinite(baselineValue)) return "";
  const difference = value - baselineValue;
  if (Math.abs(difference) < 0.000001) return '<small class="comparison-delta">référence</small>';
  const sign = difference > 0 ? "+" : "";
  const className = difference > 0 ? "positive" : "negative";
  return `<small class="comparison-delta ${className}">${sign}${format(difference)}</small>`;
}

function renderProjectComparison() {
  const shouldShow = projects.length >= 2;
  projectComparison.hidden = !shouldShow;
  if (!shouldShow) {
    comparisonRows.innerHTML = "";
    comparisonNote.textContent = "";
    return;
  }

  if (!projects.some((project) => project.id === comparisonBaselineId)) {
    comparisonBaselineId = projects.find((project) => project.id === activeProjectId)?.id || projects[0].id;
  }
  const items = projects.map(comparableProject);
  const baseline = items.find((item) => item.project.id === comparisonBaselineId);
  const sort = comparisonSort.value;
  items.sort((left, right) => {
    const leftValue = comparisonSortValue(left, sort);
    const rightValue = comparisonSortValue(right, sort);
    return typeof leftValue === "string"
      ? leftValue.localeCompare(rightValue, "fr-FR")
      : rightValue - leftValue || left.project.name.localeCompare(right.project.name, "fr-FR");
  });

  comparisonRows.innerHTML = items
    .map(({ project, values, result, validationCount, warningCount }) => {
      const isBaseline = project.id === comparisonBaselineId;
      const metrics = result.metrics;
      const invalidLabel =
        validationCount > 0 ? `, ${validationCount} paramètre${validationCount > 1 ? "s" : ""} à corriger` : "";
      return `<tr${isBaseline ? ' class="comparison-baseline"' : ""}>
        <td><input type="radio" name="comparison-baseline" value="${escapeHtml(project.id)}" aria-label="Utiliser ${escapeHtml(project.name)} comme référence" ${isBaseline ? "checked" : ""}></td>
        <th scope="row">${escapeHtml(project.name)}${isBaseline ? '<small class="baseline-label">Référence</small>' : ""}</th>
        <td>${money(metrics.monthlyCashFlowAfterTax)}${comparisonDelta(metrics.monthlyCashFlowAfterTax, baseline.result.metrics.monthlyCashFlowAfterTax, money)}</td>
        <td>${percent(metrics.netYieldBeforeTax)}${comparisonDelta(metrics.netYieldBeforeTax, baseline.result.metrics.netYieldBeforeTax, percent)}</td>
        <td>${money(metrics.cashInvested)}${comparisonDelta(metrics.cashInvested, baseline.result.metrics.cashInvested, money)}</td>
        <td>${validationCount > 0 ? "—" : `${Math.round(result.score)}/100 · ${result.rating}`}</td>
        <td>${warningCount}${invalidLabel}</td>
        <td>${financingLabels[values.financingMethod]} · ${rentalTypeLabels[values.rentalType]} · ${taxModeLabels[values.taxMode]}<small>${money(values.purchasePrice)} · ${money(values.monthlyRent)}/mois · ${values.vacancyDays} j vacants</small></td>
      </tr>`;
    })
    .join("");
  comparisonNote.textContent = `Écarts calculés par rapport à « ${baseline.project.name} ». Un cash investi inférieur peut être favorable : interprétez-le avec le financement et le risque.`;
}

function setSignedText(element, value, format = money) {
  element.textContent = format(value);
  element.classList.toggle("positive", value >= 0);
  element.classList.toggle("negative", value < 0);
}

function setDebtCoverageText(element, metrics) {
  element.classList.remove("positive", "caution", "negative");
  if (metrics.loanAmount <= 0) {
    element.textContent = "Sans crédit";
    return;
  }

  element.textContent = `${ratioFormatter.format(metrics.debtCoverageRatio)}×`;
  if (metrics.debtCoverageRatio > 1.2) element.classList.add("positive");
  else if (metrics.debtCoverageRatio >= 1) element.classList.add("caution");
  else element.classList.add("negative");
}

function renderMetrics(metrics) {
  const rows = [
    ["totalProjectCost", "Coût total du projet", money(metrics.totalProjectCost)],
    ["grossAnnualRent", "Loyer annuel brut", money(metrics.grossAnnualRent)],
    ["vacancyCost", "Coût de la vacance", money(metrics.vacancyCost)],
    ["effectiveAnnualRent", "Loyer annuel effectif", money(metrics.effectiveAnnualRent)],
    ["effectiveTenantCharges", "Charges récupérables effectives", money(metrics.effectiveTenantCharges)],
    ["unrecoveredCharges", "Charges récupérables non couvertes", money(metrics.unrecoveredCharges)],
    ["grossYieldPrice", "Rendement brut sur prix", percent(metrics.grossYieldPrice)],
    ["grossYieldTotalCost", "Rendement brut sur coût total", percent(metrics.grossYieldTotalCost)],
    ["annualOperatingExpenses", "Charges annuelles", money(metrics.annualOperatingExpenses)],
    ["netOperatingIncome", "Revenu net d'exploitation", `${money(metrics.netOperatingIncome)} / an`],
    ["monthlyCashFlowBeforeTax", "Cash-flow avant impôt", `${money(metrics.monthlyCashFlowBeforeTax)} / mois`],
    ["monthlyCashFlowAfterTax", "Cash-flow après impôt", `${money(metrics.monthlyCashFlowAfterTax)} / mois`],
    ["taxableProfit", `Base taxable (${metrics.taxModeLabel})`, money(metrics.taxableProfit)],
    ["estimatedTax", "Impôt annuel estimé", money(metrics.estimatedTax)],
    ["cashInvested", "Cash investi", money(metrics.cashInvested)],
    ["loanAmount", "Montant emprunté", money(metrics.loanAmount)],
    ["monthlyDebtService", "Mensualité de dette", money(metrics.monthlyDebtService)],
    ["annualInterest", "Intérêts de l'année analysée", money(metrics.annualInterest)],
    ["annualPrincipalRepaid", "Capital remboursé dans l'année", money(metrics.annualPrincipalRepaid)],
    ["loanBalanceEnd", "Capital restant dû fin d'année", money(metrics.loanBalanceEnd)],
    ["appliedDepreciation", "Amortissement fiscal utilisé", money(metrics.appliedDepreciation)],
    ["deferredDepreciation", "Amortissement non utilisé", money(metrics.deferredDepreciation)],
    [
      "debtCoverageRatio",
      "Couverture de dette",
      metrics.debtCoverageRatio > 20 ? "N/A" : metrics.debtCoverageRatio.toFixed(2),
    ],
    ["breakEvenRentBeforeTax", "Loyer d'équilibre avant impôt", `${money(metrics.breakEvenRentBeforeTax)} / mois`],
    ["breakEvenRentAfterTax", "Loyer d'équilibre après impôt", `${money(metrics.breakEvenRentAfterTax)} / mois`],
  ];

  document.querySelector("#metricsList").innerHTML = rows
    .map(
      ([key, term, value]) =>
        `<div><dt>${term}</dt><dd aria-describedby="metric-help-${key}">${value}</dd><small class="metric-helper" id="metric-help-${key}">${metricHelp[key]}</small></div>`,
    )
    .join("");
}

function renderSensitivity(values) {
  const scenarios = [
    [
      "Optimiste",
      {
        monthlyRent: values.monthlyRent * 1.05,
        vacancyDays: values.vacancyDays * 0.5,
        maintenanceReserve: values.maintenanceReserve * 0.8,
      },
    ],
    ["Base", {}],
    [
      "Stress",
      {
        monthlyRent: values.monthlyRent * 0.95,
        vacancyDays: Math.min(183, values.vacancyDays * 2),
        maintenanceReserve: values.maintenanceReserve * 1.3,
        interestRate: values.financingMethod === "mortgage" ? values.interestRate + 0.5 : values.interestRate,
      },
    ],
  ];

  document.querySelector("#sensitivityRows").innerHTML = scenarios
    .map(([name, overrides]) => {
      const result = calculate({ ...values, ...overrides });
      const cashClass = result.metrics.monthlyCashFlowAfterTax >= 0 ? "positive" : "negative";
      return `<tr>
        <td>${name}</td>
        <td class="${cashClass} has-tooltip" tabindex="0" data-tooltip="${metricHelp.monthlyCashFlowAfterTax}">${money(result.metrics.monthlyCashFlowAfterTax)}</td>
        <td class="has-tooltip" tabindex="0" data-tooltip="${metricHelp.netYieldBeforeTax}">${percent(result.metrics.netYieldBeforeTax)}</td>
        <td class="has-tooltip" tabindex="0" data-tooltip="Note qualitative issue du score financier et du score de risque.">${result.rating}</td>
      </tr>`;
    })
    .join("");
}

function renderScoreBreakdown(result) {
  document.querySelector("#financialScoreValue").textContent = `${result.financialScore}/70`;
  document.querySelector("#riskScoreValue").textContent = `${result.riskBreakdown.total}/${result.riskBreakdown.max}`;
  document.querySelector("#riskScoreExplanation").textContent =
    result.score < result.rawScore
      ? `La note brute additionne ${result.financialScore} points financiers et ${result.riskBreakdown.total} points qualitatifs, puis elle est plafonnée à ${result.score} à cause du risque réglementaire DPE.`
      : `La note finale additionne ${result.financialScore} points financiers et ${result.riskBreakdown.total} points qualitatifs. Plus cette partie est haute, plus le risque est favorable.`;
  document.querySelector("#riskScoreRows").innerHTML = result.riskBreakdown.items
    .map(
      (item) => `<div>
        <span>${escapeHtml(item.label)} <small>${escapeHtml(item.valueLabel)}</small></span>
        <strong>${item.points}/${item.max}</strong>
      </div>`,
    )
    .join("");
}

function renderEquations(values, metrics) {
  const fixedOperatingExpenses = getFixedOperatingExpenses(values);
  const variableExpenseRate = getVariableExpenseRate(values);
  const vacancyRate = vacancyRateFromDays(values.vacancyDays);
  const notaryFees = values.purchasePrice * rate(values.notaryRate);
  const annualDebtService = metrics.monthlyDebtService * 12;
  const recoverableTaxeOrdures = getRecoverableTaxeOrdures(values);

  const equations = [
    {
      title: "Coût total du projet",
      formula: "prix + frais de notaire + agence + travaux + mobilier + autres frais",
      current: `${money(values.purchasePrice)} + ${money(notaryFees)} + ${money(values.agencyFees)} + ${money(values.renovationWorks)} + ${money(values.furnitureCost)} + ${money(values.otherUpfrontCosts)} = ${money(metrics.totalProjectCost)}`,
    },
    {
      title: "Loyer annuel effectif",
      formula: "loyer mensuel x 12 x (1 - jours vacants / 365)",
      current: `${money(values.monthlyRent)} x 12 x (1 - ${values.vacancyDays} / 365) = ${money(metrics.effectiveAnnualRent)}`,
    },
    {
      title: "Charges annuelles",
      formula: "dépenses brutes + (loyers + provisions encaissés) x (gestion + GLI) - provisions et TEOM récupérées",
      current: `${money(fixedOperatingExpenses)} + (${money(metrics.effectiveAnnualRent)} + ${money(metrics.effectiveTenantCharges)}) x ${percent(variableExpenseRate)} - ${money(metrics.effectiveTenantCharges + metrics.effectiveRecoveredTaxeOrdures)} = ${money(metrics.annualOperatingExpenses)}`,
      note:
        recoverableTaxeOrdures > 0
          ? `TEOM récupérée au prorata de l'occupation : ${money(metrics.effectiveRecoveredTaxeOrdures)} sur ${money(recoverableTaxeOrdures)}.`
          : "",
    },
    {
      title: "Revenu net d'exploitation",
      formula: "loyer annuel effectif - charges annuelles",
      current: `${money(metrics.effectiveAnnualRent)} - ${money(metrics.annualOperatingExpenses)} = ${money(metrics.netOperatingIncome)}`,
    },
    {
      title: "Mensualité de crédit",
      formula: "capital x [taux mensuel x (1 + taux mensuel)^n] / [(1 + taux mensuel)^n - 1]",
      current: `${money(metrics.loanAmount)} financés sur ${values.loanDurationYears} ans à ${percent(rate(values.interestRate))}, assurance incluse = ${money(metrics.monthlyDebtService)} / mois`,
    },
    {
      title: `Amortissement du prêt — année ${values.loanYear}`,
      formula: "chaque mois : intérêts = capital restant dû x taux / 12 ; capital remboursé = échéance - intérêts",
      current: `${money(metrics.loanBalanceStart)} au début → ${money(metrics.annualInterest)} d'intérêts + ${money(metrics.annualPrincipalRepaid)} de capital remboursé → ${money(metrics.loanBalanceEnd)} restant dû`,
      note: "Les intérêts fiscaux ne sont plus approximés par capital initial × taux : ils suivent exactement les 12 échéances de l'année choisie.",
    },
    {
      title: "Cash investi",
      formula: "crédit : min(max(apport, 0), coût total) + frais bancaires ; comptant : coût total + frais bancaires",
      current:
        values.financingMethod === "cash"
          ? `${money(metrics.totalProjectCost)} + ${money(values.bankFees)} = ${money(metrics.cashInvested)}`
          : `${money(metrics.effectiveDownPayment)} + ${money(values.bankFees)} = ${money(metrics.cashInvested)}`,
      note: "En crédit, l'apport pris en compte est plafonné au coût total du projet.",
    },
    {
      title: "Rendement net avant impôt",
      formula: "revenu net d'exploitation / coût total du projet",
      current: `${money(metrics.netOperatingIncome)} / ${money(metrics.totalProjectCost)} = ${percent(metrics.netYieldBeforeTax)}`,
    },
    {
      title: "Cash-flow avant impôt",
      formula: "(revenu net d'exploitation - dette annuelle) / 12",
      current: `(${money(metrics.netOperatingIncome)} - ${money(annualDebtService)}) / 12 = ${money(metrics.monthlyCashFlowBeforeTax)} / mois`,
    },
    {
      title: "Impôt estimé",
      formula: `${metrics.taxModeLabel} : ${metrics.taxFormulaLabel}`,
      current:
        values.taxMode === "manual"
          ? `${money(values.manualAnnualTax)} saisi manuellement = ${money(metrics.estimatedTax)}`
          : `${money(metrics.taxableProfit)} x (TMI ${percent(rate(values.marginalTaxRate))} + PS ${percent(rate(metrics.appliedSocialContributionsRate))}) = ${money(metrics.estimatedTax)}`,
      note:
        values.taxMode === "lmnp-real"
          ? `Résultat avant amortissement : ${money(metrics.preDepreciationProfit)}. Amortissement utilisé : ${money(metrics.appliedDepreciation)} ; non utilisé : ${money(metrics.deferredDepreciation)}. Recettes charges comprises : ${money(metrics.taxableReceipts)}.`
          : `Recettes fiscales estimées : ${money(metrics.taxableReceipts)}. Base taxable estimée : ${money(metrics.taxableProfit)}.`,
    },
    {
      title: "Cash-flow après impôt",
      formula: "(NOI - dette annuelle - impôt estimé) / 12",
      current: `(${money(metrics.netOperatingIncome)} - ${money(annualDebtService)} - ${money(metrics.estimatedTax)}) / 12 = ${money(metrics.monthlyCashFlowAfterTax)} / mois`,
    },
    {
      title: "Loyer d'équilibre avant impôt",
      formula:
        "[dépenses fixes + dette - récupérations fixes nettes de frais] / [12 x occupation x (1 - frais variables)]",
      current: `Avec ${percent(1 - vacancyRate)} d'occupation et ${percent(variableExpenseRate)} de frais variables = ${money(metrics.breakEvenRentBeforeTax)} / mois`,
    },
    {
      title: "Loyer d'équilibre après impôt",
      formula: "résolution du loyer où cash-flow après impôt = 0",
      current: `Avec les paramètres actuels, le seuil est ${money(metrics.breakEvenRentAfterTax)} / mois.`,
      note: "Ce calcul est résolu par recherche numérique car l'impôt change quand le loyer cible change.",
    },
    {
      title: "Score de risque qualitatif",
      formula: "DPE + demande locative + état immeuble + travaux copropriété + liquidité revente",
      current: "Maximum 30 points : DPE 8, demande 8, état 6, travaux 4, liquidité 4.",
      note: "Ces points s'ajoutent au score financier sur 70 points. Un score haut signifie un risque qualitatif plus favorable.",
    },
  ];

  document.querySelector("#equationsList").innerHTML = equations
    .map(
      (equation) => `<article class="equation-item">
        <h3>${equation.title}</h3>
        <code>${equation.formula}</code>
        <p>${equation.current}</p>
        ${equation.note ? `<p>${equation.note}</p>` : ""}
      </article>`,
    )
    .join("");
}

function render({ announce = false } = {}) {
  applyContextualFields();
  const values = readValues();
  updateDisclosureSummaries(values);
  const result = calculate(values);
  const { metrics } = result;
  const validationDetails = getValidationDetails(values, result);
  const validationErrors = validationDetails.map((detail) => detail.message);
  const isValid = validationDetails.length === 0;

  document.querySelector("#ratingLabel").textContent = isValid ? result.rating : "À corriger";
  document.querySelector("#scoreValue").textContent = isValid ? Math.round(result.score) : "--";
  document.querySelector("#ratingInterpretation").textContent = isValid
    ? result.label
    : "La note est suspendue tant que les paramètres signalés ne sont pas corrigés.";
  document.querySelector("#stripRating").textContent = isValid ? result.rating : "À corriger";
  setSignedText(document.querySelector("#monthlyCashFlowAfterTax"), metrics.monthlyCashFlowAfterTax);
  setSignedText(document.querySelector("#stripCashflow"), metrics.monthlyCashFlowAfterTax);
  document.querySelector("#netYieldBeforeTax").textContent = percent(metrics.netYieldBeforeTax);
  document.querySelector("#stripYield").textContent = percent(metrics.netYieldBeforeTax);
  setSignedText(document.querySelector("#returnOnCash"), metrics.returnOnCashBeforeTax, percent);
  setDebtCoverageText(document.querySelector("#debtCoverageRatio"), metrics);
  document.querySelector("#breakEvenRentAfterTax").textContent = `${money(metrics.breakEvenRentAfterTax)} / mois`;

  renderMetrics(metrics);
  renderScoreBreakdown(result);
  renderEquations(values, metrics);
  renderSensitivity(values);
  renderFieldErrors(validationDetails);
  document.querySelector("#saveProjectButton").setAttribute("aria-disabled", String(!isValid));
  document.querySelector("#copyButton").disabled = !isValid;

  const validationPanel = document.querySelector("#validationPanel");
  validationPanel.hidden = isValid;
  document.querySelector("#validationList").innerHTML = validationErrors
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const warningItems = warnings(values, metrics);
  const warningPanel = document.querySelector("#warningsPanel");
  warningPanel.hidden = warningItems.length === 0;
  document.querySelector("#warningsList").innerHTML = warningItems.map((item) => `<li>${item}</li>`).join("");
  if (announce) {
    document.querySelector("#resultStatus").textContent = isValid
      ? `Résultat mis à jour. Note ${result.rating}, score ${Math.round(result.score)} sur 100, cash-flow après impôt ${money(metrics.monthlyCashFlowAfterTax)} par mois.`
      : `Résultat non noté. ${validationDetails.length} correction${validationDetails.length > 1 ? "s" : ""} requise${validationDetails.length > 1 ? "s" : ""}.`;
  }
}

function resetForm() {
  if (!confirmDiscard("réinitialiser les paramètres")) return;
  activeProjectId = null;
  projectNameInput.value = "";
  fields.forEach((field) => {
    const value = defaults[field.dataset.field];
    field.value = value;
  });
  render();
  renderProjectList();
  commitCurrentState();
  setStatus("Paramètres réinitialisés.");
}

async function copySummary() {
  const values = readValues();
  const result = calculate(values);
  if (getValidationDetails(values, result).length > 0) {
    document.querySelector("#copyStatus").textContent = "Corrigez les paramètres signalés avant de copier le résumé.";
    return;
  }
  const text = buildSummaryText(values, result);

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    document.querySelector("#copyStatus").textContent = "Résumé copié.";
  } catch {
    document.querySelector("#copyStatus").textContent = "Copie indisponible dans ce navigateur.";
  }
}

form.addEventListener("input", () => {
  render();
  refreshDirtyState();
});
form.addEventListener("change", () => {
  const contextualChanges = applyContextualFields();
  render({ announce: true });
  const dirty = refreshDirtyState();
  if (contextualChanges.length > 0) {
    setStatus(`${contextualChanges.join(" ")}${dirty ? " Modifications non enregistrées." : ""}`);
  }
});
helpButton.addEventListener("click", openHelpOverlay);
helpCloseButton.addEventListener("click", closeHelpOverlay);
helpOverlay.addEventListener("click", (event) => {
  if (event.target === helpOverlay) closeHelpOverlay();
});
helpOverlay.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  helpButton.focus();
});
document.querySelector("#resetButton").addEventListener("click", resetForm);
document.querySelector("#copyButton").addEventListener("click", copySummary);
document.querySelector("#saveProjectButton").addEventListener("click", saveCurrentProject);
document.querySelector("#newProjectButton").addEventListener("click", startNewProject);
exportProjectsButton.addEventListener("click", exportSavedProjects);
importProjectsButton.addEventListener("click", () => importProjectsInput.click());
importProjectsInput.addEventListener("change", async () => {
  await importSavedProjects(importProjectsInput.files?.[0]);
  importProjectsInput.value = "";
});
deleteAllProjectsButton.addEventListener("click", deleteAllProjects);
projectNameInput.addEventListener("input", () => {
  refreshDirtyState();
});
projectList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-action]");
  if (!button) return;
  const projectId = button.dataset.projectId;
  if (button.dataset.projectAction === "load") loadProject(projectId);
  if (button.dataset.projectAction === "delete") deleteProject(projectId);
});
comparisonSort.addEventListener("change", renderProjectComparison);
comparisonRows.addEventListener("change", (event) => {
  const baselineControl = event.target.closest('[name="comparison-baseline"]');
  if (!baselineControl) return;
  comparisonBaselineId = baselineControl.value;
  renderProjectComparison();
});

fields.forEach((field) => {
  const label = field.closest("label");
  const help = fieldHelp[field.dataset.field];
  if (!label || !help) return;
  const helper = document.createElement("small");
  helper.className = "field-helper";
  helper.id = `field-help-${field.dataset.field}`;
  helper.textContent = help;
  label.appendChild(helper);
  field.setAttribute("aria-describedby", helper.id);
});

window.addEventListener("beforeunload", (event) => {
  if (!hasUnsavedChanges()) return;
  event.preventDefault();
  event.returnValue = "";
});

window.addEventListener("rentaloc:before-update", (event) => {
  if (!confirmDiscard("installer la nouvelle version")) event.preventDefault();
});

[...document.querySelectorAll("[data-tooltip]")].forEach((element, index) => {
  const description = document.createElement("span");
  description.className = "sr-only";
  description.id = `tooltip-description-${index + 1}`;
  description.textContent = element.dataset.tooltip;
  element.appendChild(description);
  element.setAttribute("aria-describedby", description.id);
});

renderProjectList();
render();
commitCurrentState();
if (storedProjects.message) setStatus(storedProjects.message);
