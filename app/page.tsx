import EnergyDashboard from "./dashboard";
import AuthPopupBridge from "@/components/AuthPopupBridge";
import { loadEnergyDashboardData } from "@/lib/load-energy-data";

export default function Home() {
  const data = loadEnergyDashboardData();

  return (
    <>
      <AuthPopupBridge />
      <EnergyDashboard dashboardData={data} />
    </>
  );
}
