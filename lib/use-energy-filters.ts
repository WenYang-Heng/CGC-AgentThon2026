"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useOptimistic, useTransition } from "react";
import { normalizeFloorIds, normalizePeriod, readEnergyFilters, writeEnergyFilters } from "./energy-filters";
import type { EnergyFilterState } from "@/types/energy-filters";

export function useEnergyFilters({ years = [2026], selection = "multi" }: { years?: number[]; selection?: "single" | "multi" } = {}) {
  const params = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const query = params.toString();
  const yearsKey = years.join(",");
  const canonical = useMemo(() => readEnergyFilters(new URLSearchParams(query), yearsKey.split(",").map(Number), selection), [query, yearsKey, selection]);
  const [value, setOptimistic] = useOptimistic(canonical);
  const [, startTransition] = useTransition();
  const rawIds = normalizeFloorIds(params.get("floors")?.split(",") ?? null);
  const multiNotice = selection === "single" && ((rawIds?.length ?? 0) > 1 || params.get("scopeNotice") === "multi-floor");
  const yearNotice = params.has("year") && !years.includes(Number(params.get("year")));
  return {
    value,
    notice: multiNotice ? "This page supports one floor at a time. Showing All Floors instead of the previous multi-floor selection." : yearNotice ? `Showing ${value.period.year}; the requested year is not available on this page.` : undefined,
    onChange(next: EnergyFilterState) {
      const normalized = { period: normalizePeriod(next.period, years), floorIds: normalizeFloorIds(next.floorIds, selection) };
      const updated = writeEnergyFilters(new URLSearchParams(params.toString()), normalized); updated.delete("scopeNotice");
      if (updated.toString() !== params.toString()) startTransition(() => {
        setOptimistic(normalized);
        router.replace(`${pathname}?${updated}`, { scroll: false });
      });
    },
  };
}
