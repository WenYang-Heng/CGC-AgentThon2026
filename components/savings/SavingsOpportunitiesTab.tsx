"use client";

import { useMemo, useRef, useState } from "react";
import StatCard from "@/components/StatCard/StatCard";
import { filterOpportunities, formatCurrencyMYR, formatEnergySaving, getFinancialOpportunity, rankOpportunities, summarizeOpportunities } from "@/lib/savings-calculations";
import type { SavingsFilters, SavingsOpportunity, SavingsPageData } from "@/types/savings";
import styles from "./SavingsPage.module.css";
import SavingsDropdown from "./SavingsDropdown";

function Mark() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 5h18v15H3zM3 9h18M15 13h6M6 16h5" /></svg>;
}

function OpportunityDetail({ item, onClose }: { item: SavingsOpportunity; onClose: () => void }) {
  return <section className={styles.detail} aria-label={`Details for ${item.id}`}>
    <div className={styles.sectionHead}><div><span className={styles.eyebrow}>{item.id} · {item.category}</span><h3>{item.action}</h3></div><button type="button" onClick={onClose}>Close details</button></div>
    <dl className={styles.detailGrid}>
      <div><dt>Trigger condition</dt><dd>{item.trigger ?? "Not specified"}</dd></div>
      <div><dt>Recommended action</dt><dd>{item.action}</dd></div>
      <div><dt>Energy opportunity</dt><dd>{formatEnergySaving(item.estimatedKwhSaving)}</dd></div>
      <div><dt>Financial opportunity</dt><dd>{formatCurrencyMYR(getFinancialOpportunity(item))}<small>{item.reportedRmSaving !== null ? "Source-reported RM" : item.calculatedRmSaving !== null ? "Workbook-calculated RM" : "No financial estimate"}</small></dd></div>
      <div><dt>Source-reported CO₂e opportunity</dt><dd>{item.reportedCo2eTonnes === null ? "Not quantified" : `${item.reportedCo2eTonnes.toLocaleString("en-MY")} t/year`}</dd></div>
      <div><dt>Evidence</dt><dd>{item.sourceType ?? "Not specified"}<small>{item.evidenceSource ?? "Evidence not specified"}</small></dd></div>
      <div><dt>Confidence / status</dt><dd>{item.confidence ?? "Unspecified"} · {item.approvalStatus ?? "Unspecified"}</dd></div>
      <div><dt>Owner / estimate period</dt><dd>{item.ownerFunction ?? "Unassigned"} · {item.savingPeriod ?? "Not specified"}<small>{item.estimateType}</small></dd></div>
    </dl>
    <p className={styles.note}>{item.disclaimer ?? "Audit-derived opportunity. Subject to technical validation, approval, implementation and measurement & verification."}</p>
  </section>;
}

export default function SavingsOpportunitiesTab({ data, filters }: { data: SavingsPageData; filters: SavingsFilters }) {
  const [sort, setSort] = useState<"energy" | "financial">("energy");
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const opportunities = data?.opportunities ?? [];
  const filtered = useMemo(() => filterOpportunities(data?.opportunities ?? [], filters), [data, filters]);
  const summary = useMemo(() => summarizeOpportunities(filtered, data?.baselineAnnualConsumptionKwh ?? null), [filtered, data]);
  const detail = opportunities.find(item => item.id === detailId);
  const tableItems = rankOpportunities(filtered, sort);
  const detailOpen = (id: string) => {
    setDetailId(id);
    window.requestAnimationFrame(() => { detailRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" }); detailRef.current?.focus(); });
  };

  return <>
        <section className={styles.kpis} aria-label="Gross audit opportunity">
          <StatCard icon={<Mark />} label="Gross Energy Opportunity" value={formatEnergySaving(summary.grossEnergyOpportunityKwh)} comparisonText="Audit-derived, before overlap adjustment" tone="neutral" trend="neutral" />
          <StatCard icon={<Mark />} label="Gross Financial Opportunity" value={formatCurrencyMYR(summary.grossFinancialOpportunityRm)} comparisonText="Audit-derived annual opportunity" tone="neutral" trend="neutral" />
        </section>

        <section className={styles.panel} aria-labelledby="portfolio-title">
          <div className={styles.sectionHead}><div><h2 id="portfolio-title">Opportunity Portfolio</h2></div><div className={styles.portfolioSort}><SavingsDropdown label="Opportunity portfolio sort" value={sort} onChange={value => setSort(value as "energy" | "financial")} options={[{"value":"energy","label":"Energy opportunity ↓"},{"value":"financial","label":"Financial opportunity ↓"}]} /></div></div>
          <div className={styles.tableScroll} tabIndex={0} aria-label="Scrollable opportunity portfolio"><table><thead><tr><th scope="col">Opportunity</th><th scope="col">Category</th><th scope="col">Energy Opportunity</th><th scope="col">Financial Opportunity</th><th scope="col">Confidence</th><th scope="col">Status</th><th scope="col">Owner</th></tr></thead><tbody>
            {tableItems.map(item => <tr key={item.id}><th scope="row"><button type="button" onClick={() => detailOpen(item.id)} aria-expanded={detailId === item.id}>{item.action}</button><small>{item.id}</small></th><td>{item.category}</td><td>{formatEnergySaving(item.estimatedKwhSaving)}</td><td>{formatCurrencyMYR(getFinancialOpportunity(item))}<small>{item.reportedRmSaving !== null ? "Source-reported" : item.calculatedRmSaving !== null ? "Workbook-calculated" : ""}</small></td><td><span className={styles.badge}>{item.confidence ?? "Unspecified"}</span></td><td><span className={styles.badge}>{item.approvalStatus ?? "Unspecified"}</span></td><td>{item.ownerFunction ?? "Unassigned"}</td></tr>)}
            {!tableItems.length && <tr><td colSpan={7} className={styles.empty}>No opportunities match these filters.</td></tr>}
          </tbody></table></div>
          <div ref={detailRef} tabIndex={-1}>{detail && <OpportunityDetail item={detail} onClose={() => setDetailId(null)} />}</div>
        </section>

  </>;
}
