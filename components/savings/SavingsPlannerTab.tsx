"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard/StatCard";
import { getForecast } from "@/services/forecast-service";
import { formatCurrencyMYR, formatEnergySaving, hasPotentialOverlap, planningValue, postActionConsumption, summarizeOpportunities } from "@/lib/savings-calculations";
import type { SavingsPageData } from "@/types/savings";
import styles from "./SavingsPage.module.css";

type ForecastState = { status: "loading" } | { status: "error" } | { status: "ready"; total: number | null; year: number };
const icon = <span aria-hidden="true">↘</span>;
export default function SavingsPlannerTab({ data, active }: { data: SavingsPageData; active: boolean }) {
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [rate, setRate] = useState(0.7);
  const [forecast, setForecast] = useState<ForecastState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    getForecast(null, controller.signal).then(result => { if (!controller.signal.aborted) setForecast({ status: "ready", total: result.forecast2027Total, year: result.forecastYear }); }).catch(() => { if (!controller.signal.aborted) setForecast({ status: "error" }); });
    return () => controller.abort();
  }, [active, attempt]);
  const items = useMemo(() => data.opportunities.filter(item => selected.includes(item.id)), [data, selected]);
  const summary = summarizeOpportunities(items, data.baselineAnnualConsumptionKwh);
  const planningEnergy = planningValue(summary.grossEnergyOpportunityKwh, rate);
  const planningFinance = planningValue(summary.grossFinancialOpportunityRm, rate);
  const visible = data.opportunities.filter(item => !category || item.category === category);
  const overlap = hasPotentialOverlap(items);
  const after = postActionConsumption(forecast.status === "ready" ? forecast.total : null, planningEnergy);
  const energy = (value: number | null) => value === null ? "Unavailable" : `${(value / 1000).toLocaleString("en-MY", { maximumFractionDigits: 1 })} MWh`;
  return <>
    <div className={styles.tabToolbar}><div><h2>Selected Gross Opportunity</h2></div><label className={styles.sort}>Category<select aria-label="Planner category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{[...new Set(data.opportunities.map(item => item.category))].sort().map(value => <option key={value}>{value}</option>)}</select></label></div>
    <section className={styles.kpis} aria-label="Selected gross opportunity metrics">
      <StatCard icon={icon} label="Selected Measures" value={String(selected.length)} comparisonText="Measures considered for technical review" tone="neutral" trend="neutral" />
      <StatCard icon={icon} label="Gross Energy Opportunity" value={formatEnergySaving(summary.grossEnergyOpportunityKwh)} comparisonText="Selected gross opportunity · before overlap" tone="neutral" trend="neutral" />
      <StatCard icon={icon} label="Gross Financial Opportunity" value={formatCurrencyMYR(summary.grossFinancialOpportunityRm)} comparisonText="Source-reported RM preferred" tone="neutral" trend="neutral" />
      <StatCard icon={icon} label="Potential Reduction vs Baseline" value={summary.opportunityPercentageOfBaseline === null ? "Unavailable" : `${summary.opportunityPercentageOfBaseline.toFixed(1)}%`} comparisonText="Gross potential · not guaranteed achievable" tone="neutral" trend="neutral" />
    </section>
    {overlap && <p className={styles.overlap}><strong>Potential overlap</strong>Some selected measures may affect the same energy load. Combined savings should not be treated as additive until technically validated.</p>}
    <div className={styles.lowerGrid}>
      <section className={styles.panel} aria-labelledby="measure-selector-title"><div className={styles.sectionHead}><div><h2 id="measure-selector-title">Measure Selector</h2></div><button type="button" disabled={!selected.length} onClick={() => setSelected([])}>Clear</button></div><div className={styles.scenarioList}>{visible.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} /><span><strong>{item.action}</strong><small>{item.category} · {item.confidence ?? "Unspecified"} confidence</small><small>{formatEnergySaving(item.estimatedKwhSaving)} · {formatCurrencyMYR(item.reportedRmSaving ?? item.calculatedRmSaving)}</small></span></label>)}</div><p className={styles.helper}>{selected.filter(id => !visible.some(item => item.id === id)).length} selected measures are outside the current filter.</p></section>
      <section className={styles.panel} aria-labelledby="planning-title"><h2 id="planning-title">Planning Scenario</h2><label className={styles.sort}>Planning realization<select aria-label="Planning realization" value={rate} onChange={event => setRate(Number(event.target.value))}><option value={0.5}>Conservative · 50%</option><option value={0.7}>Planning · 70%</option><option value={1}>Full Gross · 100%</option></select></label>{!selected.length ? <p className={styles.empty}>No measures selected.</p> : <div className={styles.scenarioTotals} aria-live="polite"><span>Selected gross opportunity</span><strong>{formatEnergySaving(summary.grossEnergyOpportunityKwh)}</strong><strong>{formatCurrencyMYR(summary.grossFinancialOpportunityRm)}</strong><span>{Math.round(rate * 100)}% user-selected assumption</span><span>Illustrative planning saving</span><strong>{formatEnergySaving(planningEnergy)}</strong><strong>{formatCurrencyMYR(planningFinance)}</strong></div>}<p className={styles.note}>Planning scenario only. Actual savings require implementation and measurement. Measures may overlap; the realization assumption does not resolve overlap.</p></section>
    </div>
    <section className={styles.panel} aria-labelledby="projected-title"><h2 id="projected-title">Projected Impact</h2>
      {forecast.status === "loading" ? <p role="status">Loading forecast comparison…</p> : forecast.status === "error" ? <div><p>Forecast service is currently unavailable. Measure selection and planning remain available.</p><button type="button" onClick={() => { setForecast({ status: "loading" }); setAttempt(value => value + 1); }}>Retry forecast</button></div> : <div className={styles.impactGrid}><div><span>{forecast.year} Forecast Without Measures</span><strong>{energy(forecast.total)}</strong></div><div><span>Selected Planning Saving</span><strong>{selected.length ? energy(planningEnergy) : "No measures selected"}</strong></div><div><span>Illustrative Post-Action Consumption</span><strong>{energy(after)}</strong></div></div>}
      {forecast.status === "ready" && selected.length > 0 && planningEnergy !== null && forecast.total !== null && planningEnergy > forecast.total && <p className={styles.note}>Selected planning savings exceed the forecast. No negative post-action consumption is shown; revise the selection and validate overlap.</p>}
      <p className={styles.helper}>This is an illustrative annual comparison; the forecast model does not model selected interventions. Future financial impact is omitted because no validated 2027 cost rate is available.</p>
    </section>
  </>;
}
