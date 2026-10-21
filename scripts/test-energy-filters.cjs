const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {}, URL, URLSearchParams };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/energy-filters.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const api = context.exports;
const plain = value => JSON.parse(JSON.stringify(value));
test('monthly ranges normalize malformed values without introducing fake floor IDs', () => {
  assert.deepEqual(plain(api.readEnergyFilters(new URLSearchParams('year=no&startMonth=-1&endMonth=99&floors=ALL,F99'))), {
    period: { year: 2026, startMonth: 0, endMonth: 11 }, floorIds: null,
  });
  assert.deepEqual(plain(api.normalizePeriod({ year: 2025, startMonth: 9, endMonth: 2 }, [2025, 2026])), { year: 2025, startMonth: 9, endMonth: 9 });
  assert.deepEqual(plain(api.normalizeFloorIds(['F05', 'F04', 'F04', 'Floor 4'])), ['F04', 'F05']);
  assert.equal(api.normalizeFloorIds(['F04', 'F05'], 'single'), null);
  assert.equal(api.normalizeFloorIds(api.FLOOR_IDS), null);
});
test('month ranges and floor labels use consistent monthly semantics', () => {
  const period = { year: 2026, startMonth: 6, endMonth: 8 };
  assert.equal(api.formatFloorName('F04'), 'Floor 4');
  assert.equal(api.formatPeriodLabel(period), 'July – September 2026');
  assert.equal(api.formatPeriodLabel({ ...period, endMonth: 6 }), 'July 2026');
  assert.equal(api.formatPeriodLabel({ year: 2026, startMonth: 0, endMonth: 11 }), 'Full Year 2026');
  assert.deepEqual(plain(api.getPeriodMonthIndices(period)), [6, 7, 8]);
  assert.equal(api.isMonthInPeriod(6, period), true);
  assert.equal(api.isMonthInPeriod(5, period), false);
  assert.equal(api.isMonthInPeriod(6, period, 2025), false);
});
test('URL round trips retain unrelated parameters and All Floors omits floors', () => {
  const filters = { period: { year: 2026, startMonth: 0, endMonth: 8 }, floorIds: ['F04', 'F05'] };
  const params = api.writeEnergyFilters(new URLSearchParams('keep=value'), filters);
  assert.equal(params.get('keep'), 'value');
  assert.equal(params.get('floors'), 'F04,F05');
  assert.deepEqual(plain(api.readEnergyFilters(params)), filters);
  assert.equal(api.writeEnergyFilters(params, { ...filters, floorIds: null }).has('floors'), false);
  assert.equal(api.energyNavigationHref('/insights', new URLSearchParams()), '/insights');
});
test('navigation preserves supported scope and never silently picks one of multiple floors', () => {
  const params = new URLSearchParams('year=2026&startMonth=6&endMonth=8&floors=F04,F05');
  const single = new URL(api.energyNavigationHref('/insights', params), 'https://test.local');
  assert.equal(single.searchParams.has('floors'), false);
  assert.equal(single.searchParams.get('scopeNotice'), 'multi-floor');
  assert.equal(single.searchParams.get('startMonth'), '6');
  const multi = new URL(api.energyNavigationHref('/savings', params), 'https://test.local');
  assert.equal(multi.searchParams.get('floors'), 'F04,F05');
  params.set('floors', 'F04');
  assert.equal(new URL(api.energyNavigationHref('/building', params), 'https://test.local').searchParams.get('floors'), 'F04');
});
