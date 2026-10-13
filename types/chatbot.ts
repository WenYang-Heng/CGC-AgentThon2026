import type { ConsentAction } from "@/lib/copilot-consent";
import type { CopilotDashboardPayload } from "@/lib/copilot-dashboard-data";
import type { CopilotRecommendationsPayload } from "@/lib/copilot-recommendations-data";

export type MessageSender = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  consentActions?: ConsentAction[];
  consentActivityId?: string;
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
  dashboardPayload?: CopilotDashboardPayload;
  recommendationsPayload?: CopilotRecommendationsPayload;
}
