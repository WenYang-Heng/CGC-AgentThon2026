"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import EnergyFilterBar from "@/components/EnergyFilters/EnergyFilterBar";
import { useEnergyFilters } from "@/lib/use-energy-filters";
import { MONTHS, isMonthInPeriod } from "@/lib/energy-filters";
import Sidebar from "@/components/Sidebar/Sidebar";
import ReportFormModal from "@/components/ReportFormModal/ReportFormModal";
import ReportTable, { EnergyWasteReport } from "@/components/ReportTable/ReportTable";
import { createEnergyWasteReport } from "@/services/chatbot-service";
import styles from "./report-energy-waste.module.css";

type Tab = "active" | "review" | "resolved";

const initialReports: EnergyWasteReport[] = [
  { id: "EWR-1048", issue: "Air Conditioning", floorId: "F08", location: "Floor 8 · Meeting Room", dateReported: "29 Sep 2026", status: "Under Review" },
  { id: "EWR-1047", issue: "Lights", floorId: "F12", location: "Floor 12 · Open Office", dateReported: "28 Sep 2026", status: "Active" },
  { id: "EWR-1046", issue: "Equipment", floorId: "F04", location: "Floor 4 · Pantry", dateReported: "27 Sep 2026", status: "Under Review" },
  { id: "EWR-1045", issue: "Lights", floorId: "F15", location: "Floor 15 · Training Room", dateReported: "25 Sep 2026", status: "Resolved" },
  { id: "EWR-1044", issue: "Equipment", floorId: "F02", location: "Floor 2 · Server Room", dateReported: "24 Sep 2026", status: "Active" },
  { id: "EWR-1043", issue: "Air Conditioning", floorId: "F10", location: "Floor 10 · Reception", dateReported: "22 Sep 2026", status: "Resolved" },
];

const sidebarItems = [
  { label: "Energy Explorer", href: "/", icon: <Icon name="chart" /> },
  { label: "Report Energy Waste", href: "/report-energy-waste", icon: <Icon name="report" /> },
  { label: "Insights", href: "/insights", icon: <Icon name="insights" /> },
];

export default function ReportEnergyWastePage() {
  const common = useEnergyFilters({ years: [2025, 2026], selection: "multi" });
  const [issueFilter, setIssueFilter] = useState("");
  const [tab, setTab] = useState<Tab>("active");
  const [reports, setReports] = useState(initialReports);
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const scopedReports = useMemo(() => reports.filter(report => {
    const [, month, year] = report.dateReported.split(" ");
    return (!common.value.floorIds || common.value.floorIds.includes(report.floorId))
      && isMonthInPeriod(MONTHS.indexOf(month), common.value.period, Number(year))
      && (!issueFilter || report.issue === issueFilter);
  }), [reports, common.value.floorIds, common.value.period, issueFilter]);
  const visibleReports = scopedReports.filter(report => tab === "active" ? report.status !== "Resolved" : tab === "review" ? report.status === "Under Review" : report.status === "Resolved");

  const closeModal = useCallback(() => { if (!submissionInProgress.current) setModalOpen(false); }, []);
  const counts = { active: scopedReports.filter((report) => report.status !== "Resolved").length, review: scopedReports.filter((report) => report.status === "Under Review").length, resolved: scopedReports.filter((report) => report.status === "Resolved").length };

  return (
    <div className={styles.shell}>
      <Sidebar items={sidebarItems} activeHref="/report-energy-waste" mobileOpen={mobileNavOpen} />
      <main className={styles.workspace}>
        <header className={styles.pageHeader}>
          <button className={styles.menuButton} type="button" onClick={() => setMobileNavOpen((value) => !value)} aria-label="Toggle navigation" aria-expanded={mobileNavOpen}><Icon name="menu" /></button>
          <h1>Report Energy Waste</h1>
          <button className={styles.createButton} type="button" disabled={submitting} onClick={() => { setSubmitError(null); setSuccessMessage(null); setModalOpen(true); }}><Icon name="plus" /><span>Create report</span></button>
        </header>

        <div className={styles.sharedFilters}><EnergyFilterBar value={common.value} onChange={common.onChange} availableYears={[2025, 2026]} floorSelection="multi" advancedFilters={[{ key: "issue", label: "Issue type", value: issueFilter, options: [{ value: "", label: "All issue types" }, ...["Lights", "Air Conditioning", "Equipment"].map(value => ({ value, label: value }))] }]} onApplyAdvanced={values => setIssueFilter(values.issue)} /></div>
        {successMessage && <p className={styles.successMessage} role="status">{successMessage}</p>}

        <section className={styles.reportPanel} aria-labelledby="reports-heading">
          <div className={styles.tabs} role="tablist" aria-label="Report status">
            {([['active', 'All active', counts.active], ['review', 'Under Review', counts.review], ['resolved', 'Resolved', counts.resolved]] as const).map(([value, label, count]) => (
              <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? styles.tabActive : ""} onClick={() => setTab(value)}>{label}<span>{count}</span></button>
            ))}
          </div>
          <ReportTable reports={visibleReports} />
        </section>
      </main>
      {mobileNavOpen && <button type="button" className={styles.scrim} aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <ReportFormModal open={modalOpen} submitting={submitting} error={submitError} onClose={closeModal} onSubmit={async (report) => {
        if (submissionInProgress.current) return;
        submissionInProgress.current = true;
        setSubmitting(true);
        setSubmitError(null);
        setSuccessMessage(null);
        const minimumLoading = new Promise<void>(resolve => window.setTimeout(resolve, 1500));
        try {
          const request = createEnergyWasteReport({
            issueType: report.issue,
            floorId: report.floorId,
            floorName: report.floorName,
            roomType: report.roomType,
            description: report.description,
          });
          const [outcome] = await Promise.all([request.then(result => ({ result }), error => ({ error })), minimumLoading]);
          if ("error" in outcome) throw outcome.error;
          const result = outcome.result;
          if (!result.success || !result.reportId) throw new Error(result.message || "The report could not be created.");
          const dateReported = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
          setReports((current) => [{ id: result.reportId!, issue: report.issue, floorId: report.floorId, location: `${report.floorName} · ${report.roomType}`, dateReported, status: result.status ?? "Active" }, ...current]);
          setTab("active");
          setSuccessMessage(`Report ${result.reportId} created successfully.`);
          setModalOpen(false);
        } catch (error) {
          setSubmitError(error instanceof Error ? error.message : "The report could not be created.");
        } finally {
          submissionInProgress.current = false;
          setSubmitting(false);
        }
      }} />
    </div>
  );
}

function Icon({ name }: { name: "chart" | "report" | "insights" | "menu" | "plus" }) {
  const paths = {
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /><path d="m4 14 5-4 4 3 6-7" /></>,
    report: <><path d="M8 4h8M9 3h6v3H9zM7 5H5v16h14V5h-2" /><path d="M8 11h8M8 15h5" /></>,
    insights: <path d="M4 20v-6M9 20V9M14 20v-4M19 20V4" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
