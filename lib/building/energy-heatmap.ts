import type { EnergyPeriod } from "@/types/energy-filters";
import type { EnergyFloorData } from "@/app/dashboard-data";

export type HeatmapMetric = "usage" | "intensity";
export interface FloorHeatmapReading {
  floorId: string; name: string; usage: number | null; baseline: number | null;
  change: number | null; value: number | null; color: string;
}
const available = (value: number | null | undefined): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
export function buildEnergyHeatmap(floors: Record<string, EnergyFloorData>, ids: string[], month: number | "year" | EnergyPeriod, metric: HeatmapMetric) {
  const periodUsage = (values: (number | null)[] | undefined) => {
    if (typeof month === "number") return available(values?.[month]);
    const start = month === "year" ? 0 : month.startMonth;
    const end = month === "year" ? 11 : month.endMonth;
    const months = Array.from({ length: end - start + 1 }, (_, index) => available(values?.[index + start]));
    return months.every((value): value is number => value !== null) ? months.reduce((sum, value) => sum + value, 0) : null;
  };
  const readings = ids.map(floorId => {
    const floor = floors[floorId];
    const usage = periodUsage(floor?.current2026);
    const baseline = periodUsage(floor?.baseline2025);
    const area = available(floor?.area);
    const value = metric === "usage" ? usage : usage !== null && area !== null && area > 0 ? usage / area : null;
    return { floorId, name: floor?.label ?? floorId, usage, baseline, value,
      change: usage !== null && baseline !== null && baseline > 0 ? (usage - baseline) / baseline * 100 : null };
  });
  const values = readings.flatMap(item => item.value === null ? [] : [item.value]);
  const maximum = values.length ? Math.max(...values) : null;
  const roughStep = (maximum ?? 0) > 0 ? maximum! / 5 : 1;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = ([1, 2, 2.5, 5, 10].find(multiplier => multiplier * magnitude >= roughStep) ?? 10) * magnitude;
  const scaleMaximum = maximum === null ? null : Math.max(step, Math.ceil(maximum / step) * step);
  const ticks = scaleMaximum === null ? [] : Array.from({ length: Math.round(scaleMaximum / step) + 1 }, (_, index) => Number((index * step).toPrecision(12))).reverse();
  const colors = [[219, 234, 254], [96, 165, 250], [250, 204, 21], [220, 38, 38]];
  const color = (value: number | null) => {
    if (value === null || maximum === null) return "#9ca3af";
    const position = value / scaleMaximum! * (colors.length - 1);
    const index = Math.min(colors.length - 2, Math.floor(position)), fraction = position - index;
    return `rgb(${colors[index].map((channel, i) => Math.round(channel + (colors[index + 1][i] - channel) * fraction)).join(",")})`;
  };
  return { maximum, scaleMaximum, ticks, readings: Object.fromEntries(readings.map(item => [item.floorId, { ...item, color: color(item.value) }])) as Record<string, FloorHeatmapReading> };
}
