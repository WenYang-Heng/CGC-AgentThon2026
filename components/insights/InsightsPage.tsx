"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import ForecastChart from "./ForecastChart";
import StatCard from "@/components/StatCard/StatCard";
import { anomalyMockData } from "@/data/anomaly-mock-data";
import { getForecast } from "@/services/forecast-service";
import { CopilotAuthRequiredError, emailEnergyInsights } from "@/services/chatbot-service";
import type { ElectricityForecast, MonthlyForecast } from "@/types/forecast";
import type { CopilotRecommendationsPayload } from "@/lib/copilot-recommendations-data";
import type { EnergyAnomaly, AnomalySeverity } from "@/types/anomaly";
import type { InsightTab, Recommendation } from "@/types/insights";
import styles from "./InsightsPage.module.css";

let recommendationsLoadStarted = false;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PERIODS = [
  { label: "Full Year", start: 0, end: 11 },
  { label: "Q1", start: 0, end: 2 },
  { label: "Q2", start: 3, end: 5 },
  { label: "Q3", start: 6, end: 8 },
  { label: "Q4", start: 9, end: 11 },
];

function sumField(months: MonthlyForecast[], field: "actual2025" | "actual2026" | "forecast2027"): number | null {
  if (!months.length || months.some(month => month[field] === null)) return null;
  return months.reduce((total, month) => total + month[field]!, 0);
}

function periodForecast(forecast: ElectricityForecast, start: number, end: number): ElectricityForecast {
  const monthly = forecast.monthly.slice(start, end + 1);
  const available = monthly.filter(month => month.forecast2027 !== null);
  const peak = available.reduce<MonthlyForecast | null>((highest, month) =>
    !highest || month.forecast2027! > highest.forecast2027! ? month : highest, null);
  // Do not report partial totals as complete consumption for the selected period.
  const complete = monthly.length === end - start + 1;
  return {
    ...forecast, monthly,
    actual2025Total: complete ? sumField(monthly, "actual2025") : null,
    actual2026Total: complete ? sumField(monthly, "actual2026") : null,
    forecast2027Total: complete ? sumField(monthly, "forecast2027") : null,
    highestForecastMonth: peak ? MONTH_NAMES[MONTHS.indexOf(peak.month)] ?? peak.month : null,
    anomalyMonthsExcluded: forecast.anomalyMonthsExcluded.filter(month => MONTH_NAMES.slice(start, end + 1).includes(month)),
  };
}

function formatPeriodLabel(start: number, end: number): string {
  return start === end ? MONTH_NAMES[start] : `${MONTH_NAMES[start]} to ${MONTH_NAMES[end]}`;
}

function usageChange(forecast: ElectricityForecast | null): number | null {
  if (!forecast || forecast.actual2025Total === null || forecast.actual2026Total === null || forecast.actual2025Total <= 0) return null;
  return ((forecast.actual2026Total - forecast.actual2025Total) / forecast.actual2025Total) * 100;
}

function formatKwh(value: number | null | undefined): string {
  return value == null ? "Unavailable" : `${value.toLocaleString()} kWh`;
}

function formatPercent(value: number | null): string {
  return value === null ? "Unavailable" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function changeStatement(forecast: ElectricityForecast | null, period: string): string {
  const change = usageChange(forecast);
  if (!forecast || change === null) return "Electricity consumption change is unavailable because baseline or current-year totals are missing.";
  const scope = forecast.floorId ?? "Menara CGC";
  const comparison = change === 0 ? "unchanged consumption" : `a ${Math.abs(change).toFixed(1)}% ${change > 0 ? "increase" : "decrease"}`;
  return `${scope} recorded ${formatKwh(forecast.actual2026Total)} during ${period} ${forecast.currentYear}, representing ${comparison} compared with the same period in the ${forecast.baselineYear} baseline.`;
}

function managementSummary(forecast: ElectricityForecast, period: string): string {
  const method = forecast.method === "baseline_growth" ? "baseline-growth" : "3-month moving-average";
  return `${changeStatement(forecast, period)} The ${forecast.baselineYear} total for this period is ${formatKwh(forecast.actual2025Total)}. Based on the ${method} model, the same period in ${forecast.forecastYear} is projected at ${formatKwh(forecast.forecast2027Total)}. ${forecast.highestForecastMonth ? `The highest forecast month in this period is ${forecast.highestForecastMonth}.` : "The highest forecast month is unavailable."} Identified abnormal periods are excluded from normal annual trend estimation. ${forecast.currentYear} values are generated for prototype use.`;
}

function Icon({ name, size = 19 }: { name: "explorer" | "alert" | "cost" | "leaf" | "insights" | "trend" | "building" | "spark" | "copy" | "download" | "menu" | "close"; size?: number }) {
  const paths = {
    explorer: <><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" /></>,
    alert: <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
    cost: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 1-3 2.3 0 3.5 6 1.5 6 4.5 0 1.3-1.3 2.2-3 2.2-1.2 0-2.4-.4-3.2-1.2M12 5.5v13" /></>,
    leaf: <><path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16Z" /><path d="M4 21c3-6 7-9 13-13" /></>,
    insights: <><path d="M4 18V9m5 9V5m5 13v-6m5 6V3" /><path d="m3 8 6-4 5 6 6-8" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
    building: <><path d="M4 21V4h11v17M8 8h3m-3 4h3m-3 4h3m4-7h5v12M2 21h20" /></>,
    spark: <path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4" /><path d="M4 19h16" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const navItems = [
  { label: "Energy Explorer", href: "/", icon: <Icon name="explorer" /> },
  { label: "Report Energy Waste", href: "/report-energy-waste", icon: <Icon name="alert" /> },
  { label: "Insights", href: "/insights", icon: <Icon name="insights" /> },
];

function PanelHead({ title, subtitle, aside }: { title: string; subtitle: string; aside?: React.ReactNode }) {
  return <header className={styles.panelHead}><div><h2>{title}</h2><p>{subtitle}</p></div>{aside}</header>;
}

function AnomalyCard({ anomaly, expanded, onToggle, onAction, onNotify, notifying, notifyDisabled }: { anomaly: EnergyAnomaly; expanded: boolean; onToggle: () => void; onAction: (message: string) => void; onNotify: () => void; notifying: boolean; notifyDisabled: boolean }) {
  return <article className={styles.anomalyCard}>
    <div className={styles.anomalyTop}><div><span>{anomaly.floor} · {anomaly.startTime}–{anomaly.endTime}</span><h3>{anomaly.description}</h3></div><span className={`${styles.severity} ${styles[anomaly.severity]}`}>{anomaly.severity}</span></div>
    <div className={styles.analyticsFinding}><span>Analytics</span><strong>{anomaly.baselineDeviation}% above baseline</strong></div>
    <div className={styles.aiFinding}><Icon name="spark" size={15} /><p><span>AI explanation</span>{anomaly.possibleCauses.join(" · ")}</p></div>
    {expanded ? <div className={styles.anomalyDetails}><div><span>Possible causes</span><ul>{anomaly.possibleCauses.map((cause) => <li key={cause}>{cause}</li>)}</ul></div><div><span>Recommended action</span><p>{anomaly.recommendedAction}</p></div></div> : null}
    <div className={styles.cardActions}><button onClick={() => onAction(`Ticket drafted for ${anomaly.floor}`)}>Create Ticket</button><button type="button" disabled={notifyDisabled} aria-busy={notifying} onClick={onNotify}>{notifying ? "Notifying…" : "Notify Floor Champion"}</button><button onClick={onToggle}>{expanded ? "Hide Details" : "View Details"}</button></div>
  </article>;
}

export default function InsightsPage({ forecastFloors }: { forecastFloors: string[] }) {
  const [activeTab, setActiveTab] = useState<InsightTab>("overview");
  const [floor, setFloor] = useState("All Floors");
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(11);
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodTriggerRef = useRef<HTMLButtonElement>(null);
  const periodLabel = formatPeriodLabel(startMonth, endMonth);
  const floorId = floor === "All Floors" ? null : floor;
  const [forecastResult, setForecastResult] = useState<{ floorId: string | null; forecast?: ElectricityForecast; error?: string } | null>(null);
  const [forecastAttempt, setForecastAttempt] = useState(0);
  const currentForecast = forecastResult?.floorId === floorId ? forecastResult : null;
  const annualForecast = currentForecast?.forecast ?? null;
  const forecast = useMemo(() => annualForecast ? periodForecast(annualForecast, startMonth, endMonth) : null, [annualForecast, startMonth, endMonth]);
  const forecastLoading = currentForecast === null;
  const forecastError = currentForecast?.error ?? null;
  const hasForecastAnomalies = Boolean(forecast?.anomalyMonthsExcluded.length);
  useEffect(() => {
    const publishContext = () => window.dispatchEvent(new CustomEvent("energy-chatbot-context", { detail: { context: {
      page: "insights", floorId, floorName: floor, selectedFloor: floor,
      analysisPeriod: periodLabel, selectedDateRange: periodLabel, year: 2026,
      forecastRelevant: true, hasAnomalies: hasForecastAnomalies,
    } } }));
    publishContext();
    window.addEventListener("energy-chatbot-context-request", publishContext);
    return () => window.removeEventListener("energy-chatbot-context-request", publishContext);
  }, [floorId, floor, periodLabel, hasForecastAnomalies]);
  const retryForecast = () => { setForecastResult(null); setForecastAttempt(value => value + 1); };
  const change = usageChange(forecast);
  const summary = useMemo(() => forecast ? managementSummary(forecast, periodLabel) : null, [forecast, periodLabel]);
  const chartProps = { floorId, forecast, periodLabel, loading: forecastLoading, error: forecastError, onRetry: retryForecast };
  const metricKwh = (value: number | null | undefined) => forecastLoading ? "Loading…" : formatKwh(value);

  useEffect(() => {
    const controller = new AbortController();
    getForecast(floorId, controller.signal).then(loaded => {
      if (!controller.signal.aborted) setForecastResult({ floorId, forecast: loaded });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setForecastResult({ floorId, error: error instanceof Error ? error.message : "Forecast could not be loaded." });
    });
    return () => controller.abort();
  }, [floorId, forecastAttempt]);
  const [severity, setSeverity] = useState<"all" | AnomalySeverity>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const emailPendingRef = useRef(false);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const notificationPendingRef = useRef(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsStatus, setRecommendationsStatus] = useState("Loading recommendations from Copilot Studio…");
  const menuRef = useRef<HTMLButtonElement>(null);
  const visibleAnomalies = useMemo(() => anomalyMockData.anomalies.filter((anomaly) => (floor === "All Floors" || anomaly.floor === `Floor ${Number(floor.slice(1))}`) && (severity === "all" || anomaly.severity === severity)), [floor, severity]);
  const show = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(null), 2500); };
  const copySummary = async () => { if (!summary) return; await navigator.clipboard.writeText(summary); show("Management summary copied"); };
  const notifyFloorChampion = async (anomaly: EnergyAnomaly) => {
    if (notificationPendingRef.current) return;
    notificationPendingRef.current = true;
    setNotifyingId(anomaly.id);
    const cardFloorId = `F${String(Number(anomaly.floor.replace("Floor ", ""))).padStart(2, "0")}`;
    const notificationSummary = `Floor champion notification for ${anomaly.floor}. Prototype demo anomaly; this is not a measured monthly anomaly.\nIssue: ${anomaly.description}\nTime: ${anomaly.startTime}–${anomaly.endTime}\nSeverity: ${anomaly.severity}\nDeviation: ${anomaly.baselineDeviation}% above baseline\nPossible causes: ${anomaly.possibleCauses.join("; ")}\nRecommended action: ${anomaly.recommendedAction}\nSelected analysis period: ${periodLabel}. The demo anomaly has no recorded date and is not verified for this period.`;
    try {
      await emailEnergyInsights({ building: "Menara CGC", floorId: cardFloorId, floorName: anomaly.floor, analysisPeriod: periodLabel, summary: notificationSummary });
    } catch {
      // Notifications intentionally have no follow-up message; authentication state remains shared.
    } finally {
      notificationPendingRef.current = false;
      setNotifyingId(null);
    }
  };
  const prepareSummaryEmail = async () => {
    if (!summary || emailPendingRef.current) return;
    emailPendingRef.current = true;
    setEmailSending(true);
    setEmailResult(null);
    try {
      setEmailResult(await emailEnergyInsights({ building: "Menara CGC", floorId, floorName: floor, analysisPeriod: periodLabel, summary }));
    } catch (error) {
      setEmailResult({ success: false, message: error instanceof CopilotAuthRequiredError ? "Sign in using the sidebar, then click Send Email again." : "Email delivery could not be confirmed. Check whether it was sent before retrying." });
    } finally {
      emailPendingRef.current = false;
      setEmailSending(false);
    }
  };
  const exportSummary = () => { if (!summary) return; const url = URL.createObjectURL(new Blob([summary], { type: "text/plain" })); const link = document.createElement("a"); link.href = url; link.download = "energy-management-summary.txt"; link.click(); URL.revokeObjectURL(url); show("Summary exported"); };
  const requestRecommendations = () => {
    setRecommendationsStatus("Checking AI recommendations…");
    window.dispatchEvent(new CustomEvent("energy-chatbot-send", {
      detail: { message: "get_recommendation", background: true },
    }));
  };

  useEffect(() => {
    const receiveRecommendations = (event: Event) => {
      const payload = (event as CustomEvent<CopilotRecommendationsPayload>).detail;
      if (!payload) return;
      setRecommendations(payload.recommendations);
      setRecommendationsStatus(payload.recommendations.length
        ? `${payload.recommendations.length} recommendations generated from the agent.`
        : "The agent found no evidence-based recommendations.");
    };
    const receiveError = () => setRecommendationsStatus("Recommendations could not be loaded from the agent.");
    window.addEventListener("copilot-recommendations-data", receiveRecommendations);
    window.addEventListener("copilot-recommendations-error", receiveError);
    if (!recommendationsLoadStarted) {
      recommendationsLoadStarted = true;
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("energy-chatbot-send", {
        detail: { message: "get_recommendation", background: true },
      })), 100);
    }
    return () => {
      window.removeEventListener("copilot-recommendations-data", receiveRecommendations);
      window.removeEventListener("copilot-recommendations-error", receiveError);
    };
  }, []);

  return <div className={styles.shell}>
    <Sidebar items={navItems} activeHref="/insights" mobileOpen={mobileNavOpen} userInitials="HW" userName="Heng Wen" userSubtitle="Energy workspace" />
    <main className={styles.workspace}>
      <header className={styles.topbar}>
        <button ref={menuRef} className={styles.mobileMenu} onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
        <div className={styles.pageTitle}><h1>Energy Insights</h1></div>
      <section className={styles.filters} aria-label="Insight filters">
        <div className={styles.analysisPeriod} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPeriodOpen(false); }} onKeyDown={event => { if (event.key === "Escape") { setPeriodOpen(false); periodTriggerRef.current?.focus(); } }}>
          <button ref={periodTriggerRef} type="button" className={styles.periodTrigger} aria-label={`Analysis Period: ${periodLabel}`} aria-haspopup="dialog" aria-expanded={periodOpen} aria-controls="insights-period-picker" onClick={() => setPeriodOpen(open => !open)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>
            <span id="analysis-period-value">{periodLabel}</span><i aria-hidden="true" />
          </button>
          {periodOpen && <div id="insights-period-picker" className={styles.periodPopover} role="dialog" aria-label="Choose analysis period">
          <strong>Analysis Period</strong>
          <div className={styles.monthRange}>
            <label>From<select aria-label="Start month" value={startMonth} onChange={event => { const month = Number(event.target.value); setStartMonth(month); if (month > endMonth) setEndMonth(month); }}>{MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}</select></label>
            <span aria-hidden="true">→</span>
            <label>To<select aria-label="End month" value={endMonth} onChange={event => { const month = Number(event.target.value); setEndMonth(month); if (month < startMonth) setStartMonth(month); }}>{MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}</select></label>
          </div>
          <div className={styles.quickPeriods} aria-label="Quick analysis periods">{PERIODS.map(period => <button key={period.label} type="button" aria-pressed={startMonth === period.start && endMonth === period.end} onClick={() => { setStartMonth(period.start); setEndMonth(period.end); }}>{period.label}</button>)}</div>
          <button type="button" className={styles.periodDone} onClick={() => { setPeriodOpen(false); periodTriggerRef.current?.focus(); }}>Done</button>
          </div>}
        </div>
        <label><select aria-label="Floor" value={floor} onChange={(event) => setFloor(event.target.value)}><option>All Floors</option>{forecastFloors.map((value) => <option key={value}>{value}</option>)}</select></label>
      </section>
      </header>

      <nav className={styles.tabs} aria-label="Insights sections">{(["overview", "anomalies", "forecast", "summary"] as InsightTab[]).map((tab) => <button key={tab} className={activeTab === tab ? styles.activeTab : ""} onClick={() => setActiveTab(tab)}>{tab === "summary" ? "Management Summary" : tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav>

      {(activeTab === "overview") ? <>
        <section className={styles.metrics}>
          <StatCard icon={<Icon name="building" size={28} />} label="2026 Consumption" value={metricKwh(forecast?.actual2026Total)} comparisonText={`${periodLabel} · generated prototype data`} tone="neutral" trend="neutral" />
          <StatCard icon={<Icon name="trend" size={28} />} label="Change vs 2025 Baseline" value={forecastLoading ? "Loading…" : formatPercent(change)} comparisonText={`${periodLabel} · same period comparison`} tone={change === null || change === 0 ? "neutral" : change > 0 ? "negative" : "positive"} trend={change === null || change === 0 ? "neutral" : change > 0 ? "up" : "down"} />
          <StatCard icon={<Icon name="building" size={28} />} label="2027 Projected Consumption" value={metricKwh(forecast?.forecast2027Total)} comparisonText={`${periodLabel} · calculated projection`} tone="neutral" trend="neutral" />
          <StatCard icon={<Icon name="trend" size={28} />} label="Highest Forecast Month" value={forecastLoading ? "Loading…" : forecast?.highestForecastMonth ?? "Unavailable"} comparisonText={`${periodLabel} · 2027 projection`} tone="neutral" trend="neutral" />
        </section>
        <section className={styles.overviewGrid}>
          <article className={`${styles.panel} ${styles.performance}`} aria-busy={forecastLoading}>
            <PanelHead title="Energy performance overview" subtitle={`${floor} · ${periodLabel} comparison`} aside={<span className={styles.unit}>Calculated data</span>} />
            <div className={styles.performanceBody}>
              <div className={styles.finding}><span>Consumption trend</span><h2>{forecastLoading ? "Loading electricity performance…" : changeStatement(forecast, periodLabel)}</h2><p>2026 values are generated for prototype use. 2027 projections use the normal annual trend.</p></div>
              {forecastError ? <p role="alert">{forecastError} <button type="button" onClick={retryForecast}>Retry</button></p> : null}
              <dl><div><dt>2025 actual period total</dt><dd>{metricKwh(forecast?.actual2025Total)}</dd></div><div><dt>2026 generated period total</dt><dd>{metricKwh(forecast?.actual2026Total)}</dd></div><div><dt>2027 projected period total</dt><dd>{metricKwh(forecast?.forecast2027Total)}</dd></div></dl>
              <button onClick={() => setActiveTab("forecast")}>View Forecast Details</button>
            </div>
          </article>
        </section>
        <section className={styles.splitGrid}><div><div className={styles.sectionTitle}><div><h2>Detected anomalies</h2><p>Prototype demo data · independent of calculated overview metrics</p></div><button onClick={() => setActiveTab("anomalies")}>View all</button></div>{visibleAnomalies.slice(0, 2).map((anomaly) => <AnomalyCard key={anomaly.id} anomaly={anomaly} expanded={expanded === anomaly.id} onToggle={() => setExpanded(expanded === anomaly.id ? null : anomaly.id)} onAction={show} onNotify={() => void notifyFloorChampion(anomaly)} notifying={notifyingId === anomaly.id} notifyDisabled={notifyingId !== null} />)}</div><ForecastChart {...chartProps} /></section>
        <section><div className={styles.sectionTitle}><div><h2>AI recommendations</h2><p>{recommendationsStatus}</p></div><button type="button" onClick={requestRecommendations}>Check AI Recommendations</button></div><div className={styles.recommendations}>{recommendations.map((item) => <article key={item.id}><div><span>{item.floor}</span><span className={item.impact === "High" ? styles.highImpact : styles.moderateImpact}>{item.impact} impact</span></div><h3>{item.title}</h3><p>{item.explanation}</p><strong>{item.action}</strong></article>)}</div></section>
      </> : null}

      {activeTab === "anomalies" ? <section><div className={styles.sectionTitle}><div><h2>Anomaly detection</h2><p>{visibleAnomalies.length} prototype demo exceptions in the selected scope</p></div><label className={styles.severityFilter}>Severity<select value={severity} onChange={(event) => setSeverity(event.target.value as "all" | AnomalySeverity)}><option value="all">All</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label></div><div className={styles.anomalyGrid}>{visibleAnomalies.map((anomaly) => <AnomalyCard key={anomaly.id} anomaly={anomaly} expanded={expanded === anomaly.id} onToggle={() => setExpanded(expanded === anomaly.id ? null : anomaly.id)} onAction={show} onNotify={() => void notifyFloorChampion(anomaly)} notifying={notifyingId === anomaly.id} notifyDisabled={notifyingId !== null} />)}</div></section> : null}
      {activeTab === "forecast" ? <section className={styles.forecastOnly}><ForecastChart {...chartProps} /></section> : null}
      {activeTab === "summary" ? <section className={`${styles.panel} ${styles.summaryCard}`}><PanelHead title="Management summary" subtitle={`${floor} · ${periodLabel} electricity summary`} /><blockquote>{summary ?? (forecastLoading ? "Loading management summary…" : "Unavailable. Forecast data is needed to generate a management summary.")}</blockquote><div className={styles.summaryActions}><button disabled={forecastLoading} onClick={() => { retryForecast(); show("Refreshing summary from the selected scope"); }}><Icon name="spark" size={16} />Generate Summary</button><button disabled={!summary} onClick={() => void copySummary()}><Icon name="copy" size={16} />Copy Summary</button><button type="button" disabled={!summary || emailSending} aria-busy={emailSending} onClick={() => void prepareSummaryEmail()}>{emailSending ? "Sending email…" : "Send Email"}</button><button disabled={!summary} onClick={exportSummary}><Icon name="download" size={16} />Export</button></div>{emailResult && <p className={styles.forecastNote} role={emailResult.success ? "status" : "alert"}>{emailResult.message}</p>}</section> : null}
    </main>
    {mobileNavOpen ? <button className={styles.scrim} aria-label="Close navigation" onClick={() => { setMobileNavOpen(false); menuRef.current?.focus(); }} /> : null}
    {notice ? <div className={styles.toast} role="status"><span />{notice}</div> : null}
  </div>;
}
