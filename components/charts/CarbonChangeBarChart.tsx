"use client";

import { useState, useSyncExternalStore } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, type ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import shared from "./ElectricityLineChart.module.css";
import styles from "./CarbonChangeBarChart.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);
type CarbonMonth = { baseline: number | null; current: number | null; difference: number | null; change: number | null };
import { MONTHS } from "@/lib/energy-filters";
const carbon = (value: number | null, signed = false) => value === null ? "Unavailable" : `${signed && value > 0 ? "+" : ""}${value.toLocaleString("en-MY", { maximumFractionDigits: 1 })} kgCO₂e`;
const change = (value: number | null) => value === null ? "Unavailable" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export default function CarbonChangeBarChart({ data, activeMonthIndex, label, axis, monthLabels = MONTHS }: {
  data: CarbonMonth[]; activeMonthIndex: number; label: string; monthLabels?: string[];
  axis: { minimum: number; maximum: number; ticks: number[] };
}) {
  const [hovered, setHovered] = useState<{ index: number; left: number } | null>(null);
  const months = monthLabels;
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const options: ChartOptions<"bar"> = {
    responsive: true, maintainAspectRatio: false, animation: reducedMotion ? false : { duration: 450 },
    interaction: { mode: "index", intersect: false },
    layout: { padding: { top: 16, right: 14, bottom: 0, left: 6 } },
    scales: {
      x: { border: { display: false }, grid: { display: false }, ticks: { color: "#697990", font: { size: 11 }, maxRotation: 0 } },
      y: { min: axis.minimum, max: axis.maximum, border: { display: false },
        grid: { color: context => context.tick.value === 0 ? "#8291a6" : "#edf1f6", lineWidth: context => context.tick.value === 0 ? 1.6 : 1 },
        ticks: { stepSize: axis.ticks[1] - axis.ticks[0], padding: 10, color: "#697990", font: { size: 11 }, callback: value => `${Number(value) > 0 ? "+" : ""}${value}%` } },
    },
    plugins: { tooltip: { enabled: false, external: ({ chart, tooltip }) => {
      const index = tooltip.dataPoints?.[0]?.dataIndex;
      if (!tooltip.opacity || index === undefined) { setHovered(current => current === null ? current : null); return; }
      const left = Math.max(8, Math.min(chart.width - 336, tooltip.caretX - 160));
      setHovered(current => current?.index === index && current.left === left ? current : { index, left });
    } } },
  };
  const month = hovered === null ? null : data[hovered.index];
  return <div className={shared.wrapper}>
    <div className={shared.plot} onPointerLeave={() => setHovered(null)}>
      <Bar data={{ labels: months, datasets: [{ label: "Change vs 2025", data: data.map(item => item.change),
        backgroundColor: data.map(item => item.change === null ? "transparent" : item.change > 0 ? "#df7771" : "#0bb894"),
        borderColor: "#52627a", borderWidth: data.map((_, index) => index === activeMonthIndex ? 1.5 : 0),
        borderRadius: 4, borderSkipped: "start", maxBarThickness: 30, categoryPercentage: 0.8, barPercentage: 0.75,
      }] }} options={options} role="img" aria-label={label} />
      {hovered && month && <div className={styles.tooltip} style={{ left: hovered.left }} role="tooltip">
        <strong>{months[hovered.index]}</strong>
        <div><span>2026: {carbon(month.current)}</span><b className={month.change !== null && month.change > 0 ? styles.increase : styles.decrease}>{month.change === null || month.change === 0 ? "" : month.change > 0 ? "↑ " : "↓ "}{change(month.change)}</b></div>
        <div>2025: {carbon(month.baseline)}</div><div className={styles.difference}>Difference: {carbon(month.difference, true)}</div>
      </div>}
    </div>
    <div className={shared.legend}><span><i style={{ background: "#66748b" }} />2025</span></div>
    <p className={shared.readout}><strong>{months[activeMonthIndex]}</strong><span>Change: {change(data[activeMonthIndex]?.change ?? null)}</span></p>
    {data.some(month => month.change === null) && <p className={shared.missing}>N/A: percentage change unavailable because data is missing or baseline emissions are zero.</p>}
    <div className={shared.srOnly}><table><caption>{label}</caption><thead><tr><th>Month</th><th>2026</th><th>2025</th><th>Difference</th><th>Change</th></tr></thead><tbody>{data.map((month, index) => <tr key={months[index]}><th scope="row">{months[index]}</th><td>{carbon(month.current)}</td><td>{carbon(month.baseline)}</td><td>{carbon(month.difference, true)}</td><td>{change(month.change)}</td></tr>)}</tbody></table></div>
  </div>;
}
