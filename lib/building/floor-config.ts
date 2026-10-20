export interface FloorConfig { id: string; label: string; svgPath: string }
export const FLOOR_CONFIGS: FloorConfig[] = [
  { id: "F09", label: "Floor 09", svgPath: "/building/floors/F09.svg" },
];
// Visualization units, not surveyed architectural dimensions.
export const FLOOR_VIEW = {
  scale: 0.026, wallHeight: 1.55, wallThickness: 0.055, lowWallScale: 0.32,
  camera3d: [30, 22, 34] as const, cameraTop: [0, 45, 0.01] as const,
  minDistance: 18, maxDistance: 70, transitionSeconds: 0.45,
};
