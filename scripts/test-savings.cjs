const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const context = vm.createContext({ exports: {}, process, console, require(name) {
    if (name in dependencies) return dependencies[name];
    return require(name);
  } });
  vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, context);
  return context.exports;
}
const calculations = load('lib/savings-calculations.ts');
const mock = load('data/anomaly-mock-data.ts');
const loader = load('lib/load-savings-data.ts', { 'server-only': {}, '@/data/anomaly-mock-data': mock, '@/lib/savings-calculations': calculations });
const data = loader.loadSavingsData();

test('actual workbooks: audit annual scope, baseline, source-reported finance, cost-only measure', () => {
  assert.equal(data.opportunities.length, 12);
  assert.equal(data.excludedScenarioCount, 14);
  assert.equal(data.baselineAnnualConsumptionKwh, 1393880);
  assert.equal(data.summary.grossEnergyOpportunityKwh, 405182);
  assert.equal(data.summary.grossFinancialOpportunityRm, 238393);
  assert.equal(data.summary.quantifiedOpportunityCount, 9);
  const powerFactor = data.opportunities.find(item => item.category === 'Power Factor');
  assert.equal(powerFactor.estimatedKwhSaving, null);
  assert.equal(calculations.getFinancialOpportunity(powerFactor), 36000);
  assert.equal(calculations.getFinancialOpportunity(data.opportunities[0]), 34723);
  assert.ok(data.opportunities.every(item => item.savingPeriod === 'Annual' && item.sourceType === 'CGC Energy Audit'));
});

test('null, zero, fallback, invalid numbers, percentage and no accidental NaN', () => {
  const base = data.opportunities[0];
  const missing = { ...base, estimatedKwhSaving: null, reportedRmSaving: null, calculatedRmSaving: null };
  assert.equal(calculations.summarizeOpportunities([missing], 1000).grossEnergyOpportunityKwh, null);
  assert.equal(calculations.summarizeOpportunities([missing], 1000).quantifiedOpportunityCount, 0);
  assert.equal(calculations.summarizeOpportunities([], null).grossFinancialOpportunityRm, null);
  assert.equal(calculations.getFinancialOpportunity({ ...missing, calculatedRmSaving: 17 }), 17);
  assert.equal(calculations.getFinancialOpportunity({ ...missing, reportedRmSaving: 0, calculatedRmSaving: 17 }), 0);
  for (const value of [-1, NaN, Infinity, undefined, '', '100']) assert.equal(calculations.nonnegativeNumber(value), null);
  assert.equal(calculations.summarizeOpportunities([{ ...missing, estimatedKwhSaving: 100 }], 1000).opportunityPercentageOfBaseline, 10);
  for (const baseline of [0, null, NaN]) assert.equal(calculations.summarizeOpportunities([base], baseline).opportunityPercentageOfBaseline, null);
});

test('filters, sorting, selected totals and overlap are deterministic', () => {
  const cooling = calculations.filterOpportunities(data.opportunities, { category: 'Air-conditioning', confidence: 'High', status: 'Draft' });
  assert.equal(cooling.length, 4);
  assert.equal(calculations.filterOpportunities(data.opportunities, { category: '', confidence: '', status: 'Approved' }).length, 0);
  const selected = data.opportunities.filter(item => ['AUD-001', 'AUD-005', 'AUD-009'].includes(item.id));
  const totals = calculations.summarizeOpportunities(selected, data.baselineAnnualConsumptionKwh);
  assert.equal(totals.grossEnergyOpportunityKwh, 176100);
  assert.equal(totals.grossFinancialOpportunityRm, 87934);
  assert.equal(calculations.hasPotentialOverlap(selected), true);
  assert.equal(calculations.hasPotentialOverlap([data.opportunities[0]]), false);
  for (const metric of ['energy', 'financial']) {
    const ranked = calculations.rankOpportunities(data.opportunities, metric);
    const value = item => (metric === 'energy' ? item.estimatedKwhSaving : calculations.getFinancialOpportunity(item)) ?? -1;
    assert.ok(ranked.every((item, index) => index === 0 || value(ranked[index - 1]) >= value(item)));
  }
});

test('prototype signals associate with audit measures without changing totals', () => {
  assert.equal(data.operationalSignals.length, 4);
  assert.equal(new Set(data.operationalSignals.map(signal => signal.id)).size, 4);
  const f04 = data.operationalSignals.find(item => item.id === 'MOCK-F04-2026-07');
  assert.ok(f04.relatedIds.includes('AUD-001'));
  for (const id of ['MOCK-F08-2026-03', 'MOCK-F12-2026-05']) assert.equal(data.operationalSignals.find(item => item.id === id).relatedIds.length, 0);
  assert.equal(calculations.summarizeOpportunities(data.opportunities, data.baselineAnnualConsumptionKwh).grossEnergyOpportunityKwh, data.summary.grossEnergyOpportunityKwh);
});

test('cost records use source bills, year-specific annual occupancy, and complete aggregates', () => {
  assert.equal(data.costFloors.length, 16);
  const baseline = calculations.calculateFloorCosts(data.costFloors, 2025, 0, 11);
  const generated = calculations.calculateFloorCosts(data.costFloors, 2026, 0, 11);
  assert.equal(baseline[0].employees, 20);
  assert.equal(generated[0].employees, null);
  assert.equal(calculations.summarizeCosts(generated).costPerEmployee, null);
  const jan = calculations.calculateFloorCosts(data.costFloors, 2025, 0, 0);
  assert.equal(jan[0].costRm, 3096.57);
  assert.equal(jan[0].effectiveRateRmPerKwh, 3096.57 / 5555);
  const missing = { ...data.costFloors[0], areaM2: null, employees2025: null,
    baseline: [{ costRm: null, energyKwh: 100 }] };
  const floor = calculations.calculateFloorCosts([missing], 2025, 0, 0)[0];
  for (const key of ['costRm', 'costPerEmployee', 'costPerM2', 'effectiveRateRmPerKwh']) assert.equal(floor[key], null);
  const zeroDenominator = { ...data.costFloors[0], baseline: [{ costRm: 10, energyKwh: 0 }], employees2025: 0, areaM2: 0 };
  const zero = calculations.calculateFloorCosts([zeroDenominator], 2025, 0, 0)[0];
  assert.equal(zero.costPerEmployee, null);
  assert.equal(zero.costPerM2, null);
  assert.equal(zero.effectiveRateRmPerKwh, null);
  assert.equal(calculations.completeSum([10, null]), null);
  assert.equal(calculations.completeSum([0, 0]), 0);
  assert.equal(calculations.completeSum([1000, -200]), 800);
  assert.equal(data.costFloors.find(floor => floor.floorId === 'F12').baseline[4].costRm, -632.62);
  assert.notEqual(calculations.summarizeCosts(baseline).totalCostRm, null);
  assert.notEqual(calculations.summarizeCosts(generated).totalCostRm, null);
});

test('planning assumption and post-action consumption preserve nulls and prevent negative impact', () => {
  assert.ok(Math.abs(calculations.planningValue(176100, 0.7) - 123270) < 0.000001);
  assert.equal(calculations.planningValue(null, 0.7), null);
  assert.equal(calculations.planningValue(100, 2), null);
  assert.equal(calculations.postActionConsumption(1500000, 100000), 1400000);
  assert.equal(calculations.postActionConsumption(100, 110), null);
  assert.equal(calculations.postActionConsumption(null, 10), null);
  assert.equal(calculations.postActionConsumption(100, null), null);
});
