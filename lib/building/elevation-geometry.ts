export interface BuildingLevel {
  id: string; label: string; position: [number, number, number]; size: [number, number, number];
}
interface Outline { left: number; top: number; right: number; bottom: number }
// These elevation assets use rectangular M/H/V/Z paths. Reject other geometry.
function rectangles(svg: string): Outline[] {
  return [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => {
    const values = /^M([\d.]+) ([\d.]+)H([\d.]+)V([\d.]+)H([\d.]+)V([\d.]+)Z$/.exec(match[1]);
    if (!values) throw new Error("Unsupported elevation outline");
    const [, left, top, right, bottom, closeX, closeY] = values.map(Number);
    if (left !== closeX || top !== closeY || right <= left || bottom <= top) throw new Error("Invalid elevation outline");
    return { left, top, right, bottom };
  });
}
export function buildElevationModel(frontSvg: string, backSvg: string, leftSvg: string) {
  const front = rectangles(frontSvg), back = rectangles(backSvg), side = rectangles(leftSvg);
  const base = front.reduce((lowest, item) => item.bottom > lowest.bottom ? item : lowest);
  const bands = front.filter(item => item.left === base.left && item.right === base.right && item.bottom - item.top === base.bottom - base.top).sort((a, b) => b.bottom - a.bottom);
  if (bands.length !== 16) throw new Error("Expected 16 floor bands in elevations");
  const sideBase = side.find(item => item.top === base.top && item.bottom === base.bottom);
  if (!sideBase) throw new Error("Missing side elevation base");
  const scale = 0.012, cx = (base.left + base.right) / 2, cz = (sideBase.left + sideBase.right) / 2;
  const box = (outline: Outline, depth: Outline, id: string, label: string): BuildingLevel => ({ id, label,
    position: [((outline.left + outline.right) / 2 - cx) * scale, (base.bottom - (outline.top + outline.bottom) / 2) * scale, ((depth.left + depth.right) / 2 - cz) * scale],
    size: [(outline.right - outline.left) * scale, (outline.bottom - outline.top) * scale, (depth.right - depth.left) * scale],
  });
  const floors = bands.map((outline, index) => {
    const depth = side.find(item => item.top === outline.top && item.bottom === outline.bottom);
    if (!depth || !back.some(item => item.left === outline.left && item.right === outline.right && item.top === outline.top && item.bottom === outline.bottom)) throw new Error("Elevation floor bands do not match");
    return box(outline, depth, `F${String(index + 1).padStart(2, "0")}`, `Floor ${index + 1}`);
  });
  const roofSide = side.find(item => item.bottom === bands[15].top);
  if (!roofSide) throw new Error("Missing roof profile");
  const roof = front.filter(item => item.bottom <= bands[15].top).map((item, index) => box(item, roofSide, `roof-${index}`, "Roof"));
  return { floors, roof };
}
