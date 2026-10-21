"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import { FLOOR_CONFIGS } from "@/lib/building/floor-config";
import type { BuildingLevel } from "@/lib/building/elevation-geometry";
import type { EnergyFloorData } from "@/app/dashboard-data";
import { buildEnergyHeatmap, type HeatmapMetric } from "@/lib/building/energy-heatmap";
import EnergyFilterBar from "@/components/EnergyFilters/EnergyFilterBar";
import { useEnergyFilters } from "@/lib/use-energy-filters";
import styles from "./BuildingView.module.css";

const FloorScene = dynamic(() => import("./FloorScene"), { ssr: false, loading: () => <p className={styles.state} role="status">Loading floor model…</p> });
const BuildingScene = dynamic(() => import("./BuildingScene"), { ssr: false, loading: () => <p className={styles.state} role="status">Loading building…</p> });
class ViewerBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className={styles.state} role="alert"><p>Floor model is currently unavailable.</p><button type="button" onClick={this.props.onRetry}>Retry model</button></div> : this.props.children;
  }
}
const navItems = [
  { label: "Energy Explorer", href: "/", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" /></svg> },
  { label: "Report Energy Waste", href: "/report-energy-waste", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3ZM12 9v4m0 3h.01" /></svg> },
  { label: "Insights", href: "/insights", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 18V9m5 9V5m5 13v-6m5 6V3" /></svg> },
];

export default function BuildingView({ building, energyFloors }: { building: { floors: BuildingLevel[]; roof: BuildingLevel[] }; energyFloors: Record<string, EnergyFloorData> }) {
  const [view] = useState<"building" | "floor">("building");
  const common = useEnergyFilters({ selection: "single" });
  const [heatMetric, setHeatMetric] = useState<HeatmapMetric>("usage");
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const heatmap = buildEnergyHeatmap(energyFloors, building.floors.map(item => item.id), common.value.period, heatMetric);
  const heatUnit = heatMetric === "usage" ? "kWh" : "kWh/m²";
  const selectedFloor = common.value.floorIds?.[0] ?? null;
  const setSelectedFloor = (id: string | null) => common.onChange({ ...common.value, floorIds: id ? [id] : null });
  const [floorId, setFloorId] = useState(FLOOR_CONFIGS[0].id);
  const [mode, setMode] = useState<"3d" | "top">("3d");
  const [lowWalls, setLowWalls] = useState(false);
  const [reset, setReset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const floor = FLOOR_CONFIGS.find(item => item.id === floorId) ?? FLOOR_CONFIGS[0];
  return <div className={styles.shell}>
    <Sidebar items={navItems} activeHref="/building" mobileOpen={mobileOpen} />
    <main className={styles.workspace}>
      <header className={styles.header}><button ref={menuRef} type="button" className={styles.mobileMenu} aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>☰</button><div><h1>Building View</h1><p>Explore Menara CGC floor geometry in an interactive 3D view.</p></div></header>
      {view === "building" && <section className={styles.panel} aria-label="Building exterior viewer">
        <div className={`${styles.viewer} ${styles.exteriorViewer}`}>
        <div className={styles.heatmapSwitchPosition}><span id="building-heatmap-label">Heatmap</span><button className={styles.heatmapSwitch} type="button" role="switch" aria-checked={heatmapEnabled} aria-labelledby="building-heatmap-label" onClick={() => setHeatmapEnabled(value => !value)}><span className={styles.heatmapSwitchThumb} aria-hidden="true" /></button></div>
        <div className={styles.heatFilters}>
          <EnergyFilterBar value={common.value} onChange={common.onChange} notice={common.notice} floors={building.floors.map(item => ({ id: item.id, label: item.label }))} advancedFilters={[{ key: "metric", label: "Heatmap metric", value: heatMetric, defaultValue: "usage", options: [{ value: "usage", label: "Electricity usage (kWh)" }, { value: "intensity", label: "Energy intensity (kWh/m2)" }] }]} onApplyAdvanced={values => setHeatMetric(values.metric as HeatmapMetric)} />
          <div className={styles.controls}><button type="button" onClick={() => { setSelectedFloor(null); setReset(value => value + 1); }}>Reset building</button></div>
        </div>
        {heatmapEnabled && <div className={styles.verticalLegend} aria-label="Energy heatmap legend">
          <strong>{heatUnit}</strong>
          <div className={styles.verticalScale}><div className={styles.verticalGradient} /><div className={styles.scaleTicks}>{heatmap.ticks.length ? heatmap.ticks.map(tick => <span key={tick}>{tick.toLocaleString("en-MY", { maximumFractionDigits: 4 })}</span>) : <span>N/A</span>}</div></div>
        </div>}
        <ViewerBoundary key={`exterior-${attempt}`} onRetry={() => setAttempt(value => value + 1)}><BuildingScene building={building} selectedFloor={selectedFloor} onSelectFloor={setSelectedFloor} reset={reset} heatmap={heatmap.readings} metric={heatMetric} heatmapEnabled={heatmapEnabled} /></ViewerBoundary></div>
      </section>}
      {view === "floor" && <section className={styles.panel} aria-label="Floor architecture viewer">
        <div className={styles.toolbar}><label>Floor<select aria-label="Floor" value={floor.id} onChange={event => { setFloorId(event.target.value); setReset(value => value + 1); }}>{FLOOR_CONFIGS.map(item => <option key={item.id} value={item.id}>{item.id}</option>)}</select></label><div className={styles.controls} role="group" aria-label="View controls">
          <button type="button" aria-pressed={mode === "3d"} onClick={() => { setMode("3d"); setReset(value => value + 1); }}>3D View</button>
          <button type="button" aria-pressed={mode === "top"} onClick={() => { setMode("top"); setReset(value => value + 1); }}>Top View</button>
          <button type="button" aria-pressed={lowWalls} aria-label={lowWalls ? "Full Walls" : "Low Walls"} onClick={() => setLowWalls(value => !value)}>{lowWalls ? "Full Walls" : "Low Walls"}</button>
          <button type="button" onClick={() => { setMode("3d"); setLowWalls(false); setReset(value => value + 1); }}>Reset</button>
        </div></div>
        <div className={styles.viewer}>
          <ViewerBoundary key={`${floor.id}-${attempt}`} onRetry={() => setAttempt(value => value + 1)}><FloorScene floor={floor} mode={mode} lowWalls={lowWalls} reset={reset} attempt={attempt} selectedRoom={selectedRoom} onSelectRoom={setSelectedRoom} onRoomsLoaded={setRoomCount} /></ViewerBoundary>
        </div>
        <div className={styles.roomDetails}>
          <label htmlFor="building-room">Room<select id="building-room" value={selectedRoom ?? ""} disabled={!roomCount} onChange={event => setSelectedRoom(event.target.value === "" ? null : Number(event.target.value))}>
            <option value="">Select a room</option>{Array.from({ length: roomCount }, (_, index) => <option key={index} value={index}>Room {index + 1}</option>)}
          </select></label>
          <div aria-live="polite">{selectedRoom === null ? <p>Click a room surface to see its details. Top View or Low Walls makes selection easier.</p> : <><h2>Room {selectedRoom + 1}</h2><p>{floor.id} · Room names and uses have not been mapped. Room-level energy readings are unavailable.</p><button type="button" onClick={() => setSelectedRoom(null)}>Clear selection</button></>}</div>
        </div>
        <p className={styles.instructions}>{mode === "top" ? "Scroll to zoom · Use 3D View to rotate" : "Drag to rotate · Scroll to zoom"}</p>
        <p className={styles.note}>F09 SVG-derived boundaries · visualization heights and thicknesses are not surveyed dimensions. Room labels identify closed outlines in the plan.</p>
      </section>}
    </main>
    {mobileOpen && <button type="button" className={styles.scrim} aria-label="Close navigation" onClick={() => { setMobileOpen(false); menuRef.current?.focus(); }} />}
  </div>;
}
