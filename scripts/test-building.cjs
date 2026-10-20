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
  const moduleContext = vm.createContext({ exports: {} });
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
  heat = buildEnergyHeatmap(floors, ['F01', 'F02'], 'year', 'intensity');
  assert.equal(heat.readings.F01.value, 24);
  assert.equal(heat.readings.F02.value, null);
  floors.F01.current2026[5] = null;
  heat = buildEnergyHeatmap(floors, ['F01'], 'year', 'usage');
  assert.equal(heat.maximum, null);
  assert.equal(heat.readings.F01.color, '#9ca3af');
  assert.equal(buildEnergyHeatmap(floors, ['F01'], 0, 'usage').readings.F01.usage, 100);
});
