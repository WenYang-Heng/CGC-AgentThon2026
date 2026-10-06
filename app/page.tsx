import EnergyDashboard from "./dashboard";
import { loadEnergyDashboardData } from "@/lib/load-energy-data";

export default function Home() {
  const data = loadEnergyDashboardData();

  return <EnergyDashboard dashboardData={data} />;
}
