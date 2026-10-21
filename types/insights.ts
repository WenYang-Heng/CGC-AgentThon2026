export type InsightTab = "overview" | "anomalies" | "forecast" | "summary";

export interface ManagementSummaryRequest {
  floorId: string | null;
  floorName: string;
  analysisPeriod: string;
  baselineYear: number;
  currentYear: number;
  forecastYear: number;
  baselineKWh: number | null;
  currentKWh: number | null;
  changePercent: number | null;
  forecastKWh: number | null;
  highestForecastMonth: string | null;
  forecastMethod: string;
  anomalyCount: number;
  anomalyMonths: string[];
}

export interface ManagementSummary {
  headline: string;
  summary: string;
  keyConcern: string;
  recommendedFocus: string;
}

export interface CopilotManagementSummaryPayload {
  managementSummary: ManagementSummary;
}

export interface Recommendation {
  id: string;
  title: string;
  explanation: string;
  impact: "Moderate" | "High";
  floor: string;
  action: string;
}
