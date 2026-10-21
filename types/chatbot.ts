import type { ConsentAction } from "@/lib/copilot-consent";
import type { CopilotDashboardPayload } from "@/lib/copilot-dashboard-data";
import type { CopilotRecommendationsPayload } from "@/lib/copilot-recommendations-data";
import type { CopilotManagementSummaryPayload } from "@/types/insights";

export type MessageSender = "user" | "assistant" | "system";

export interface ChatChoice {
  title: string;
  type: "imBack" | "messageBack";
  value: unknown;
  text?: string;
  activityId?: string;
}

export interface EmailEnergyInsightsRequest {
  building: string;
  floorId: string | null;
  floorName: string;
  analysisPeriod: string;
  summary: string;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  consentActions?: ConsentAction[];
  consentActivityId?: string;
  choices?: ChatChoice[];
  attachments?: { name: string; size: number; file?: File }[];
}

export interface ChatContext {
  page?: string;
  building?: string;
  selectedFloor?: string;
  selectedDateRange?: string;
  floorId?: string | null;
  floorName?: string | null;
  month?: string | null;
  year?: number | null;
  analysisPeriod?: string | null;
  hasAnomalies?: boolean;
  forecastRelevant?: boolean;
  currentAnomaly?: {
    baselineDeviation?: number;
    timeRange?: string;
  };
}

export interface ChatResponse {
  text: string;
  consentActions?: ConsentAction[];
  consentActivityId?: string;
  choices?: ChatChoice[];
  dashboardPayload?: CopilotDashboardPayload;
  recommendationsPayload?: CopilotRecommendationsPayload;
  managementSummaryPayload?: CopilotManagementSummaryPayload;
}
