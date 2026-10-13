import "server-only";

import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

import type {
  EnergyDashboardData,
  EnergyFloorData,
} from "@/app/dashboard-data";

type SheetRow = Record<string, string | number | Date | undefined>;

const workbookPath = path.join(
  process.cwd(),
  "data",
  "CGC_Energy_AgentThon_Data_Template_1.xlsx"
);

function rowsFromSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
) {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Workbook sheet "${sheetName}" was not found.`);
  }

  return XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    range: 2,
    raw: true,
    defval: undefined,
  });
}

function monthIndex(value: SheetRow[string]) {
  if (typeof value === "number") return (XLSX.SSF.parse_date_code(value)?.m ?? 0) - 1;
  if (value instanceof Date) {
    return value.getUTCMonth();
  }

  const match = String(value ?? "").match(/(?:^|-)\s*(\d{1,2})(?:-|\/)/);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return parsed >= 1 && parsed <= 12 ? parsed - 1 : -1;
}

function loadBaselineData(): EnergyDashboardData {
  const workbook = XLSX.read(fs.readFileSync(workbookPath), {
    type: "buffer",
    cellDates: false,
  });

  const energyRows = rowsFromSheet(workbook, "Energy_Data");
  const floorRows = rowsFromSheet(workbook, "Floor_Master");
  const occupancyRows = rowsFromSheet(workbook, "Occupancy");
  const emissionRows = rowsFromSheet(workbook, "Emission_Factor");
  const issueRows = rowsFromSheet(workbook, "Data_Issue_Log");

  const floorMetadata = new Map(
    floorRows.map((row) => [String(row.Floor_ID), row])
  );
  const occupancy = new Map(
    occupancyRows.map((row) => [
      String(row.Floor_ID),
      numeric(row.Employee_Count),
    ])
  );

  const floors: Record<string, EnergyFloorData> = {};
  const seen = new Set<string>();

  for (const row of energyRows) {
    const id = String(row.Floor_ID ?? "");
    const index = monthIndex(row.Month);

    if (!/^F(0[1-9]|1[0-6])$/.test(id) || index < 0) {
      continue;
    }
    const date = typeof row.Month === "number" ? XLSX.SSF.parse_date_code(row.Month) : null;
    if (index > 11 || date?.y !== 2025) throw new Error(`Invalid 2025 reporting date for ${id}`);
    const key = `${id}-${index}`;
    if (seen.has(key)) throw new Error(`Duplicate 2025 floor/month: ${key}`);
    seen.add(key);

    const metadata = floorMetadata.get(id);
    const floor =
      floors[id] ??
      (floors[id] = {
        label: String(metadata?.Floor_Name ?? id),
        short: id,
        usageType: String(metadata?.Floor_Use ?? "Not specified"),
        area: numeric(metadata?.Area_m2),
        employees: occupancy.get(id) ?? null,
        peakDemand: null,
        demandValues: Array(12).fill(null),
        values: Array(12).fill(null),
        cost: null,
        costValues: Array(12).fill(null),
      });

    floor.values[index] = numeric(row.Electricity_kWh);
    floor.costValues[index] = numeric(row.Cost_RM);
    floor.demandValues[index] = numeric(row.Max_Demand_kW);
  }

  for (const floor of Object.values(floors)) {
    floor.cost = floor.costValues.some(value => value === null) ? null : floor.costValues.reduce<number>((sum, value) => sum + value!, 0);
    const demands = floor.demandValues.filter((value): value is number => value !== null);
    floor.peakDemand = demands.length ? Math.max(...demands) : null;
  }
  const emissionFactor =
    numeric(
      emissionRows.find((row) => Number(row.Year) === 2025)
        ?.Factor_Value
    );

  const anomalies = issueRows.filter(row => row.Issue_ID != null).map((row) => ({
    issueId: row.Issue_ID == null ? null : String(row.Issue_ID),
    floorId: row.Floor_ID == null ? null : String(row.Floor_ID),
    period: row.Period == null ? null : String(row.Period),
    issueType: row.Issue_Type == null ? null : String(row.Issue_Type),
    severity: row.Severity == null ? null : String(row.Severity),
    status: row.Status == null ? null : String(row.Status),
    resolution: row.Resolution == null ? null : String(row.Resolution),
    notes: row.Notes == null ? null : String(row.Notes),
  }));

  return {
    floors,
    emissionFactor,
    building: { id: "MCGC", name: "Menara CGC" },
    reportingYear: 2025,
    anomalies,
  };
}

function numeric(value: SheetRow[string]): number | null {
  if (value == null || value === "" || value instanceof Date) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const monthAbbreviations = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function issueMonths(period: string | null): number[] {
  const names = period?.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/g) ?? [];
  const indices = names.map(name => monthAbbreviations.indexOf(name.slice(0, 3)));
  return indices.length === 2 && indices[1] >= indices[0]
    ? Array.from({ length: indices[1] - indices[0] + 1 }, (_, i) => indices[0] + i)
    : indices;
}

export function loadEnergyDashboardData(): EnergyDashboardData {
  const data = loadBaselineData();
  const workbook = XLSX.read(fs.readFileSync(path.join(process.cwd(), "data", "CGC_Energy_2026_Mock_Only.xlsx")), { type: "buffer", cellDates: false });
  // Explicitly include every supported floor; an absent baseline stays unknown.
  for (let number = 1; number <= 16; number++) {
    const id = `F${String(number).padStart(2, "0")}`;
    const floor = data.floors[id] ?? (data.floors[id] = {
      label: id, short: id, usageType: "Not specified", area: null, employees: null,
      values: Array(12).fill(null), demandValues: Array(12).fill(null), costValues: Array(12).fill(null), cost: null, peakDemand: null,
    });
    floor.baseline2025 = [...floor.values];
    floor.current2026 = Array(12).fill(null);
    floor.currentDemand2026 = Array(12).fill(null);
  }
  const seen = new Set<string>();
  for (const row of rowsFromSheet(workbook, "Energy_Data_2026_Mock")) {
    const id = String(row.Floor_ID ?? "");
    const floor = data.floors[id];
    if (!floor) continue;
    const index = monthIndex(row.Month);
    const date = typeof row.Month === "number" ? XLSX.SSF.parse_date_code(row.Month) : null;
    if (index < 0 || index > 11 || date?.y !== 2026) throw new Error(`Invalid 2026 reporting date for ${id}`);
    const key = `${id}-${index}`;
    if (seen.has(key)) throw new Error(`Duplicate 2026 floor/month: ${key}`);
    seen.add(key);
    floor.current2026![index] = numeric(row.Electricity_kWh);
    floor.currentDemand2026![index] = numeric(row.Max_Demand_kW);
  }
  const mockIssues = rowsFromSheet(workbook, "Data_Issue_Log_2026_Mock").filter(row => row.Issue_ID != null).map(row => {
    const text = (key: string) => row[key] == null ? null : String(row[key]);
    const period = text("Period");
    return { issueId: text("Issue_ID"), floorId: text("Floor_ID"), period,
      issueType: text("Issue_Type"), severity: text("Severity"), status: text("Status"),
      resolution: text("Resolution"), notes: text("Notes"), year: 2026, monthIndices: issueMonths(period) };
  });
  data.anomalies = [...(data.anomalies ?? []).map(issue => ({ ...issue, year: 2025, monthIndices: issueMonths(issue.period) })), ...mockIssues];
  data.reportingYear = 2026;
  return data;
}
