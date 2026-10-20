"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StatCard from "@/components/StatCard/StatCard";
import { calculateFloorCosts, completeSum, formatRm, safeRatio, summarizeCosts } from "@/lib/savings-calculations";
import type { FloorCostPerformance, SavingsPageData } from "@/types/savings";
import styles from "./SavingsPage.module.css";
import SavingsDropdown from "./SavingsDropdown";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const COST_PERIODS = [{ label: "Full Year", start: 0, end: 11 }, { label: "Q1", start: 0, end: 2 }, { label: "Q2", start: 3, end: 5 }, { label: "Q3", start: 6, end: 8 }, { label: "Q4", start: 9, end: 11 }];
const moneyIcon = <span aria-hidden="true">RM</span>;
type CostSort = "costRm" | "costPerEmployee" | "costPerM2" | "effectiveRateRmPerKwh";

function MonthlyCostChart({ rows }: { rows: { month: string; baseline: number | null; generated: number | null }[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  useEffect(() => {
    if (!monthlyOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, [monthlyOpen]);
  const [size, setSize] = useState({ width: 740, height: 340 });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [rows.length]);
  const maxValue = Math.max(1, ...rows.flatMap(row => [row.baseline ?? 0, row.generated ?? 0]));
  const rough = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, ([1, 2, 5, 10].find(value => value * magnitude >= rough) ?? 10) * magnitude);
  const max = Math.ceil(maxValue / step) * step;
  const plotLeft = 64;
  const plotRight = size.width - 18;
  const x = (index: number) => plotLeft + index * (plotRight - plotLeft) / Math.max(1, rows.length - 1);
  const y = (value: number) => size.height - 38 - value / max * (size.height - 74);
  const tooltip = (row: typeof rows[number]) => {
    const difference = row.baseline !== null && row.generated !== null ? row.generated - row.baseline : null;
    const percent = safeRatio(difference === null ? null : Math.abs(difference), row.baseline);
    return `${row.month}\n2025 Baseline: ${formatRm(row.baseline, 2)}\n2026 Generated: ${formatRm(row.generated, 2)}\nDifference: ${difference === null ? "Unavailable" : `${difference > 0 ? "+" : difference < 0 ? "−" : ""}${formatRm(Math.abs(difference), 2)}`}\nChange: ${percent === null ? "Unavailable" : `${difference! > 0 ? "+" : difference! < 0 ? "−" : ""}${(percent * 100).toFixed(1)}%`}`;
  };
  if (!rows.some(row => row.baseline !== null || row.generated !== null)) return <p className={styles.empty}>No cost data is available for this period.</p>;
  return <>
    <svg ref={svgRef} className={styles.costChart} viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label="Monthly electricity cost in RM comparing 2025 Baseline and 2026 Generated">
      <text x="8" y="22">RM</text>
      {Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step).map(value => <g key={value}><line x1={plotLeft} x2={plotRight} y1={y(value)} y2={y(value)} stroke="#e5ebf2" /><text x={plotLeft - 8} y={y(value) + 4} textAnchor="end">{value.toLocaleString("en-MY")}</text></g>)}
      {([{ key: "baseline", color: "#137be8", dashed: true }, { key: "generated", color: "#05856e", dashed: false }] as const).map(series => {
        let previous = false;
        const path = rows.map((row, index) => { const value = row[series.key]; if (value === null) { previous = false; return ""; } const point = `${previous ? "L" : "M"}${x(index)},${y(value)}`; previous = true; return point; }).join(" ");
        return <g key={series.key}><path d={path} fill="none" stroke={series.color} strokeWidth="2.5" strokeDasharray={series.dashed ? "6 4" : undefined} />{rows.map((row, index) => row[series.key] === null ? null : <circle key={row.month} cx={x(index)} cy={y(row[series.key]!)} r="4" fill={series.color} tabIndex={0} aria-label={tooltip(row)}><title>{tooltip(row)}</title></circle>)}</g>;
      })}
      {rows.map((row, index) => <text key={row.month} x={x(index)} y={size.height - 12} textAnchor="middle">{row.month}</text>)}
    </svg>
    <div className={styles.costLegend}><span>┄ 2025 Baseline</span><span>━ 2026 Generated</span></div>
    <button type="button" className={styles.monthlyValuesButton} aria-haspopup="dialog" onClick={() => setMonthlyOpen(true)}>View monthly cost and differences</button>
    <dialog ref={dialogRef} className={styles.monthlyDialog} aria-labelledby="monthly-cost-dialog-title" onCancel={() => setMonthlyOpen(false)} onClose={() => setMonthlyOpen(false)} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setMonthlyOpen(false);
    }}>
      <header className={styles.monthlyDialogHeader}><h2 id="monthly-cost-dialog-title">Monthly cost and differences</h2><button type="button" aria-label="Close monthly cost details" onClick={() => setMonthlyOpen(false)}>✕</button></header>
      <div className={styles.tableScroll} tabIndex={0} aria-label="Monthly cost comparison table"><table><thead><tr><th scope="col">Month</th><th scope="col">2025 Baseline</th><th scope="col">2026 Generated</th><th scope="col">Difference</th><th scope="col">Change</th></tr></thead><tbody>{rows.map(row => {
      const difference = row.baseline !== null && row.generated !== null ? row.generated - row.baseline : null;
      const percent = difference !== null && row.baseline !== null && row.baseline > 0 ? difference / row.baseline * 100 : null;
      return <tr key={row.month}><th>{row.month}</th><td>{formatRm(row.baseline, 2)}</td><td>{formatRm(row.generated, 2)}</td><td>{difference === null ? "Unavailable" : `${difference > 0 ? "+" : difference < 0 ? "−" : ""}${formatRm(Math.abs(difference), 2)}`}</td><td>{percent === null ? "Unavailable" : `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`}</td></tr>;
    })}</tbody></table></div></dialog>
  </>;
}

export default function CostPerformanceTab({ data, year, periodIndex }: { data: SavingsPageData; year: 2025 | 2026; periodIndex: number }) {
  const [sort, setSort] = useState<CostSort>("costRm");
  const period = COST_PERIODS[periodIndex];
  const floors = useMemo(() => calculateFloorCosts(data.costFloors, year, period.start, period.end), [data, year, period]);
  const summary = summarizeCosts(floors);
  const ranked = [...floors].sort((a, b) => (b.costRm ?? -1) - (a.costRm ?? -1));
  const tableRows = [...floors].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1));
  const maxCost = Math.max(1, ...floors.map(floor => floor.costRm ?? 0));
  const monthly = MONTHS.map((month, index) => ({ month,
    baseline: completeSum(data.costFloors.map(floor => floor.baseline[index].costRm)),
    generated: completeSum(data.costFloors.map(floor => floor.generated[index].costRm)),
  })).slice(period.start, period.end + 1);
  const context = `${year} ${year === 2026 ? "Generated" : "Baseline"} · ${period.label}`;
  const normalized = (value: number | null, unit: string, digits = 2) => value === null ? "Unavailable" : `${formatRm(value, digits)} / ${unit}`;
  const metrics: { label: string; value: string; text: string }[] = [
    { label: "Electricity Spend", value: formatRm(summary.totalCostRm), text: `${context} · selected period` },
    { label: "Effective Energy Cost", value: normalized(summary.effectiveRateRmPerKwh, "kWh", 3), text: "Effective blended cost · source billing values" },
    { label: "Cost per Employee", value: normalized(summary.costPerEmployee, "employee"), text: "Occupancy-normalized · annual-average headcount" },
    { label: "Cost per m²", value: normalized(summary.costPerM2, "m²"), text: "Area-normalized · selected-period cost" },
  ];
  const share = (floor: FloorCostPerformance) => { const ratio = safeRatio(floor.costRm, summary.totalCostRm); return ratio === null ? "Share unavailable" : `${(ratio * 100).toFixed(1)}% of building cost`; };
  return <>
    <section className={styles.kpis} aria-label="Cost performance metrics">{metrics.map(item => <StatCard key={item.label} icon={moneyIcon} label={item.label} value={item.value} comparisonText={item.text} tone="neutral" trend="neutral" />)}</section>
    <div className={styles.costChartsGrid}>
    <section className={styles.panel} aria-labelledby="cost-trend-title"><h2 id="cost-trend-title">Monthly Electricity Cost</h2><MonthlyCostChart rows={monthly} /></section>
    <section className={styles.panel} aria-labelledby="floor-contribution-title"><h2 id="floor-contribution-title">Cost Contribution by Floor</h2><div className={styles.barChart}>{ranked.map(floor => <div className={`${styles.barRow} ${styles.floorBar}`} key={floor.floorId} title={`${floor.floorName}: ${formatRm(floor.costRm, 2)}; ${share(floor)}`}><span className={styles.barLabel}><strong>{floor.floorName}</strong><small>{share(floor)}</small></span><span className={styles.barTrack}>{floor.costRm !== null && <span style={{ width: `${floor.costRm / maxCost * 100}%` }} />}</span><strong>{formatRm(floor.costRm)}</strong></div>)}</div></section>
    </div>
    <section className={styles.panel} aria-labelledby="cost-efficiency-title"><div className={`${styles.sectionHead} ${styles.costEfficiencyHeader}`}><h2 id="cost-efficiency-title">Cost Efficiency by Floor</h2><div className={styles.sort}><SavingsDropdown label="Cost efficiency sort" value={sort} onChange={value => setSort(value as CostSort)} options={[{"value":"costRm","label":"Electricity cost ↓"},{"value":"costPerEmployee","label":"RM / employee ↓"},{"value":"costPerM2","label":"RM / m² ↓"},{"value":"effectiveRateRmPerKwh","label":"Effective RM / kWh ↓"}]} /></div></div><div className={styles.tableScroll} tabIndex={0} aria-label="Scrollable cost efficiency table"><table><thead><tr><th>Floor</th><th>Usage type</th><th>Electricity Cost</th><th>RM / Employee</th><th>RM / m²</th><th>Effective RM / kWh</th></tr></thead><tbody>{tableRows.map(floor => <tr key={floor.floorId}><th scope="row">{floor.floorId}</th><td>{floor.usageType ?? "Unavailable"}</td><td>{formatRm(floor.costRm, 2)}</td><td>{formatRm(floor.costPerEmployee, 2)}</td><td>{formatRm(floor.costPerM2, 2)}</td><td>{formatRm(floor.effectiveRateRmPerKwh, 3)}</td></tr>)}</tbody></table></div></section>
    <section className={styles.panel} aria-labelledby="cost-exposure-title"><h2 id="cost-exposure-title">Operational Cost Exposure</h2><div className={styles.exposureGrid}>{data.operationalSignals.filter(signal => signal.source === "2026 generated prototype").map(signal => <article key={signal.id}><strong>{signal.floorId} · {signal.period}</strong><p>{signal.description}</p><span className={styles.badge}>Generated prototype · Not quantified</span></article>)}</div><p className={styles.note}>Estimated Cost Exposure is not quantified because these prototype signals have no independently validated expected-usage model. A year-on-year increase alone is not proof of avoidable cost.</p></section>
  </>;
}
