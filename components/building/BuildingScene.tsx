"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Edges, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { BuildingLevel } from "@/lib/building/elevation-geometry";
import type { FloorHeatmapReading, HeatmapMetric } from "@/lib/building/energy-heatmap";
import styles from "./BuildingView.module.css";

export default function BuildingScene({ building, selectedFloor, onSelectFloor, reset, heatmap, metric }: {
  building: { floors: BuildingLevel[]; roof: BuildingLevel[] }; selectedFloor: string | null; onSelectFloor: (id: string) => void; reset: number;
  heatmap: Record<string, FloorHeatmapReading>; metric: HeatmapMetric;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const detailId = hovered ?? selectedFloor;
  const reading = detailId ? heatmap[detailId] : null;
  return <div className={styles.buildingScene}><div className={styles.buildingCanvas}><Canvas frameloop="demand" dpr={[1, 2]} gl={{ alpha: true, antialias: true }} fallback={<p role="alert">A WebGL-capable browser is required to view the building.</p>}>
    <PerspectiveCamera key={`camera-${reset}`} makeDefault position={[34, 29, 38]} fov={45} />
    <hemisphereLight args={["#ffffff", "#a5b4c3", 2]} /><directionalLight position={[15, 35, 20]} intensity={2.5} />
    <group position={[0, -11, 0]}>
      {building.floors.map(floor => <mesh key={floor.id} position={floor.position}
        onPointerOver={event => { event.stopPropagation(); setHovered(floor.id); }}
        onPointerOut={() => setHovered(null)} onClick={event => { event.stopPropagation(); if (event.delta <= 5) onSelectFloor(floor.id); }}>
        <boxGeometry args={floor.size} /><meshStandardMaterial color={heatmap[floor.id]?.color ?? "#9ca3af"} emissive={hovered === floor.id ? "#ffffff" : "#000000"} emissiveIntensity={0.12} roughness={0.8} />
        <Edges color={selectedFloor === floor.id ? "#062858" : hovered === floor.id ? "#ffffff" : "#748596"} lineWidth={selectedFloor === floor.id ? 2.5 : 1} />
      </mesh>)}
      {building.roof.map(part => <mesh key={part.id} position={part.position}><boxGeometry args={part.size} /><meshStandardMaterial color="#a5b2c0" roughness={0.8} /><Edges color="#748596" /></mesh>)}
    </group>
    <OrbitControls key={`controls-${reset}`} makeDefault target={[0, 1, 0]} enablePan={false} minDistance={28} maxDistance={95} maxPolarAngle={Math.PI / 2 - 0.03} />
  </Canvas></div>
    <aside className={styles.hoverDetails} aria-label="Floor energy details">
      {reading ? <><strong>{reading.name}</strong><span>Electricity: {reading.usage?.toLocaleString("en-MY") ?? "Unavailable"} kWh</span>
        {metric === "intensity" && <span>{reading.value?.toLocaleString("en-MY", { maximumFractionDigits: 2 }) ?? "Unavailable"} kWh/m²</span>}
      </> : <><strong>Floor details</strong><span>Hover over or select a floor to view its energy usage.</span></>}
    </aside>
  </div>;
}
