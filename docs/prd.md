PRD — One-Page Rental Project Simulator

1. Product summary

Build a one-page web simulator that helps a user evaluate whether a rental real-estate project is financially attractive.

The simulator should take key property, financing, rent, expense, tax, and risk assumptions as inputs, then calculate gross yield, net yield, cash flow, return on cash invested, debt coverage, break-even rent, and an overall project rating.

The goal is not to replace a professional accountant or mortgage broker, but to give a clear first-pass answer: “Is this rental project worth deeper analysis?”

2. Target users

Primary user:

* Individual investor living in France.
* Wants to evaluate a small rental property such as a studio or one-bedroom apartment.
* May compare a rental project against leaving money in savings or investing in ETFs.
* May be self-employed or salaried.
* Needs simple but realistic calculations.

Secondary users:

* Freelancers considering property as diversification.
* First-time landlords.
* Investors comparing multiple cities or properties.

3. Core user problem

Rental property ads usually show attractive gross yields, but they often ignore:

* Notary fees.
* Renovation and furnishing costs.
* Taxe foncière.
* Co-ownership charges.
* Maintenance.
* Vacancy.
* Property management fees.
* Mortgage payments.
* Tax treatment.
* DPE or energy-related risk.
* Cash-flow negativity.

Users need a simple tool that converts a property listing into a realistic investment view.

4. Product goal

The simulator should answer four questions:

1. What is the real yield?
2. Will the project generate positive or negative monthly cash flow?
3. How sensitive is the project to vacancy, interest rate, rent level, and expenses?
4. Is the project good, average, risky, or bad?

5. Scope

In scope for V1

A single-page responsive web app with:

* Input form.
* Live calculations.
* Summary result card.
* Detailed metrics table.
* Assumptions panel.
* Sensitivity mini-section.
* Recommendation/rating.
* Ability to reset inputs.
* Optional ability to copy/share results as text.

Out of scope for V1

* User accounts.
* Saving multiple simulations.
* Bank API integrations.
* Automatic property listing import.
* Real-time mortgage rate API.
* Automatic tax filing advice.
* Legal document generation.
* Exact tax optimization.
* Multi-property portfolio tracking.

6. Page structure

The website is one page with four main sections:

1. Hero / intro
2. Input simulator
3. Results dashboard
4. Explanation / methodology

Desktop layout:

* Left column: inputs.
* Right column: live results.

Mobile layout:

* Inputs first.
* Sticky summary result after main assumptions.
* Detailed calculations below.

7. User flow

1. User lands on the page.
2. User sees a short explanation: “Estimate whether a rental property is a good investment.”
3. User enters property price, rent, acquisition costs, loan assumptions, expenses, tax assumptions, and risk assumptions.
4. Results update instantly.
5. User sees:
    * Overall rating.
    * Gross yield.
    * Net yield.
    * Monthly cash flow.
    * Cash needed.
    * Return on cash invested.
    * Break-even rent.
6. User adjusts assumptions to test best/base/worst case.
7. User can copy the result summary.

8. Input fields

8.1 Property acquisition inputs

Field	Type	Default	Required	Notes
Purchase price	Currency	€120,000	Yes	Listing price excluding notary fees
Notary/acquisition fees	Currency or %	7.5%	Yes	User can enter percentage or amount
Agency fees	Currency	€0	No	If not included in price
Renovation works	Currency	€5,000	No	Initial works before renting
Furniture/equipment	Currency	€3,000	No	Especially for furnished rental
Other upfront costs	Currency	€0	No	Broker, guarantee, diagnostics, etc.

Calculated:

* Total project cost.
* Total cash required before financing.

Formula:

total_project_cost = purchase_price + notary_fees + agency_fees + renovation_works + furniture_cost + other_upfront_costs

8.2 Rent inputs

Field	Type	Default	Required	Notes
Monthly rent excluding charges	Currency	€650	Yes	Main rental income
Recoverable tenant charges	Currency	€50	No	Display only; excluded from yield by default
Expected annual rent increase	%	0%	No	V1 can store but does not need projection
Vacancy assumption	Days per year	14	Yes	Converted to a capped vacancy rate; 14 days = ~3.8%

Calculated:

* Gross annual rent.
* Vacancy cost.
* Effective annual rent.

Formulas:

gross_annual_rent = monthly_rent_excluding_charges * 12

vacancy_rate = min(max(vacancy_days, 0), 183) / 365

vacancy_cost = gross_annual_rent * vacancy_rate

effective_annual_rent = gross_annual_rent - vacancy_cost

8.3 Operating expense inputs

Field	Type	Default	Required	Notes
Non-recoverable co-ownership charges	Annual currency	€600	Yes	Landlord part only
Taxe foncière	Annual currency	€800	Yes	Property tax
Recoverable TEOM	Annual currency	€0	No	Recoverable waste collection tax included in taxe foncière
Landlord insurance / PNO	Annual currency	€120	Yes	Propriétaire non occupant insurance
Maintenance reserve	Annual currency or %	€500	Yes	Repairs, small replacements
Property management fee	% of collected rent	0%	No	If using agency
Unpaid rent insurance / GLI	% of collected rent	0%	No	Usually percentage of rent
Accounting cost	Annual currency	€300	No	Relevant for LMNP réel
CFE / furnished rental fees	Annual currency	€0	No	Cotisation foncière des entreprises or recurring furnished-rental tax costs
Relocation / diagnostics reserve	Annual currency	€0	No	Annualized reletting, diagnostics, listing, handover or tenant-change costs
Other annual costs	Annual currency	€0	No	Miscellaneous

Calculated:

* Total annual operating expenses.
* Net operating income before financing and tax.

Formulas:

management_fee = effective_annual_rent * management_fee_rate

unpaid_rent_insurance = effective_annual_rent * gli_rate

net_taxe_fonciere = max(0, taxe_fonciere - min(max(recoverable_teom, 0), taxe_fonciere))

annual_operating_expenses = non_recoverable_charges + net_taxe_fonciere + landlord_insurance + maintenance_reserve + management_fee + unpaid_rent_insurance + accounting_cost + cfe + relocation_reserve + other_annual_costs

net_operating_income = effective_annual_rent - annual_operating_expenses

8.4 Financing inputs

Field	Type	Default	Required	Notes
Financing method	Select	Mortgage	Yes	Cash purchase or mortgage
Down payment	Currency or %	€25,000	If mortgage	User can enter amount or %
Loan amount	Currency	Auto	If mortgage	Auto-calculated from total project cost and capped down payment
Interest rate	%	3.5%	If mortgage	Annual nominal rate
Loan duration	Years	20	If mortgage	5–30 years
Borrower insurance	% or monthly amount	0.3% / year	No	Optional
Bank/broker fees	Currency	€1,000	No	Upfront cost

Calculated:

* Monthly mortgage payment excluding insurance.
* Monthly borrower insurance.
* Total monthly debt service.
* Annual debt service.
* Total cash invested.

Formulas:

Monthly mortgage payment:

monthly_rate = annual_interest_rate / 12

number_of_payments = loan_duration_years * 12

If interest rate > 0:

monthly_loan_payment = loan_amount * (monthly_rate * (1 + monthly_rate)^number_of_payments) / ((1 + monthly_rate)^number_of_payments - 1)

If interest rate = 0:

monthly_loan_payment = loan_amount / number_of_payments

Borrower insurance:

monthly_borrower_insurance = loan_amount * borrower_insurance_annual_rate / 12

monthly_debt_service = monthly_loan_payment + monthly_borrower_insurance

annual_debt_service = monthly_debt_service * 12

Implemented V1 behavior:

effective_down_payment = min(max(down_payment, 0), total_project_cost)

loan_amount = max(0, total_project_cost - effective_down_payment)

If mortgage:

cash_invested = effective_down_payment + bank_fees

If cash purchase:

cash_invested = total_project_cost + bank_fees

8.5 Tax inputs

V1 should support simplified tax handling, not full professional tax advice.

Field	Type	Default	Required	Notes
Rental type	Select	Furnished	Yes	Furnished or unfurnished
Tax mode	Select	LMNP réel / Micro-BIC / Micro-foncier / Simplified manual	Yes	Keep simple
Marginal income tax rate	%	30%	Yes	User input
Social contributions	%	18.6%	Yes	Default manual rate for furnished rental in 2026; mode-specific formulas can override it
Estimated taxable rental profit	Currency	Auto/manual	No	Advanced override
Estimated annual tax	Currency	Auto/manual	No	Advanced override

Implemented V1 behavior:

* Use the selected tax mode in the calculation instead of treating the selector as informational only.
* For furnished rental in 2026, use 18.6% social contributions by default.
* For unfurnished micro-foncier, use 17.2% social contributions.
* Let manual mode use an annual tax amount entered by the user.

Common formula:

estimated_tax = taxable_profit * (marginal_tax_rate + applied_social_contributions_rate)

LMNP réel simplified:

taxable_profit = max(0, net_operating_income - annual_interest - depreciation_deduction)

Micro-BIC long-term furnished rental:

taxable_receipts = effective_annual_rent + effective_recoverable_tenant_charges

taxable_profit = taxable_receipts - min(taxable_receipts, max(taxable_receipts * 50%, 305))

Micro-foncier unfurnished rental:

taxable_profit = effective_annual_rent * 70%

Manual estimate:

estimated_tax = manual_annual_tax

Important UI note:

* Display a warning: “Tax calculation is simplified. Confirm with an accountant, especially for LMNP réel, SCI, or high-income situations.”
* 2026 reference assumption: furnished rental uses 18.6% social contributions and unfurnished rental uses 17.2% social contributions according to impots.gouv.fr guidance on rental income social contributions.

8.6 Risk and quality inputs

Field	Type	Default	Required	Notes
DPE rating	Select	D	Yes	A, B, C, D, E, F, G
City rental demand	Select	Strong	Yes	Strong, medium, weak
Building condition	Select	Good	Yes	Good, average, risky
Major co-ownership works expected	Boolean	No	Yes	Roof, facade, elevator, etc.
Liquidity/resale quality	Select	Good	Yes	Easy, normal, hard

These inputs affect the qualitative rating, not the core financial formulas. DPE also applies a regulatory cap to the final score: G is capped at Bad because it is no longer rentable for new, renewed or tacitly renewed leases from 1 January 2025; F is capped at Risky because the same restriction applies from 1 January 2028. Reference assumption: Service-Public lists the rental restrictions for DPE G from 2025, F from 2028, and E from 2034.

9. Output metrics

9.1 Main result card

Display at the top of results:

* Overall rating: Excellent / Good / Average / Risky / Bad.
* One-line interpretation.
* Monthly cash flow.
* Net yield before tax.
* Return on cash invested.

Example:

Average project

“This property has a decent gross yield, but after expenses and financing it produces negative monthly cash flow. It may still build equity, but the margin of safety is limited.”

9.2 Required financial outputs

Metric	Formula	Display
Total project cost	Purchase + fees + works + furniture + other	€137,000
Gross annual rent	Monthly rent x 12	€7,800
Gross yield on price	Annual rent / purchase price	6.5%
Gross yield on total cost	Annual rent / total project cost	5.7%
Net operating income	Effective rent - operating expenses	€5,181/year
Net yield before tax	NOI / total project cost	3.8%
Monthly cash flow before tax	(NOI - annual debt service) / 12	-€246/month
Monthly cash flow after tax	(NOI - annual debt service - estimated tax) / 12	-€246/month
Cash invested	Capped down payment + bank fees, or total project cost + bank fees for cash purchase	€26,000
Return on cash before tax	Cash flow before tax / cash invested	-11.3%
Debt service coverage ratio	NOI / annual debt service	0.64
Break-even rent	Rent needed for zero cash flow after estimated tax	€1,038/month

9.3 Yield formulas

Gross yield on purchase price:

gross_yield_price = gross_annual_rent / purchase_price

Gross yield on total cost:

gross_yield_total_cost = gross_annual_rent / total_project_cost

Net yield before tax:

net_yield_before_tax = net_operating_income / total_project_cost

Net yield after tax:

net_yield_after_tax = (net_operating_income - estimated_tax) / total_project_cost

9.4 Cash-flow formulas

Before tax:

annual_cash_flow_before_tax = net_operating_income - annual_debt_service

monthly_cash_flow_before_tax = annual_cash_flow_before_tax / 12

After tax:

annual_cash_flow_after_tax = net_operating_income - annual_debt_service - estimated_tax

monthly_cash_flow_after_tax = annual_cash_flow_after_tax / 12

9.5 Break-even rent formula

The break-even rent should estimate the monthly rent required to reach zero monthly cash flow before tax.

Because management fees and unpaid-rent insurance are calculated as a percentage of collected rent, the before-tax formula must separate fixed and rent-indexed expenses.

fixed_operating_expenses = non_recoverable_charges + net_taxe_fonciere + landlord_insurance + maintenance_reserve + accounting_cost + cfe + relocation_reserve + other_annual_costs

variable_expense_rate = management_fee_rate + gli_rate

break_even_monthly_rent_before_tax = (fixed_operating_expenses + annual_debt_service) / (12 * (1 - vacancy_rate) * (1 - variable_expense_rate))

The after-tax break-even rent should solve the same cash-flow equation after estimated tax:

annual_cash_flow_after_tax_for_rent = net_operating_income_for_rent - annual_debt_service - estimated_tax_for_rent

break_even_monthly_rent_after_tax = monthly_rent where annual_cash_flow_after_tax_for_rent = 0

Implemented V1 behavior: resolve the after-tax value numerically because estimated tax changes when the target rent changes.

10. Scoring logic

The simulator should produce a score from 0 to 100.

10.1 Financial score: 70 points

Criterion	Max points	Scoring guide
Net yield before tax	25	>5.5% = 25, 4.5–5.5% = 18, 3.5–4.5% = 10, <3.5% = 3
Monthly cash flow after tax	20	Positive = 20, -€0 to -€100 = 14, -€100 to -€250 = 7, worse than -€250 = 0
Debt coverage ratio	10	>1.2 = 10, 1.0–1.2 = 7, 0.8–1.0 = 4, <0.8 = 0
Gross yield on total cost	10	>7% = 10, 6–7% = 7, 5–6% = 4, <5% = 1
Cash invested resilience	5	Cash invested <= 20% of total project cost = 5, <= 35% = 3, >35% = 0

10.2 Risk score: 30 points

Higher risk-score points are favorable: they indicate lower qualitative risk.

Criterion	Max points	Scoring guide
DPE rating	8	A-C = 8, D = 6, E = 3, F/G = 0
Rental demand	8	Strong = 8, medium = 4, weak = 0
Building condition	6	Good = 6, average = 3, risky = 0
Major works risk	4	No = 4, uncertain = 2, yes = 0
Resale liquidity	4	Easy = 4, normal = 2, hard = 0

10.3 Final rating

Score	Rating	Label
85–100	Excellent	“Strong candidate”
70–84	Good	“Worth deeper analysis”
55–69	Average	“Proceed carefully”
40–54	Risky	“Weak margin of safety”
0–39	Bad	“Probably avoid”

10.4 Hard warnings

Regardless of score, show warnings if:

* DPE is G: rental ban applies from 1 January 2025 for new, renewed or tacitly renewed leases; cap rating to Bad.
* DPE is F: rental ban applies from 1 January 2028; cap rating to Risky.
* DPE is E: rental ban applies from 1 January 2034; show long-term warning.
* Monthly cash flow after tax is below -€300.
* Net yield before tax is below 3%.
* Vacancy assumption is below 8 days per year.
* Maintenance reserve is zero.
* Taxe foncière is missing.
* Recoverable TEOM is missing while taxe foncière is present.
* Furnished rental CFE is missing.
* Purchase price is more than 20 years of rent.
* Mortgage down payment is higher than total project cost and must be capped in calculations.

Example warning:

“Warning: This project relies on very low vacancy and no maintenance costs. The result may be overly optimistic.”

11. Sensitivity analysis

V1 should include a small sensitivity section with three scenarios:

Base case

Uses user inputs.

Optimistic case

* Rent +5%.
* Vacancy reduced by 50%.
* Maintenance -20%.

Stress case

* Rent -5%.
* Vacancy doubled.
* Maintenance +30%.
* Interest rate +0.5 percentage point, if mortgage is used.

Display for each:

* Monthly cash flow after tax.
* Net yield before tax.
* Rating.

Example table:

Scenario	Monthly cash flow	Net yield	Rating
Optimistic	+€45	4.3%	Good
Base	-€120	3.8%	Average
Stress	-€310	3.1%	Risky

12. UX requirements

12.1 General UX

* Calculations update live when inputs change.
* Currency values formatted in euros.
* Percentages shown with one decimal place.
* Negative cash flow should be visually distinct from positive cash flow.
* Inputs should have short helper text.
* Advanced fields should be collapsible.
* Results should explain what each metric means.

12.2 Input usability

Each input should support:

* Numeric keyboard on mobile.
* Clear unit: €, %, years, months.
* Sensible minimum and maximum validation.
* Defaults that produce a realistic example.

12.3 Result interpretation

Every key metric should include a plain-language interpretation.

Examples:

Gross yield:

* “Useful for quick comparison, but ignores expenses.”

Net yield:

* “Better measure of property quality before financing and tax.”

Cash flow:

* “Shows whether the property pays for itself each month after loan and costs.”

Debt coverage:

* “Above 1 means rent covers operating costs and debt. Below 1 means you must add cash.”

13. Validation rules

Required validations:

* Purchase price must be greater than 0.
* Monthly rent must be greater than 0.
* Interest rate cannot be negative.
* Loan duration must be between 1 and 30 years.
* Vacancy must be between 0 and 183 days per year.
* Mortgage down payment is capped at total project cost and should show a warning when exceeded.
* Loan amount cannot be negative.
* Tax rates must be between 0% and 70%.
* DPE must be one of A, B, C, D, E, F, G.

When invalid:

* Show inline error.
* Disable final rating until core values are valid.
* Continue showing partial calculations where possible.

14. Copy/share output

Include a button: Copy summary.

Copied text should include:

* Purchase price.
* Total project cost.
* Monthly rent.
* Gross yield.
* Net yield before tax.
* Monthly cash flow after tax.
* Cash invested.
* Final rating.
* Main warnings.

Example:

“Rental simulation: €120,000 purchase, €137,000 total project cost, €650 rent, 5.7% gross yield on total cost, 3.8% net yield before tax, -€246/month cash flow after tax, rating: Risky.”

15. Non-functional requirements

* Must load quickly on mobile and desktop.
* Must not require login.
* Must work client-side only for V1.
* No personal financial data should be stored unless the user explicitly exports it.
* Must be responsive for mobile, tablet, and desktop.
* Accessibility: labels, keyboard navigation, sufficient contrast.
* SEO-friendly static page title and meta description.

16. Data privacy

V1 should not send calculation data to a server.

If analytics are used:

* Do not collect exact financial inputs.
* Track only generic events such as page view, calculation completed, copy summary clicked.

17. Suggested default example

Use these defaults when the user first opens the simulator:

Input	Default
Purchase price	€120,000
Notary fees	7.5%
Works	€5,000
Furniture	€3,000
Monthly rent excluding charges	€650
Vacancy	14 days/year
Non-recoverable charges	€600/year
Taxe foncière	€800/year
Recoverable TEOM	€0/year
Insurance	€120/year
Maintenance reserve	€500/year
Accounting	€300/year
CFE / furnished rental fees	€0/year
Relocation / diagnostics reserve	€0/year
Down payment	€25,000
Loan rate	3.5%
Loan duration	20 years
Borrower insurance	0.3%
Tax mode	Simplified / LMNP réel estimate
Marginal tax rate	30%
Social contributions	18.6%
DPE	D
Rental demand	Strong

18. Example calculation

Given:

* Purchase price: €120,000.
* Notary fees: €9,000.
* Works/furniture: €8,000.
* Total project cost: €137,000.
* Rent: €650/month.
* Gross annual rent: €7,800.
* Effective annual rent after 14 vacant days: about €7,501.
* Operating expenses: €2,320/year.
* Loan: €112,000.
* Interest rate: 3.5%.
* Duration: 20 years.
* Monthly debt service: approximately €678.

Results:

* Gross yield on price: 6.5%.
* Gross yield on total cost: 5.7%.
* Net operating income: about €5,181/year.
* Net yield before tax: 3.8%.
* Annual debt service: about €8,131.
* Monthly cash flow before tax: about -€246/month.
* Monthly cash flow after tax: about -€246/month with the default depreciation deduction.
* Qualitative risk score with default inputs: 28/30.
* Project rating: Risky with the default inputs, mainly because the financial score is weak despite low qualitative risk.

19. Success metrics

V1 product success can be measured by:

* Users complete a simulation.
* Users adjust at least three assumptions.
* Users use the copy/share result button.
* Users spend enough time to understand the methodology.
* Low bounce rate on mobile.

Possible analytics events:

* simulation_started
* simulation_completed
* advanced_fields_opened
* scenario_changed
* copy_summary_clicked

20. Future versions

Potential V2 features:

* Save and compare multiple properties.
* Export PDF report.
* Add ETF comparison: “What if I invested the cash instead?”
* Add 10-year projection.
* Add capital appreciation assumptions.
* Add resale scenario and IRR.
* Add LMNP réel tax module.
* Add SCI / unfurnished tax comparison.
* Add mortgage amortization table.
* Add DPE renovation cost estimator.
* Add city-level rent and vacancy assumptions.
* Add multi-language support: French and English.

21. Key product principle

The simulator should be conservative by default.

It should help users avoid bad deals, not make every project look attractive.

A good output is not only “yes, buy it.” A good output is also:

“This project looks weak after realistic expenses. You may be better off keeping liquidity or investing passively unless you can negotiate the price down or increase rent safely.”
