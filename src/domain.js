(function exposeDomain(root, factory) {
  const rules = typeof module === "object" && module.exports ? require("./rules.js") : root.RentaLocRules;
  const schema = typeof module === "object" && module.exports ? require("./schema.js") : root.RentaLocSchema;
  const domain = factory(rules, schema);
  if (typeof module === "object" && module.exports) module.exports = domain;
  root.RentaLocDomain = domain;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createDomain(
    { RULESET, riskScoreDefinitions, taxModeConfigs },
    { defaults, mergeWithDefaults, validateSchema },
  ) {
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
      Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : 0;
    const vacancyRateFromDays = (days) => Math.min(Math.max(days, 0), RULESET.validation.vacancyDaysMaximum) / 365;

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
          ...RULESET.tax.microBic.touristUnclassified,
          label: "meublé de tourisme non classé",
        };
      }
      const configuredRules =
        values.rentalUse === "tourist-classified"
          ? RULESET.tax.microBic.touristClassified
          : RULESET.tax.microBic.longTerm;
      return {
        ...configuredRules,
        label:
          values.rentalUse === "tourist-classified" ? "meublé de tourisme classé" : "location meublée longue durée",
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
        taxableReceipts =
          context.effectiveAnnualRent + context.effectiveTenantCharges + context.effectiveRecoveredTaxeOrdures;
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
        taxableReceipts =
          context.effectiveAnnualRent + context.effectiveTenantCharges + context.effectiveRecoveredTaxeOrdures;
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
      return Math.max(
        0,
        (getFixedOperatingExpenses(values) + annualDebtService - fixedRecoveries) / (12 * rentRetentionRate),
      );
    }

    function findBreakEvenRentAfterTax(values, vacancyRate, annualDebtService, loanContext) {
      const annualCashFlowForRent = (monthlyRent) => {
        const operating = getOperatingContext(values, monthlyRent, vacancyRate);
        const tax = calculateTax(values, { ...operating, ...loanContext });
        return operating.netOperatingIncome - annualDebtService - tax.estimatedTax;
      };

      if (annualCashFlowForRent(0) >= 0) return { rent: 0, converged: true };

      let low = 0;
      let high = Math.max(values.monthlyRent * 2, 500);
      while (annualCashFlowForRent(high) < 0 && high < RULESET.validation.monetaryValueMaximum) {
        high = Math.min(high * 2, RULESET.validation.monetaryValueMaximum);
      }
      if (annualCashFlowForRent(high) < 0) {
        return { rent: Math.min(high, RULESET.validation.monetaryValueMaximum), converged: false };
      }

      for (let index = 0; index < 80; index += 1) {
        const mid = (low + high) / 2;
        if (annualCashFlowForRent(mid) >= 0) high = mid;
        else low = mid;
      }

      return { rent: high, converged: true };
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

    function getMicroBicEligibility(values) {
      const rules = getMicroBicRules(values);
      const activityYear = Math.max(1, Math.floor(values.rentalActivityYear || 1));
      const automaticNewActivityEligibility = activityYear <= 2;
      const priorYearExceeded = values.priorYearGrossRentalReceipts > rules.threshold;
      const twoYearsAgoExceeded = values.twoYearsAgoGrossRentalReceipts > rules.threshold;
      return {
        ...rules,
        activityYear,
        automaticNewActivityEligibility,
        priorYearExceeded,
        twoYearsAgoExceeded,
        eligible: automaticNewActivityEligibility || !(priorYearExceeded && twoYearsAgoExceeded),
      };
    }

    function validateDetails(values) {
      const details = [...validateSchema(values)];
      if (details.length > 0) return details;
      const add = (field, code, message) => details.push({ field, code, message });

      if (values.managementFeeRate + values.gliRate >= 100) {
        add("managementFeeRate", "combined-fees", "Gestion et GLI doivent totaliser moins de 100 %.");
      }
      if (values.financingMethod === "mortgage" && values.loanYear > values.loanDurationYears) {
        add("loanYear", "loan-year-outside-term", "L'année analysée doit être comprise dans la durée du prêt.");
      }
      if (values.recoverableTaxeOrdures > values.taxeFonciere) {
        add(
          "recoverableTaxeOrdures",
          "teom-over-property-tax",
          "La TEOM récupérable ne peut pas dépasser la taxe foncière totale.",
        );
      }
      if (values.deductibleReserveExpenses > values.maintenanceReserve + values.relocationReserve) {
        add(
          "deductibleReserveExpenses",
          "deduction-over-reserves",
          "Les dépenses de réserve réellement déductibles ne peuvent pas dépasser les réserves d'entretien et de relocation.",
        );
      }

      const furnishedMode = ["lmnp-real", "micro-bic"].includes(values.taxMode);
      const unfurnishedMode = ["micro-foncier", "foncier-real"].includes(values.taxMode);
      if (values.taxMode !== "manual" && values.rentalType === "furnished" && !furnishedMode) {
        add(
          "taxMode",
          "incompatible-tax-mode",
          "Une location meublée doit utiliser LMNP réel, micro-BIC ou une estimation manuelle.",
        );
      }
      if (values.taxMode !== "manual" && values.rentalType === "unfurnished" && !unfurnishedMode) {
        add(
          "taxMode",
          "incompatible-tax-mode",
          "Une location vide doit utiliser micro-foncier, régime réel foncier ou une estimation manuelle.",
        );
      }

      const householdReceipts = estimateTaxReceipts(values) + values.otherHouseholdRentalReceipts;
      if (values.taxMode === "micro-foncier" && householdReceipts > RULESET.tax.microFoncier.threshold) {
        add(
          "taxMode",
          "micro-foncier-threshold",
          "Le micro-foncier n'est plus applicable au-delà de 15 000 € de revenus fonciers bruts du foyer.",
        );
      }
      if (values.taxMode === "micro-bic") {
        const eligibility = getMicroBicEligibility(values);
        if (!eligibility.eligible) {
          add(
            "taxMode",
            "micro-bic-ineligible",
            `Le micro-BIC ${eligibility.label} n'est pas applicable en 2026 : les recettes brutes du foyer dépassent ${money(eligibility.threshold)} en 2024 et en 2025.`,
          );
        }
      }
      if (
        values.rentalType === "furnished" &&
        values.rentalUse !== "long-term" &&
        householdReceipts > RULESET.tax.professionalFurnishedReceiptsThreshold &&
        values.taxMode !== "manual"
      ) {
        add(
          "taxMode",
          "professional-social-contributions",
          "Au-delà de 23 000 € de recettes en meublé de tourisme, des cotisations sociales professionnelles peuvent s'appliquer : utilisez une estimation manuelle validée.",
        );
      } else if (
        values.rentalType === "furnished" &&
        householdReceipts > RULESET.tax.professionalFurnishedReceiptsThreshold
      ) {
        if (values.householdActivityIncome <= 0) {
          add(
            "householdActivityIncome",
            "household-income-required",
            "Au-delà de 23 000 € de recettes meublées du foyer, renseignez les autres revenus professionnels pour vérifier le statut LMNP/LMP.",
          );
        } else if (householdReceipts > values.householdActivityIncome && values.taxMode !== "manual") {
          add(
            "taxMode",
            "possible-lmp",
            "Les recettes meublées dépassent 23 000 € et les autres revenus professionnels : ce cas peut relever du LMP et nécessite une estimation manuelle/professionnelle.",
          );
        }
      }

      return details.filter(
        (detail, index) => details.findIndex((candidate) => candidate.message === detail.message) === index,
      );
    }

    function validateValues(values) {
      return validateDetails(values).map((detail) => detail.message);
    }

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

    function ratingFromScore(score) {
      if (score >= 85) return ["Excellent", "Candidat solide"];
      if (score >= 70) return ["Bon", "À analyser plus en détail"];
      if (score >= 55) return ["Moyen", "Avancer avec prudence"];
      if (score >= 40) return ["Risque", "Marge de sécurité faible"];
      return ["Mauvais", "Probablement à éviter"];
    }

    function applyRegulatoryScoreCap(values, score) {
      if (values.rentalUse !== "long-term") return score;
      const cap = RULESET.dpe.scoreCaps[values.dpeRating];
      if (Number.isFinite(cap)) return Math.min(score, cap);
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
      const amortization = loanYearSummary(
        loanAmount,
        rate(values.interestRate),
        values.loanDurationYears,
        values.loanYear,
      );
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
      const breakEvenAfterTax = findBreakEvenRentAfterTax(values, vacancyRate, annualDebtService, loanContext);
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
        breakEvenRentAfterTax: breakEvenAfterTax.rent,
        breakEvenRentAfterTaxConverged: breakEvenAfterTax.converged,
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
      const calculationIssues = breakEvenAfterTax.converged
        ? []
        : [
            {
              field: "manualAnnualTax",
              code: "break-even-not-found",
              message:
                "Le loyer d'équilibre après impôt n'a pas pu être résolu dans les limites acceptées. Réduisez l'impôt manuel ou vérifiez les taux.",
            },
          ];
      return { metrics, score, rawScore, financialScore, riskBreakdown, rating, label, calculationIssues };
    }

    function warnings(values, metrics) {
      const list = [];
      if (values.rentalUse !== "long-term") {
        list.push(
          "Location touristique : les règles locales, l'enregistrement, les autorisations et les exigences DPE propres au bien ne sont pas vérifiés par RentaLoc.",
        );
      } else if (values.dpeRating === "G") {
        list.push(
          "DPE G : location interdite depuis le 1er janvier 2025 pour les baux signés, renouvelés ou reconduits.",
        );
      } else if (values.dpeRating === "F") {
        list.push("DPE F : interdiction de location à partir du 1er janvier 2028, travaux à budgéter.");
      } else if (values.dpeRating === "E") {
        list.push("DPE E : interdiction de location prévue à partir du 1er janvier 2034, risque long terme.");
      }
      if (values.rentalUse === "long-term" && RULESET.dpe.rentFreezeRatings.includes(values.dpeRating)) {
        list.push(
          "DPE F/G : le loyer est gelé en métropole lors d'une nouvelle location, d'un renouvellement ou d'une reconduction tacite.",
        );
      }
      if (values.taxMode === "micro-bic") {
        const eligibility = getMicroBicEligibility(values);
        const currentHouseholdReceipts = metrics.taxableReceipts + values.otherHouseholdRentalReceipts;
        if (currentHouseholdReceipts > eligibility.threshold) {
          list.push(
            `Les recettes 2026 projetées dépassent ${money(eligibility.threshold)} : cela ne supprime pas à lui seul le micro-BIC 2026, mais peut affecter l'éligibilité future si le dépassement se répète.`,
          );
        }
      }
      if (metrics.monthlyCashFlowAfterTax < -300) list.push("Cash-flow après impôt inférieur à -300 EUR par mois.");
      if (metrics.netYieldBeforeTax < 0.03) list.push("Rendement net avant impôt inférieur à 3 %.");
      if (values.vacancyDays < 8)
        list.push("Vacance locative inférieure à 8 jours par an : hypothèse potentiellement optimiste.");
      if (values.maintenanceReserve === 0) list.push("Réserve d'entretien nulle : risque de sous-estimer les coûts.");
      if (values.taxeFonciere === 0) list.push("Taxe foncière absente : vérifiez l'hypothèse.");
      if (values.taxeFonciere > 0 && values.recoverableTaxeOrdures === 0) {
        list.push(
          "TEOM récupérable non renseignée : si elle est incluse dans la taxe foncière, les charges propriétaire peuvent être surestimées.",
        );
      }
      if (values.recoverableOperatingExpenses > values.tenantCharges * 12) {
        list.push(
          "Les provisions mensuelles sont inférieures aux dépenses récupérables annuelles : vérifiez la régularisation de charges.",
        );
      }
      if (
        values.rentalType === "furnished" &&
        values.rentalActivityYear > 1 &&
        metrics.taxableReceipts > RULESET.tax.cfeMinimumBaseExemptionReceipts &&
        values.cfe === 0
      ) {
        list.push("CFE non renseignée en location meublée : vérifiez si une cotisation annuelle s'applique.");
      }
      if (values.taxMode === "lmnp-real" && metrics.deferredDepreciation > 0) {
        list.push(
          `L'amortissement est plafonné au bénéfice : ${money(metrics.deferredDepreciation)} n'est pas utilisé cette année et doit être suivi comme report potentiel.`,
        );
      }
      if (metrics.taxOperatingLoss > 0) {
        list.push(
          `Un déficit fiscal estimé de ${money(metrics.taxOperatingLoss)} n'est pas transformé en économie d'impôt immédiate dans ce simulateur.`,
        );
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

    function buildSummaryText(values, result = calculate(values)) {
      const { metrics, rating } = result;
      const warningItems = warnings(values, metrics);
      const lines = [
        "Résumé RentaLoc du projet locatif",
        `Référence : revenus ${RULESET.taxYear}, ${RULESET.jurisdiction}, règles ${RULESET.version}`,
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
        "",
        "Estimation fiscale simplifiée : à confirmer avec un comptable ou conseiller qualifié avant toute décision.",
      ];
      if (warningItems.length > 0) {
        lines.push("", "Points d'attention :", ...warningItems.map((warning) => `- ${warning}`));
      }
      return lines.join("\n");
    }

    return Object.freeze({
      RULESET,
      defaults,
      mergeWithDefaults,
      vacancyRateFromDays,
      getMicroBicRules,
      getMicroBicEligibility,
      getRecoverableTaxeOrdures,
      getFixedOperatingExpenses,
      getVariableExpenseRate,
      getOperatingContext,
      calculateTax,
      monthlyPayment,
      loanYearSummary,
      estimateTaxReceipts,
      validateDetails,
      validateValues,
      scoreFinancial,
      scoreRiskBreakdown,
      ratingFromScore,
      calculate,
      warnings,
      buildSummaryText,
    });
  },
);
