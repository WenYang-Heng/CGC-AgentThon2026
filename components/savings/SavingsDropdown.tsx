"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./SavingsDropdown.module.css";

export default function SavingsDropdown({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.findIndex(option => option.value === value);
  useEffect(() => {
    if (!open) return;
    buttons.current[Math.max(0, selected)]?.focus();
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, selected]);
  return <div ref={root} className={styles.root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={`${label}: ${options[selected]?.label ?? "Select"}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }}>
      <span>{options[selected]?.label ?? "Select"}</span><i aria-hidden="true" />
    </button>
    {open && <div id={id} role="listbox" aria-label={label} className={styles.menu} onKeyDown={event => {
      const index = buttons.current.indexOf(document.activeElement as HTMLButtonElement);
      let next = index;
      if (event.key === "ArrowDown") next = (index + 1) % options.length;
      else if (event.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = options.length - 1;
      else return;
      event.preventDefault(); buttons.current[next]?.focus();
    }}>{options.map((option, index) => <button ref={node => { buttons.current[index] = node; }} key={option.value} type="button" role="option" aria-selected={option.value === value} tabIndex={index === Math.max(0, selected) ? 0 : -1} onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}>{option.label}</button>)}</div>}
  </div>;
}
