import "server-only";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { anomalyMockData } from "@/data/anomaly-mock-data";
import { nonnegativeNumber, relateSignal, summarizeOpportunities } from "@/lib/savings-calculations";
import type { CostFloorData, OperationalSignal, SavingsOpportunity, SavingsPageData } from "@/types/savings";

type Row = Record<string, unknown>;
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
function readWorkbook(filename: string) {
  return XLSX.read(fs.readFileSync(path.join(process.cwd(), "data", filename)), { type: "buffer", cellDates: false });
}
function rows(workbook: XLSX.WorkBook, name: string, required: string[]): Row[] {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Missing sheet ${name}`);
  const headers = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 2 })[0] ?? [];
  if (required.some(column => !headers.includes(column))) throw new Error(`Invalid columns in ${name}`);
  return XLSX.utils.sheet_to_json<Row>(sheet, { range: 2, defval: null });
}

export function loadSavingsData(): SavingsPageData {
  const baseline = readWorkbook("CGC_Energy_AgentThon_Data_Template_1.xlsx");
  const prototype = readWorkbook("CGC_Energy_2026_Mock_Only.xlsx");
  const metadata = rows(baseline, "Floor_Master", ["Floor_ID", "Floor_Name", "Area_m2", "Floor_Use"]);
  const occupancy = (workbook: XLSX.WorkBook, sheet: string) => new Map(rows(workbook, sheet, ["Floor_ID", "Employee_Count"]).filter(row => text(row.Floor_ID)).map(row => [String(row.Floor_ID), nonnegativeNumber(row.Employee_Count)]));
  const baselineOccupancy = occupancy(baseline, "Occupancy");
  const generatedOccupancy = occupancy(prototype, "Occupancy_2026_Mock");
  const costFloors: CostFloorData[] = Array.from({ length: 16 }, (_, index) => {
    const floorId = `F${String(index + 1).padStart(2, "0")}`;
    const floor = metadata.find(row => row.Floor_ID === floorId);
    return { floorId, floorName: text(floor?.Floor_Name) ?? floorId, usageType: text(floor?.Floor_Use), areaM2: nonnegativeNumber(floor?.Area_m2),
      employees2025: baselineOccupancy.get(floorId) ?? null, employees2026: generatedOccupancy.get(floorId) ?? null,
      baseline: Array.from({ length: 12 }, () => ({ energyKwh: null, costRm: null })), generated: Array.from({ length: 12 }, () => ({ energyKwh: null, costRm: null })) };
  });
  for (const [workbook, sheet, year, field] of [[baseline, "Energy_Data", 2025, "baseline"], [prototype, "Energy_Data_2026_Mock", 2026, "generated"]] as const) {
    const seen = new Set<string>();
    for (const row of rows(workbook, sheet, ["Floor_ID", "Month", "Cost_RM", "Electricity_kWh"])) {
      const floor = costFloors.find(item => item.floorId === row.Floor_ID);
      if (!floor) continue;
      const date = typeof row.Month === "number" ? XLSX.SSF.parse_date_code(row.Month) : null;
      if (date?.y !== year || date.m < 1 || date.m > 12) throw new Error("Invalid cost reporting date");
      const key = `${floor.floorId}-${date.m}`;
      if (seen.has(key)) throw new Error("Duplicate cost floor/month");
      seen.add(key);
      // Negative source bills can be legitimate meter-reconciliation credits.
      floor[field][date.m - 1] = { costRm: typeof row.Cost_RM === "number" && Number.isFinite(row.Cost_RM) ? row.Cost_RM : null, energyKwh: nonnegativeNumber(row.Electricity_kWh) };
    }
  }
  const recommendations = rows(baseline, "Recommendations", ["Recommendation_ID", "Source_Type", "Estimated_kWh_Saving", "Source_Reported_RM_Saving", "Calculated_RM_Saving", "Saving_Period", "Recommended_Action"]);
  const opportunities: SavingsOpportunity[] = recommendations
    .filter(row => row.Source_Type === "CGC Energy Audit" && row.Saving_Period === "Annual")
    .map(row => ({
      id: String(row.Recommendation_ID), category: text(row.Category) ?? "Unspecified", action: text(row.Recommended_Action) ?? "Action not specified",
      trigger: text(row.Trigger_Condition), estimateType: text(row.Estimate_Type),
      estimatedKwhSaving: nonnegativeNumber(row.Estimated_kWh_Saving), reportedRmSaving: nonnegativeNumber(row.Source_Reported_RM_Saving), calculatedRmSaving: nonnegativeNumber(row.Calculated_RM_Saving),
      reportedCo2eTonnes: nonnegativeNumber(row.Source_Reported_CO2e_t), confidence: text(row.Confidence), approvalStatus: text(row.Approval_Status),
      ownerFunction: text(row.Owner_Function), savingPeriod: text(row.Saving_Period), disclaimer: text(row.Disclaimer), sourceType: text(row.Source_Type), evidenceSource: text(row.Evidence_Source),
    }));
  if (new Set(opportunities.map(item => item.id)).size !== opportunities.length) throw new Error("Duplicate recommendation IDs");
  const readings = rows(baseline, "Energy_Data", ["Floor_ID", "Month", "Electricity_kWh"]);
  const values = new Map<string, number | null>();
  for (const row of readings) {
    if (!/^F(0[1-9]|1[0-6])$/.test(String(row.Floor_ID))) continue;
    const date = typeof row.Month === "number" ? XLSX.SSF.parse_date_code(row.Month) : null;
    if (date?.y !== 2025) throw new Error("Invalid baseline reporting date");
    const key = `${row.Floor_ID}-${date.m}`;
    if (values.has(key)) throw new Error("Duplicate baseline floor/month");
    values.set(key, nonnegativeNumber(row.Electricity_kWh));
  }
  const baselineAnnualConsumptionKwh = values.size === 192 && [...values.values()].every(value => value !== null)
    ? [...values.values()].reduce<number>((sum, value) => sum + value!, 0) : null;
  const operationalSignals: OperationalSignal[] = rows(prototype, "Data_Issue_Log_2026_Mock", ["Issue_ID", "Floor_ID", "Issue_Type", "Period", "Notes"]).filter(row => text(row.Issue_ID)).map(row => {
    const description = [text(row.Issue_Type), text(row.Notes)].filter(Boolean).join(" — ");
    return { id: String(row.Issue_ID), floorId: String(row.Floor_ID), period: text(row.Period) ?? "Period unavailable", description,
      severity: text(row.Severity) ?? "Unspecified", source: "2026 generated prototype", ...relateSignal(description, opportunities) };
  });
  for (const anomaly of anomalyMockData.anomalies) {
    const description = `${anomaly.description} ${anomaly.possibleCauses.join("; ")}`;
    operationalSignals.push({ id: anomaly.id, floorId: `F${String(Number(anomaly.floor.replace("Floor ", ""))).padStart(2, "0")}`, period: `${anomaly.startTime}–${anomaly.endTime}; date unavailable`, description,
      severity: anomaly.severity, source: "Undated prototype example", ...relateSignal(description, opportunities) });
  }
  return { costFloors, opportunities, summary: summarizeOpportunities(opportunities, baselineAnnualConsumptionKwh), baselineAnnualConsumptionKwh,
    operationalSignals, excludedScenarioCount: recommendations.filter(row => text(row.Recommendation_ID) && !(row.Source_Type === "CGC Energy Audit" && row.Saving_Period === "Annual")).length };
}
