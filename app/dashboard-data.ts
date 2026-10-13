export type EnergyFloorData = {
  label: string;
  short: string;
  usageType: string;
  area: number | null;
  employees: number | null;
  peakDemand: number | null;
  demandValues: (number | null)[];
  values: (number | null)[];
  baseline2025?: (number | null)[];
  current2026?: (number | null)[];
  currentDemand2026?: (number | null)[];
  cost: number | null;
  costValues: (number | null)[];
};

export type EnergyDashboardData = {
  floors: Record<string, EnergyFloorData>;
  emissionFactor: number | null;
  building?: { id: string | null; name: string | null };
  reportingYear?: number;
  anomalies?: EnergyAnomaly[];
};

export type EnergyAnomaly = {
  issueId: string | null;
  floorId: string | null;
  period: string | null;
  issueType: string | null;
  severity: string | null;
  status: string | null;
  resolution: string | null;
  notes: string | null;
  year?: number;
  monthIndices?: number[];
};
