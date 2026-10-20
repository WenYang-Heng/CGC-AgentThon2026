"use client";

import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsInstance } from "three-stdlib";
import { FLOOR_VIEW, type FloorConfig } from "@/lib/building/floor-config";
import SvgFloorModel from "./SvgFloorModel";
import styles from "./BuildingView.module.css";

function subscribeMotion(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function CameraControls({ mode, reset }: { mode: "3d" | "top"; reset: number }) {
  const controls = useRef<OrbitControlsInstance>(null);
  const destination = useRef<Vector3 | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);
  const { camera, invalidate, size } = useThree();
  useEffect(() => {
    const position = new Vector3(...(mode === "top" ? FLOOR_VIEW.cameraTop : FLOOR_VIEW.camera3d));
    // Keep the complete model in frame on narrow canvases without changing its geometry.
    const aspect = size.width / Math.max(1, size.height);
    if (aspect < 0.85) position.setLength(Math.min(FLOOR_VIEW.maxDistance - 1, position.length() * 0.85 / aspect));
    controls.current?.target.set(0, 0, 0);
    if (controls.current) controls.current.enabled = false;
    camera.up.set(0, 1, 0);
    if (reducedMotion) {
      camera.position.copy(position); camera.lookAt(0, 0, 0);
      if (controls.current) { controls.current.enabled = true; controls.current.update(); }
      destination.current = null;
    } else destination.current = position;
    invalidate();
  }, [camera, invalidate, mode, reset, reducedMotion, size.width, size.height]);
  useFrame((_, delta) => {
    if (!destination.current) return;
    camera.position.lerp(destination.current, 1 - Math.exp(-delta * 12));
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(destination.current) < 0.01) {
      camera.position.copy(destination.current);
      destination.current = null;
      if (controls.current) { controls.current.enabled = true; controls.current.update(); }
    }
    invalidate();
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} enableRotate={mode === "3d"} enablePan={false}
    minDistance={FLOOR_VIEW.minDistance} maxDistance={FLOOR_VIEW.maxDistance} minPolarAngle={0.0001} maxPolarAngle={Math.PI / 2 - 0.03} />;
}

export default function FloorScene({ floor, mode, lowWalls, reset, attempt, selectedRoom, onSelectRoom, onRoomsLoaded }: {
  floor: FloorConfig; mode: "3d" | "top"; lowWalls: boolean; reset: number; attempt: number;
  selectedRoom: number | null; onSelectRoom: (room: number | null) => void; onRoomsLoaded: (count: number) => void;
}) {
  const [wallCount, setWallCount] = useState(0);
  const onLoaded = useCallback((count: number, rooms: number) => { setWallCount(count); onRoomsLoaded(rooms); }, [onRoomsLoaded]);
  const svgPath = attempt ? `${floor.svgPath}?retry=${attempt}` : floor.svgPath;
  return <div style={{ width: "100%", height: "100%" }} data-floor-id={floor.id} data-wall-count={wallCount} data-view-mode={mode} data-low-walls={lowWalls} aria-label={`Interactive 3D floor-plan model for ${floor.label}.`}>
    <Canvas frameloop="demand" dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [...FLOOR_VIEW.camera3d], fov: 45, near: 0.1, far: 250 }}
      onCreated={({ gl, scene }) => { gl.setClearColor(0x000000, 0); scene.background = null; }}
      fallback={<p className={styles.state} role="alert">Floor model is currently unavailable. A WebGL-capable browser is required.</p>}>
      <hemisphereLight args={["#ffffff", "#9da8b4", 2]} />
      <directionalLight position={[12, 25, 16]} intensity={2.5} />
      <Suspense fallback={null}><SvgFloorModel svgPath={svgPath} lowWalls={lowWalls} onLoaded={onLoaded} selectedRoom={selectedRoom} onSelectRoom={onSelectRoom} /></Suspense>
      <CameraControls mode={mode} reset={reset} />
    </Canvas>
    {!wallCount && <div className={styles.loadingOverlay} role="status">Loading floor model…</div>}
  </div>;
}
