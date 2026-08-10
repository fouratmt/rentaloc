const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const calculations = require("../src/domain.js");
const { fieldDefinitions } = require("../src/schema.js");
const {
  buildSummaryText,
  defaults,
  calculate,
  getMicroBicEligibility,
  loanYearSummary,
  scoreFinancial,
  scoreRiskBreakdown,
  validateDetails,
  validateValues,
  warnings,
} = calculations;
const closeTo = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}`);

test("default mortgage uses the exact amortization schedule for the selected year", () => {
  const { metrics } = calculate({ ...defaults });
  const annualLoanPayments = (metrics.monthlyDebtService - metrics.annualBorrowerInsurance / 12) * 12;

  assert.ok(metrics.annualInterest < metrics.loanAmount * (defaults.interestRate / 100));
  closeTo(metrics.annualInterest + metrics.annualPrincipalRepaid, annualLoanPayments, 1e-5);
  closeTo(metrics.loanBalanceStart - metrics.annualPrincipalRepaid, metrics.loanBalanceEnd, 1e-5);
});

test("after-tax break-even rent resolves to approximately zero cash flow", () => {
  const base = calculate({ ...defaults });
  const atBreakEven = calculate({ ...defaults, monthlyRent: base.metrics.breakEvenRentAfterTax });
  closeTo(atBreakEven.metrics.monthlyCashFlowAfterTax, 0, 0.01);
});

test("invalid denominators never produce Infinity and invalid projects are rejected", () => {
  const values = {
    ...defaults,
    purchasePrice: 0,
    renovationWorks: 0,
    furnitureCost: 0,
    otherUpfrontCosts: 0,
    agencyFees: 0,
    monthlyRent: 0,
  };
  const result = calculate(values);
  assert.ok(validateValues(values).length >= 2);
  Object.values(result.metrics).forEach((value) => {
    if (typeof value === "number") assert.ok(Number.isFinite(value));
  });
});

test("LMNP depreciation is capped and the unused amount is exposed", () => {
  const result = calculate({ ...defaults, financingMethod: "cash", bankFees: 0, depreciationDeduction: 100000 });
  assert.equal(result.metrics.taxableProfit, 0);
  assert.ok(result.metrics.appliedDepreciation <= Math.max(0, result.metrics.preDepreciationProfit));
  assert.ok(result.metrics.deferredDepreciation > 0);
});

test("cash reserves are deductible only to the extent actually spent", () => {
  const baseValues = { ...defaults, financingMethod: "cash", bankFees: 0, depreciationDeduction: 0 };
  const provisionOnly = calculate({ ...baseValues, deductibleReserveExpenses: 0 });
  const spent = calculate({ ...baseValues, deductibleReserveExpenses: 500 });
  closeTo(provisionOnly.metrics.preDepreciationProfit - spent.metrics.preDepreciationProfit, 500);
});

test("unclassified tourist micro-BIC applies the 30% abatement and 15,000 euro threshold", () => {
  const values = { ...defaults, taxMode: "micro-bic", rentalUse: "tourist-unclassified" };
  const result = calculate(values);
  closeTo(result.metrics.taxableProfit, result.metrics.taxableReceipts * 0.7);
  assert.ok(
    validateValues({
      ...values,
      rentalActivityYear: 3,
      priorYearGrossRentalReceipts: 16000,
      twoYearsAgoGrossRentalReceipts: 16000,
    }).some((message) => message.includes("15 000") || message.includes("15 000")),
  );
});

test("tax regimes cannot be mixed between furnished and unfurnished rentals", () => {
  assert.ok(validateValues({ ...defaults, rentalType: "unfurnished", taxMode: "lmnp-real" }).length > 0);
  assert.ok(validateValues({ ...defaults, rentalType: "furnished", taxMode: "micro-foncier" }).length > 0);
  assert.equal(validateValues({ ...defaults, rentalType: "unfurnished", taxMode: "foncier-real" }).length, 0);
});

test("every supported tax mode produces an explicit, finite tax result", () => {
  const cases = [
    { taxMode: "lmnp-real", rentalType: "furnished", expectedLabel: /LMNP réel/ },
    { taxMode: "micro-bic", rentalType: "furnished", expectedLabel: /Micro-BIC/ },
    { taxMode: "micro-foncier", rentalType: "unfurnished", expectedLabel: /Micro-foncier/ },
    { taxMode: "foncier-real", rentalType: "unfurnished", expectedLabel: /Régime réel foncier/ },
    { taxMode: "manual", rentalType: "furnished", manualAnnualTax: 1234, expectedLabel: /manuelle/ },
  ];

  cases.forEach(({ expectedLabel, ...overrides }) => {
    const values = { ...defaults, ...overrides };
    const result = calculate(values);
    assert.equal(validateValues(values).length, 0);
    assert.ok(Number.isFinite(result.metrics.estimatedTax));
    assert.match(result.metrics.taxModeLabel, expectedLabel);
    if (overrides.taxMode === "manual") closeTo(result.metrics.estimatedTax, 1234);
  });
});

test("tourist furnished receipts above 23,000 euros require professional social handling", () => {
  const values = {
    ...defaults,
    monthlyRent: 2500,
    rentalUse: "tourist-classified",
    taxMode: "lmnp-real",
    householdActivityIncome: 100000,
  };
  assert.ok(validateValues(values).some((message) => message.includes("cotisations sociales professionnelles")));
});

test("unrecovered recoverable charges reduce taxable income under real property income", () => {
  const common = {
    ...defaults,
    rentalType: "unfurnished",
    taxMode: "foncier-real",
    financingMethod: "cash",
    bankFees: 0,
    tenantCharges: 0,
  };
  const withoutRecoverableExpense = calculate({ ...common, recoverableOperatingExpenses: 0 });
  const withUnrecoveredExpense = calculate({ ...common, recoverableOperatingExpenses: 600 });
  closeTo(withoutRecoverableExpense.metrics.taxableProfit - withUnrecoveredExpense.metrics.taxableProfit, 600);
});

test("vacancy leaves the correct share of recoverable expenses with the owner", () => {
  const occupied = calculate({
    ...defaults,
    vacancyDays: 0,
    tenantCharges: 50,
    recoverableOperatingExpenses: 600,
    taxeFonciere: 800,
    recoverableTaxeOrdures: 120,
  });
  const tenPercentVacancy = calculate({
    ...defaults,
    vacancyDays: 36.5,
    tenantCharges: 50,
    recoverableOperatingExpenses: 600,
    taxeFonciere: 800,
    recoverableTaxeOrdures: 120,
  });
  closeTo(occupied.metrics.unrecoveredCharges, 0);
  closeTo(tenPercentVacancy.metrics.unrecoveredCharges, 72);
});

test("over-provisioned tenant charges are capped after annual regularization", () => {
  const result = calculate({
    ...defaults,
    vacancyDays: 0,
    tenantCharges: 200,
    recoverableOperatingExpenses: 600,
  });
  closeTo(result.metrics.effectiveTenantCharges, 600);
});

test("2026 micro-BIC eligibility uses the 83,600 euro threshold and two consecutive prior years", () => {
  const base = {
    ...defaults,
    taxMode: "micro-bic",
    rentalUse: "long-term",
    rentalActivityYear: 3,
  };
  assert.equal(getMicroBicEligibility({ ...base, priorYearGrossRentalReceipts: 83601, twoYearsAgoGrossRentalReceipts: 83601 }).eligible, false);
  assert.equal(getMicroBicEligibility({ ...base, priorYearGrossRentalReceipts: 83601, twoYearsAgoGrossRentalReceipts: 83600 }).eligible, true);
  assert.equal(getMicroBicEligibility({ ...base, rentalActivityYear: 2, priorYearGrossRentalReceipts: 100000, twoYearsAgoGrossRentalReceipts: 100000 }).eligible, true);
});

test("current-year threshold crossing warns but does not invalidate micro-BIC by itself", () => {
  const values = {
    ...defaults,
    taxMode: "micro-bic",
    rentalUse: "long-term",
    rentalActivityYear: 3,
    monthlyRent: 8000,
    householdActivityIncome: 200000,
  };
  const result = calculate(values);
  assert.equal(validateValues(values).length, 0);
  assert.ok(warnings(values, result.metrics).some((message) => message.includes("éligibilité future")));
});

test("runtime schema rejects invalid enums, non-finite values, and excessive rates", () => {
  assert.ok(validateDetails({ ...defaults, dpeRating: "H" }).some((error) => error.field === "dpeRating"));
  assert.ok(validateDetails({ ...defaults, interestRate: 31 }).some((error) => error.field === "interestRate"));
  assert.ok(validateDetails({ ...defaults, marginalTaxRate: 71 }).some((error) => error.field === "marginalTaxRate"));
  assert.ok(validateDetails({ ...defaults, purchasePrice: Number.NaN }).some((error) => error.code === "not-finite"));
  Object.entries(fieldDefinitions).forEach(([field, definition]) => {
    if (definition.type === "enum") {
      assert.ok(validateDetails({ ...defaults, [field]: "__invalid__" }).some((error) => error.field === field));
    } else if (definition.max !== undefined) {
      assert.ok(validateDetails({ ...defaults, [field]: definition.max + 1 }).some((error) => error.field === field));
    }
  });
});

test("supported maximum vacancy and fee assumptions remain finite", () => {
  const values = {
    ...defaults,
    vacancyDays: fieldDefinitions.vacancyDays.max,
    managementFeeRate: fieldDefinitions.managementFeeRate.max,
    gliRate: fieldDefinitions.gliRate.max,
  };
  assert.equal(validateValues(values).length, 0);
  const result = calculate(values);
  Object.values(result.metrics).forEach((value) => {
    if (typeof value === "number") assert.ok(Number.isFinite(value));
  });
});

test("zero-rate loans and the final loan year amortize exactly", () => {
  closeTo(loanYearSummary(120000, 0, 10, 1).payment, 1000);
  const finalYear = loanYearSummary(120000, 0, 10, 10);
  closeTo(finalYear.principalRepaid, 12000);
  closeTo(finalYear.balanceEnd, 0);
});

test("cash purchases have no debt and display debt coverage as not applicable", () => {
  const result = calculate({ ...defaults, financingMethod: "cash", bankFees: 0 });
  assert.equal(result.metrics.loanAmount, 0);
  assert.equal(result.metrics.monthlyDebtService, 0);
  assert.equal(result.metrics.debtCoverageRatio, 99);
});

test("financial score boundaries follow the published rubric", () => {
  const metrics = {
    netYieldBeforeTax: 0.055,
    monthlyCashFlowAfterTax: 0,
    debtCoverageRatio: 1.2,
    grossYieldTotalCost: 0.07,
    cashInvested: 20000,
    totalProjectCost: 100000,
  };
  assert.equal(scoreFinancial(metrics), 57);
  assert.equal(scoreFinancial({ ...metrics, netYieldBeforeTax: 0.055001, debtCoverageRatio: 1.2001, grossYieldTotalCost: 0.070001 }), 70);
  assert.equal(scoreFinancial({ ...metrics, netYieldBeforeTax: 0, monthlyCashFlowAfterTax: -251, debtCoverageRatio: 0, grossYieldTotalCost: 0, cashInvested: 100001 }), 4);
});

test("qualitative risk score covers its best and worst boundaries", () => {
  assert.equal(scoreRiskBreakdown({ ...defaults }).total, 28);
  assert.equal(
    scoreRiskBreakdown({ ...defaults, dpeRating: "G", rentalDemand: "weak", buildingCondition: "risky", majorWorksRisk: "yes", resaleLiquidity: "hard" }).total,
    0,
  );
});

test("warning set covers conservative-input and regulatory cases", () => {
  const values = {
    ...defaults,
    dpeRating: "G",
    vacancyDays: 0,
    maintenanceReserve: 0,
    taxeFonciere: 0,
  };
  const items = warnings(values, calculate(values).metrics).join(" ");
  assert.match(items, /DPE G/);
  assert.match(items, /Vacance/);
  assert.match(items, /entretien/);
  assert.match(items, /Taxe foncière/);
});

test("copied summary includes rule scope, disclaimer, and generated warnings", () => {
  const values = { ...defaults, maintenanceReserve: 0 };
  const text = buildSummaryText(values);
  assert.match(text, /revenus 2026, France métropolitaine/);
  assert.match(text, /Estimation fiscale simplifiée/);
  assert.match(text, /Points d'attention/);
  assert.match(text, /Réserve d'entretien nulle/);
});

test("break-even non-convergence is a blocking calculation issue", () => {
  const expensive = {
    ...defaults,
    nonRecoverableCharges: 100000000,
    recoverableOperatingExpenses: 100000000,
    taxeFonciere: 100000000,
    landlordInsurance: 100000000,
    maintenanceReserve: 100000000,
    accountingCost: 100000000,
    cfe: 100000000,
    relocationReserve: 100000000,
    otherAnnualCosts: 100000000,
    managementFeeRate: 20,
    gliRate: 10,
  };
  const result = calculate(expensive);
  assert.equal(result.metrics.breakEvenRentAfterTaxConverged, false);
  assert.ok(result.calculationIssues.some((issue) => issue.code === "break-even-not-found"));
});

test("independent arithmetic reference scenarios remain stable", () => {
  const fixturePath = path.join(__dirname, "fixtures", "reference-scenarios.json");
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(fixture.provenance.professionalApproval, "pending");
  fixture.scenarios.forEach((scenario) => {
    const result = calculate({ ...defaults, ...scenario.overrides });
    Object.entries(scenario.expected).forEach(([metric, expected]) => {
      closeTo(result.metrics[metric], expected, 1e-6);
    });
  });
});
