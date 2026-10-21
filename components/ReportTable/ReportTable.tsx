import styles from "./ReportTable.module.css";

export type ReportStatus = "Active" | "Under Review" | "Resolved";

export type EnergyWasteReport = {
  id: string;
  issue: "Lights" | "Air Conditioning" | "Equipment";
  location: string;
  floorId: string;
  dateReported: string;
  status: ReportStatus;
};

const statusClass: Record<ReportStatus, string> = {
  Active: styles.open,
  "Under Review": styles.review,
  Resolved: styles.resolved,
};

export default function ReportTable({ reports }: { reports: EnergyWasteReport[] }) {
  if (reports.length === 0) {
    return (
      <div className={styles.empty}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4h8M9 3h6v3H9zM7 5H5v16h14V5h-2M8 11h8M8 15h5" />
        </svg>
        <strong>No reports in this view</strong>
        <p>Reports matching the selected filters will appear here.</p>
      </div>
    );
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ref. ID</th>
            <th>Issue</th>
            <th>Location</th>
            <th>Date Reported</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td className={styles.reference}>{report.id}</td>
              <td>
                <span className={styles.issueIcon} aria-hidden="true">
                  {report.issue === "Lights" ? <LightIcon /> : report.issue === "Air Conditioning" ? <AirIcon /> : <EquipmentIcon />}
                </span>
                <strong>{report.issue}</strong>
              </td>
              <td>{report.location}</td>
              <td>{report.dateReported}</td>
              <td><span className={`${styles.status} ${statusClass[report.status]}`}>{report.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LightIcon() {
  return <svg viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M8.5 15.5A7 7 0 1 1 15.5 15.5C14.5 16.3 14 17 14 18h-4c0-1-.5-1.7-1.5-2.5Z" /></svg>;
}

function AirIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 8h10c2 0 3-1 3-2.5S16 3 14.5 3C13 3 12 4 12 5M4 12h14c1.5 0 2.5 1 2.5 2.5S19.5 17 18 17c-1.2 0-2.1-.7-2.4-1.7M4 16h7" /></svg>;
}

function EquipmentIcon() {
  return <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h3M15 15.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>;
}
