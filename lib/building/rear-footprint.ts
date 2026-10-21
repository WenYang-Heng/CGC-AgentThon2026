import { intersection } from "polygon-clipping";
import type { BuildingLevel } from "./elevation-geometry";

/** Only the three right-hand wall segments marked in the top-view reference. */
export function isWhiteRightWall(x: number, z: number, reference: BuildingLevel): boolean {
  const [width, , depth] = reference.size;
  const left = reference.position[0] - width / 2;
  const rear = reference.position[2] - depth / 2;
  const diagonalStart = left + width * 0.69;
  const diagonalEnd = left + width * 0.915;
  const returnZ = rear + depth * 0.55;
  const tolerance = 1e-4;
  const diagonalZ = rear + depth * (0.15 + 0.4 * (x - diagonalStart) / (diagonalEnd - diagonalStart));
  return (x >= diagonalStart - tolerance && x <= diagonalEnd + tolerance && Math.abs(z - diagonalZ) < tolerance)
    || (x >= diagonalEnd - tolerance && Math.abs(z - returnZ) < tolerance)
    || Math.abs(x - (left + width)) < tolerance;
}

/** The remaining straight rear strip on the uncut side of the roof plan. */
export function isWhiteRearStrip(x: number, z: number, reference: BuildingLevel): boolean {
  const [width, , depth] = reference.size;
  const left = reference.position[0] - width / 2;
  const rear = reference.position[2] - depth / 2;
  return x <= left + width * 0.31 + 1e-4 && Math.abs(z - rear) < 1e-4;
}

/** Apply the same world-space stepped/chamfered rear cut on every level. */
export function cutRearCorner(points: [number, number][], part: BuildingLevel, reference: BuildingLevel): [number, number][] {
  const [width, , depth] = reference.size;
  const left = reference.position[0] - width / 2;
  const rear = reference.position[2] - depth / 2;
  const extent = Math.max(width, depth) * 10;
  const mask: [number, number][] = [
    [-extent, -extent], [left + width * 0.31, -extent],
    [left + width * 0.31, rear + depth * 0.15],
    [left + width * 0.69, rear + depth * 0.15],
    [left + width * 0.915, rear + depth * 0.55],
    [extent, rear + depth * 0.55], [extent, extent], [-extent, extent],
  ];
  const world: [number, number][] = points.map(([x, z]) => [x + part.position[0], z + part.position[2]]);
  const result = intersection([world], [mask]);
  if (result.length !== 1 || result[0].length !== 1) throw new Error("Unexpected building footprint after rear cut");
  return result[0][0].slice(0, -1).map(([x, z]) => [x - part.position[0], z - part.position[2]]);
}
