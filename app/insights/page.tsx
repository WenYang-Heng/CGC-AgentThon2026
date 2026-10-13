import InsightsPage from "@/components/insights/InsightsPage";

export default function Page() {
  return <InsightsPage forecastFloors={Array.from({ length: 16 }, (_, index) => `F${String(index + 1).padStart(2, "0")}`)} />;
}
