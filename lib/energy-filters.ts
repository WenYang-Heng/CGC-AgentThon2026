import type { EnergyFilterState, EnergyPeriod } from "@/types/energy-filters";

export const MONTHS: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES: string[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const FLOOR_IDS = Array.from({ length: 16 }, (_, index) => `F${String(index + 1).padStart(2, "0")}`);
export const DEFAULT_ENERGY_FILTERS: EnergyFilterState = { period: { year: 2026, startMonth: 0, endMonth: 11 }, floorIds: null };
export function formatFloorName(id: string): string { return FLOOR_IDS.includes(id) ? `Floor ${Number(id.slice(1))}` : id; }
export function normalizePeriod(period: Partial<EnergyPeriod>, years: number[] = [2026]): EnergyPeriod {
  const month = (value: number | undefined, fallback: number) => Number.isInteger(value) && value! >= 0 && value! <= 11 ? value! : fallback;
  const startMonth = month(period.startMonth, 0);
  return { year: years.includes(period.year ?? 0) ? period.year! : years.includes(2026) ? 2026 : years[0], startMonth, endMonth: Math.max(startMonth, month(period.endMonth, 11)) };
}
export function formatPeriodLabel(period: EnergyPeriod): string {
  if (period.startMonth === 0 && period.endMonth === 11) return `Full Year ${period.year}`;
  return `${MONTH_NAMES[period.startMonth]}${period.endMonth === period.startMonth ? "" : ` – ${MONTH_NAMES[period.endMonth]}`} ${period.year}`;
}
export function isMonthInPeriod(month: number, period: EnergyPeriod, year = period.year): boolean { return Number.isInteger(month) && year === period.year && month >= period.startMonth && month <= period.endMonth; }
export function getPeriodMonthIndices(period: EnergyPeriod): number[] { return Array.from({ length: period.endMonth - period.startMonth + 1 }, (_, index) => index + period.startMonth); }
export function normalizeFloorIds(ids: string[] | null, selection: "single" | "multi" = "multi"): string[] | null {
  const valid = [...new Set(ids?.filter(id => FLOOR_IDS.includes(id)) ?? [])].sort();
  return !valid.length || valid.length === FLOOR_IDS.length || (selection === "single" && valid.length > 1) ? null : valid;
}
export function readEnergyFilters(params: URLSearchParams, years = [2026], selection: "single" | "multi" = "multi"): EnergyFilterState {
  const number = (key: string) => /^\d+$/.test(params.get(key) ?? "") ? Number(params.get(key)) : undefined;
  return { period: normalizePeriod({ year: number("year"), startMonth: number("startMonth"), endMonth: number("endMonth") }, years), floorIds: normalizeFloorIds(params.get("floors")?.split(",") ?? null, selection) };
}
export function writeEnergyFilters(params: URLSearchParams, value: EnergyFilterState): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set("year", String(value.period.year)); next.set("startMonth", String(value.period.startMonth)); next.set("endMonth", String(value.period.endMonth));
  const ids = normalizeFloorIds(value.floorIds);
  if (ids) next.set("floors", ids.join(",")); else next.delete("floors");
  return next;
}
export function energyNavigationHref(href: string, params: URLSearchParams): string {
  if (!params.has("year") && !params.has("startMonth") && !params.has("endMonth") && !params.has("floors")) return href;
  const target = new URL(href, "https://local.invalid");
  const single = ["/insights", "/building"].includes(target.pathname);
  const years = ["/savings", "/report-energy-waste"].includes(target.pathname) ? [2025, 2026] : [2026];
  const next = writeEnergyFilters(target.searchParams, readEnergyFilters(params, years, single ? "single" : "multi"));
  if (single && (normalizeFloorIds(params.get("floors")?.split(",") ?? null)?.length ?? 0) > 1) next.set("scopeNotice", "multi-floor");
  return `${target.pathname}?${next}`;
}
