const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const context = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(fs.readFileSync('lib/building/floor-geometry.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const build = context.exports.buildFloorGeometry;
function loadModule(file) {
  const moduleContext = vm.createContext({ exports: {}, require });
  vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, moduleContext);
  return moduleContext.exports;
}
const subPath = (points, autoClose = false) => ({ autoClose, getPoints: () => points });

test('open, diagonal and closed SVG subpaths preserve all nonzero boundaries', () => {
  const closed = [{ x: 10, y: 20 }, { x: 20, y: 20 }, { x: 20, y: 30 }, { x: 10, y: 30 }];
  const model = build([{ subPaths: [subPath(closed, true), subPath([{ x: 20, y: 30 }, { x: 30, y: 40 }])] }], 0.026);
  assert.equal(model.walls.length, 5);
  assert.equal(model.centerX, 20);
  assert.equal(model.centerY, 30);
  assert.equal(model.width, 20 * 0.026);
  assert.equal(model.rooms.length, 1);
  assert.equal(model.rooms[0][0].x, (10 - model.centerX) * 0.026);
  assert.equal(model.rooms[0][0].z, (20 - model.centerY) * 0.026);
  assert.ok(Math.abs(model.walls[4].length - Math.sqrt(200) * 0.026) < 1e-10);
  assert.equal(model.walls[4].rotationY, -Math.PI / 4);
});
test('repeated closure and repeated points never add zero-length or double closing walls', () => {
  const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
  assert.equal(build([{ subPaths: [subPath(points, true)] }], 1).walls.length, 3);
  assert.throws(() => build([], 1), /No usable/);
  assert.throws(() => build([{ subPaths: [subPath([{ x: NaN, y: 0 }, { x: 1, y: 1 }])] }], 1), /Invalid/);
});
test('source asset remains vector-only with no background rectangle or invented room geometry', () => {
  const svg = fs.readFileSync('public/building/floors/F09.svg','utf8');
  assert.match(svg, /viewBox="0 0 1666 1129"/);
  assert.equal((svg.match(/<path\b/g) || []).length, 31);
  assert.doesNotMatch(svg, /<rect\b|<image\b/);
  const model = fs.readFileSync('components/building/SvgFloorModel.tsx','utf8');
  assert.match(model, /model.rooms.map/);
  assert.match(model, /lowWalls \? FLOOR_VIEW.lowWallScale : 1/);
});

test('elevations build 16 ordered floors from the base and preserve side setbacks', () => {
  const { buildElevationModel } = loadModule('lib/building/elevation-geometry.ts');
  const svg = name => fs.readFileSync(`public/building/elevations/${name}.svg`, 'utf8');
  const model = buildElevationModel(svg('front'), svg('back'), svg('left'));
  assert.equal(model.floors.length, 16);
  assert.equal(model.floors[0].id, 'F01');
  assert.equal(model.floors[15].id, 'F16');
  model.floors.forEach((floor, index) => {
    assert.ok(floor.size.every(value => value > 0));
    if (index) assert.ok(floor.position[1] > model.floors[index - 1].position[1]);
  });
  assert.ok(model.floors[0].size[2] > model.floors[1].size[2]);
  assert.ok(model.floors[15].size[2] < model.floors[9].size[2]);
});

test('facade preserves flat outer walls at F15 depth and widens the central face on F11 through F14', () => {
  const { facadeProfile } = loadModule('lib/building/facade-profile.ts');
  const { buildElevationModel } = loadModule('lib/building/elevation-geometry.ts');
  const svg = name => fs.readFileSync(`public/building/elevations/${name}.svg`, 'utf8');
  const { floors } = buildElevationModel(svg('front'), svg('back'), svg('left'));
  const reference = floors.find(floor => floor.id === 'F15');
  let previousWidth = 0;
  for (const floor of floors.filter(item => Number(item.id.slice(1)) >= 2 && Number(item.id.slice(1)) <= 14)) {
    const points = facadeProfile(floor, reference);
    assert.ok(points[2][0] > points[3][0], 'outer flat wall has positive width');
    assert.equal(points[2][1], points[3][1]);
    assert.ok(Math.abs(points[2][1] + floor.position[2] - reference.position[2] - reference.size[2] / 2) < 1e-9);
    assert.ok(points[4][0] < points[3][0], 'sloped shoulder has positive width');
    assert.ok(points[4][1] > points[3][1], 'central face projects beyond outer wall');
    assert.equal(points[4][0], -points[5][0]);
    const width = points[4][0] - points[5][0];
    if (Number(floor.id.slice(1)) >= 12) assert.ok(width > previousWidth);
    else if (previousWidth) assert.equal(width, previousWidth);
    previousWidth = width;
    const level = Number(floor.id.slice(1));
    if (level >= 11 && level <= 13) {
      const next = floors.find(item => Number(item.id.slice(1)) === level + 1);
      const top = facadeProfile(floor, reference, 'top');
      const bottom = facadeProfile(next, reference);
      assert.ok(top[4][0] < bottom[4][0], 'distinct widening ledge separates consecutive floors');
      assert.ok(top[4][0] > points[4][0], 'riser inclines slightly sideways');
      assert.ok(top[4][1] < points[4][1], 'riser inclines slightly backwards');
      assert.ok(top[4][1] + floor.position[2] > bottom[4][1] + next.position[2], 'side view retains the setback ledge');
    }
    if (level < 11) assert.equal(JSON.stringify(facadeProfile(floor, reference, 'top')), JSON.stringify(points), 'lower floors have constant width throughout their height');
  }
  const slopeReference = floors.find(floor => floor.id === 'F11');
  const anchor = facadeProfile(slopeReference, reference, 'bottom', slopeReference);
  for (const floor of floors.filter(item => Number(item.id.slice(1)) >= 2 && Number(item.id.slice(1)) < 11)) {
    for (const edge of ['bottom', 'top']) {
      const profile = facadeProfile(floor, reference, edge, slopeReference);
      assert.ok(Math.abs(profile[4][0] - anchor[4][0]) < 1e-9, 'lower central face matches F11 width');
    }
  }
  const slope = (anchor[4][1] - anchor[3][1]) / (anchor[3][0] - anchor[4][0]);
  for (const floor of floors.filter(item => /^F1[1-4]$/.test(item.id))) {
    for (const edge of ['bottom', 'top']) {
      const profile = facadeProfile(floor, reference, edge, slopeReference);
      const actual = (profile[4][1] - profile[3][1]) / (profile[3][0] - profile[4][0]);
      assert.ok(Math.abs(actual - slope) < 1e-9, 'upper side walls share F11 slope');
    }
  }
});

test('rear cut stays aligned across all floors and roof while preserving the front', () => {
  const { cutRearCorner } = loadModule('lib/building/rear-footprint.ts');
  const { buildElevationModel } = loadModule('lib/building/elevation-geometry.ts');
  const svg = name => fs.readFileSync(`public/building/elevations/${name}.svg`, 'utf8');
  const model = buildElevationModel(svg('front'), svg('back'), svg('left'));
  const reference = model.floors.find(floor => floor.id === 'F15');
  const rear = reference.position[2] - reference.size[2] / 2;
  const left = reference.position[0] - reference.size[0] / 2;
  for (const part of [...model.floors, ...model.roof]) {
    const [w, , d] = part.size;
    const result = cutRearCorner([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]], part, reference);
    assert.ok(result.length >= 4);
    assert.ok(result.some(([,z]) => Math.abs(z - d / 2) < 1e-9), 'front remains intact');
    for (const [x,z] of result) {
      const worldX = x + part.position[0], worldZ = z + part.position[2];
      const start = left + reference.size[0] * 0.31;
      if (worldX > start + 1e-8) assert.ok(worldZ >= rear + reference.size[2] * 0.15 - 1e-8, 'rear strip is removed');
      if (worldX > left + reference.size[0] * 0.915 + 1e-8) assert.ok(worldZ >= rear + reference.size[2] * 0.55 - 1e-8, 'outer corner is removed');
    }
  }
});

test('heatmap annual totals, normalization, missing readings and clean color limits agree', () => {
  const { buildEnergyHeatmap } = loadModule('lib/building/energy-heatmap.ts');
  const floors = { F01: { current2026: Array(12).fill(100), baseline2025: Array(12).fill(80), area: 50 },
    F02: { current2026: Array(12).fill(0), baseline2025: Array(12).fill(0), area: 0 } };
  let heat = buildEnergyHeatmap(floors, ['F01', 'F02'], 'year', 'usage');
  assert.equal(heat.readings.F01.usage, 1200);
  assert.equal(heat.readings.F01.change, 25);
  assert.equal(heat.readings.F02.usage, 0);
  assert.equal(heat.readings.F02.change, null);
  assert.ok(heat.scaleMaximum >= heat.maximum);
  assert.equal(heat.ticks[0], heat.scaleMaximum);
  assert.equal(heat.ticks.at(-1), 0);
  const quarter = buildEnergyHeatmap(floors, ['F01'], { year: 2026, startMonth: 6, endMonth: 8 }, 'usage');
  assert.equal(quarter.readings.F01.usage, 300);
  assert.equal(quarter.readings.F01.baseline, 240);
  assert.equal(quarter.readings.F01.change, 25);
  heat = buildEnergyHeatmap(floors, ['F01', 'F02'], 'year', 'intensity');
  assert.equal(heat.readings.F01.value, 24);
  assert.equal(heat.readings.F02.value, null);
  floors.F01.current2026[5] = null;
  heat = buildEnergyHeatmap(floors, ['F01'], 'year', 'usage');
  assert.equal(heat.maximum, null);
  assert.equal(heat.readings.F01.color, '#9ca3af');
  assert.equal(buildEnergyHeatmap(floors, ['F01'], 0, 'usage').readings.F01.usage, 100);
});
