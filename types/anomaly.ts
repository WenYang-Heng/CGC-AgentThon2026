export type AnomalySeverity = "low" | "medium" | "high";

// Monthly prototype scenarios; no hourly or interval readings are available.
export interface EnergyAnomaly {
  id: string;
  floorId: string;
  floorName: string;
  month: string;
  severity: AnomalySeverity;
  actualKWh: number;
  expectedKWh: number | null;
  deviationPercent: number | null;
  type: string;
  description: string;
  possibleCauses: string[];
  recommendedAction: string;
  status?: "Unresolved" | "Resolved";
}
