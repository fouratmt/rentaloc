const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadCalculations() {
  const appPath = path.join(__dirname, "..", "src", "app.js");
  const source = fs.readFileSync(appPath, "utf8");
  const calculationSource = source.split("function renderMetrics")[0];
  const dummyElement = {
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} },
    focus() {},
    scrollIntoView() {},
    textContent: "",
    hidden: true,
  };
  const context = {
    console,
    document: {
      querySelector: () => dummyElement,
      querySelectorAll: () => [],
      body: dummyElement,
    },
    window: { addEventListener() {}, isSecureContext: false, crypto: {} },
    navigator: {},
    localStorage: { getItem: () => null, setItem() {} },
  };
  vm.createContext(context);
  vm.runInContext(
    `${calculationSource}\n;globalThis.__calculations = { defaults, mergeWithDefaults, calculate, calculateTax, validateValues, loanYearSummary, getOperatingContext, vacancyRateFromDays };`,
    context,
  );
  return context.__calculations;
}

const calculations = loadCalculations();
const { defaults, calculate, validateValues } = calculations;
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
  assert.ok(validateValues({ ...values, otherHouseholdRentalReceipts: 10000 }).some((message) => message.includes("15 000") || message.includes("15 000")));
});

test("tax regimes cannot be mixed between furnished and unfurnished rentals", () => {
  assert.ok(validateValues({ ...defaults, rentalType: "unfurnished", taxMode: "lmnp-real" }).length > 0);
  assert.ok(validateValues({ ...defaults, rentalType: "furnished", taxMode: "micro-foncier" }).length > 0);
  assert.equal(validateValues({ ...defaults, rentalType: "unfurnished", taxMode: "foncier-real" }).length, 0);
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
