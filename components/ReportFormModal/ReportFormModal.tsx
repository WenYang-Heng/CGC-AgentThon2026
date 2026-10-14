"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { EnergyWasteReport } from "../ReportTable/ReportTable";
import styles from "./ReportFormModal.module.css";

type Issue = EnergyWasteReport["issue"];

type Props = {
  open: boolean;
  onClose: () => void;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (report: { issue: Issue; floorId: string; floorName: string; roomType: string; description: string }) => void;
};

const issues: { name: Issue; icon: React.ReactNode }[] = [
  { name: "Lights", icon: <path d="M9 18h6M10 22h4M8.5 15.5A7 7 0 1 1 15.5 15.5C14.5 16.3 14 17 14 18h-4c0-1-.5-1.7-1.5-2.5Z" /> },
  { name: "Air Conditioning", icon: <path d="M4 8h10c2 0 3-1 3-2.5S16 3 14.5 3C13 3 12 4 12 5M4 12h14c1.5 0 2.5 1 2.5 2.5S19.5 17 18 17c-1.2 0-2.1-.7-2.4-1.7M4 16h7" /> },
  { name: "Equipment", icon: <path d="M5 4h14v16H5zM8 8h8M8 12h3M15 15.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /> },
];

const rooms = ["Open Office", "Meeting Room", "Pantry", "Server Room", "Reception", "Training Room", "Utility Room"];

export default function ReportFormModal({ open, onClose, submitting = false, error, onSubmit }: Props) {
  const [issue, setIssue] = useState<Issue>("Lights");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");
  const [description, setDescription] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstControlRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstControlRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      if (!controls?.length) { event.preventDefault(); dialogRef.current?.focus(); return; }
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && submitting) dialogRef.current?.focus();
  }, [open, submitting]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting || !floor || !room || description.trim().length < 10) return;
    onSubmit({ issue, floorId: `F${floor.padStart(2, "0")}`, floorName: `Floor ${floor}`, roomType: room, description: description.trim() });
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (!submitting && event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
        <header className={styles.header}>
          <div>
            <span className={styles.headerIcon}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></span>
            <div><h2 id="report-dialog-title">Create energy waste report</h2></div>
          </div>
          <button ref={firstControlRef} type="button" className={styles.close} onClick={onClose} disabled={submitting} aria-label="Close report form"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
        </header>

        <form onSubmit={submit} aria-busy={submitting}>
          <fieldset className={styles.issueFieldset}>
            <legend>Issue</legend>
            <div className={styles.issueGrid}>
              {issues.map((option) => (
                <button key={option.name} disabled={submitting} type="button" className={issue === option.name ? styles.issueSelected : ""} onClick={() => setIssue(option.name)} aria-pressed={issue === option.name}>
                  <svg viewBox="0 0 24 24">{option.icon}</svg><span>{option.name}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.fieldGrid}>
            <label>Floor<select disabled={submitting} required value={floor} onChange={(event) => setFloor(event.target.value)}><option value="" disabled>Select floor</option>{Array.from({ length: 16 }, (_, index) => <option key={index + 1} value={index + 1}>Floor {index + 1}</option>)}</select></label>
            <label>Room type<select disabled={submitting} required value={room} onChange={(event) => setRoom(event.target.value)}><option value="" disabled>Select room</option>{rooms.map((name) => <option key={name}>{name}</option>)}</select></label>
          </div>

          <label className={styles.description}>Describe the issue<textarea disabled={submitting} required minLength={10} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Please describe the issue you encountered." rows={5} /><small>Provide at least 10 characters so the facilities team can investigate.</small></label>

          {!submitting && error && <div className={styles.error} role="alert"><strong>Report creation could not be confirmed</strong><p>{error}</p><p>Your entries are preserved. Check the reports before retrying if the connection was interrupted.</p></div>}
          <footer className={styles.footer}>
            <button type="button" className={styles.cancel} onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submit} aria-busy={submitting} disabled={submitting || !floor || !room || description.trim().length < 10}>{submitting && <span className={styles.spinner} aria-hidden="true" />}<span aria-live="polite">{submitting ? "Creating report…" : error ? "Retry submission" : "Submit report"}</span></button>
          </footer>
        </form>
      </div>
    </div>
  );
}
