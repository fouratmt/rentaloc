(function exposeRules(root, factory) {
  const rules = factory();
  if (typeof module === "object" && module.exports) module.exports = rules;
  root.RentaLocRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRules() {
  "use strict";

  const RULESET = Object.freeze({
    version: "2026.1",
    taxYear: 2026,
    jurisdiction: "France métropolitaine",
    verifiedOn: "2026-08-07",
    reviewDue: "2027-01-31",
    schemaVersion: 2,
    tax: Object.freeze({
      furnishedSocialContributionsRate: 18.6,
      unfurnishedSocialContributionsRate: 17.2,
      professionalFurnishedReceiptsThreshold: 23000,
      cfeMinimumBaseExemptionReceipts: 5000,
      microBic: Object.freeze({
        longTerm: Object.freeze({ threshold: 83600, abatementRate: 0.5, minimumAbatement: 305 }),
        touristClassified: Object.freeze({ threshold: 83600, abatementRate: 0.5, minimumAbatement: 305 }),
        touristUnclassified: Object.freeze({ threshold: 15000, abatementRate: 0.3, minimumAbatement: 305 }),
      }),
      microFoncier: Object.freeze({ threshold: 15000, abatementRate: 0.3, minimumAbatement: 0 }),
    }),
    dpe: Object.freeze({
      rentalBanYears: Object.freeze({ G: 2025, F: 2028, E: 2034 }),
      scoreCaps: Object.freeze({ G: 39, F: 54 }),
      rentFreezeRatings: Object.freeze(["F", "G"]),
    }),
    validation: Object.freeze({
      vacancyDaysMaximum: 183,
      notaryRateMaximum: 20,
      interestRateMaximum: 30,
      borrowerInsuranceRateMaximum: 20,
      managementFeeRateMaximum: 20,
      gliRateMaximum: 10,
      taxRateMaximum: 70,
      loanDurationYearsMaximum: 30,
      monetaryValueMaximum: 100000000,
    }),
    sources: Object.freeze([
      Object.freeze({
        id: "micro-fiscal-2026",
        subject: "Micro-fiscal thresholds, two-year eligibility rule, and new-activity rule",
        url: "https://entreprendre.service-public.gouv.fr/vosdroits/F23267",
        publisher: "Service Public Entreprendre",
        pageVerifiedOn: "2026-05-13",
        checkedOn: "2026-08-07",
      }),
      Object.freeze({
        id: "furnished-income-2026",
        subject: "Furnished-rental regimes and abatements",
        url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F32744",
        publisher: "Service Public",
        pageVerifiedOn: "2026-04-15",
        checkedOn: "2026-08-07",
      }),
      Object.freeze({
        id: "social-contributions-2026",
        subject: "Rental-income social contributions",
        url: "https://www.impots.gouv.fr/particulier/questions/je-donne-un-bien-en-location-dois-je-payer-des-prelevements-sociaux",
        publisher: "Direction générale des Finances publiques",
        pageVerifiedOn: null,
        checkedOn: "2026-08-07",
      }),
      Object.freeze({
        id: "furnished-cfe-2026",
        subject: "Furnished-rental registration and CFE exemptions",
        url: "https://www.impots.gouv.fr/particulier/les-locations-meublees",
        publisher: "Direction générale des Finances publiques",
        pageVerifiedOn: "2026-04-08",
        checkedOn: "2026-08-07",
      }),
      Object.freeze({
        id: "dpe-rental-rules",
        subject: "Metropolitan long-term rental DPE restrictions",
        url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F16096",
        publisher: "Service Public",
        pageVerifiedOn: null,
        checkedOn: "2026-08-07",
      }),
    ]),
  });

  const taxModeConfigs = Object.freeze({
    "lmnp-real": Object.freeze({
      label: "LMNP réel simplifié",
      socialContributionsRate: RULESET.tax.furnishedSocialContributionsRate,
    }),
    "micro-bic": Object.freeze({
      label: "Micro-BIC",
      socialContributionsRate: RULESET.tax.furnishedSocialContributionsRate,
    }),
    "micro-foncier": Object.freeze({
      label: "Micro-foncier",
      socialContributionsRate: RULESET.tax.unfurnishedSocialContributionsRate,
      abatementRate: RULESET.tax.microFoncier.abatementRate,
      minimumAbatement: RULESET.tax.microFoncier.minimumAbatement,
    }),
    "foncier-real": Object.freeze({
      label: "Régime réel foncier simplifié",
      socialContributionsRate: RULESET.tax.unfurnishedSocialContributionsRate,
    }),
    manual: Object.freeze({ label: "Estimation manuelle", socialContributionsRate: null }),
  });

  const riskScoreDefinitions = Object.freeze([
    Object.freeze({
      key: "dpeRating",
      label: "DPE",
      max: 8,
      scores: Object.freeze({ A: 8, B: 8, C: 8, D: 6, E: 3, F: 0, G: 0 }),
      labels: Object.freeze({ A: "A", B: "B", C: "C", D: "D", E: "E", F: "F", G: "G" }),
    }),
    Object.freeze({
      key: "rentalDemand",
      label: "Demande locative",
      max: 8,
      scores: Object.freeze({ strong: 8, medium: 4, weak: 0 }),
      labels: Object.freeze({ strong: "Forte", medium: "Moyenne", weak: "Faible" }),
    }),
    Object.freeze({
      key: "buildingCondition",
      label: "État de l'immeuble",
      max: 6,
      scores: Object.freeze({ good: 6, average: 3, risky: 0 }),
      labels: Object.freeze({ good: "Bon", average: "Moyen", risky: "Risque" }),
    }),
    Object.freeze({
      key: "majorWorksRisk",
      label: "Travaux de copropriété",
      max: 4,
      scores: Object.freeze({ no: 4, uncertain: 2, yes: 0 }),
      labels: Object.freeze({ no: "Non", uncertain: "Incertain", yes: "Oui" }),
    }),
    Object.freeze({
      key: "resaleLiquidity",
      label: "Liquidité revente",
      max: 4,
      scores: Object.freeze({ easy: 4, normal: 2, hard: 0 }),
      labels: Object.freeze({ easy: "Facile", normal: "Normale", hard: "Difficile" }),
    }),
  ]);

  return Object.freeze({ RULESET, riskScoreDefinitions, taxModeConfigs });
});
