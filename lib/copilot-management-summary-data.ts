import type { CopilotManagementSummaryPayload, ManagementSummary } from "@/types/insights";

function summaryFromValue(value: unknown, depth = 0): CopilotManagementSummaryPayload | undefined {
  if (depth > 3 || !value || typeof value !== "object" || Array.isArray(value)) return;
  const record = value as Record<string, unknown>;
  const candidate = record.managementSummary ?? record;
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const fields = candidate as Record<string, unknown>;
    if (typeof fields.headline === "string" && typeof fields.summary === "string"
      && typeof fields.keyConcern === "string" && typeof fields.recommendedFocus === "string") {
      return { managementSummary: {
        headline: fields.headline, summary: fields.summary,
        keyConcern: fields.keyConcern, recommendedFocus: fields.recommendedFocus,
      } };
    }
  }
  // AI Builder returns model metadata with the generated JSON in `text`.
  if (typeof record.text === "string") {
    try { return summaryFromValue(JSON.parse(record.text), depth + 1); } catch { return; }
  }
}

export function parseCopilotManagementSummary(messages: string[]): CopilotManagementSummaryPayload | undefined {
  for (const message of [...messages].reverse()) {
    const fenced = message.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const start = message.indexOf("{");
    const end = message.lastIndexOf("}");
    const candidate = fenced ?? (start >= 0 && end > start ? message.slice(start, end + 1) : "");
    try {
      const value: unknown = JSON.parse(candidate);
      const payload = summaryFromValue(value);
      if (payload) return payload;
    } catch { /* Unstructured or malformed agent messages are not summaries. */ }
  }
}

export function managementSummaryToText(summary: ManagementSummary): string {
  return `${summary.headline}\n\n${summary.summary}\n\nKey concern:\n${summary.keyConcern}\n\nRecommended focus:\n${summary.recommendedFocus}`;
}
