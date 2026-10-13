export type InsightTab = "overview" | "anomalies" | "forecast" | "summary";

export interface Recommendation {
  id: string;
  title: string;
  explanation: string;
  impact: "Moderate" | "High";
  floor: string;
  action: string;
}
