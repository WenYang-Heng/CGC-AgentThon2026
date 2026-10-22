"use client";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { CalendarDays, Building2, SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { DEFAULT_ENERGY_FILTERS, FLOOR_IDS, MONTH_NAMES, formatFloorName, formatPeriodLabel } from "@/lib/energy-filters";
import type { EnergyFilterState } from "@/types/energy-filters";
import styles from "./EnergyFilterBar.module.css";

export type AdvancedFilter = { key: string; label: string; value: string; defaultValue?: string; options: { value: string; label: string }[] };
type Props = {
  value: EnergyFilterState; onChange: (value: EnergyFilterState) => void;
  floors?: { id: string; label: string }[]; floorSelection?: "single" | "multi";
  availableYears?: number[]; showPeriod?: boolean; showFloor?: boolean; notice?: string;
  advancedFilters?: AdvancedFilter[]; onApplyAdvanced?: (values: Record<string, string>) => void;
};
function Popover({ label, icon, children }: { label: string; icon: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false); const id = useId();
  const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); document.getElementById(id + "-trigger")?.focus(); };
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="dialog"] input, [role="dialog"] select, [role="dialog"] button')?.focus();
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss); return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  return <div ref={root} className={styles.picker} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
    <button id={id + "-trigger"} ref={trigger} type="button" className={styles.trigger} aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }}>{icon}<span>{label}</span><ChevronDown size={15} /></button>
    {open && <div id={id} role="dialog" aria-label={label.split(":")[0]} className={styles.popover}>{children(close)}</div>}
  </div>;
}
function FloorChoices({ value, floors, selection, onApply, close }: { value: string[] | null; floors: { id: string; label: string }[]; selection: "single" | "multi"; onApply: (ids: string[] | null) => void; close: () => void }) {
  const [draft, setDraft] = useState(value); const [search, setSearch] = useState("");
  if (selection === "single") return <div className={styles.singleFloors}>{[{ id: "", label: "All Floors" }, ...floors].map(floor => <button type="button" key={floor.id} aria-pressed={(value?.[0] ?? "") === floor.id} onClick={() => { onApply(floor.id ? [floor.id] : null); close(); }}>{floor.label}</button>)}</div>;
  return <><label className={styles.search}>Search floors<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Floor name or ID" /></label><div className={styles.options}>
    <label><input type="checkbox" checked={draft === null} onChange={() => setDraft(draft === null ? [] : null)} />All Floors</label>
    {floors.filter(floor => `${floor.label} ${floor.id}`.toLowerCase().includes(search.toLowerCase())).map(floor => <label key={floor.id}><input type="checkbox" checked={draft === null || draft.includes(floor.id)} onChange={() => setDraft(current => { const ids = current ?? floors.map(item => item.id); return ids.includes(floor.id) ? ids.filter(id => id !== floor.id) : [...ids, floor.id]; })} />{floor.label}</label>)}
  </div><div className={styles.footer}><button type="button" onClick={() => setDraft(null)}>Select all</button><button type="button" onClick={() => setDraft([])}>Clear</button><button type="button" onClick={close}>Cancel</button><button type="button" className={styles.primary} disabled={draft?.length === 0} onClick={() => { onApply(draft?.length === floors.length ? null : draft); close(); }}>Apply</button></div></>;
}
function AdvancedPanel({ filters, onApply, close }: { filters: AdvancedFilter[]; onApply: (values: Record<string, string>) => void; close: () => void }) {
  const [draft, setDraft] = useState(Object.fromEntries(filters.map(filter => [filter.key, filter.value])));
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { root.current?.querySelector("select")?.focus(); }, []);
  return <div ref={root} className={styles.advanced}><div className={styles.advancedFields}>{filters.map(filter => <label key={filter.key}>{filter.label}<select value={draft[filter.key]} onChange={event => setDraft(current => ({ ...current, [filter.key]: event.target.value }))}>{filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}</div><div className={styles.footer}><button type="button" onClick={() => setDraft(Object.fromEntries(filters.map(filter => [filter.key, filter.defaultValue ?? ""])))}>Reset</button><button type="button" onClick={close}>Cancel</button><button type="button" className={styles.primary} onClick={() => { onApply(draft); close(); }}>Apply filters</button></div></div>;
}

function PeriodChoices({ value, years, onChange, close }: { value: EnergyFilterState; years: number[]; onChange: Props["onChange"]; close: () => void }) {
  return <>
    <div className={styles.presets}>{[{ label: "Full Year", start: 0, end: 11 }, ...[0, 1, 2, 3].map(q => ({ label: "Q" + (q + 1), start: q * 3, end: q * 3 + 2 }))].map(preset => <button type="button" key={preset.label} aria-pressed={value.period.startMonth === preset.start && value.period.endMonth === preset.end} onClick={() => { onChange({ ...value, period: { ...value.period, startMonth: preset.start, endMonth: preset.end } }); close(); }}>{preset.label}</button>)}</div>
    <div className={styles.range}>
      <label>From<select aria-label="Start month" value={value.period.startMonth} onChange={event => { const startMonth = Number(event.target.value); onChange({ ...value, period: { ...value.period, startMonth, endMonth: Math.max(startMonth, value.period.endMonth) } }); }}>{MONTH_NAMES.map((month, index) => <option value={index} key={month}>{month}</option>)}</select></label>
      <label>To<select aria-label="End month" value={value.period.endMonth} onChange={event => { const endMonth = Number(event.target.value); onChange({ ...value, period: { ...value.period, endMonth, startMonth: Math.min(endMonth, value.period.startMonth) } }); }}>{MONTH_NAMES.map((month, index) => <option value={index} key={month}>{month}</option>)}</select></label>
      <label>Year<select aria-label="Analysis year" value={value.period.year} onChange={event => onChange({ ...value, period: { ...value.period, year: Number(event.target.value) } })}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
    </div><div className={styles.footer}><button type="button" className={styles.primary} onClick={close}>Done</button></div>
  </>;
}

export default function EnergyFilterBar({ value, onChange, floors = FLOOR_IDS.map(id => ({ id, label: formatFloorName(id) })), floorSelection = "single", availableYears = [2026], showPeriod = true, showFloor = true, notice, advancedFilters = [], onApplyAdvanced }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedButton = useRef<HTMLButtonElement>(null); const advancedId = useId();
  const activeAdvanced = advancedFilters.filter(filter => filter.value !== (filter.defaultValue ?? ""));
  const periodActive = showPeriod && (value.period.startMonth !== 0 || value.period.endMonth !== 11 || value.period.year !== 2026);
  const selectedFloors = showFloor ? value.floorIds ?? [] : [];
  const defaults = Object.fromEntries(advancedFilters.map(filter => [filter.key, filter.defaultValue ?? ""]));
  const resetPeriod = { ...DEFAULT_ENERGY_FILTERS.period, year: availableYears.includes(2026) ? 2026 : availableYears[0] };
  return <section className={styles.bar} aria-label="Energy filters">
    <div className={styles.controls}>
      {showPeriod && <Popover label={"Analysis Period: " + formatPeriodLabel(value.period)} icon={<CalendarDays size={17} />}>{close => <PeriodChoices value={value} years={availableYears} onChange={onChange} close={close} />}</Popover>}
      {showFloor && <Popover label={"Floor: " + (value.floorIds ? value.floorIds.length === 1 ? formatFloorName(value.floorIds[0]) : value.floorIds.length + " floors" : "All Floors")} icon={<Building2 size={17} />}>{close => <FloorChoices value={value.floorIds} floors={floors} selection={floorSelection} close={close} onApply={floorIds => onChange({ ...value, floorIds })} />}</Popover>}
      {advancedFilters.length > 0 && <button ref={advancedButton} type="button" className={styles.trigger} aria-expanded={advancedOpen} aria-controls={advancedOpen ? advancedId : undefined} onClick={() => setAdvancedOpen(current => !current)}><SlidersHorizontal size={17} />Filters{activeAdvanced.length > 0 && <span className={styles.count}>{activeAdvanced.length}</span>}</button>}
    </div>
    {(periodActive || selectedFloors.length > 0 || activeAdvanced.length > 0) && <div className={styles.chips} aria-label="Applied filters">
      {periodActive && <button type="button" onClick={() => onChange({ ...value, period: resetPeriod })} aria-label="Remove period filter">{formatPeriodLabel(value.period)}<X size={13} /></button>}
      {selectedFloors.map(id => <button type="button" key={id} onClick={() => { const ids = selectedFloors.filter(item => item !== id); onChange({ ...value, floorIds: ids.length ? ids : null }); }} aria-label={"Remove " + formatFloorName(id) + " filter"}>{formatFloorName(id)}<X size={13} /></button>)}
      {activeAdvanced.map(filter => <button type="button" key={filter.key} onClick={() => onApplyAdvanced?.({ ...Object.fromEntries(advancedFilters.map(item => [item.key, item.value])), [filter.key]: filter.defaultValue ?? "" })} aria-label={"Remove " + filter.label + " filter"}>{filter.label}: {filter.options.find(option => option.value === filter.value)?.label ?? filter.value}<X size={13} /></button>)}
      <button type="button" className={styles.clear} onClick={() => { onChange({ period: resetPeriod, floorIds: null }); if (advancedFilters.length) onApplyAdvanced?.(defaults); }}>Clear all</button>
    </div>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {advancedOpen && <div id={advancedId} role="region" aria-label="Advanced filters" onKeyDown={event => { if (event.key === "Escape") { setAdvancedOpen(false); advancedButton.current?.focus(); } }}><AdvancedPanel key={JSON.stringify(advancedFilters.map(filter => filter.value))} filters={advancedFilters} onApply={values => onApplyAdvanced?.(values)} close={() => { setAdvancedOpen(false); advancedButton.current?.focus(); }} /></div>}
  </section>;
}
