"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Color, ExtrudeGeometry, Float32BufferAttribute, Shape } from "three";
import { facadeProfile } from "@/lib/building/facade-profile";
import { cutRearCorner, isWhiteRearStrip, isWhiteRightWall } from "@/lib/building/rear-footprint";
import cgcLogo from "@/public/cgc-logo.jpeg";
import { Canvas } from "@react-three/fiber";
import { Edges, OrbitControls, PerspectiveCamera, useTexture } from "@react-three/drei";
import type { BuildingLevel } from "@/lib/building/elevation-geometry";
import type { FloorHeatmapReading, HeatmapMetric } from "@/lib/building/energy-heatmap";
import styles from "./BuildingView.module.css";

function FacadeGeometry({ floor, reference, slopeReference, plain = false }: { floor: BuildingLevel; reference: BuildingLevel; slopeReference?: BuildingLevel; plain?: boolean }) {
  const geometry = useMemo(() => {
    const original = plain ? [
      [-floor.size[0] / 2, -floor.size[2] / 2], [floor.size[0] / 2, -floor.size[2] / 2],
      [floor.size[0] / 2, floor.size[2] / 2], [-floor.size[0] / 2, floor.size[2] / 2],
    ] as [number, number][] : facadeProfile(floor, reference, "bottom", slopeReference);
    const points = cutRearCorner(original, floor, reference);
    const topPoints = plain ? original : facadeProfile(floor, reference, "top", slopeReference);
    const outline = new Shape();
    outline.moveTo(...points[0]);
    points.slice(1).forEach(point => outline.lineTo(...point));
    outline.closePath();
    const shape = new ExtrudeGeometry(outline, { depth: floor.size[1], bevelEnabled: false, steps: 1 });
    const positions = shape.getAttribute("position");
    // Slightly incline each riser while keeping the larger changes at the
    // floor boundaries, preserving the stepped outline and angled panels.
    for (let index = 0; index < positions.count; index++) {
      if (Math.abs(positions.getZ(index)) > 1e-6) continue;
      const corner = original.findIndex(([x, z]) => Math.abs(positions.getX(index) - x) < 1e-5 && Math.abs(positions.getY(index) - z) < 1e-5);
      if (corner >= 0) positions.setXY(index, ...topPoints[corner]);
    }
    positions.needsUpdate = true;
    shape.computeVertexNormals();
    shape.rotateX(Math.PI / 2);
    shape.translate(0, floor.size[1] / 2, 0);
    const outerFront = reference.position[2] + reference.size[2] / 2 - floor.position[2];
    const white = new Color("#f3f2ec");
    const blue = new Color("#17466c");
    const colors: number[] = [];
    const normals = shape.getAttribute("normal");
    // Extrusion triangles are unindexed: each face can keep its own color
    // without blending white facade panels into the recessed blue walls.
    for (let index = 0; index < positions.count; index += 3) {
      const centerZ = (positions.getZ(index) + positions.getZ(index + 1) + positions.getZ(index + 2)) / 3;
      const centerX = (positions.getX(index) + positions.getX(index + 1) + positions.getX(index + 2)) / 3;
      const markedWall = Math.abs(normals.getY(index)) < 0.1
        && (isWhiteRightWall(centerX + floor.position[0], centerZ + floor.position[2], reference)
          || isWhiteRearStrip(centerX + floor.position[0], centerZ + floor.position[2], reference));
      const upperFrontWall = plain && normals.getZ(index) > 0.05 && Math.abs(normals.getY(index)) < 0.1;
      const upperLeftWall = plain && normals.getX(index) < -0.95 && Math.abs(normals.getY(index)) < 0.1;
      const facadeLedge = !plain && Math.abs(normals.getY(index)) > 0.9
        && [0, 1, 2].some(offset => positions.getZ(index + offset) > outerFront + 0.001);
      const onSideWall = [0, 1, 2].every(offset => Math.abs(Math.abs(positions.getX(index + offset)) - floor.size[0] / 2) < 1e-5)
        && [1, 2].every(offset => Math.abs(positions.getX(index + offset) - positions.getX(index)) < 1e-5);
      const color = !upperFrontWall && (facadeLedge || upperLeftWall || markedWall || (!plain && (onSideWall || centerZ > outerFront + 0.001))) ? white : blue;
      for (let vertex = 0; vertex < 3; vertex++) colors.push(color.r, color.g, color.b);
    }
    shape.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return shape;
  }, [floor, reference, slopeReference, plain]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function BuildingLogo({ roof }: { roof: BuildingLevel }) {
  const texture = useTexture(cgcLogo.src);
  const width = Math.min(5.2, roof.size[0] * 0.8, roof.size[1] * 0.95 * cgcLogo.width / cgcLogo.height);
  return <mesh position={[roof.position[0], roof.position[1], roof.position[2] + roof.size[2] / 2 + 0.02]} raycast={() => {}}>
      <planeGeometry args={[width, width * cgcLogo.height / cgcLogo.width]} />
      <meshBasicMaterial map={texture} alphaMap={texture} transparent alphaTest={0.1} depthWrite={false} toneMapped={false} />
    </mesh>;
}

export default function BuildingScene({ building, selectedFloor, onSelectFloor, reset, heatmap, metric, heatmapEnabled = false }: {
  building: { floors: BuildingLevel[]; roof: BuildingLevel[] }; selectedFloor: string | null; onSelectFloor: (id: string) => void; reset: number;
  heatmap: Record<string, FloorHeatmapReading>; metric: HeatmapMetric; heatmapEnabled?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const detailId = hovered ?? selectedFloor;
  const reading = detailId ? heatmap[detailId] : null;
  const floors = useMemo(() => {
    const second = building.floors.find(floor => floor.id === "F02");
    return building.floors.map(floor => floor.id === "F01" && second ? {
      ...floor,
      position: [second.position[0], floor.position[1], second.position[2]] as [number, number, number],
      size: [second.size[0], floor.size[1], second.size[2]] as [number, number, number],
    } : floor);
  }, [building.floors]);
  const firstFloor = floors.find(floor => floor.id === "F01");
  const originalBase = building.floors.find(floor => floor.id === "F01");
  const plinthHeight = 0.85;
  const facadeReference = building.floors.find(floor => floor.id === "F15");
  const slopeReference = building.floors.find(floor => floor.id === "F11");
  const topRoof = building.roof.reduce<BuildingLevel | null>((highest, part) => !highest || part.position[1] + part.size[1] / 2 > highest.position[1] + highest.size[1] / 2 ? part : highest, null);
  const roofParts = useMemo(() => {
    if (!topRoof) return building.roof;
    const shoulders = building.roof.filter(part => part.id !== topRoof.id);
    if (!shoulders.length) return building.roof;
    const shoulderTop = Math.max(...shoulders.map(part => part.position[1] + part.size[1] / 2));
    const bottom = topRoof.position[1] - topRoof.size[1] / 2;
    const top = topRoof.position[1] + topRoof.size[1] / 2;
    if (shoulderTop <= bottom || shoulderTop >= top) return building.roof;
    const signDepth = Math.min(0.45, topRoof.size[2]);
    return [...shoulders, {
      ...topRoof, id: `${topRoof.id}-body`,
      position: [topRoof.position[0], (bottom + shoulderTop) / 2, topRoof.position[2]] as [number, number, number],
      size: [topRoof.size[0], shoulderTop - bottom, topRoof.size[2]] as [number, number, number],
    }, {
      ...topRoof, id: `${topRoof.id}-front-sign`,
      position: [topRoof.position[0], (shoulderTop + top) / 2, topRoof.position[2] + (topRoof.size[2] - signDepth) / 2] as [number, number, number],
      size: [topRoof.size[0], top - shoulderTop, signDepth] as [number, number, number],
    }];
  }, [building.roof, topRoof]);
  return <div className={styles.buildingScene}><div className={styles.buildingCanvas}><Canvas frameloop="demand" dpr={[1, 2]} gl={{ alpha: true, antialias: true }} fallback={<p role="alert">A WebGL-capable browser is required to view the building.</p>}>
    <PerspectiveCamera key={`camera-${reset}`} makeDefault position={[34, 29, 38]} fov={45} />
    <hemisphereLight args={["#ffffff", "#a5b4c3", 2]} /><directionalLight position={[15, 35, 20]} intensity={2.5} />
    <group position={[0, -11, 0]}>
      {firstFloor && originalBase && <mesh position={[firstFloor.position[0], firstFloor.position[1] - firstFloor.size[1] / 2 - plinthHeight / 2, firstFloor.position[2]]} raycast={() => {}}>
        <boxGeometry args={[originalBase.size[0] * 1.3, plinthHeight, originalBase.size[2] * 1.25]} />
        <meshStandardMaterial color={heatmapEnabled ? "#cbd2d9" : "#596573"} roughness={0.95} />
        <Edges color="#414c59" />
      </mesh>}
      {topRoof && <Suspense fallback={null}><BuildingLogo roof={topRoof} /></Suspense>}
      {floors.map(floor => <mesh key={floor.id} position={floor.position}
        onPointerOver={event => { event.stopPropagation(); setHovered(floor.id); }}
        onPointerOut={() => setHovered(null)} onClick={event => { event.stopPropagation(); if (event.delta <= 5) onSelectFloor(floor.id); }}>
        {facadeReference
          ? <FacadeGeometry floor={floor} reference={facadeReference} slopeReference={slopeReference} plain={Number(floor.id.slice(1)) > 14} />
          : <boxGeometry args={floor.size} />}
        <meshStandardMaterial key={heatmapEnabled ? "heatmap" : "facade"} vertexColors={!heatmapEnabled && !!facadeReference} color={heatmapEnabled ? heatmap[floor.id]?.color ?? "#9ca3af" : facadeReference ? "#ffffff" : "#17466c"} emissive={hovered === floor.id ? "#ffffff" : "#000000"} emissiveIntensity={0.12} roughness={0.8} />
        <Edges color={selectedFloor === floor.id ? "#062858" : hovered === floor.id ? "#ffffff" : "#748596"} lineWidth={selectedFloor === floor.id ? 2.5 : 1} />
      </mesh>)}
      {roofParts.map(part => <mesh key={part.id} position={part.position}>{facadeReference ? <FacadeGeometry floor={part} reference={facadeReference} plain /> : <boxGeometry args={part.size} />}<meshStandardMaterial key={heatmapEnabled ? "heatmap" : "facade"} vertexColors={!heatmapEnabled && !!facadeReference} color={heatmapEnabled ? "#cbd2d9" : facadeReference ? "#ffffff" : "#17466c"} roughness={0.8} /></mesh>)}
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
