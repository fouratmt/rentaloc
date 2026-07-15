const defaults = {
  purchasePrice: 120000,
  notaryRate: 8,
  agencyFees: 0,
  renovationWorks: 5000,
  furnitureCost: 3000,
  otherUpfrontCosts: 0,
  monthlyRent: 650,
  tenantCharges: 50,
  vacancyDays: 14,
  recoverableOperatingExpenses: 600,
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
  loanYear: 1,
  rentalType: "furnished",
  rentalUse: "long-term",
  taxMode: "lmnp-real",
  marginalTaxRate: 30,
  socialContributionsRate: 18.6,
  depreciationDeduction: 2500,
  deductibleReserveExpenses: 0,
  otherHouseholdRentalReceipts: 0,
  householdActivityIncome: 0,
  rentalActivityYear: 1,
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
const installButton = document.querySelector("#installButton");
const installOverlay = document.querySelector("#installOverlay");
const installCloseButton = document.querySelector("#installCloseButton");
const installInstructions = document.querySelector("#installInstructions");
const projectsStorageKey = "rentaloc-projects-v1";
let activeProjectId = null;
let deferredInstallPrompt = null;

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./", updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
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
const safeDivide = (numerator, denominator) =>
  Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : 0;
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

function isInstalledApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function setInstallButtonVisibility() {
  const shouldShow = !isInstalledApp();
  installButton.hidden = !shouldShow;
  document.body.classList.toggle("install-available", shouldShow);
}

function updateInstallInstructions() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isAppleMobile =
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isSafari = userAgent.includes("safari") && !userAgent.includes("chrome") && !userAgent.includes("chromium");

  if (isAppleMobile) {
    installInstructions.textContent =
      "Touchez le bouton Partager de votre navigateur, puis choisissez « Sur l'écran d'accueil » et confirmez avec « Ajouter ».";
  } else if (isSafari) {
    installInstructions.textContent =
      "Dans Safari, ouvrez le menu Fichier puis choisissez « Ajouter au Dock ». Sur iPhone ou iPad, utilisez Partager puis « Sur l'écran d'accueil ».";
  } else {
    installInstructions.textContent =
      "Ouvrez le menu de votre navigateur, puis choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ». Chrome et Edge affichent aussi une icône d'installation dans la barre d'adresse.";
  }
}

function openInstallOverlay() {
  updateInstallInstructions();
  installOverlay.hidden = false;
  document.body.classList.add("modal-open");
  installCloseButton.focus();
}

function closeInstallOverlay() {
  installOverlay.hidden = true;
  document.body.classList.remove("modal-open");
  installButton.focus();
}

async function requestInstall() {
  if (!deferredInstallPrompt) {
    openInstallOverlay();
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
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
  "foncier-real": {
    label: "Régime réel foncier simplifié",
    socialContributionsRate: 17.2,
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

function getMicroBicRules(values) {
  if (values.rentalUse === "tourist-unclassified") {
    return {
      threshold: 15000,
      abatementRate: 0.3,
      minimumAbatement: 305,
      label: "meublé de tourisme non classé",
    };
  }
  return {
    threshold: 77700,
    abatementRate: 0.5,
    minimumAbatement: 305,
    label: values.rentalUse === "tourist-classified" ? "meublé de tourisme classé" : "location meublée longue durée",
  };
}

function applyAbatement(receipts, abatementRate, minimumAbatement = 0) {
  const abatement = Math.min(receipts, Math.max(receipts * abatementRate, minimumAbatement));
  return Math.max(0, receipts - abatement);
}

function getRecoverableTaxeOrdures(values) {
  return Math.min(Math.max(values.recoverableTaxeOrdures || 0, 0), Math.max(values.taxeFonciere || 0, 0));
}

function getEffectiveRecoveredTaxeOrdures(values, vacancyRate) {
  return getRecoverableTaxeOrdures(values) * (1 - vacancyRate);
}

function getEffectiveTenantCharges(values, vacancyRate) {
  const occupiedShareOfExpenses = values.recoverableOperatingExpenses * (1 - vacancyRate);
  const provisionsCollected = values.tenantCharges * 12 * (1 - vacancyRate);
  return Math.min(Math.max(0, provisionsCollected), Math.max(0, occupiedShareOfExpenses));
}

function getFixedOperatingExpenses(values) {
  return (
    values.nonRecoverableCharges +
    values.recoverableOperatingExpenses +
    values.taxeFonciere +
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

function getOperatingContext(values, monthlyRent, vacancyRate) {
  const grossAnnualRent = monthlyRent * 12;
  const effectiveAnnualRent = grossAnnualRent * (1 - vacancyRate);
  const effectiveTenantCharges = getEffectiveTenantCharges(values, vacancyRate);
  const effectiveRecoveredTaxeOrdures = getEffectiveRecoveredTaxeOrdures(values, vacancyRate);
  const feeBaseReceipts = effectiveAnnualRent + effectiveTenantCharges;
  const managementFee = feeBaseReceipts * rate(values.managementFeeRate);
  const unpaidRentInsurance = feeBaseReceipts * rate(values.gliRate);
  const grossOperatingExpenses = getFixedOperatingExpenses(values) + managementFee + unpaidRentInsurance;
  const recoveries = effectiveTenantCharges + effectiveRecoveredTaxeOrdures;
  const annualOperatingExpenses = grossOperatingExpenses - recoveries;
  const netOperatingIncome = effectiveAnnualRent - annualOperatingExpenses;
  const recoverableCosts = values.recoverableOperatingExpenses + getRecoverableTaxeOrdures(values);
  const unrecoveredCharges = Math.max(0, recoverableCosts - recoveries);

  return {
    grossAnnualRent,
    effectiveAnnualRent,
    effectiveTenantCharges,
    effectiveRecoveredTaxeOrdures,
    feeBaseReceipts,
    managementFee,
    unpaidRentInsurance,
    grossOperatingExpenses,
    recoveries,
    annualOperatingExpenses,
    netOperatingIncome,
    unrecoveredCharges,
  };
}

function getDeductibleReserveExpenses(values) {
  return Math.min(
    Math.max(0, values.deductibleReserveExpenses),
    Math.max(0, values.maintenanceReserve + values.relocationReserve),
  );
}

function calculateTax(values, context) {
  const config = getTaxModeConfig(values);
  const appliedSocialContributionsRate = getAppliedSocialContributionsRate(values);
  const totalTaxRate = rate(values.marginalTaxRate) + rate(appliedSocialContributionsRate);
  let taxableProfit = 0;
  let taxableReceipts = context.effectiveAnnualRent;
  let formulaLabel = "";
  let preDepreciationProfit = 0;
  let appliedDepreciation = 0;
  let deferredDepreciation = 0;
  let operatingLoss = 0;

  if (values.taxMode === "micro-bic") {
    const rules = getMicroBicRules(values);
    taxableReceipts = context.effectiveAnnualRent + context.effectiveTenantCharges + context.effectiveRecoveredTaxeOrdures;
    taxableProfit = applyAbatement(taxableReceipts, rules.abatementRate, rules.minimumAbatement);
    formulaLabel = `recettes charges comprises - abattement Micro-BIC ${rules.abatementRate * 100} %`;
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
      preDepreciationProfit: taxableProfit,
      appliedDepreciation,
      deferredDepreciation,
      operatingLoss,
    };
  } else if (values.taxMode === "foncier-real") {
    taxableReceipts = context.effectiveAnnualRent;
    const deductibleExpenses =
      values.nonRecoverableCharges +
      Math.max(0, values.recoverableOperatingExpenses - context.effectiveTenantCharges) +
      Math.max(0, values.taxeFonciere - context.effectiveRecoveredTaxeOrdures) +
      values.landlordInsurance +
      context.managementFee +
      context.unpaidRentInsurance +
      values.accountingCost +
      values.otherAnnualCosts +
      getDeductibleReserveExpenses(values) +
      context.annualInterest +
      context.annualBorrowerInsurance +
      context.deductibleLoanFees;
    preDepreciationProfit = taxableReceipts - deductibleExpenses;
    taxableProfit = Math.max(0, preDepreciationProfit);
    operatingLoss = Math.max(0, -preDepreciationProfit);
    formulaLabel = "loyers hors charges - dépenses réellement déductibles - intérêts et assurance du prêt";
  } else {
    taxableReceipts = context.effectiveAnnualRent + context.effectiveTenantCharges + context.effectiveRecoveredTaxeOrdures;
    const deductibleExpenses =
      values.nonRecoverableCharges +
      values.recoverableOperatingExpenses +
      values.taxeFonciere +
      values.landlordInsurance +
      context.managementFee +
      context.unpaidRentInsurance +
      values.accountingCost +
      values.cfe +
      values.otherAnnualCosts +
      getDeductibleReserveExpenses(values) +
      context.annualInterest +
      context.annualBorrowerInsurance +
      context.deductibleLoanFees;
    preDepreciationProfit = taxableReceipts - deductibleExpenses;
    appliedDepreciation = Math.min(values.depreciationDeduction, Math.max(0, preDepreciationProfit));
    deferredDepreciation = Math.max(0, values.depreciationDeduction - appliedDepreciation);
    operatingLoss = Math.max(0, -preDepreciationProfit);
    taxableProfit = Math.max(0, preDepreciationProfit - appliedDepreciation);
    formulaLabel = "recettes charges comprises - dépenses réelles - intérêts/assurance - amortissement plafonné";
  }

  return {
    estimatedTax: taxableProfit * totalTaxRate,
    taxableProfit,
    taxableReceipts,
    totalTaxRate,
    appliedSocialContributionsRate,
    taxModeLabel: config.label,
    formulaLabel,
    preDepreciationProfit,
    appliedDepreciation,
    deferredDepreciation,
    operatingLoss,
  };
}

function findBreakEvenRentBeforeTax(values, vacancyRate, annualDebtService) {
  const variableExpenseRate = getVariableExpenseRate(values);
  const rentRetentionRate = (1 - vacancyRate) * (1 - variableExpenseRate);
  if (rentRetentionRate <= 0) return Number.POSITIVE_INFINITY;
  const fixedRecoveries =
    getEffectiveTenantCharges(values, vacancyRate) * (1 - variableExpenseRate) +
    getEffectiveRecoveredTaxeOrdures(values, vacancyRate);
  return Math.max(0, (getFixedOperatingExpenses(values) + annualDebtService - fixedRecoveries) / (12 * rentRetentionRate));
}

function findBreakEvenRentAfterTax(values, vacancyRate, annualDebtService, loanContext) {
  const annualCashFlowForRent = (monthlyRent) => {
    const operating = getOperatingContext(values, monthlyRent, vacancyRate);
    const tax = calculateTax(values, { ...operating, ...loanContext });
    return operating.netOperatingIncome - annualDebtService - tax.estimatedTax;
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
  const validationErrors = validateValues(values);
  if (validationErrors.length > 0) {
    setStatus("Corrigez les paramètres signalés avant d'enregistrer.");
    document.querySelector("#validationPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
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

function monthlyPayment(principal, annualRate, years) {
  const payments = years * 12;
  if (principal <= 0 || payments <= 0) return 0;
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / payments;
  const factor = Math.pow(1 + monthlyRate, payments);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function loanYearSummary(principal, annualRate, years, requestedYear) {
  const totalMonths = Math.max(0, Math.round(years * 12));
  const year = Math.min(Math.max(1, Math.floor(requestedYear || 1)), Math.max(1, Math.ceil(totalMonths / 12)));
  const payment = monthlyPayment(principal, annualRate, years);
  const monthlyRate = annualRate / 12;
  let balance = Math.max(0, principal);
  let balanceStart = balance;
  let interest = 0;
  let principalRepaid = 0;
  const firstMonth = (year - 1) * 12;
  const lastMonth = Math.min(year * 12, totalMonths);

  for (let month = 0; month < totalMonths && balance > 0; month += 1) {
    if (month === firstMonth) balanceStart = balance;
    const interestPart = balance * monthlyRate;
    const principalPart = Math.min(balance, Math.max(0, payment - interestPart));
    if (month >= firstMonth && month < lastMonth) {
      interest += interestPart;
      principalRepaid += principalPart;
    }
    balance = Math.max(0, balance - principalPart);
  }

  return {
    year,
    balanceStart,
    balanceEnd: Math.max(0, balanceStart - principalRepaid),
    interest,
    principalRepaid,
    payment,
  };
}

function estimateTaxReceipts(values) {
  const operating = getOperatingContext(values, values.monthlyRent, vacancyRateFromDays(values.vacancyDays));
  return values.rentalType === "furnished"
    ? operating.effectiveAnnualRent + operating.effectiveTenantCharges + operating.effectiveRecoveredTaxeOrdures
    : operating.effectiveAnnualRent;
}

function validateValues(values) {
  const errors = [];
  const requiredPositive = [
    ["purchasePrice", "Le prix d'achat doit être supérieur à 0 €."],
    ["monthlyRent", "Le loyer mensuel doit être supérieur à 0 €."],
  ];
  requiredPositive.forEach(([key, message]) => {
    if (!Number.isFinite(values[key]) || values[key] <= 0) errors.push(message);
  });

  const nonNegativeKeys = Object.keys(defaults).filter((key) => typeof defaults[key] === "number");
  nonNegativeKeys.forEach((key) => {
    if (!Number.isFinite(values[key]) || values[key] < 0) {
      errors.push(`${fieldHelp[key] ? key : "Une valeur"} doit être un nombre positif ou nul.`);
    }
  });

  if (values.vacancyDays > 183) errors.push("La vacance doit rester entre 0 et 183 jours par an.");
  if (values.notaryRate > 20) errors.push("Le taux de frais de notaire paraît invalide (maximum accepté : 20 %).");
  if (values.managementFeeRate + values.gliRate >= 100) errors.push("Gestion et GLI doivent totaliser moins de 100 %.");
  if (values.financingMethod === "mortgage") {
    if (values.loanDurationYears < 1 || values.loanDurationYears > 30) errors.push("La durée du prêt doit être comprise entre 1 et 30 ans.");
    if (values.loanYear < 1 || values.loanYear > values.loanDurationYears) errors.push("L'année analysée doit être comprise dans la durée du prêt.");
  }
  if (values.recoverableTaxeOrdures > values.taxeFonciere) {
    errors.push("La TEOM récupérable ne peut pas dépasser la taxe foncière totale.");
  }
  if (values.deductibleReserveExpenses > values.maintenanceReserve + values.relocationReserve) {
    errors.push("Les dépenses de réserve réellement déductibles ne peuvent pas dépasser les réserves d'entretien et de relocation.");
  }

  const furnishedMode = ["lmnp-real", "micro-bic"].includes(values.taxMode);
  const unfurnishedMode = ["micro-foncier", "foncier-real"].includes(values.taxMode);
  if (values.taxMode !== "manual" && values.rentalType === "furnished" && !furnishedMode) {
    errors.push("Une location meublée doit utiliser LMNP réel, micro-BIC ou une estimation manuelle.");
  }
  if (values.taxMode !== "manual" && values.rentalType === "unfurnished" && !unfurnishedMode) {
    errors.push("Une location vide doit utiliser micro-foncier, régime réel foncier ou une estimation manuelle.");
  }

  const householdReceipts = estimateTaxReceipts(values) + values.otherHouseholdRentalReceipts;
  if (values.taxMode === "micro-foncier" && householdReceipts > 15000) {
    errors.push("Le micro-foncier n'est plus applicable au-delà de 15 000 € de revenus fonciers bruts du foyer.");
  }
  if (values.taxMode === "micro-bic") {
    const rules = getMicroBicRules(values);
    if (householdReceipts > rules.threshold) {
      errors.push(`Le micro-BIC ${rules.label} dépasse son seuil de ${money(rules.threshold)} de recettes du foyer.`);
    }
  }
  if (
    values.rentalType === "furnished" &&
    values.rentalUse !== "long-term" &&
    householdReceipts > 23000 &&
    values.taxMode !== "manual"
  ) {
    errors.push("Au-delà de 23 000 € de recettes en meublé de tourisme, des cotisations sociales professionnelles peuvent s'appliquer : utilisez une estimation manuelle validée.");
  } else if (values.rentalType === "furnished" && householdReceipts > 23000) {
    if (values.householdActivityIncome <= 0) {
      errors.push("Au-delà de 23 000 € de recettes meublées du foyer, renseignez les autres revenus professionnels pour vérifier le statut LMNP/LMP.");
    } else if (householdReceipts > values.householdActivityIncome && values.taxMode !== "manual") {
      errors.push("Les recettes meublées dépassent 23 000 € et les autres revenus professionnels : ce cas peut relever du LMP et nécessite une estimation manuelle/professionnelle.");
    }
  }

  return [...new Set(errors)];
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
  const vacancyRate = vacancyRateFromDays(values.vacancyDays);
  const operating = getOperatingContext(values, values.monthlyRent, vacancyRate);
  const vacancyCost = operating.grossAnnualRent * vacancyRate;
  const cashPurchase = values.financingMethod === "cash";
  const effectiveDownPayment = Math.min(Math.max(values.downPayment, 0), totalProjectCost);
  const loanAmount = cashPurchase ? 0 : Math.max(0, totalProjectCost - effectiveDownPayment);
  const amortization = loanYearSummary(loanAmount, rate(values.interestRate), values.loanDurationYears, values.loanYear);
  const loanPayment = amortization.payment;
  const borrowerInsurance = cashPurchase ? 0 : (loanAmount * rate(values.borrowerInsuranceRate)) / 12;
  const monthlyDebtService = loanPayment + borrowerInsurance;
  const annualDebtService = monthlyDebtService * 12;
  const annualBorrowerInsurance = borrowerInsurance * 12;
  const loanContext = {
    annualInterest: cashPurchase ? 0 : amortization.interest,
    annualBorrowerInsurance,
    deductibleLoanFees: !cashPurchase && values.loanYear === 1 ? values.bankFees : 0,
  };
  const tax = calculateTax(values, { ...operating, ...loanContext });
  const estimatedTax = tax.estimatedTax;
  const annualCashFlowBeforeTax = operating.netOperatingIncome - annualDebtService;
  const annualCashFlowAfterTax = annualCashFlowBeforeTax - estimatedTax;
  const breakEvenRentBeforeTax = findBreakEvenRentBeforeTax(values, vacancyRate, annualDebtService);
  const breakEvenRentAfterTax = findBreakEvenRentAfterTax(
    values,
    vacancyRate,
    annualDebtService,
    loanContext,
  );
  const cashInvested = cashPurchase ? totalProjectCost + values.bankFees : effectiveDownPayment + values.bankFees;

  const metrics = {
    totalProjectCost,
    grossAnnualRent: operating.grossAnnualRent,
    vacancyCost,
    effectiveAnnualRent: operating.effectiveAnnualRent,
    effectiveTenantCharges: operating.effectiveTenantCharges,
    effectiveRecoveredTaxeOrdures: operating.effectiveRecoveredTaxeOrdures,
    unrecoveredCharges: operating.unrecoveredCharges,
    managementFee: operating.managementFee,
    unpaidRentInsurance: operating.unpaidRentInsurance,
    grossYieldPrice: safeDivide(operating.grossAnnualRent, values.purchasePrice),
    grossYieldTotalCost: safeDivide(operating.grossAnnualRent, totalProjectCost),
    annualOperatingExpenses: operating.annualOperatingExpenses,
    netOperatingIncome: operating.netOperatingIncome,
    netYieldBeforeTax: safeDivide(operating.netOperatingIncome, totalProjectCost),
    netYieldAfterTax: safeDivide(operating.netOperatingIncome - estimatedTax, totalProjectCost),
    monthlyCashFlowBeforeTax: annualCashFlowBeforeTax / 12,
    monthlyCashFlowAfterTax: annualCashFlowAfterTax / 12,
    cashInvested,
    returnOnCashBeforeTax: safeDivide(annualCashFlowBeforeTax, cashInvested),
    debtCoverageRatio: annualDebtService > 0 ? safeDivide(operating.netOperatingIncome, annualDebtService) : 99,
    breakEvenRentBeforeTax,
    breakEvenRentAfterTax,
    estimatedTax,
    taxableProfit: tax.taxableProfit,
    taxableReceipts: tax.taxableReceipts,
    totalTaxRate: tax.totalTaxRate,
    appliedSocialContributionsRate: tax.appliedSocialContributionsRate,
    taxModeLabel: tax.taxModeLabel,
    taxFormulaLabel: tax.formulaLabel,
    preDepreciationProfit: tax.preDepreciationProfit,
    appliedDepreciation: tax.appliedDepreciation,
    deferredDepreciation: tax.deferredDepreciation,
    taxOperatingLoss: tax.operatingLoss,
    loanAmount,
    monthlyDebtService,
    annualInterest: loanContext.annualInterest,
    annualPrincipalRepaid: cashPurchase ? 0 : amortization.principalRepaid,
    loanBalanceStart: cashPurchase ? 0 : amortization.balanceStart,
    loanBalanceEnd: cashPurchase ? 0 : amortization.balanceEnd,
    annualBorrowerInsurance,
    effectiveDownPayment,
    netTaxeFonciere: Math.max(0, values.taxeFonciere - operating.effectiveRecoveredTaxeOrdures),
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
  if (["F", "G"].includes(values.dpeRating)) {
    list.push("DPE F/G : le loyer est gelé en métropole lors d'une nouvelle location, d'un renouvellement ou d'une reconduction tacite.");
  }
  if (metrics.monthlyCashFlowAfterTax < -300) list.push("Cash-flow après impôt inférieur à -300 EUR par mois.");
  if (metrics.netYieldBeforeTax < 0.03) list.push("Rendement net avant impôt inférieur à 3 %.");
  if (values.vacancyDays < 8) list.push("Vacance locative inférieure à 8 jours par an : hypothèse potentiellement optimiste.");
  if (values.maintenanceReserve === 0) list.push("Réserve d'entretien nulle : risque de sous-estimer les coûts.");
  if (values.taxeFonciere === 0) list.push("Taxe foncière absente : vérifiez l'hypothèse.");
  if (values.taxeFonciere > 0 && values.recoverableTaxeOrdures === 0) {
    list.push("TEOM récupérable non renseignée : si elle est incluse dans la taxe foncière, les charges propriétaire peuvent être surestimées.");
  }
  if (values.recoverableOperatingExpenses > values.tenantCharges * 12) {
    list.push("Les provisions mensuelles sont inférieures aux dépenses récupérables annuelles : vérifiez la régularisation de charges.");
  }
  if (
    values.rentalType === "furnished" &&
    values.rentalActivityYear > 1 &&
    metrics.taxableReceipts > 5000 &&
    values.cfe === 0
  ) {
    list.push("CFE non renseignée en location meublée : vérifiez si une cotisation annuelle s'applique.");
  }
  if (values.taxMode === "lmnp-real" && metrics.deferredDepreciation > 0) {
    list.push(`L'amortissement est plafonné au bénéfice : ${money(metrics.deferredDepreciation)} n'est pas utilisé cette année et doit être suivi comme report potentiel.`);
  }
  if (metrics.taxOperatingLoss > 0) {
    list.push(`Un déficit fiscal estimé de ${money(metrics.taxOperatingLoss)} n'est pas transformé en économie d'impôt immédiate dans ce simulateur.`);
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

function render() {
  const values = readValues();
  const result = calculate(values);
  const { metrics } = result;
  const validationErrors = validateValues(values);
  const isValid = validationErrors.length === 0;

  document.querySelector("#ratingLabel").textContent = isValid ? result.rating : "À corriger";
  document.querySelector("#scoreValue").textContent = isValid ? Math.round(result.score) : "--";
  document.querySelector("#ratingInterpretation").textContent = isValid ? result.label : "La note est suspendue tant que les paramètres signalés ne sont pas corrigés.";
  document.querySelector("#stripRating").textContent = isValid ? result.rating : "À corriger";
  document.querySelector("#previewRating").textContent = isValid ? result.rating : "À corriger";
  document.querySelector("#previewScore").textContent = isValid ? Math.round(result.score) : "--";
  setSignedText(document.querySelector("#monthlyCashFlowAfterTax"), metrics.monthlyCashFlowAfterTax);
  setSignedText(document.querySelector("#stripCashflow"), metrics.monthlyCashFlowAfterTax);
  setSignedText(document.querySelector("#previewCashflow"), metrics.monthlyCashFlowAfterTax);
  document.querySelector("#netYieldBeforeTax").textContent = percent(metrics.netYieldBeforeTax);
  document.querySelector("#stripYield").textContent = percent(metrics.netYieldBeforeTax);
  document.querySelector("#previewYield").textContent = percent(metrics.netYieldBeforeTax);
  setSignedText(document.querySelector("#returnOnCash"), metrics.returnOnCashBeforeTax, percent);
  document.querySelector("#breakEvenRentAfterTax").textContent = `${money(metrics.breakEvenRentAfterTax)} / mois`;

  renderMetrics(metrics);
  renderScoreBreakdown(result);
  renderEquations(values, metrics);
  renderSensitivity(values);

  const validationPanel = document.querySelector("#validationPanel");
  validationPanel.hidden = isValid;
  document.querySelector("#validationList").innerHTML = validationErrors
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

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
  if (validateValues(values).length > 0) {
    document.querySelector("#copyStatus").textContent = "Corrigez les paramètres signalés avant de copier le résumé.";
    return;
  }
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
installButton.addEventListener("click", requestInstall);
installCloseButton.addEventListener("click", closeInstallOverlay);
installOverlay.addEventListener("click", (event) => {
  if (event.target === installOverlay) closeInstallOverlay();
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  setInstallButtonVisibility();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installOverlay.hidden = true;
  document.body.classList.remove("modal-open");
  setInstallButtonVisibility();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !helpOverlay.hidden) closeHelpOverlay();
  if (event.key === "Escape" && !installOverlay.hidden) closeInstallOverlay();
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

setInstallButtonVisibility();
renderProjectList();
render();
