import type { ElectricityForecast } from "@/types/forecast";
import styles from "./InsightsPage.module.css";

export default function ForecastSummary({ forecast }: { forecast: ElectricityForecast }) {
  const growth = forecast.growthRate;
  return <div className={styles.forecastStats}>
    <div><span>Projected 2027 Period Usage</span><strong>{forecast.forecast2027Total === null ? "Unavailable" : `${forecast.forecast2027Total.toLocaleString()} kWh`}</strong></div>
    <div><span>Expected Growth</span><strong>{growth === null ? "Unavailable" : `${growth > 0 ? "+" : ""}${(growth * 100).toFixed(1)}%`}</strong><small>Normal annual trend</small></div>
    <div><span>Highest Forecast Month</span><strong>{forecast.highestForecastMonth ?? "Unavailable"}</strong></div>
    <div><span>Forecast Method</span><strong>{forecast.method === "baseline_growth" ? "Baseline growth" : "3-month moving average"}</strong></div>
  </div>;
}
