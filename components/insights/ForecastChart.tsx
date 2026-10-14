"use client";

import type { ElectricityForecast, MonthlyForecast } from "@/types/forecast";
import ForecastSummary from "./ForecastSummary";
import styles from "./InsightsPage.module.css";

const series = [
  { key: "actual2025", label: "2025 Actual", color: "#137be8" },
  { key: "actual2026", label: "2026 Generated", color: "#9460cc" },
  { key: "forecast2027", label: "2027 Forecast", color: "#05856e" },
] as const;

function LineChart({ monthly }: { monthly: MonthlyForecast[] }) {
  const highestValue = Math.max(1, ...monthly.flatMap(row => series.map(s => row[s.key] ?? 0)));
  const roughStep = highestValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = Math.max(1, ([1, 2, 5, 10].find(multiplier => multiplier * magnitude >= roughStep) ?? 10) * magnitude);
  const max = Math.ceil(highestValue / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  const x = (index: number) => 64 + index * (590 / Math.max(1, monthly.length - 1));
  const y = (value: number) => 200 - value / max * 165;
  return <>
    <svg className={styles.chart} viewBox="0 0 680 235" role="img" aria-label="Monthly electricity usage in kWh: 2025 actual, 2026 generated, and 2027 forecast">
      <text x="5" y="15">kWh</text>
      {ticks.map(tick => <g key={tick}><line x1="64" y1={y(tick)} x2="654" y2={y(tick)} className={styles.gridLine} /><text x="57" y={y(tick) + 4} textAnchor="end">{tick.toLocaleString()}</text></g>)}
      {series.map(s => {
        // Separate paths at null values so unknown months are visible as gaps.
        let previous = false;
        const path = monthly.map((row, index) => {
          const value = row[s.key];
          if (value === null) { previous = false; return ""; }
          const command = `${previous ? "L" : "M"}${x(index)},${y(value)}`;
          previous = true;
          return command;
        }).join(" ");
        return <g key={s.key}><path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.key === "forecast2027" ? "6 4" : undefined} />{monthly.map((row, index) => row[s.key] === null ? null : <circle key={row.month} cx={x(index)} cy={y(row[s.key]!)} r="3" fill={s.color}><title>{`${row.month}: ${s.label} ${row[s.key]?.toLocaleString()} kWh`}</title></circle>)}</g>;
      })}
      {monthly.map((row, index) => <text key={row.month} x={x(index)} y="225" textAnchor="middle">{row.month}</text>)}
    </svg>
    <div className={styles.chartLegend}>{series.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}</div>
    <details className={styles.forecastNote}><summary>View monthly values</summary><div className={styles.heatmapScroll}><table><thead><tr><th>Month</th>{series.map(s => <th key={s.key}>{s.label} (kWh)</th>)}</tr></thead><tbody>{monthly.map(row => <tr key={row.month}><th>{row.month}{row.isAnomaly2026 ? " *" : ""}</th>{series.map(s => <td key={s.key}>{row[s.key]?.toLocaleString() ?? "Unavailable"}</td>)}</tr>)}</tbody></table></div><p>* Identified abnormal 2026 period.</p></details>
  </>;
}

export default function ForecastChart({ floorId, forecast, periodLabel, loading, error, onRetry }: {
  floorId: string | null;
  forecast: ElectricityForecast | null;
  periodLabel: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const empty = forecast && !forecast.monthly.some(row => row.forecast2027 !== null);
  return <article className={styles.panel} aria-busy={loading}>
    <header className={styles.panelHead}><div><h2>Monthly electricity forecast</h2><p>{floorId ?? "All Floors"} · {periodLabel} 2027</p></div></header>
    {loading ? <p className={styles.forecastNote} role="status">Loading electricity forecast…</p> : error ? <div className={styles.forecastNote} role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Retry</button></div> : forecast ? <>
      <ForecastSummary forecast={forecast} />
      {empty ? <p className={styles.forecastNote} role="status">No forecast is available for this scope. Baseline or current-year readings are missing.</p> : <LineChart monthly={forecast.monthly} />}
      {forecast.monthly.some(row => row.actual2025 === null || row.actual2026 === null || row.forecast2027 === null) && !empty ? <p className={styles.forecastNote}>Some readings are unavailable. Chart gaps and unavailable totals preserve missing data.</p> : null}
      {forecast.anomalyMonthsExcluded.length ? <p className={styles.forecastNote}>Abnormal periods excluded from normal growth: {forecast.anomalyMonthsExcluded.join(", ")}. Expected Growth shows the normal trend used by the forecast.</p> : null}
    </> : <p className={styles.forecastNote} role="status">No forecast data is available.</p>}
    <p className={styles.forecastNote}>2027 projections use the 2025 electricity baseline and the observed 2026 consumption trend. Identified abnormal periods are excluded from normal trend estimation. 2026 data is generated for prototype use.</p>
  </article>;
}
