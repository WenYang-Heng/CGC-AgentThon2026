export type AnomalySeverity = "low" | "medium" | "high";

// Prototype anomaly cards use time-of-day examples, not monthly metered records.
export interface EnergyAnomaly {
  id: string;
  floor: string;
  startTime: string;
  endTime: string;
  severity: AnomalySeverity;
  baselineDeviation: number;
  description: string;
  possibleCauses: string[];
  recommendedAction: string;
}
