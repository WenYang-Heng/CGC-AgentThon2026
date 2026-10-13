import type { EnergyDashboardData, EnergyFloorData } from "@/app/dashboard-data";

type CopilotFloor = {
  id?: unknown;
  name?: unknown;
  usageType?: unknown;
  employeeCount?: unknown;
  monthlyElectricityKWh?: unknown;
};

export type CopilotDashboardPayload = {
  reportingYear?: unknown;
  building?: unknown;
  totalElectricityKWh?: unknown;
  totalEmployeeCount?: unknown;
  floors?: unknown;
  anomalies?: unknown;
};

function jsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate.trim()) return;
  try {
    const value: unknown = JSON.parse(candidate);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as CopilotDashboardPayload
      : undefined;
  } catch {
    return;
  }
}

export function parseCopilotDashboardPayload(messages: string[]) {
  for (const message of [...messages].reverse()) {
    const payload = jsonObject(message);
    if (payload && Array.isArray(payload.floors)) return payload;
  }
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function mergeCopilotDashboardData(
  current: EnergyDashboardData,
  payload: CopilotDashboardPayload,
): EnergyDashboardData {
  const nextFloors = { ...current.floors };
  const incomingFloors = Array.isArray(payload.floors) ? payload.floors : [];

  for (const incoming of incomingFloors) {
    if (!incoming || typeof incoming !== "object") continue;
    const floor = incoming as CopilotFloor;
    if (typeof floor.id !== "string" || !/^F\d{2}$/i.test(floor.id)) continue;
    const id = floor.id.toUpperCase();
    const existing: EnergyFloorData = nextFloors[id] ?? {
      label: id,
      short: id,
      usageType: "Not specified",
      area: 0,
      employees: 0,
      peakDemand: 0,
      demandValues: Array(12).fill(0),
      values: Array(12).fill(0),
      cost: 0,
      costValues: Array(12).fill(0),
    };
    const values = [...existing.values];
    if (Array.isArray(floor.monthlyElectricityKWh)) {
      for (let index = 0; index < 12; index += 1) {
        const value = finiteNumber(floor.monthlyElectricityKWh[index]);
        if (value !== undefined) values[index] = value;
      }
    }
    nextFloors[id] = {
      ...existing,
      label: typeof floor.name === "string" && floor.name.trim() ? floor.name : existing.label,
      usageType: typeof floor.usageType === "string" && floor.usageType.trim()
        ? floor.usageType
        : existing.usageType,
      employees: finiteNumber(floor.employeeCount) ?? existing.employees,
      values,
    };
  }

  const building = payload.building && typeof payload.building === "object"
    ? payload.building as Record<string, unknown>
    : undefined;
  const anomalies = Array.isArray(payload.anomalies)
    ? payload.anomalies.filter((item) => item && typeof item === "object").map((item) => {
        const anomaly = item as Record<string, unknown>;
        return {
          issueId: nullableText(anomaly.issueId),
          floorId: nullableText(anomaly.floorId),
          period: nullableText(anomaly.period),
          issueType: nullableText(anomaly.issueType),
          severity: nullableText(anomaly.severity),
          status: nullableText(anomaly.status),
          resolution: nullableText(anomaly.resolution),
          notes: nullableText(anomaly.notes),
        };
      })
    : current.anomalies;

  return {
    ...current,
    floors: nextFloors,
    reportingYear: finiteNumber(payload.reportingYear) ?? current.reportingYear,
    building: building ? {
      id: nullableText(building.id) ?? current.building?.id ?? null,
      name: nullableText(building.name) ?? current.building?.name ?? null,
    } : current.building,
    anomalies,
  };
}
