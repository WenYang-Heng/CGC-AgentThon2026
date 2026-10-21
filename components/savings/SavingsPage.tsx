"use client";

import { useRef, useState } from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import type { SavingsFilters, SavingsPageData } from "@/types/savings";
import CostPerformanceTab from "./CostPerformanceTab";
import SavingsOpportunitiesTab from "./SavingsOpportunitiesTab";
import styles from "./SavingsPage.module.css";
import EnergyFilterBar from "@/components/EnergyFilters/EnergyFilterBar";
import { useEnergyFilters } from "@/lib/use-energy-filters";

const tabs = [{ id: "cost", label: "Cost Performance" }, { id: "opportunities", label: "Savings Opportunities" }] as const;
type Tab = typeof tabs[number]["id"];
const icon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 5h18v15H3zM3 9h18M15 13h6M6 16h5" /></svg>;
const navItems = [{ label: "Energy Explorer", href: "/", icon }, { label: "Report Energy Waste", href: "/report-energy-waste", icon }, { label: "Insights", href: "/insights", icon }];

export default function SavingsPage({ data }: { data: SavingsPageData | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("cost");
  const common = useEnergyFilters({ years: [2025, 2026], selection: "multi" });
  const [filters, setFilters] = useState<SavingsFilters>({ category: "", confidence: "", status: "" });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuRef = useRef<HTMLButtonElement>(null);
  return <div className={styles.shell}>
    <Sidebar items={navItems} activeHref="/savings" mobileOpen={mobileOpen} />
    <main className={styles.workspace}>
      <header className={styles.header}>
        <button ref={menuRef} type="button" className={styles.mobileMenu} aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>☰</button>
        <div><h1>Savings &amp; Cost</h1></div>
      </header>
      {data && <div className={styles.sharedFilters}><EnergyFilterBar value={common.value} onChange={common.onChange} notice={activeTab === "cost" ? common.notice : "Audit opportunities are annual and building-wide. Period and floor selections apply to Cost Performance."} availableYears={[2025, 2026]} floorSelection="multi" showPeriod={activeTab === "cost"} showFloor={activeTab === "cost"} advancedFilters={activeTab === "opportunities" ? ([{ key: "category", field: "category", label: "Category", all: "All categories" }, { key: "confidence", field: "confidence", label: "Confidence", all: "All confidence" }, { key: "status", field: "approvalStatus", label: "Status", all: "All statuses" }] as const).map(({ key, field, label, all }) => ({ key, label, value: filters[key], options: [{ value: "", label: all }, ...[...new Set(data.opportunities.map(item => item[field]).filter((value): value is string => value !== null))].sort().map(value => ({ value, label: value }))] })) : []} onApplyAdvanced={values => setFilters({ category: values.category, confidence: values.confidence, status: values.status })} /></div>}

      {!data ? <section className={styles.panel} role="alert"><h2>Savings data is temporarily unavailable</h2><p>Please try again. The source workbooks could not be loaded.</p><a href="/savings">Reload savings data</a></section> : <>
        <div className={styles.tabs} role="tablist" aria-label="Savings & Cost sections">{tabs.map((tab, index) => <button key={tab.id} id={`savings-tab-${tab.id}`} ref={node => { tabRefs.current[index] = node; }} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`savings-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={event => {
          const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
          if (next !== null) { event.preventDefault(); setActiveTab(tabs[next].id); tabRefs.current[next]?.focus(); }
        }}>{tab.label}</button>)}</div>
        <div role="tabpanel" id="savings-panel-cost" aria-labelledby="savings-tab-cost" hidden={activeTab !== "cost"}><CostPerformanceTab data={data} period={common.value.period} floorIds={common.value.floorIds} /></div>
        <div role="tabpanel" id="savings-panel-opportunities" aria-labelledby="savings-tab-opportunities" hidden={activeTab !== "opportunities"}><SavingsOpportunitiesTab data={data} filters={filters} /></div>
      </>}
    </main>
    {mobileOpen && <button type="button" className={styles.scrim} aria-label="Close navigation" onClick={() => { setMobileOpen(false); menuRef.current?.focus(); }} />}
  </div>;
}
