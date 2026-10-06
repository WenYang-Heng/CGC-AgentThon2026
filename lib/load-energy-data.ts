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
  if (value instanceof Date) {
    return value.getUTCMonth();
  }

  const match = String(value ?? "").match(/(?:^|-)\s*(\d{1,2})(?:-|\/)/);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return parsed >= 1 && parsed <= 12 ? parsed - 1 : -1;
}

export function loadEnergyDashboardData(): EnergyDashboardData {
  const workbook = XLSX.read(fs.readFileSync(workbookPath), {
    type: "buffer",
    cellDates: true,
  });

  const energyRows = rowsFromSheet(workbook, "Energy_Data");
  const floorRows = rowsFromSheet(workbook, "Floor_Master");
  const occupancyRows = rowsFromSheet(workbook, "Occupancy");
  const emissionRows = rowsFromSheet(workbook, "Emission_Factor");

  const floorMetadata = new Map(
    floorRows.map((row) => [String(row.Floor_ID), row])
  );
  const occupancy = new Map(
    occupancyRows.map((row) => [
      String(row.Floor_ID),
      Number(row.Employee_Count) || 0,
    ])
  );

  const floors: Record<string, EnergyFloorData> = {};

  for (const row of energyRows) {
    const id = String(row.Floor_ID ?? "");
    const index = monthIndex(row.Month);

    if (!id || index < 0) {
      continue;
    }

    const metadata = floorMetadata.get(id);
    const floor =
      floors[id] ??
      (floors[id] = {
        label: String(metadata?.Floor_Name ?? id),
        short: id,
        usageType: String(metadata?.Floor_Use ?? "Not specified"),
        area: Number(metadata?.Area_m2) || 0,
        employees: occupancy.get(id) ?? 0,
        peakDemand: 0,
        demandValues: Array(12).fill(0),
        values: Array(12).fill(0),
        cost: 0,
        costValues: Array(12).fill(0),
      });

    floor.values[index] = Number(row.Electricity_kWh) || 0;
    floor.costValues[index] = Number(row.Cost_RM) || 0;
    floor.cost += floor.costValues[index];
    floor.demandValues[index] = Number(row.Max_Demand_kW) || 0;
    floor.peakDemand = Math.max(
      floor.peakDemand,
      floor.demandValues[index]
    );
  }

  const emissionFactor =
    Number(
      emissionRows.find((row) => Number(row.Year) === 2025)
        ?.Factor_Value
    ) || 0.74;

  return { floors, emissionFactor };
}
