export interface SavingsOpportunity {
  id: string;
  category: string;
  action: string;
  trigger: string | null;
  estimateType: string | null;
  estimatedKwhSaving: number | null;
  reportedRmSaving: number | null;
  calculatedRmSaving: number | null;
  reportedCo2eTonnes: number | null;
  confidence: string | null;
  approvalStatus: string | null;
  ownerFunction: string | null;
  savingPeriod: string | null;
  disclaimer: string | null;
  sourceType: string | null;
  evidenceSource: string | null;
}

export interface SavingsSummary {
  grossEnergyOpportunityKwh: number | null;
  grossFinancialOpportunityRm: number | null;
  opportunityPercentageOfBaseline: number | null;
  quantifiedOpportunityCount: number;
  totalOpportunityCount: number;
  highConfidenceCount: number;
}

export interface OperationalSignal {
  id: string;
  floorId: string;
  period: string;
  description: string;
  severity: string;
  source: "2026 generated prototype" | "Undated prototype example";
  relatedIds: string[];
  reason: string;
}

export interface SavingsPageData {
  costFloors: CostFloorData[];
  opportunities: SavingsOpportunity[];
  summary: SavingsSummary;
  baselineAnnualConsumptionKwh: number | null;
  operationalSignals: OperationalSignal[];
  excludedScenarioCount: number;
}

export interface SavingsFilters { category: string; confidence: string; status: string }

export interface MonthlyCostReading { energyKwh: number | null; costRm: number | null }
export interface CostFloorData {
  floorId: string;
  floorName: string;
  usageType: string | null;
  areaM2: number | null;
  employees2025: number | null;
  employees2026: number | null;
  baseline: MonthlyCostReading[];
  generated: MonthlyCostReading[];
}
export interface FloorCostPerformance {
  floorId: string;
  floorName: string;
  usageType: string | null;
  electricityKwh: number | null;
  costRm: number | null;
  employees: number | null;
  areaM2: number | null;
  costPerEmployee: number | null;
  costPerM2: number | null;
  effectiveRateRmPerKwh: number | null;
}
