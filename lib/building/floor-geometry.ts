interface Point { x: number; y: number }
interface SubPath { getPoints: (divisions?: number) => Point[]; autoClose: boolean }
export interface WallSegment { x: number; z: number; length: number; rotationY: number }

export function buildFloorGeometry(paths: { subPaths: SubPath[] }[], scale: number) {
  const epsilon = 1e-7;
  const segments: [Point, Point][] = [];
  const add = (a: Point, b: Point) => {
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) throw new Error("Invalid SVG coordinates");
    if (Math.hypot(b.x - a.x, b.y - a.y) > epsilon) segments.push([a, b]);
  };
  for (const path of paths) for (const subPath of path.subPaths) {
    const points = subPath.getPoints(24);
    for (let index = 0; index < points.length - 1; index++) add(points[index], points[index + 1]);
    if (subPath.autoClose && points.length > 1) add(points[points.length - 1], points[0]);
  }
  if (!segments.length || !Number.isFinite(scale) || scale <= 0) throw new Error("No usable floor geometry");
  const points = segments.flat();
  const minX = Math.min(...points.map(point => point.x));
  const maxX = Math.max(...points.map(point => point.x));
  const minY = Math.min(...points.map(point => point.y));
  const maxY = Math.max(...points.map(point => point.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  // Only explicit closed outlines are selectable; open wall segments stay walls.
  const rooms = paths.flatMap(path => path.subPaths.filter(subPath => subPath.autoClose)
    .map(subPath => subPath.getPoints(24))
    .filter(outline => outline.length >= 3)
    .map(outline => outline.map(point => ({ x: (point.x - centerX) * scale, z: (point.y - centerY) * scale }))));
  const walls: WallSegment[] = segments.map(([a, b]) => {
    const dx = (b.x - a.x) * scale;
    const dz = (b.y - a.y) * scale;
    return { x: ((a.x + b.x) / 2 - centerX) * scale, z: ((a.y + b.y) / 2 - centerY) * scale,
      length: Math.hypot(dx, dz), rotationY: -Math.atan2(dz, dx) };
  });
  return { walls, rooms, width: (maxX - minX) * scale, depth: (maxY - minY) * scale, centerX, centerY };
}
