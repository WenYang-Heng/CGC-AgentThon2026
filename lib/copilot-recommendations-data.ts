import type { Recommendation } from "@/types/insights";

export type CopilotRecommendationsPayload = {
  recommendations: Recommendation[];
};

function jsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const candidate = fenced ?? (start >= 0 && end > start ? text.slice(start, end + 1) : "");
  if (!candidate) return;
  try { return JSON.parse(candidate); } catch { return; }
}

export function parseCopilotRecommendations(messages: string[]): CopilotRecommendationsPayload | undefined {
  for (const message of [...messages].reverse()) {
    const value = jsonObject(message);
    if (!value || typeof value !== "object" || !Array.isArray((value as { recommendations?: unknown }).recommendations)) continue;
    const recommendations = (value as { recommendations: unknown[] }).recommendations.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const recommendation = item as Record<string, unknown>;
      if (
        typeof recommendation.id !== "string" ||
        typeof recommendation.title !== "string" ||
        typeof recommendation.explanation !== "string" ||
        typeof recommendation.action !== "string" ||
        (recommendation.impact !== "High" && recommendation.impact !== "Moderate")
      ) return [];
      const floor = typeof recommendation.floorName === "string"
        ? recommendation.floorName
        : typeof recommendation.floor === "string"
          ? recommendation.floor
          : typeof recommendation.floorId === "string"
            ? recommendation.floorId
            : "All Floors";
      return [{
        id: recommendation.id,
        title: recommendation.title,
        explanation: recommendation.explanation,
        impact: recommendation.impact,
        floor,
        action: recommendation.action,
      } satisfies Recommendation];
    });
    return { recommendations };
  }
}
