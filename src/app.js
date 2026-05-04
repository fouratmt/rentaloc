const defaults = {
  purchasePrice: 120000,
  notaryRate: 7.5,
  agencyFees: 0,
  renovationWorks: 5000,
  furnitureCost: 3000,
  otherUpfrontCosts: 0,
  monthlyRent: 650,
  tenantCharges: 50,
  vacancyDays: 14,
  nonRecoverableCharges: 600,
  taxeFonciere: 800,
  recoverableTaxeOrdures: 0,
  landlordInsurance: 120,
  maintenanceReserve: 500,
  managementFeeRate: 0,
  gliRate: 0,
  accountingCost: 300,
  cfe: 0,
  relocationReserve: 0,
  otherAnnualCosts: 0,
  financingMethod: "mortgage",
  downPayment: 25000,
  interestRate: 3.5,
  loanDurationYears: 20,
  borrowerInsuranceRate: 0.3,
  bankFees: 1000,
  taxMode: "lmnp-real",
  marginalTaxRate: 30,
  socialContributionsRate: 18.6,
  depreciationDeduction: 2500,
  manualAnnualTax: 0,
  dpeRating: "D",
  rentalDemand: "strong",
  buildingCondition: "good",
  majorWorksRisk: "no",
  resaleLiquidity: "easy",
};

const form = document.querySelector("#simulatorForm");
const fields = [...document.querySelectorAll("[data-field]")];
const projectNameInput = document.querySelector("#projectName");
const projectList = document.querySelector("#projectList");
const projectStatus = document.querySelector("#projectStatus");
const helpButton = document.querySelector("#helpButton");
const helpOverlay = document.querySelector("#helpOverlay");
const helpCloseButton = document.querySelector("#helpCloseButton");
const projectsStorageKey = "rentaloc-projects-v1";
let activeProjectId = null;

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The app still works as a plain static page if service workers are unavailable.
    });
  });
}

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

const money = (value) => formatter.format(Number.isFinite(value) ? value : 0);
const percent = (value) => percentFormatter.format(Number.isFinite(value) ? value : 0);
const rate = (value) => value / 100;
const vacancyRateFromDays = (days) => Math.min(Math.max(days, 0), 183) / 365;
const mergeWithDefaults = (values = {}) => ({ ...defaults, ...values });

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

function loadProjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem(projectsStorageKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((project) => project && project.id && project.name && project.values)
      .map((project) => ({
        ...project,
        values: mergeWithDefaults(project.values),
      }));
  } catch {
    return [];
  }
}

function persistProjects() {
  try {
    localStorage.setItem(projectsStorageKey, JSON.stringify(projects));
  } catch {
    setStatus("Sauvegarde locale indisponible dans ce navigateur.");
  }
}

function setStatus(message) {
  projectStatus.textContent = message;
}

function openHelpOverlay() {
  helpOverlay.hidden = false;
  document.body.classList.add("modal-open");
  helpCloseButton.focus();
}

function closeHelpOverlay() {
  helpOverlay.hidden = true;
  document.body.classList.remove("modal-open");
  helpButton.focus();
}

let projects = loadProjects();

const fieldHelp = {
  purchasePrice: "Montant total du prix affiché, hors frais de notaire et hors coûts annexes.",
  notaryRate: "Taux estimé appliqué au prix d'achat pour calculer les frais d'acquisition.",
  agencyFees: "Montant total des frais d'agence à ajouter si le prix annoncé ne les inclut pas.",
  renovationWorks: "Budget total des travaux initiaux avant mise en location.",
  furnitureCost: "Budget total de mobilier et équipements, surtout utile en location meublée.",
  otherUpfrontCosts: "Montant total des frais initiaux divers : courtier, garantie, diagnostics ou dossiers.",
  monthlyRent: "Loyer mensuel hors charges utilisé pour calculer les rendements.",
  tenantCharges: "Montant mensuel des charges refacturées au locataire, affichées mais exclues du rendement.",
  vacancyDays: "Nombre estimé de jours par an sans locataire ou sans loyer encaissé.",
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
  taxMode: "Régime fiscal utilisé pour estimer la base taxable.",
  marginalTaxRate: "Taux marginal d'imposition utilisé dans le calcul fiscal simplifié.",
  socialContributionsRate: "Taux de prélèvements sociaux utilisé en mode manuel. Les autres régimes appliquent le taux 2026 correspondant.",
  depreciationDeduction: "Montant annuel estimé de déduction, par exemple amortissement LMNP réel. Ignoré en régime micro.",
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
  debtCoverageRatio: "Rapport entre revenu net d'exploitation et dette annuelle. Au-dessus de 1, le bien couvre la dette.",
  breakEvenRentBeforeTax: "Loyer mensuel nécessaire pour atteindre un cash-flow avant impôt égal à zéro.",
  breakEvenRentAfterTax: "Loyer mensuel nécessaire pour atteindre un cash-flow après impôt estimé égal à zéro.",
};

const taxModeConfigs = {
  "lmnp-real": {
    label: "LMNP réel simplifié",
    socialContributionsRate: 18.6,
  },
  "micro-bic": {
    label: "Micro-BIC",
    socialContributionsRate: 18.6,
    abatementRate: 0.5,
    minimumAbatement: 305,
  },
  "micro-foncier": {
    label: "Micro-foncier",
    socialContributionsRate: 17.2,
    abatementRate: 0.3,
    minimumAbatement: 0,
  },
  manual: {
    label: "Estimation manuelle",
    socialContributionsRate: null,
  },
};

function getTaxModeConfig(values) {
  return taxModeConfigs[values.taxMode] || taxModeConfigs["lmnp-real"];
}

function getAppliedSocialContributionsRate(values) {
  const config = getTaxModeConfig(values);
  return config.socialContributionsRate ?? values.socialContributionsRate;
}

function applyAbatement(receipts, abatementRate, minimumAbatement = 0) {
  const abatement = Math.min(receipts, Math.max(receipts * abatementRate, minimumAbatement));
  return Math.max(0, receipts - abatement);
}

function getRecoverableTaxeOrdures(values) {
  return Math.min(Math.max(values.recoverableTaxeOrdures || 0, 0), Math.max(values.taxeFonciere || 0, 0));
}

function getNetTaxeFonciere(values) {
  return Math.max(0, values.taxeFonciere - getRecoverableTaxeOrdures(values));
}

function getFixedOperatingExpenses(values) {
  return (
    values.nonRecoverableCharges +
    getNetTaxeFonciere(values) +
    values.landlordInsurance +
    values.maintenanceReserve +
    values.accountingCost +
    values.cfe +
    values.relocationReserve +
    values.otherAnnualCosts
  );
}

function getVariableExpenseRate(values) {
  return rate(values.managementFeeRate) + rate(values.gliRate);
}

function calculateTax(values, context) {
  const config = getTaxModeConfig(values);
  const appliedSocialContributionsRate = getAppliedSocialContributionsRate(values);
  const totalTaxRate = rate(values.marginalTaxRate) + rate(appliedSocialContributionsRate);
  let taxableProfit = 0;
  let taxableReceipts = context.effectiveAnnualRent;
  let formulaLabel = "";

  if (values.taxMode === "micro-bic") {
    taxableReceipts = context.effectiveAnnualRent + context.effectiveTenantCharges;
    taxableProfit = applyAbatement(taxableReceipts, config.abatementRate, config.minimumAbatement);
    formulaLabel = "recettes charges comprises - abattement Micro-BIC 50 %";
  } else if (values.taxMode === "micro-foncier") {
    taxableReceipts = context.effectiveAnnualRent;
    taxableProfit = applyAbatement(taxableReceipts, config.abatementRate, config.minimumAbatement);
    formulaLabel = "loyers hors charges - abattement micro-foncier 30 %";
  } else if (values.taxMode === "manual") {
    taxableProfit = totalTaxRate > 0 ? Math.max(0, values.manualAnnualTax) / totalTaxRate : 0;
    return {
      estimatedTax: Math.max(0, values.manualAnnualTax),
      taxableProfit,
      taxableReceipts,
      totalTaxRate,
      appliedSocialContributionsRate,
      taxModeLabel: config.label,
      formulaLabel: "impôt annuel saisi manuellement",
    };
  } else {
    taxableReceipts = context.effectiveAnnualRent + context.effectiveTenantCharges;
    taxableProfit = Math.max(
      0,
      context.netOperatingIncome - context.annualInterest - values.depreciationDeduction,
    );
    formulaLabel = "max(0, NOI - intérêts annuels - amortissement/déduction)";
  }

  return {
    estimatedTax: taxableProfit * totalTaxRate,
    taxableProfit,
    taxableReceipts,
    totalTaxRate,
    appliedSocialContributionsRate,
    taxModeLabel: config.label,
    formulaLabel,
  };
}

function findBreakEvenRentBeforeTax(values, vacancyRate, annualDebtService) {
  const rentRetentionRate = (1 - vacancyRate) * (1 - getVariableExpenseRate(values));
  if (rentRetentionRate <= 0) return Number.POSITIVE_INFINITY;
  return (getFixedOperatingExpenses(values) + annualDebtService) / (12 * rentRetentionRate);
}

function findBreakEvenRentAfterTax(values, vacancyRate, annualDebtService, annualInterest) {
  const fixedOperatingExpenses =
    getFixedOperatingExpenses(values);
  const variableExpenseRate = getVariableExpenseRate(values);

  const annualCashFlowForRent = (monthlyRent) => {
    const effectiveRent = monthlyRent * 12 * (1 - vacancyRate);
    const effectiveTenantCharges = values.tenantCharges * 12 * (1 - vacancyRate);
    const operatingExpenses = fixedOperatingExpenses + effectiveRent * variableExpenseRate;
    const noi = effectiveRent - operatingExpenses;
    const tax = calculateTax(values, {
      effectiveAnnualRent: effectiveRent,
      effectiveTenantCharges,
      netOperatingIncome: noi,
      annualInterest,
    });
    return noi - annualDebtService - tax.estimatedTax;
  };

  if (annualCashFlowForRent(0) >= 0) return 0;

  let low = 0;
  let high = Math.max(values.monthlyRent * 2, 500);
  while (annualCashFlowForRent(high) < 0 && high < 100000) {
    high *= 2;
  }

  for (let index = 0; index < 80; index += 1) {
    const mid = (low + high) / 2;
    if (annualCashFlowForRent(mid) >= 0) high = mid;
    else low = mid;
  }

  return high;
}

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

function saveCurrentProject() {
  const now = new Date().toISOString();
  const values = readValues();
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
    projects = [project, ...projects];
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
      const updatedAt = project.updatedAt
        ? new Date(project.updatedAt).toLocaleDateString("fr-FR")
        : "date inconnue";
      const isActive = project.id === activeProjectId;
      return `<article class="project-item${isActive ? " active" : ""}">
        <button class="project-item-main" type="button" data-project-action="load" data-project-id="${escapeHtml(project.id)}">
          <strong>${escapeHtml(project.name)}</strong>
          <span>${rating} · ${money(metrics.monthlyCashFlowAfterTax)} / mois · ${updatedAt}</span>
        </button>
        <button class="project-item-delete" type="button" data-project-action="delete" data-project-id="${escapeHtml(project.id)}">Supprimer</button>
      </article>`;
    })
    .join("");
}

function monthlyPayment(principal, annualRate, years) {
  const payments = years * 12;
  if (principal <= 0 || payments <= 0) return 0;
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / payments;
  const factor = Math.pow(1 + monthlyRate, payments);
  return (principal * monthlyRate * factor) / (factor - 1);
}

const riskScoreDefinitions = [
  {
    key: "dpeRating",
    label: "DPE",
    max: 8,
    scores: { A: 8, B: 8, C: 8, D: 6, E: 3, F: 0, G: 0 },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E", F: "F", G: "G" },
  },
  {
    key: "rentalDemand",
    label: "Demande locative",
    max: 8,
    scores: { strong: 8, medium: 4, weak: 0 },
    labels: { strong: "Forte", medium: "Moyenne", weak: "Faible" },
  },
  {
    key: "buildingCondition",
    label: "État de l'immeuble",
    max: 6,
    scores: { good: 6, average: 3, risky: 0 },
    labels: { good: "Bon", average: "Moyen", risky: "Risque" },
  },
  {
    key: "majorWorksRisk",
    label: "Travaux de copropriété",
    max: 4,
    scores: { no: 4, uncertain: 2, yes: 0 },
    labels: { no: "Non", uncertain: "Incertain", yes: "Oui" },
  },
  {
    key: "resaleLiquidity",
    label: "Liquidité revente",
    max: 4,
    scores: { easy: 4, normal: 2, hard: 0 },
    labels: { easy: "Facile", normal: "Normale", hard: "Difficile" },
  },
];

function scoreFinancial(metrics) {
  let score = 0;
  if (metrics.netYieldBeforeTax > 0.055) score += 25;
  else if (metrics.netYieldBeforeTax >= 0.045) score += 18;
  else if (metrics.netYieldBeforeTax >= 0.035) score += 10;
  else score += 3;

  if (metrics.monthlyCashFlowAfterTax >= 0) score += 20;
  else if (metrics.monthlyCashFlowAfterTax >= -100) score += 14;
  else if (metrics.monthlyCashFlowAfterTax >= -250) score += 7;

  if (metrics.debtCoverageRatio > 1.2) score += 10;
  else if (metrics.debtCoverageRatio >= 1) score += 7;
  else if (metrics.debtCoverageRatio >= 0.8) score += 4;

  if (metrics.grossYieldTotalCost > 0.07) score += 10;
  else if (metrics.grossYieldTotalCost >= 0.06) score += 7;
  else if (metrics.grossYieldTotalCost >= 0.05) score += 4;
  else score += 1;

  if (metrics.cashInvested <= metrics.totalProjectCost * 0.2) score += 5;
  else if (metrics.cashInvested <= metrics.totalProjectCost * 0.35) score += 3;

  return score;
}

function scoreRiskBreakdown(values) {
  const items = riskScoreDefinitions.map((definition) => {
    const value = values[definition.key];
    const points = definition.scores[value] ?? 0;
    return {
      key: definition.key,
      label: definition.label,
      valueLabel: definition.labels[value] ?? "Non renseigné",
      points,
      max: definition.max,
    };
  });

  return {
    items,
    total: items.reduce((sum, item) => sum + item.points, 0),
    max: items.reduce((sum, item) => sum + item.max, 0),
  };
}

function scoreRisk(values) {
  return scoreRiskBreakdown(values).total;
}

function ratingFromScore(score) {
  if (score >= 85) return ["Excellent", "Candidat solide"];
  if (score >= 70) return ["Bon", "À analyser plus en détail"];
  if (score >= 55) return ["Moyen", "Avancer avec prudence"];
  if (score >= 40) return ["Risque", "Marge de sécurité faible"];
  return ["Mauvais", "Probablement à éviter"];
}

function applyRegulatoryScoreCap(values, score) {
  if (values.dpeRating === "G") return Math.min(score, 39);
  if (values.dpeRating === "F") return Math.min(score, 54);
  return score;
}

function calculate(values) {
  const notaryFees = values.purchasePrice * rate(values.notaryRate);
  const totalProjectCost =
    values.purchasePrice +
    notaryFees +
    values.agencyFees +
    values.renovationWorks +
    values.furnitureCost +
    values.otherUpfrontCosts;
  const grossAnnualRent = values.monthlyRent * 12;
  const vacancyRate = vacancyRateFromDays(values.vacancyDays);
  const vacancyCost = grossAnnualRent * vacancyRate;
  const effectiveAnnualRent = grossAnnualRent - vacancyCost;
  const effectiveTenantCharges = values.tenantCharges * 12 * (1 - vacancyRate);
  const managementFee = effectiveAnnualRent * rate(values.managementFeeRate);
  const unpaidRentInsurance = effectiveAnnualRent * rate(values.gliRate);
  const netTaxeFonciere = getNetTaxeFonciere(values);
  const annualOperatingExpenses =
    values.nonRecoverableCharges +
    netTaxeFonciere +
    values.landlordInsurance +
    values.maintenanceReserve +
    managementFee +
    unpaidRentInsurance +
    values.accountingCost +
    values.cfe +
    values.relocationReserve +
    values.otherAnnualCosts;
  const netOperatingIncome = effectiveAnnualRent - annualOperatingExpenses;
  const cashPurchase = values.financingMethod === "cash";
  const effectiveDownPayment = Math.min(Math.max(values.downPayment, 0), totalProjectCost);
  const loanAmount = cashPurchase ? 0 : Math.max(0, totalProjectCost - effectiveDownPayment);
  const loanPayment = monthlyPayment(loanAmount, rate(values.interestRate), values.loanDurationYears);
  const borrowerInsurance = cashPurchase ? 0 : (loanAmount * rate(values.borrowerInsuranceRate)) / 12;
  const monthlyDebtService = loanPayment + borrowerInsurance;
  const annualDebtService = monthlyDebtService * 12;
  const annualInterest = loanAmount * rate(values.interestRate);
  const tax = calculateTax(values, {
    effectiveAnnualRent,
    effectiveTenantCharges,
    netOperatingIncome,
    annualInterest,
  });
  const estimatedTax = tax.estimatedTax;
  const annualCashFlowBeforeTax = netOperatingIncome - annualDebtService;
  const annualCashFlowAfterTax = annualCashFlowBeforeTax - estimatedTax;
  const breakEvenRentBeforeTax = findBreakEvenRentBeforeTax(values, vacancyRate, annualDebtService);
  const breakEvenRentAfterTax = findBreakEvenRentAfterTax(
    values,
    vacancyRate,
    annualDebtService,
    annualInterest,
  );
  const cashInvested = cashPurchase ? totalProjectCost + values.bankFees : effectiveDownPayment + values.bankFees;

  const metrics = {
    totalProjectCost,
    grossAnnualRent,
    vacancyCost,
    effectiveAnnualRent,
    effectiveTenantCharges,
    grossYieldPrice: grossAnnualRent / values.purchasePrice,
    grossYieldTotalCost: grossAnnualRent / totalProjectCost,
    annualOperatingExpenses,
    netOperatingIncome,
    netYieldBeforeTax: netOperatingIncome / totalProjectCost,
    netYieldAfterTax: (netOperatingIncome - estimatedTax) / totalProjectCost,
    monthlyCashFlowBeforeTax: annualCashFlowBeforeTax / 12,
    monthlyCashFlowAfterTax: annualCashFlowAfterTax / 12,
    cashInvested,
    returnOnCashBeforeTax: annualCashFlowBeforeTax / Math.max(1, cashInvested),
    debtCoverageRatio: annualDebtService > 0 ? netOperatingIncome / annualDebtService : 99,
    breakEvenRentBeforeTax,
    breakEvenRentAfterTax,
    estimatedTax,
    taxableProfit: tax.taxableProfit,
    taxableReceipts: tax.taxableReceipts,
    totalTaxRate: tax.totalTaxRate,
    appliedSocialContributionsRate: tax.appliedSocialContributionsRate,
    taxModeLabel: tax.taxModeLabel,
    taxFormulaLabel: tax.formulaLabel,
    loanAmount,
    monthlyDebtService,
    effectiveDownPayment,
    netTaxeFonciere,
  };

  const financialScore = scoreFinancial(metrics);
  const riskBreakdown = scoreRiskBreakdown(values);
  const rawScore = Math.min(100, financialScore + riskBreakdown.total);
  const score = applyRegulatoryScoreCap(values, rawScore);
  const [rating, label] = ratingFromScore(score);
  return { metrics, score, rawScore, financialScore, riskBreakdown, rating, label };
}

function warnings(values, metrics) {
  const list = [];
  if (values.dpeRating === "G") {
    list.push("DPE G : location interdite depuis le 1er janvier 2025 pour les baux signés, renouvelés ou reconduits.");
  } else if (values.dpeRating === "F") {
    list.push("DPE F : interdiction de location à partir du 1er janvier 2028, travaux à budgéter.");
  } else if (values.dpeRating === "E") {
    list.push("DPE E : interdiction de location prévue à partir du 1er janvier 2034, risque long terme.");
  }
  if (metrics.monthlyCashFlowAfterTax < -300) list.push("Cash-flow après impôt inférieur à -300 EUR par mois.");
  if (metrics.netYieldBeforeTax < 0.03) list.push("Rendement net avant impôt inférieur à 3 %.");
  if (values.vacancyDays < 8) list.push("Vacance locative inférieure à 8 jours par an : hypothèse potentiellement optimiste.");
  if (values.maintenanceReserve === 0) list.push("Réserve d'entretien nulle : risque de sous-estimer les coûts.");
  if (values.taxeFonciere === 0) list.push("Taxe foncière absente : vérifiez l'hypothèse.");
  if (values.taxeFonciere > 0 && values.recoverableTaxeOrdures === 0) {
    list.push("TEOM récupérable non renseignée : si elle est incluse dans la taxe foncière, les charges propriétaire peuvent être surestimées.");
  }
  if (values.recoverableTaxeOrdures > values.taxeFonciere) {
    list.push("TEOM récupérable supérieure à la taxe foncière : le calcul la plafonne au montant de taxe foncière.");
  }
  if (["lmnp-real", "micro-bic"].includes(values.taxMode) && values.cfe === 0) {
    list.push("CFE non renseignée en location meublée : vérifiez si une cotisation annuelle s'applique.");
  }
  if (values.taxMode === "manual" && values.manualAnnualTax === 0) {
    list.push("Fiscalité manuelle à 0 EUR : vérifiez que l'impôt annuel attendu est bien nul.");
  }
  if (values.purchasePrice > metrics.grossAnnualRent * 20) list.push("Prix supérieur à 20 années de loyer.");
  if (values.financingMethod === "mortgage" && values.downPayment > metrics.totalProjectCost) {
    list.push("Apport supérieur au coût du projet : le calcul le plafonne au coût total hors frais bancaires.");
  }
  return list;
}

function setSignedText(element, value, format = money) {
  element.textContent = format(value);
  element.classList.toggle("positive", value >= 0);
  element.classList.toggle("negative", value < 0);
}

function renderMetrics(metrics) {
  const rows = [
    ["totalProjectCost", "Coût total du projet", money(metrics.totalProjectCost)],
    ["grossAnnualRent", "Loyer annuel brut", money(metrics.grossAnnualRent)],
    ["vacancyCost", "Coût de la vacance", money(metrics.vacancyCost)],
    ["effectiveAnnualRent", "Loyer annuel effectif", money(metrics.effectiveAnnualRent)],
    ["effectiveTenantCharges", "Charges récupérables effectives", money(metrics.effectiveTenantCharges)],
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
  const annualInterest = metrics.loanAmount * rate(values.interestRate);
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
      formula: "charges fixes nettes de TEOM récupérable + loyer effectif x (gestion + GLI)",
      current: `${money(fixedOperatingExpenses)} + ${money(metrics.effectiveAnnualRent)} x ${percent(variableExpenseRate)} = ${money(metrics.annualOperatingExpenses)}`,
      note: recoverableTaxeOrdures > 0 ? `TEOM récupérable déduite de la taxe foncière : ${money(recoverableTaxeOrdures)}.` : "",
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
          ? `Base taxable estimée : ${money(metrics.netOperatingIncome)} - ${money(annualInterest)} - ${money(values.depreciationDeduction)} = ${money(metrics.taxableProfit)}. Les recettes charges comprises estimées sont ${money(metrics.taxableReceipts)}.`
          : `Recettes fiscales estimées : ${money(metrics.taxableReceipts)}. Base taxable estimée : ${money(metrics.taxableProfit)}.`,
    },
    {
      title: "Cash-flow après impôt",
      formula: "(NOI - dette annuelle - impôt estimé) / 12",
      current: `(${money(metrics.netOperatingIncome)} - ${money(annualDebtService)} - ${money(metrics.estimatedTax)}) / 12 = ${money(metrics.monthlyCashFlowAfterTax)} / mois`,
    },
    {
      title: "Loyer d'équilibre avant impôt",
      formula: "(charges fixes + dette annuelle) / [12 x (1 - vacance) x (1 - frais variables)]",
      current: `(${money(fixedOperatingExpenses)} + ${money(annualDebtService)}) / [12 x ${percent(1 - vacancyRate)} x ${percent(1 - variableExpenseRate)}] = ${money(metrics.breakEvenRentBeforeTax)} / mois`,
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

function render() {
  const values = readValues();
  const result = calculate(values);
  const { metrics } = result;

  document.querySelector("#ratingLabel").textContent = result.rating;
  document.querySelector("#scoreValue").textContent = Math.round(result.score);
  document.querySelector("#ratingInterpretation").textContent = result.label;
  document.querySelector("#stripRating").textContent = result.rating;
  setSignedText(document.querySelector("#monthlyCashFlowAfterTax"), metrics.monthlyCashFlowAfterTax);
  setSignedText(document.querySelector("#stripCashflow"), metrics.monthlyCashFlowAfterTax);
  document.querySelector("#netYieldBeforeTax").textContent = percent(metrics.netYieldBeforeTax);
  document.querySelector("#stripYield").textContent = percent(metrics.netYieldBeforeTax);
  setSignedText(document.querySelector("#returnOnCash"), metrics.returnOnCashBeforeTax, percent);
  document.querySelector("#breakEvenRentAfterTax").textContent = `${money(metrics.breakEvenRentAfterTax)} / mois`;

  renderMetrics(metrics);
  renderScoreBreakdown(result);
  renderEquations(values, metrics);
  renderSensitivity(values);

  const warningItems = warnings(values, metrics);
  const warningPanel = document.querySelector("#warningsPanel");
  warningPanel.hidden = warningItems.length === 0;
  document.querySelector("#warningsList").innerHTML = warningItems.map((item) => `<li>${item}</li>`).join("");
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
  const { metrics, rating } = calculate(values);
  const text = [
    "Résumé RentaLoc du projet locatif",
    `Prix d'achat : ${money(values.purchasePrice)}`,
    `Coût total : ${money(metrics.totalProjectCost)}`,
    `Loyer mensuel : ${money(values.monthlyRent)}`,
    `Vacance locative : ${values.vacancyDays} jours/an`,
    `Rendement brut : ${percent(metrics.grossYieldTotalCost)}`,
    `Rendement net avant impôt : ${percent(metrics.netYieldBeforeTax)}`,
    `Cash-flow après impôt : ${money(metrics.monthlyCashFlowAfterTax)} / mois`,
    `Loyer d'équilibre cash-flow 0 : ${money(metrics.breakEvenRentAfterTax)} / mois`,
    `Cash investi : ${money(metrics.cashInvested)}`,
    `Note finale : ${rating}`,
  ].join("\n");

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

function handleFormChange() {
  render();
  if (activeProjectId) {
    setStatus("Modifications non enregistrées.");
  }
}

form.addEventListener("input", handleFormChange);
form.addEventListener("change", handleFormChange);
helpButton.addEventListener("click", openHelpOverlay);
helpCloseButton.addEventListener("click", closeHelpOverlay);
helpOverlay.addEventListener("click", (event) => {
  if (event.target === helpOverlay) closeHelpOverlay();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !helpOverlay.hidden) closeHelpOverlay();
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
