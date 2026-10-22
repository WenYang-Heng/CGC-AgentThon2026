import type { CostFloorData, FloorCostPerformance, OperationalSignal, SavingsFilters, SavingsOpportunity, SavingsSummary } from "@/types/savings";

export function completeSum(values: (number | null)[]): number | null {
  return values.length && values.every(value => value !== null && Number.isFinite(value))
    ? values.reduce<number>((total, value) => total + value!, 0) : null;
}
export function safeRatio(numerator: number | null, denominator: number | null): number | null {
  return numerator !== null && denominator !== null && Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : null;
}
export function calculateFloorCosts(floors: CostFloorData[], year: 2025 | 2026, start: number, end: number): FloorCostPerformance[] {
  return floors.map(floor => {
    const readings = (year === 2025 ? floor.baseline : floor.generated).slice(start, end + 1);
    const costRm = completeSum(readings.map(row => row.costRm));
    const electricityKwh = completeSum(readings.map(row => row.energyKwh));
    const employees = year === 2025 ? floor.employees2025 : floor.employees2026;
    return { floorId: floor.floorId, floorName: floor.floorName, usageType: floor.usageType, costRm, electricityKwh, employees, areaM2: floor.areaM2,
      costPerEmployee: safeRatio(costRm, employees), costPerM2: safeRatio(costRm, floor.areaM2), effectiveRateRmPerKwh: safeRatio(costRm, electricityKwh) };
  });
}
export function summarizeCosts(floors: FloorCostPerformance[]) {
  const totalCostRm = completeSum(floors.map(floor => floor.costRm));
  const employeeEligible = floors.filter(floor => floor.costRm !== null && floor.employees !== null);
  const employeeEligibleCost = completeSum(employeeEligible.map(floor => floor.costRm));
  const employeeTotal = completeSum(employeeEligible.map(floor => floor.employees));
  return { totalCostRm, effectiveRateRmPerKwh: safeRatio(totalCostRm, completeSum(floors.map(floor => floor.electricityKwh))),
    costPerEmployee: safeRatio(employeeEligibleCost, employeeTotal), costPerM2: safeRatio(totalCostRm, completeSum(floors.map(floor => floor.areaM2))),
    employeeCoverage: employeeEligible.length, floorCount: floors.length };
}
export function planningValue(gross: number | null, rate: number): number | null {
  return gross !== null && Number.isFinite(gross) && gross >= 0 && Number.isFinite(rate) && rate >= 0 && rate <= 1 ? gross * rate : null;
}
export function postActionConsumption(forecast: number | null, saving: number | null): number | null {
  return forecast !== null && saving !== null && Number.isFinite(forecast) && Number.isFinite(saving) && forecast >= 0 && saving >= 0 && saving <= forecast ? forecast - saving : null;
}
export function formatRm(value: number | null, digits = 0): string {
  return value === null ? "Unavailable" : `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function nonnegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

export function getFinancialOpportunity(opportunity: SavingsOpportunity): number | null {
  return nonnegativeNumber(opportunity.reportedRmSaving) ?? nonnegativeNumber(opportunity.calculatedRmSaving);
}

function quantifiedSum(values: (number | null)[]): number | null {
  const quantified = values.filter((value): value is number => value !== null);
  return quantified.length ? quantified.reduce((sum, value) => sum + value, 0) : null;
}

export function filterOpportunities(opportunities: SavingsOpportunity[], filters: SavingsFilters): SavingsOpportunity[] {
  return opportunities.filter(item => (!filters.category || item.category === filters.category)
    && (!filters.confidence || item.confidence === filters.confidence)
    && (!filters.status || item.approvalStatus === filters.status));
}

export function summarizeOpportunities(opportunities: SavingsOpportunity[], baseline: number | null): SavingsSummary {
  const energy = quantifiedSum(opportunities.map(item => nonnegativeNumber(item.estimatedKwhSaving)));
  return {
    grossEnergyOpportunityKwh: energy,
    grossFinancialOpportunityRm: quantifiedSum(opportunities.map(getFinancialOpportunity)),
    opportunityPercentageOfBaseline: energy !== null && baseline !== null && Number.isFinite(baseline) && baseline > 0 ? energy / baseline * 100 : null,
    quantifiedOpportunityCount: opportunities.filter(item => nonnegativeNumber(item.estimatedKwhSaving) !== null || getFinancialOpportunity(item) !== null).length,
    totalOpportunityCount: opportunities.length,
    highConfidenceCount: opportunities.filter(item => item.confidence?.toLowerCase() === "high").length,
  };
}

export function formatEnergySaving(value: number | null): string {
  return value === null ? "Not quantified" : value >= 1000 ? `${(value / 1000).toLocaleString("en-MY", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MWh/year` : `${value.toLocaleString("en-MY")} kWh/year`;
}
export function formatCurrencyMYR(value: number | null): string {
  return value === null ? "Not quantified" : `RM ${value.toLocaleString("en-MY", { maximumFractionDigits: 0 })}/year`;
}

export function rankOpportunities(opportunities: SavingsOpportunity[], metric: "energy" | "financial"): SavingsOpportunity[] {
  const value = (item: SavingsOpportunity) => metric === "energy" ? nonnegativeNumber(item.estimatedKwhSaving) : getFinancialOpportunity(item);
  return [...opportunities].sort((a, b) => (value(b) ?? -1) - (value(a) ?? -1) || a.id.localeCompare(b.id));
}

export function hasPotentialOverlap(opportunities: SavingsOpportunity[]): boolean {
  const categories = opportunities.map(item => item.category);
  return new Set(categories).size < categories.length
    || (categories.includes("Air-conditioning") && categories.includes("Data Centre"))
    || (categories.includes("Baseload") && categories.some(category => ["Air-conditioning", "Data Centre", "Lighting"].includes(category)))
    || (categories.includes("Energy Management") && categories.length > 1);
}

// Association by subject matter, never floor attribution or a causal saving calculation.
export function relateSignal(description: string, opportunities: SavingsOpportunity[]): Pick<OperationalSignal, "relatedIds" | "reason"> {
  if (/reconciliation|usage drop|low usage|partial.occupancy/i.test(description)) return { relatedIds: [], reason: "Validate metering or occupancy first; no savings amount is inferred." };
  const afterHours = /after.hours|night|weekend/i.test(description);
  const cooling = /cooling|ahu/i.test(description);
  const lighting = /lighting/i.test(description);
  const relatedIds = opportunities.filter(item =>
    (afterHours && (item.category === "Baseload" || /after.hours|night|weekend/i.test(item.trigger ?? "")))
    || (cooling && ["Air-conditioning", "Data Centre"].includes(item.category))
    || (lighting && item.category === "Lighting")
  ).map(item => item.id);
  return { relatedIds, reason: relatedIds.length ? "Matched by after-hours, cooling or lighting wording to audit category/trigger. Building-wide opportunities; no floor-specific saving is assigned." : "No direct category/trigger match; investigate before assigning an opportunity." };
}
