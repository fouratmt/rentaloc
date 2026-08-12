(function exposeSchema(root, factory) {
  const rules = typeof module === "object" && module.exports ? require("./rules.js") : root.RentaLocRules;
  const schema = factory(rules);
  if (typeof module === "object" && module.exports) module.exports = schema;
  root.RentaLocSchema = schema;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSchema({ RULESET }) {
  const moneyMax = RULESET.validation.monetaryValueMaximum;
  const defaults = Object.freeze({
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
    socialContributionsRate: RULESET.tax.furnishedSocialContributionsRate,
    depreciationDeduction: 2500,
    deductibleReserveExpenses: 0,
    otherHouseholdRentalReceipts: 0,
    priorYearGrossRentalReceipts: 0,
    twoYearsAgoGrossRentalReceipts: 0,
    householdActivityIncome: 0,
    rentalActivityYear: 1,
    manualAnnualTax: 0,
    dpeRating: "D",
    rentalDemand: "strong",
    buildingCondition: "good",
    majorWorksRisk: "no",
    resaleLiquidity: "easy",
  });

  const monetaryFields = [
    "purchasePrice",
    "agencyFees",
    "renovationWorks",
    "furnitureCost",
    "otherUpfrontCosts",
    "monthlyRent",
    "tenantCharges",
    "recoverableOperatingExpenses",
    "nonRecoverableCharges",
    "taxeFonciere",
    "recoverableTaxeOrdures",
    "landlordInsurance",
    "maintenanceReserve",
    "accountingCost",
    "cfe",
    "relocationReserve",
    "otherAnnualCosts",
    "downPayment",
    "bankFees",
    "depreciationDeduction",
    "deductibleReserveExpenses",
    "otherHouseholdRentalReceipts",
    "priorYearGrossRentalReceipts",
    "twoYearsAgoGrossRentalReceipts",
    "householdActivityIncome",
    "manualAnnualTax",
  ];

  const fieldDefinitions = {};
  monetaryFields.forEach((key) => {
    fieldDefinitions[key] = { type: "number", min: 0, max: moneyMax };
  });
  Object.assign(fieldDefinitions, {
    purchasePrice: { type: "number", minExclusive: 0, max: moneyMax },
    monthlyRent: { type: "number", minExclusive: 0, max: moneyMax },
    notaryRate: { type: "number", min: 0, max: RULESET.validation.notaryRateMaximum },
    vacancyDays: { type: "number", min: 0, max: RULESET.validation.vacancyDaysMaximum },
    managementFeeRate: { type: "number", min: 0, max: RULESET.validation.managementFeeRateMaximum },
    gliRate: { type: "number", min: 0, max: RULESET.validation.gliRateMaximum },
    interestRate: { type: "number", min: 0, max: RULESET.validation.interestRateMaximum },
    borrowerInsuranceRate: { type: "number", min: 0, max: RULESET.validation.borrowerInsuranceRateMaximum },
    loanDurationYears: { type: "number", min: 1, max: RULESET.validation.loanDurationYearsMaximum, integer: true },
    loanYear: { type: "number", min: 1, max: RULESET.validation.loanDurationYearsMaximum, integer: true },
    marginalTaxRate: { type: "number", min: 0, max: RULESET.validation.taxRateMaximum },
    socialContributionsRate: { type: "number", min: 0, max: RULESET.validation.taxRateMaximum },
    rentalActivityYear: { type: "number", min: 1, max: 100, integer: true },
    financingMethod: { type: "enum", values: ["mortgage", "cash"] },
    rentalType: { type: "enum", values: ["furnished", "unfurnished"] },
    rentalUse: { type: "enum", values: ["long-term", "tourist-classified", "tourist-unclassified"] },
    taxMode: { type: "enum", values: ["lmnp-real", "micro-bic", "micro-foncier", "foncier-real", "manual"] },
    dpeRating: { type: "enum", values: ["A", "B", "C", "D", "E", "F", "G"] },
    rentalDemand: { type: "enum", values: ["strong", "medium", "weak"] },
    buildingCondition: { type: "enum", values: ["good", "average", "risky"] },
    majorWorksRisk: { type: "enum", values: ["no", "uncertain", "yes"] },
    resaleLiquidity: { type: "enum", values: ["easy", "normal", "hard"] },
  });
  Object.values(fieldDefinitions).forEach(Object.freeze);
  Object.freeze(fieldDefinitions);

  const labels = Object.freeze({
    purchasePrice: "Le prix d'achat",
    monthlyRent: "Le loyer mensuel",
    notaryRate: "Le taux de frais de notaire",
    vacancyDays: "La vacance",
    managementFeeRate: "Le taux de gestion",
    gliRate: "Le taux de GLI",
    interestRate: "Le taux d'intérêt",
    borrowerInsuranceRate: "Le taux d'assurance emprunteur",
    loanDurationYears: "La durée du prêt",
    loanYear: "L'année du prêt analysée",
    marginalTaxRate: "La TMI",
    socialContributionsRate: "Le taux de prélèvements sociaux",
    rentalActivityYear: "L'année d'activité locative",
  });

  function mergeWithDefaults(values = {}) {
    return { ...defaults, ...(values && typeof values === "object" ? values : {}) };
  }

  function normalizeValues(values = {}) {
    const merged = mergeWithDefaults(values);
    return Object.keys(defaults).reduce((normalized, key) => {
      normalized[key] = merged[key];
      return normalized;
    }, {});
  }

  function validateSchema(values) {
    const errors = [];
    Object.entries(fieldDefinitions).forEach(([field, definition]) => {
      const value = values?.[field];
      const label = labels[field] || "Cette valeur";
      if (definition.type === "enum") {
        if (!definition.values.includes(value)) {
          errors.push({ field, code: "invalid-enum", message: `${label} n'est pas une option reconnue.` });
        }
        return;
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push({ field, code: "not-finite", message: `${label} doit être un nombre valide.` });
        return;
      }
      if (definition.minExclusive !== undefined && value <= definition.minExclusive) {
        errors.push({
          field,
          code: "too-small",
          message: `${label} doit être supérieur à ${definition.minExclusive}.`,
        });
      } else if (definition.min !== undefined && value < definition.min) {
        errors.push({ field, code: "too-small", message: `${label} doit être supérieur ou égal à ${definition.min}.` });
      }
      if (definition.max !== undefined && value > definition.max) {
        errors.push({
          field,
          code: "too-large",
          message: `${label} ne peut pas dépasser ${definition.max.toLocaleString("fr-FR")}.`,
        });
      }
      if (definition.integer && !Number.isInteger(value)) {
        errors.push({ field, code: "not-integer", message: `${label} doit être un nombre entier.` });
      }
    });
    return errors;
  }

  return Object.freeze({
    SIMULATION_SCHEMA_VERSION: RULESET.schemaVersion,
    defaults,
    fieldDefinitions,
    mergeWithDefaults,
    normalizeValues,
    validateSchema,
  });
});
