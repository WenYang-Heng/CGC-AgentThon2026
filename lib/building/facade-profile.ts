import type { BuildingLevel } from "./elevation-geometry";

/** Local X/Z outline: flat outer walls, angled shoulders, flat central face. */
export function facadeProfile(floor: BuildingLevel, reference: BuildingLevel, edge: "bottom" | "top" = "bottom", slopeReference?: BuildingLevel): [number, number][] {
  const level = Number(floor.id.slice(1));
  const halfWidth = floor.size[0] / 2;
  const halfDepth = floor.size[2] / 2;
  const outerFront = reference.position[2] + reference.size[2] / 2 - floor.position[2];
  const shoulderX = Math.min(halfWidth, reference.size[0] * 0.43);
  const stepped = level >= 11 && level <= 14;
  const standardRatio = 0.44 + Math.max(0, Math.min(level - 11, 3)) / 3 * (2 * shoulderX / reference.size[0] - 0.46)
    + (stepped && edge === "top" ? 0.012 : 0);
  const front = halfDepth - (stepped && edge === "top" ? floor.size[1] * 0.06 : 0);
  let centralX = Math.min(shoulderX, reference.size[0] * standardRatio / 2);
  if (stepped && slopeReference) {
    // All upper shoulders lie in F11's plane, rather than independently
    // rotating each floor's side wall. Depth ledges remain unchanged.
    const referenceProjection = slopeReference.position[2] + slopeReference.size[2] / 2
      - (reference.position[2] + reference.size[2] / 2);
    const referenceRun = shoulderX - reference.size[0] * 0.44 / 2;
    if (referenceProjection > 0) centralX = shoulderX - (front - outerFront) * referenceRun / referenceProjection;
  }
  return [
    [-halfWidth, -halfDepth], [halfWidth, -halfDepth],
    [halfWidth, outerFront], [shoulderX, outerFront],
    [centralX, front], [-centralX, front],
    [-shoulderX, outerFront], [-halfWidth, outerFront],
  ];
}
