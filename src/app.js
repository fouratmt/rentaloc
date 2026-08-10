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
const { MAX_PROJECTS, PROJECTS_STORAGE_KEY, createProjectRepository } = window.RentaLocStorage;

const form = document.querySelector("#simulatorForm");
const fields = [...document.querySelectorAll("[data-field]")];
const projectNameInput = document.querySelector("#projectName");
const projectList = document.querySelector("#projectList");
const projectStatus = document.querySelector("#projectStatus");
const helpButton = document.querySelector("#helpButton");
const helpOverlay = document.querySelector("#helpOverlay");
const helpCloseButton = document.querySelector("#helpCloseButton");
let activeProjectId = null;

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

function persistProjects() {
  const result = projectRepository.save(projects);
  projects = result.projects;
  if (!result.ok || result.message) setStatus(result.message);
  return result.ok;
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
  tenantCharges: "Provisions mensuelles refacturées au locataire, hors TEOM. Elles compensent les dépenses récupérables selon l'occupation.",
  vacancyDays: "Nombre estimé de jours par an sans locataire ou sans loyer encaissé.",
  recoverableOperatingExpenses: "Dépenses récupérables annuelles payées par le bailleur, hors TEOM. La vacance laisse une partie à sa charge.",
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
  loanYear: "Année du tableau d'amortissement utilisée pour calculer précisément intérêts, capital remboursé et solde du prêt.",
  rentalType: "Une location vide relève des revenus fonciers ; une location meublée relève en principe des BIC.",
  rentalUse: "Le seuil et l'abattement micro-BIC diffèrent pour un meublé de tourisme non classé.",
  taxMode: "Régime fiscal utilisé pour estimer la base taxable.",
  marginalTaxRate: "Taux marginal d'imposition utilisé dans le calcul fiscal simplifié.",
  socialContributionsRate: "Taux de prélèvements sociaux utilisé en mode manuel. Les autres régimes appliquent le taux 2026 correspondant.",
  depreciationDeduction: "Montant annuel estimé de déduction, par exemple amortissement LMNP réel. Ignoré en régime micro.",
  deductibleReserveExpenses: "Part des réserves d'entretien/relocation réellement dépensée et fiscalement déductible cette année. Une simple provision de trésorerie n'est pas déduite.",
  otherHouseholdRentalReceipts: "Autres recettes locatives brutes du foyer relevant de la même catégorie, utilisées pour vérifier les seuils de régime.",
  priorYearGrossRentalReceipts: "Recettes meublées brutes de tout le foyer en 2025. Avec 2024, elles déterminent l'éligibilité micro-BIC des revenus 2026 à partir de la troisième année d'activité.",
  twoYearsAgoGrossRentalReceipts: "Recettes meublées brutes de tout le foyer en 2024. Deux dépassements consécutifs en 2024 et 2025 excluent le micro-BIC pour 2026.",
  householdActivityIncome: "Autres revenus professionnels nets du foyer, nécessaires pour repérer un possible passage de LMNP à LMP.",
  rentalActivityYear: "Année d'activité de location meublée. La première année bénéficie en principe de l'exonération de CFE liée à la création.",
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
  effectiveTenantCharges: "Charges récupérables estimées après vacance, exclues des rendements mais incluses dans certaines bases fiscales.",
  unrecoveredCharges: "Part des dépenses récupérables et de la TEOM restant au bailleur à cause de la vacance ou d'une provision insuffisante.",
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
  annualInterest: "Intérêts réellement payés pendant l'année du prêt sélectionnée, issus du tableau d'amortissement mensuel.",
  annualPrincipalRepaid: "Capital remboursé pendant l'année sélectionnée ; il augmente votre patrimoine mais n'entre pas dans le cash-flow.",
  loanBalanceEnd: "Capital restant dû à la fin de l'année de prêt sélectionnée.",
  debtCoverageRatio: "Rapport entre revenu net d'exploitation et dette annuelle. Au-dessus de 1, le bien couvre la dette.",
  breakEvenRentBeforeTax: "Loyer mensuel nécessaire pour atteindre un cash-flow avant impôt égal à zéro.",
  breakEvenRentAfterTax: "Loyer mensuel nécessaire pour atteindre un cash-flow après impôt estimé égal à zéro.",
  appliedDepreciation: "Amortissement utilisé cette année, plafonné pour ne pas créer de déficit LMNP.",
  deferredDepreciation: "Amortissement non utilisé cette année, à suivre séparément comme report potentiel.",
};

function readValues() {
  return fields.reduce((values, field) => {
    const key = field.dataset.field;
    values[key] = field.tagName === "SELECT" ? field.value : Number(field.value || 0);
    return values;
  }, {});
}

function setFormValues(values) {
  const nextValues = mergeWithDefaults(values);
  fields.forEach((field) => {
    const value = nextValues[field.dataset.field];
    if (value !== undefined) field.value = value;
  });
}

function projectNameOrDefault() {
  const requestedName = projectNameInput.value.trim();
  return requestedName || `Projet ${projects.length + 1}`;
}

function getValidationDetails(values, result = calculate(values)) {
  return [...validateDetails(values), ...(result.calculationIssues || [])];
}

function renderFieldErrors(validationDetails) {
  fields.forEach((field) => {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
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
    field.setAttribute("aria-describedby", error.id);
  });
}

function focusFirstInvalid(validationDetails) {
  const firstFieldName = validationDetails.find((detail) => detail.field)?.field;
  const firstField = fields.find((field) => field.dataset.field === firstFieldName);
  if (firstField) {
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

  if (existingIndex >= 0) {
    projects[existingIndex] = {
      ...projects[existingIndex],
      name,
      values,
      updatedAt: now,
    };
    setStatus("Simulation mise à jour.");
  } else {
    const project = {
      id: createId(),
      name,
      values,
      createdAt: now,
      updatedAt: now,
    };
    projects = [project, ...projects].slice(0, MAX_PROJECTS);
    activeProjectId = project.id;
    setStatus("Simulation enregistrée.");
  }

  projectNameInput.value = name;
  persistProjects();
  renderProjectList();
}

function startNewProject() {
  activeProjectId = null;
  projectNameInput.value = "";
  setFormValues(defaults);
  render();
  renderProjectList();
  setStatus("Nouvelle simulation prête.");
}

function loadProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  activeProjectId = project.id;
  projectNameInput.value = project.name;
  setFormValues(project.values);
  render();
  renderProjectList();
  setStatus(`Simulation chargée : ${project.name}.`);
}

function deleteProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  const shouldDelete = window.confirm(`Supprimer la simulation "${project.name}" ?`);
  if (!shouldDelete) return;
  projects = projects.filter((item) => item.id !== projectId);
  if (activeProjectId === projectId) {
    activeProjectId = null;
    projectNameInput.value = "";
  }
  persistProjects();
  renderProjectList();
  setStatus("Simulation supprimée.");
}

function renderProjectList() {
  if (projects.length === 0) {
    projectList.innerHTML = '<p class="empty-projects">Aucune simulation sauvegardée pour le moment.</p>';
    return;
  }

  projectList.innerHTML = projects
    .map((project) => {
      const values = mergeWithDefaults(project.values);
      const { metrics, rating } = calculate(values);
      const displayedRating = validateValues(values).length === 0 ? rating : "À corriger";
      const updatedAt = project.updatedAt
        ? new Date(project.updatedAt).toLocaleDateString("fr-FR")
        : "date inconnue";
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
    ["debtCoverageRatio", "Couverture de dette", metrics.debtCoverageRatio > 20 ? "N/A" : metrics.debtCoverageRatio.toFixed(2)],
    ["breakEvenRentBeforeTax", "Loyer d'équilibre avant impôt", `${money(metrics.breakEvenRentBeforeTax)} / mois`],
    ["breakEvenRentAfterTax", "Loyer d'équilibre après impôt", `${money(metrics.breakEvenRentAfterTax)} / mois`],
  ];

  document.querySelector("#metricsList").innerHTML = rows
    .map(
      ([key, term, value]) =>
        `<div class="has-tooltip" tabindex="0" data-tooltip="${metricHelp[key]}"><dt>${term}</dt><dd>${value}</dd></div>`,
    )
    .join("");
}

function renderSensitivity(values) {
  const scenarios = [
    ["Optimiste", { monthlyRent: values.monthlyRent * 1.05, vacancyDays: values.vacancyDays * 0.5, maintenanceReserve: values.maintenanceReserve * 0.8 }],
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
      note: recoverableTaxeOrdures > 0 ? `TEOM récupérée au prorata de l'occupation : ${money(metrics.effectiveRecoveredTaxeOrdures)} sur ${money(recoverableTaxeOrdures)}.` : "",
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
      formula: "[dépenses fixes + dette - récupérations fixes nettes de frais] / [12 x occupation x (1 - frais variables)]",
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
  const values = readValues();
  const result = calculate(values);
  const { metrics } = result;
  const validationDetails = getValidationDetails(values, result);
  const validationErrors = validationDetails.map((detail) => detail.message);
  const isValid = validationDetails.length === 0;

  document.querySelector("#ratingLabel").textContent = isValid ? result.rating : "À corriger";
  document.querySelector("#scoreValue").textContent = isValid ? Math.round(result.score) : "--";
  document.querySelector("#ratingInterpretation").textContent = isValid ? result.label : "La note est suspendue tant que les paramètres signalés ne sont pas corrigés.";
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
  activeProjectId = null;
  projectNameInput.value = "";
  fields.forEach((field) => {
    const value = defaults[field.dataset.field];
    field.value = value;
  });
  render();
  renderProjectList();
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

function markUnsavedChanges() {
  if (activeProjectId) {
    setStatus("Modifications non enregistrées.");
  }
}

form.addEventListener("input", () => {
  render();
  markUnsavedChanges();
});
form.addEventListener("change", () => {
  render({ announce: true });
  markUnsavedChanges();
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
projectNameInput.addEventListener("input", () => {
  if (activeProjectId) setStatus("Nom modifié, pensez à enregistrer.");
});
projectList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-action]");
  if (!button) return;
  const projectId = button.dataset.projectId;
  if (button.dataset.projectAction === "load") loadProject(projectId);
  if (button.dataset.projectAction === "delete") deleteProject(projectId);
});

fields.forEach((field) => {
  const label = field.closest("label");
  const help = fieldHelp[field.dataset.field];
  if (!label || !help) return;
  label.classList.add("has-tooltip");
  label.dataset.tooltip = help;
});

renderProjectList();
render();
if (storedProjects.message) setStatus(storedProjects.message);
