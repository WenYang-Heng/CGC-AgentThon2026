import BuildingView from "@/components/building/BuildingView";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildElevationModel } from "@/lib/building/elevation-geometry";
import { loadEnergyDashboardData } from "@/lib/load-energy-data";

export default function Page() {
  const read = (name: string) => readFileSync(path.join(process.cwd(), "public/building/elevations", `${name}.svg`), "utf8");
  return <BuildingView building={buildElevationModel(read("front"), read("back"), read("left"))} energyFloors={loadEnergyDashboardData().floors} />;
}
