"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import EnergyFilterBar from "@/components/EnergyFilters/EnergyFilterBar";
import { useEnergyFilters } from "@/lib/use-energy-filters";
import { MONTHS as months, MONTH_NAMES as monthNames, formatPeriodLabel, getPeriodMonthIndices } from "@/lib/energy-filters";
import Sidebar from "@/components/Sidebar/Sidebar";
import StatCard from "@/components/StatCard/StatCard";
import ElectricityLineChart from "@/components/charts/ElectricityLineChart";
import CarbonChangeBarChart from "@/components/charts/CarbonChangeBarChart";
import type {
  EnergyDashboardData,
  EnergyFloorData,
} from "./dashboard-data";
import styles from "./dashboard.module.css";

const sidebarItems = [
  {
    label: "Energy Explorer",
    href: "/",
    icon: <Icon name="explorer" />,
  },
  {
    label: "Report Energy Waste",
    href: "/report-energy-waste",
    icon: <Icon name="alert" />,
  },
  {
    label: "Insights",
    href: "/insights",
    icon: <Icon name="insights" />,
  },
];

type FloorId = string;
type FloorEntry = [FloorId, EnergyFloorData];



type IconName =
  | "bolt"
  | "explorer"
  | "building"
  | "cost"
  | "leaf"
  | "insights"
  | "menu"
  | "calendar"
  | "trend"
  | "trendDown"
  | "alert"
  | "spark"
  | "send"
  | "stack"
  | "chart"
  | "close"
  | "arrow";

function Icon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, ReactNode> = {
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />,

    explorer: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        <path d="m4 14 5-4 4 3 6-7" />
      </>
    ),

    building: (
      <path d="M4 21V7l8-4 8 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1M2 21h20" />
    ),

    cost: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 .9-3 2s1.1 1.7 3 2.1 3 1 3 2.2-1.3 2.2-3.2 2.2c-1.2 0-2.4-.4-3.3-1.2M12 5v14" />
      </>
    ),

    leaf: (
      <>
        <path d="M20.5 3.5C12 3.7 5.1 7.2 4.3 13.2c-.5 3.7 2.4 6.8 6.1 6.3 6-.8 9.5-7.7 10.1-16Z" />
        <path d="M4 21c2.2-5.5 6.5-9.7 12.7-12.5" />
      </>
    ),

    insights: <path d="M4 20v-6M9 20V9M14 20v-4M19 20V4" />,

    menu: <path d="M4 7h16M4 12h16M4 17h16" />,

    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),

    trend: (
      <>
        <path d="m3 17 6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),

    trendDown: (
      <>
        <path d="m3 7 6 6 4-4 8 9" />
        <path d="M15 18h6v-6" />
      </>
    ),

    alert: (
      <>
        <path d="M12 3 2.8 19h18.4Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),

    spark: (
      <>
        <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" />
        <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
      </>
    ),

    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),

    stack: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 10v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
      </>
    ),

    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,

    close: <path d="m6 6 12 12M18 6 6 18" />,

    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function completeSum(values: (number | null | undefined)[]): number | null {
  if (!values.length || values.some(value => value == null)) return null;
  return values.reduce<number>((sum, value) => sum + value!, 0);
}

function percentChange(current: number | null, baseline: number | null): number | null {
  return current === null || baseline === null || baseline <= 0 ? null : (current - baseline) / baseline * 100;
}

function perEmployee(usage: number | null, employees: number | null): number | null {
  return usage === null || employees === null || employees <= 0 ? null : usage / employees;
}

function formatEnergy(value: number | null): string {
  return value === null ? "Unavailable" : value.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " kWh";
}

function formatChange(value: number | null): string {
  return value === null ? "Unavailable" : (value > 0 ? "+" : "") + value.toFixed(1) + "%";
}

function monthlyTotals(entries: FloorEntry[], year: "baseline2025" | "current2026"): (number | null)[] {
  return months.map((_, index) => completeSum(entries.map(([, floor]) => floor[year]?.[index])));
}

type ChartSeries = { id: string; label: string; values: (number | null)[]; color: string };

// Set false to restore the original SVG dashboard charts.
const USE_CHARTJS_DASHBOARD = true;
const ElectricityChart = USE_CHARTJS_DASHBOARD ? ElectricityLineChart : LineChart;

function LineChart({ series, activeMonthIndex, label, unit = "kWh", monthLabels = months }: {
  series: ChartSeries[]; activeMonthIndex: number; label: string; unit?: string; monthLabels?: string[];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 760, height = 280, left = 58, right = 18, top = 28, bottom = 42;
  const highestValue = Math.max(1, ...series.flatMap(item => item.values.filter((value): value is number => value !== null)));
  const roughStep = highestValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const tickStep = Math.max(1, ([1, 2, 5, 10].find(multiplier => multiplier * magnitude >= roughStep) ?? 10) * magnitude);
  const max = Math.ceil(highestValue / tickStep) * tickStep;
  const ticks = Array.from({ length: Math.round(max / tickStep) + 1 }, (_, index) => index * tickStep);
  const x = (index: number) => left + index * (width - left - right) / 11;
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
  const active = hoveredIndex ?? activeMonthIndex;
  const formatValue = (value: number | null) => value === null ? "Unavailable" : value.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " " + unit;
  return <div className={styles.chartWrapper}>
    <svg className={styles.lineChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} onPointerLeave={() => setHoveredIndex(null)}>
      {ticks.map(tick => <g key={tick}><line x1={left} y1={y(tick)} x2={width - right} y2={y(tick)} className={styles.gridLine} /><text x={left - 10} y={y(tick) + 4} textAnchor="end" className={styles.axisText}>{tick >= 1000 ? `${tick / 1000}k` : tick}</text></g>)}
      {monthLabels.map((month, index) => <text key={month} x={x(index)} y={height - 13} textAnchor="middle" className={styles.axisText}>{month}</text>)}
      {series.map(item => {
        let previous = false;
        const path = item.values.map((value, index) => {
          if (value === null) { previous = false; return ""; }
          const segment = (previous ? "L" : "M") + x(index) + "," + y(value);
          previous = true;
          return segment;
        }).join(" ");
        return <g key={item.id}><path d={path} pathLength="1" className={styles.chartLine} style={{ stroke: item.color }} />{item.values.map((value, index) => value === null ? null : <circle key={index} cx={x(index)} cy={y(value)} r={index === active ? 4.8 : 3.2} className={styles.chartPoint} style={{ fill: item.color }}><title>{monthLabels[index] + " · " + item.label + ": " + formatValue(value)}</title></circle>)}</g>;
      })}
      <line x1={x(active)} y1={top} x2={x(active)} y2={height - bottom} className={styles.chartHoverGuide} />
      <g className={styles.peakLabel} transform={`translate(${Math.min(width - 215, Math.max(left, x(active) - 80))} 3)`}><rect width="205" height="55" rx="8" /><text x="10" y="14">{monthNames[active]}</text>{series.map((item, index) => <text key={item.id} x="10" y={29 + index * 15}>{item.label}: {formatValue(item.values[active])}</text>)}</g>
      {monthLabels.map((month, index) => <rect key={month} x={Math.max(left, x(index) - 30)} y={top} width="60" height={height - top - bottom} className={styles.chartHitArea} tabIndex={0} role="button" aria-label={month + ": " + series.map(item => item.label + " " + formatValue(item.values[index])).join(", ")} onPointerEnter={() => setHoveredIndex(index)} onFocus={() => setHoveredIndex(index)} onBlur={() => setHoveredIndex(null)} />)}
    </svg>
    <div className={styles.seriesLegend}>{series.map(item => <span key={item.id}><i style={{ backgroundColor: item.color }} /><b>{item.label}</b></span>)}</div>
    {series.some(item => item.values.some(value => value === null)) ? <p className={styles.comparisonHighlight}>Missing readings are unavailable and appear as chart gaps.</p> : null}
  </div>;
}
type CarbonMonth = {
  baseline: number | null;
  current: number | null;
  difference: number | null;
  change: number | null;
};

function carbonMonthlyChanges(baseline: (number | null)[], current: (number | null)[], factor: number | null): CarbonMonth[] {
  return baseline.map((_, index) => {
    const previous = baseline[index] == null || factor === null ? null : baseline[index]! * factor;
    const generated = current[index] == null || factor === null ? null : current[index]! * factor;
    return { baseline: previous, current: generated,
      difference: previous === null || generated === null ? null : generated - previous,
      change: percentChange(generated, previous) };
  });
}

function percentageAxis(values: (number | null)[]) {
  const available = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const maxAbs = Math.max(0, ...available.map(value => Math.abs(value)));
  const roundedLimit = Math.max(2, Math.ceil(maxAbs / 2) * 2);
  // Keep 2-point intervals for normal ranges; widen for larger future changes.
  const tickStep = roundedLimit <= 12 ? 2 : Math.ceil(roundedLimit / 12) * 2;
  const maximum = Math.ceil(roundedLimit / tickStep) * tickStep;
  const minimum = available.some(value => value < 0) ? -maximum : 0;
  const ticks = Array.from({ length: Math.round((maximum - minimum) / tickStep) + 1 }, (_, index) => minimum + index * tickStep);
  return { minimum, maximum, ticks };
}

function CarbonChangeChart({ data, activeMonthIndex, label, monthLabels = months }: {
  data: CarbonMonth[]; activeMonthIndex: number; label: string; monthLabels?: string[];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 760, height = 280, left = 70, right = 18, top = 28, bottom = 42;
  const axis = percentageAxis(data.map(month => month.change));
  const step = (width - left - right) / 12;
  const x = (index: number) => left + (index + .5) * step;
  const y = (value: number) => top + (axis.maximum - value) / (axis.maximum - axis.minimum) * (height - top - bottom);
  const formatCarbon = (value: number | null, signed = false) => value === null ? "Unavailable" :
    `${signed && value > 0 ? "+" : ""}${value.toLocaleString("en-MY", { maximumFractionDigits: 1 })} kgCO₂e`;
  const changeArrow = (value: number | null) => value === null || value === 0 ? "" : value > 0 ? "↑ " : "↓ ";
  const tooltip = (index: number) => `${monthNames[index]}\n2025: ${formatCarbon(data[index].baseline)}\n2026 (${changeArrow(data[index].change)}${formatChange(data[index].change)}): ${formatCarbon(data[index].current)}\nDifference: ${formatCarbon(data[index].difference, true)}`;
  const active = hoveredIndex ?? activeMonthIndex;
  return <div className={styles.chartWrapper}>
    <svg className={styles.lineChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} onPointerLeave={() => setHoveredIndex(null)}>
      <text x={left} y="15" className={styles.axisText}>Change (%)</text>
      {axis.ticks.map(tick => <g key={tick}><line x1={left} y1={y(tick)} x2={width - right} y2={y(tick)} className={styles.gridLine} /><text x={left - 10} y={y(tick) + 4} textAnchor="end" className={styles.axisText}>{`${tick > 0 ? "+" : ""}${tick}%`}</text></g>)}
      <line x1={left} y1={y(0)} x2={width - right} y2={y(0)} stroke="#66748b" strokeWidth="1.8" />
      {data.map((month, index) => <g key={monthLabels[index]}>
        {month.change === null ? <text x={x(index)} y={y(0) - 7} textAnchor="middle" className={styles.axisText}>N/A</text> :
          <rect x={x(index) - step * .28} y={Math.min(y(0), y(month.change))} width={step * .56} height={Math.max(1, Math.abs(y(month.change) - y(0)))} rx="2" fill={month.change > 0 ? "#df7771" : "#0bb894"} opacity={index === active ? 1 : .8}><title>{tooltip(index)}</title></rect>}
        <text x={x(index)} y={height - 13} textAnchor="middle" className={styles.axisText}>{monthLabels[index]}</text>
        <rect x={left + index * step} y={top} width={step} height={height - top - bottom} className={styles.chartHitArea} tabIndex={0} role="button" aria-label={tooltip(index)} onPointerEnter={() => setHoveredIndex(index)} onFocus={() => setHoveredIndex(index)} onBlur={() => setHoveredIndex(null)}><title>{tooltip(index)}</title></rect>
      </g>)}
      {hoveredIndex !== null ? <g className={styles.peakLabel} transform={`translate(${hoveredIndex >= 6 ? left : width - right - 345} 3)`}>
        <rect width="345" height="106" rx="8" />
        <text x="12" y="21" style={{ fontSize: 14, fontWeight: 700 }}>{monthNames[hoveredIndex]}</text>
        <text x="12" y="46" style={{ fontSize: 13 }}>2026: {formatCarbon(data[hoveredIndex].current)}<tspan dx="10" style={{ fill: data[hoveredIndex].change === null || data[hoveredIndex].change === 0 ? "#66748b" : data[hoveredIndex].change! > 0 ? "#b42318" : "#067c61", fontWeight: 700 }}>{changeArrow(data[hoveredIndex].change)}{formatChange(data[hoveredIndex].change)}</tspan></text>
        <text x="12" y="70" style={{ fontSize: 13 }}>2025: {formatCarbon(data[hoveredIndex].baseline)}</text>
        <text x="12" y="94" style={{ fontSize: 13, fill: "#137be8" }}>Difference: {formatCarbon(data[hoveredIndex].difference, true)}</text>
      </g> : null}
    </svg>
    <div className={styles.seriesLegend}><span><i style={{ backgroundColor: "#66748b" }} /><b>2025</b></span></div>
    {data.some(month => month.change === null) ? <p className={styles.comparisonHighlight}>N/A: percentage change unavailable because data is missing or baseline emissions are zero.</p> : null}
  </div>;
}

function PanelHead({
  title,
  subtitle,
  unit,
  action,
}: {
  title: string;
  subtitle?: string;
  unit?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.panelHead}>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      {action ? action : unit ? (
        <span className={styles.unit}>{unit}</span>
      ) : null}
    </div>
  );
}


export default function EnergyDashboard({ dashboardData }: { dashboardData: EnergyDashboardData }) {
  const { floors, emissionFactor } = dashboardData;
  const floorEntries = useMemo(() => Object.entries(floors) as FloorEntry[], [floors]);
  const common = useEnergyFilters({ selection: "multi" });
  const { startMonth, endMonth } = common.value.period;
  const indices = useMemo(() => getPeriodMonthIndices({ year: 2026, startMonth, endMonth }), [startMonth, endMonth]);
  const periodLabel = formatPeriodLabel(common.value.period);

  const [mobileNavOpen, setMobileNavOpen] =
    useState(false);

  const menuButtonRef =
    useRef<HTMLButtonElement>(null);

  const monthIndex = indices.length - 1;
  const scopedFloorEntries = useMemo(() => common.value.floorIds ? floorEntries.filter(([id]) => common.value.floorIds!.includes(id)) : floorEntries, [common.value.floorIds, floorEntries]);

  const baselineValues = monthlyTotals(scopedFloorEntries, "baseline2025").slice(startMonth, endMonth + 1);
  const currentValues = monthlyTotals(scopedFloorEntries, "current2026").slice(startMonth, endMonth + 1);
  const currentUsage = completeSum(currentValues);
  const change = percentChange(currentUsage, completeSum(baselineValues));
  const singleFloor = scopedFloorEntries.length === 1 ? scopedFloorEntries[0][1] : null;
  const monthlyDemands = scopedFloorEntries.flatMap(([, floor]) => indices.map(index => floor.currentDemand2026?.[index] ?? null));
  const availableDemands = monthlyDemands.filter((value): value is number => value !== null);
  const peakDemand = availableDemands.length ? Math.max(...availableDemands) : null;
  const missingDemandCount = monthlyDemands.length - availableDemands.length;
  const carbonEmissions = currentUsage === null || emissionFactor === null ? null : currentUsage * emissionFactor;
  const scopeLabel = singleFloor?.label ?? (scopedFloorEntries.length === floorEntries.length ? "All Floors" : scopedFloorEntries.length + " Selected Floors");
  const selectedIds = new Set(scopedFloorEntries.map(([id]) => id));
  const relevantAnomalies = (dashboardData.anomalies ?? []).filter(issue => issue.year === 2026 && issue.monthIndices?.some(index => indices.includes(index)) && (issue.floorId === null || selectedIds.has(issue.floorId)));
  const chatFloorId = scopedFloorEntries.length === 1 ? scopedFloorEntries[0][0] : null;
  useEffect(() => {
    const publishContext = () => window.dispatchEvent(new CustomEvent("energy-chatbot-context", { detail: { context: {
      page: "dashboard", floorId: chatFloorId, floorName: scopeLabel, selectedFloor: scopeLabel,
      analysisPeriod: periodLabel, month: indices.length === 1 ? monthNames[indices[0]] : null, year: 2026, hasAnomalies: relevantAnomalies.length > 0,
    } } }));
    publishContext();
    window.addEventListener("energy-chatbot-context-request", publishContext);
    return () => window.removeEventListener("energy-chatbot-context-request", publishContext);
  }, [chatFloorId, scopeLabel, periodLabel, indices, relevantAnomalies.length]);
  const ranked = scopedFloorEntries.map(([id, floor]) => {
    const baseline = completeSum(indices.map(index => floor.baseline2025?.[index] ?? null));
    const current = completeSum(indices.map(index => floor.current2026?.[index] ?? null));
    return { id, floor, baseline, current, change: percentChange(current, baseline), employee: perEmployee(current, floor.employees) };
  }).sort((a, b) => a.change === null ? b.change === null ? a.id.localeCompare(b.id) : 1 : b.change === null ? -1 : b.change - a.change);
  const electricitySeries: ChartSeries[] = [
    { id: "baseline", label: "2025", values: baselineValues, color: "#137be8" },
    { id: "current", label: "2026", values: currentValues, color: "#0bb894" },
  ];
  const carbonChanges = carbonMonthlyChanges(baselineValues, currentValues, emissionFactor);
  const closeNavigation = () => { setMobileNavOpen(false); window.requestAnimationFrame(() => menuButtonRef.current?.focus()); };

  return (<div className={styles.appShell}>
    <Sidebar items={sidebarItems} activeHref="/" mobileOpen={mobileNavOpen} userInitials="HW" userName="Heng Wen" userSubtitle="Energy workspace" />
    <main className={styles.workspace} id="explorer">
      <header className={styles.topbar}>
        <button ref={menuButtonRef} className={styles.mobileMenu} onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle navigation" aria-expanded={mobileNavOpen} aria-controls="primary-navigation"><Icon name={mobileNavOpen ? "close" : "menu"} /></button>
        <div className={styles.pageTitle}><h1>Dashboard</h1></div>
      </header>
      <div className={styles.sharedFilters}><EnergyFilterBar value={common.value} onChange={common.onChange} notice={common.notice} floorSelection="multi" floors={floorEntries.map(([id, floor]) => ({ id, label: floor.label }))} /></div>
        <section className={styles.metricsGrid} aria-label="Energy summary">
          <StatCard icon={<Icon name="bolt" size={24} />} label="2026 Consumption" value={formatEnergy(currentUsage)} comparisonText={periodLabel + " · generated prototype data"} tone="neutral" trend="neutral" />
          <StatCard icon={<Icon name="trend" size={24} />} label="Change vs 2025 Baseline" value={formatChange(change)} comparisonText="Same selected period" tone={change === null || change === 0 ? "neutral" : change > 0 ? "negative" : "positive"} trend={change === null || change === 0 ? "neutral" : change > 0 ? "up" : "down"} />
          <StatCard icon={<Icon name="chart" size={24} />} label={singleFloor ? "Peak Demand" : "Highest Floor Peak Demand"} value={peakDemand === null ? "No readings" : `${peakDemand.toLocaleString("en-MY")} kW`} comparisonText={`${periodLabel} · generated workbook demand${missingDemandCount ? ` · ${missingDemandCount} reading${missingDemandCount === 1 ? "" : "s"} not reported` : ""}`} tone="neutral" trend="neutral" />
          <StatCard icon={<Icon name="leaf" size={24} />} label="Carbon Emissions" value={carbonEmissions === null ? "Unavailable" : `${carbonEmissions.toLocaleString("en-MY", { maximumFractionDigits: 1 })} kg CO2e`} comparisonText={emissionFactor === null ? "Emission factor unavailable" : `Estimated using 2025 factor: ${emissionFactor} kg CO2e/kWh`} tone="neutral" trend="neutral" />
        </section>
        <section className={styles.analyticsGrid}>
          <article className={`${styles.panel} ${styles.consumptionPanel}`}><PanelHead title="Monthly Electricity Consumption (kWh)" subtitle={scopeLabel + " · 2025 baseline vs 2026 generated"} /><ElectricityChart monthLabels={indices.map(index => months[index])} series={electricitySeries} activeMonthIndex={monthIndex} label={scopeLabel + " monthly electricity: 2025 baseline and 2026 generated"} /></article>
          <article className={`${styles.panel} ${styles.consumptionPanel} ${styles.carbonPanel}`}><PanelHead title="Monthly Carbon Emissions Change vs 2025" />{USE_CHARTJS_DASHBOARD ? <CarbonChangeBarChart key={periodLabel} monthLabels={indices.map(index => months[index])} data={carbonChanges} activeMonthIndex={monthIndex} axis={percentageAxis(carbonChanges.map(month => month.change))} label={scopeLabel + " monthly carbon emissions percentage change: 2026 generated versus 2025 baseline"} /> : <CarbonChangeChart monthLabels={indices.map(index => months[index])} data={carbonChanges} activeMonthIndex={monthIndex} label={scopeLabel + " monthly carbon emissions percentage change: 2026 generated versus 2025 baseline"} />}</article>
        </section>
        <section className={styles.dynamicSection}>
          <article className={`${styles.panel} ${styles.floorComparisonPanel}`}>
            <PanelHead title="Floor Performance" subtitle={periodLabel + " · compared with the same period in 2025"} />
            <div className={styles.tableScroll}><table className={styles.comparisonTable}><thead><tr><th>Floor</th><th>Usage type</th><th>2025 baseline (kWh)</th><th>2026 generated (kWh)</th><th>Change vs baseline</th><th>Employees (2025)</th><th>kWh / employee</th></tr></thead><tbody>{ranked.map(row => <tr key={row.id}><td>{row.floor.short}</td><td>{row.floor.usageType}</td><td>{formatEnergy(row.baseline)}</td><td>{formatEnergy(row.current)}</td><td><span className={row.change === null || row.change === 0 ? undefined : row.change > 0 ? styles.statusWarning : styles.statusGood}>{formatChange(row.change)}</span></td><td>{row.floor.employees ?? "Unavailable"}</td><td>{row.employee === null ? "Unavailable" : row.employee.toFixed(1)}</td></tr>)}</tbody></table></div>
          </article>
        </section>
        <footer className={styles.footer}><span>Sources: 2025 actual baseline and generated 2026 prototype workbook. 2026 values are not actual utility readings.</span><span>Emissions use the available 2025 factor; employee comparisons use 2025 occupancy metadata.</span></footer>
      </main>

      {mobileNavOpen ? (
        <button
          className={styles.scrim}
          aria-label="Close navigation"
          onClick={closeNavigation}
        />
      ) : null}

    </div>
  );
}
