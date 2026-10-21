"use client";

import { useSyncExternalStore } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, type ChartData, type ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "./ElectricityLineChart.module.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);
type Series = { id: string; label: string; values: (number | null)[]; color: string };
import { MONTHS } from "@/lib/energy-filters";
const format = (value: number | null) => value === null ? "Unavailable" : `${value.toLocaleString("en-MY", { maximumFractionDigits: 1 })} kWh`;
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export default function ElectricityLineChart({ series, activeMonthIndex, label, monthLabels = MONTHS }: { series: Series[]; activeMonthIndex: number; label: string; monthLabels?: string[] }) {
  const months = monthLabels;
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  // Preserve the existing zero-based, rounded electricity axis and missing readings.
  const highest = Math.max(1, ...series.flatMap(item => item.values.filter((value): value is number => value !== null)));
  const roughStep = highest / 4, magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = Math.max(1, ([1, 2, 5, 10].find(multiplier => multiplier * magnitude >= roughStep) ?? 10) * magnitude);
  const data: ChartData<"line", (number | null)[], string> = {
    labels: months,
    datasets: series.map((item, index) => ({
      label: item.label, data: item.values, borderColor: item.color, borderWidth: 2.5,
      borderDash: index === 0 ? [5, 5] : [], fill: index === series.length - 1,
      backgroundColor: context => {
        const { ctx, chartArea } = context.chart;
        if (!chartArea) return "transparent";
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, `${item.color}26`); gradient.addColorStop(1, `${item.color}00`);
        return gradient;
      },
      cubicInterpolationMode: "monotone", tension: 0.3, spanGaps: false,
      pointRadius: context => context.dataIndex === activeMonthIndex ? 4 : 2.5,
      pointHoverRadius: 5.5, pointHitRadius: 16, pointBackgroundColor: item.color,
      pointBorderColor: "#fff", pointBorderWidth: 2,
    })),
  };
  const options: ChartOptions<"line"> = {
    responsive: true, maintainAspectRatio: false,
    animation: reducedMotion ? false : { duration: 450 },
    interaction: { mode: "index", intersect: false },
    layout: { padding: { top: 16, right: 14, bottom: 0, left: 6 } },
    scales: {
      x: { border: { display: false }, grid: { display: false }, ticks: { color: "#697990", font: { size: 11 }, maxRotation: 0, autoSkip: true } },
      y: { min: 0, max: Math.ceil(highest / step) * step, border: { display: false }, grid: { color: "#edf1f6" },
        ticks: { stepSize: step, padding: 10, color: "#697990", font: { size: 11 }, callback: value => Number(value) >= 1000 ? `${Number(value) / 1000}k` : value } },
    },
    plugins: {
      tooltip: {
        backgroundColor: "#222222", titleColor: "#ECEFF1", bodyColor: "#ECEFF1", borderColor: "#222222", borderWidth: 1,
        padding: 12, cornerRadius: 9, boxPadding: 6, boxWidth: 10, boxHeight: 10, usePointStyle: true, multiKeyBackground: "transparent",
        titleFont: { size: 16 }, bodyFont: { size: 15, lineHeight: 1.5 }, bodySpacing: 8,
        callbacks: {
          label: context => `${context.dataset.label}: ${format(context.parsed.y)}`,
          labelColor: context => ({ backgroundColor: series[context.datasetIndex].color, borderColor: series[context.datasetIndex].color, borderWidth: 0 }),
          labelPointStyle: () => ({ pointStyle: "circle", rotation: 0 }),
        },
      },
    },
  };
  return <div className={styles.wrapper}>
    <div className={styles.plot}><Line data={data} options={options} role="img" aria-label={label} /></div>
    <div className={styles.legend}>{series.map(item => <span key={item.id}><i style={{ background: item.color }} />{item.label}</span>)}</div>
    <p className={styles.readout}><strong>{months[activeMonthIndex]}</strong>{series.map(item => <span key={item.id}>{item.label}: {format(item.values[activeMonthIndex] ?? null)}</span>)}</p>
    {series.some(item => item.values.some(value => value === null)) && <p className={styles.missing}>Missing readings are unavailable and appear as chart gaps.</p>}
    <div className={styles.srOnly}><table><caption>{label}</caption><thead><tr><th>Month</th>{series.map(item => <th key={item.id}>{item.label} (kWh)</th>)}</tr></thead><tbody>{months.map((month, index) => <tr key={month}><th scope="row">{month}</th>{series.map(item => <td key={item.id}>{format(item.values[index] ?? null)}</td>)}</tr>)}</tbody></table></div>
  </div>;
}
