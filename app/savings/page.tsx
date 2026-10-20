import SavingsPage from "@/components/savings/SavingsPage";
import { loadSavingsData } from "@/lib/load-savings-data";
import type { SavingsPageData } from "@/types/savings";

export default function Page() {
  let data: SavingsPageData | null = null;
  try {
    data = loadSavingsData();
  } catch {
    // The page renders a nontechnical error while preserving shared navigation.
  }
  return <SavingsPage data={data} />;
}
