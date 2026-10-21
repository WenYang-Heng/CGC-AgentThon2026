const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
function compile(path) {
  return ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
}
const parserModule = { exports: {} };
vm.runInNewContext(compile('lib/copilot-management-summary-data.ts'), parserModule);
const filterModule = { exports: {} };
vm.runInNewContext(compile('lib/energy-filters.ts'), filterModule);
const { parseCopilotManagementSummary: parse, managementSummaryToText: plainText } = parserModule.exports;
const summary = { headline: 'Energy demand', summary: 'Period findings', keyConcern: 'July usage', recommendedFocus: 'Review schedules' };
test('parser accepts AI Builder text envelopes and direct summary fields after diagnostic messages', () => {
  for (const value of [summary, { text: JSON.stringify(summary), modelType: 'reasoning', finishReason: 'stop' }, { text: JSON.stringify({ managementSummary: summary }) }]) {
    const result = parse(['{"currentKWh":1445340}', 'Before prompting.', 'After prompting.', JSON.stringify(value)]);
    assert.equal(JSON.stringify(result), JSON.stringify({ managementSummary: summary }));
    assert.deepEqual(Object.keys(result.managementSummary).sort(), ['headline', 'keyConcern', 'recommendedFocus', 'summary']);
  }
  assert.equal(parse([JSON.stringify({ text: 'not JSON' })]), undefined);
  assert.equal(parse([JSON.stringify({ text: JSON.stringify({ ...summary, keyConcern: null }) })]), undefined);
});
test('parser accepts JSON, fences and surrounding text; rejects malformed or incomplete responses', () => {
  const json = JSON.stringify({ managementSummary: summary });
  for (const text of [json, '```json\n' + json + '\n```', 'Result: ' + json]) {
    assert.equal(JSON.stringify(parse(['unrelated', text])), json);
  }
  for (const text of ['', 'null', '[]', '{broken}', '{"managementSummary":null}', '{"managementSummary":[]}', JSON.stringify({ managementSummary: { ...summary, headline: 4 } }), JSON.stringify({ managementSummary: { headline: 'Partial' } })]) {
    assert.equal(parse([text]), undefined);
  }
  assert.equal(parse([json, 'malformed'])?.managementSummary.headline, summary.headline);
  assert.equal(plainText(summary), 'Energy demand\n\nPeriod findings\n\nKey concern:\nJuly usage\n\nRecommended focus:\nReview schedules');
});

const component = compile('components/insights/InsightsPage.tsx');
const tick = () => new Promise(resolve => setImmediate(resolve));
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (Array.isArray(tree)) return tree.map(child => find(child, predicate)).find(Boolean);
  return predicate(tree) ? tree : find(tree.props?.children, predicate);
}
function text(tree) {
  if (typeof tree === 'string') return tree;
  if (Array.isArray(tree)) return tree.map(text).join('');
  return tree && typeof tree === 'object' ? text(tree.props?.children) : '';
}
function setup(anomalies = []) {
  const hooks = [], effects = [], calls = [], pending = [], emails = [], copies = [], exports = [];
  let cursor = 0;
  let filterState = { period: { year: 2026, startMonth: 0, endMonth: 11 }, floorIds: null };
  function SharedFilterStub(props) {
    const React = require('react');
    return React.createElement('div', null,
      React.createElement('select', { 'aria-label': 'Floor', onChange: event => props.onChange({ ...props.value, floorIds: [event.target.value] }) }),
      React.createElement('button', { 'aria-label': 'Analysis Period: ' + filterModule.exports.formatPeriodLabel(props.value.period), onClick() {} }),
      React.createElement('button', { onClick: () => props.onChange({ ...props.value, period: { ...props.value.period, startMonth: 0, endMonth: 2 } }) }, 'Q1'),
      React.createElement('select', { 'aria-label': 'Start month', onChange: event => props.onChange({ ...props.value, period: { ...props.value.period, startMonth: Number(event.target.value) } }) }),
      React.createElement('select', { 'aria-label': 'End month', onChange: event => props.onChange({ ...props.value, period: { ...props.value.period, endMonth: Number(event.target.value) } }) }),
    );
  }
  class AuthError extends Error {}
  const fixture = { scope: 'floor', floorId: 'F04', baselineYear: 2025, currentYear: 2026, forecastYear: 2027, method: 'baseline_growth', monthly: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => ({ month, actual2025: 100, actual2026: 110, forecast2027: 120 + i, isAnomaly2026: i === 6 })), anomalyMonthsExcluded: ['July'] };
  const ctx = vm.createContext({ exports: {}, AbortController, Error,
    process: { env: { NODE_ENV: "production" } },
    window: { dispatchEvent() {}, addEventListener() {}, removeEventListener() {}, setTimeout() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    navigator: { clipboard: { async writeText(value) { copies.push(value); } } },
    Blob: class { constructor(parts) { exports.push(parts.join('')); } },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    document: { createElement: () => ({ click() {} }) },
    require(name) {
      if (name === 'react') return {
        useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = { value: initial }; return [hooks[i].value, value => { hooks[i].value = typeof value === 'function' ? value(hooks[i].value) : value; }]; },
        useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
        useMemo(fn) { cursor++; return fn(); },
        useEffect(fn, deps) { const i = cursor++; const old = hooks[i]; if (!old || !deps || deps.some((dep, n) => dep !== old.deps[n])) { hooks[i] = { deps }; effects.push(fn); } },
      };
      if (name === 'react/jsx-runtime') return require(name);
      if (name.endsWith('.css')) return {};
      if (name === '@/lib/copilot-management-summary-data') return parserModule.exports;
      if (name === '@/lib/energy-filters') return filterModule.exports;
      if (name === '@/lib/use-energy-filters') return { useEnergyFilters: () => ({ value: filterState, onChange: value => { filterState = value; } }) };
      if (name === '@/components/EnergyFilters/EnergyFilterBar') return SharedFilterStub;
      if (name === '@/data/anomaly-mock-data') return { anomalyMockData: { anomalies } };
      if (name === '@/services/forecast-service') return { getForecast: async floorId => ({ ...fixture, floorId }) };
      if (name === '@/services/chatbot-service') return {
        CopilotAuthRequiredError: AuthError,
        requestCopilotManagementSummary(context) { calls.push(context); return new Promise((resolve, reject) => pending.push({ resolve, reject })); },
        async emailEnergyInsights(context) { emails.push(context); return { success: true, message: 'Sent' }; },
      };
      return () => null;
    },
  });
  vm.runInContext(component, ctx);
  function render() {
    cursor = 0; const tree = ctx.exports.default({ forecastFloors: ['F04', 'F05'] }); while (effects.length) effects.shift()();
    function expand(node) {
      if (!node || typeof node !== 'object') return node;
      if (Array.isArray(node)) return node.map(expand);
      if (node.type === SharedFilterStub) return node.type(node.props);
      return { ...node, props: { ...node.props, children: expand(node.props?.children) } };
    }
    return expand(tree);
  }
  function button(tree, label) { const node = find(tree, item => item.type === 'button' && text(item) === label); assert.ok(node, label); return node; }
  return { render, button, calls, pending, emails, copies, exports, AuthError };
}
async function openSummary(env) {
  let tree = env.render(); await tick(); tree = env.render();
  env.button(tree, 'Management Summary').props.onClick();
  return env.render();
}
test('UI uses calculated context; structured result drives copy, email and export without chat messages', async () => {
  const env = setup(); let tree = await openSummary(env);
  assert.ok(text(tree).includes('Generate a management summary for the selected scope.'));
  const generate = env.button(tree, 'Generate Summary'); generate.props.onClick(); generate.props.onClick();
  assert.equal(env.calls.length, 1);
  assert.equal(env.calls[0].baselineKWh, 1200);
  assert.equal(env.calls[0].currentKWh, 1320);
  assert.equal(env.calls[0].anomalyCount, 1);
  assert.equal(env.calls[0].anomalyMonths[0], 'July');
  assert.deepEqual(Object.keys(env.calls[0]).sort(), ['floorId', 'floorName', 'analysisPeriod', 'baselineYear', 'currentYear', 'forecastYear', 'baselineKWh', 'currentKWh', 'changePercent', 'forecastKWh', 'highestForecastMonth', 'forecastMethod', 'anomalyCount', 'anomalyMonths'].sort());
  assert.equal(env.button(env.render(), 'Generating\u2026').props.disabled, true);
  env.pending[0].resolve({ managementSummaryPayload: { managementSummary: summary } }); await tick(); tree = env.render();
  assert.ok(text(tree).includes(summary.headline));
  await env.button(tree, 'Copy Summary').props.onClick();
  await env.button(tree, 'Send Email').props.onClick();
  env.button(tree, 'Export').props.onClick();
  assert.equal(env.copies[0], plainText(summary)); assert.equal(env.emails[0].summary, plainText(summary)); assert.equal(env.exports[0], plainText(summary));
  find(tree, item => item.props?.['aria-label'] === 'Floor').props.onChange({ target: { value: 'F05' } });
  assert.ok(!text(env.render()).includes(summary.headline));
});
test('late responses are discarded after floor or period changes; errors allow retry', async () => {
  const env = setup(); let tree = await openSummary(env);
  env.button(tree, 'Generate Summary').props.onClick();
  find(tree, item => item.props?.['aria-label'] === 'Floor').props.onChange({ target: { value: 'F04' } });
  env.pending[0].resolve({ managementSummaryPayload: { managementSummary: summary } }); await tick(); tree = env.render(); await tick(); tree = env.render();
  assert.ok(!text(tree).includes(summary.headline));
  env.button(tree, 'Generate Summary').props.onClick(); env.pending[1].resolve({ text: 'Malformed' }); await tick(); tree = env.render();
  assert.ok(text(tree).includes('did not return a valid management summary'));
  env.button(tree, 'Retry Summary').props.onClick();
  const period = find(tree, item => item.props?.['aria-label']?.startsWith('Analysis Period:'));
  period.props.onClick(); tree = env.render(); env.button(tree, 'Q1').props.onClick();
  env.pending[2].resolve({ managementSummaryPayload: { managementSummary: summary } }); await tick(); tree = env.render();
  assert.ok(!text(tree).includes(summary.headline)); assert.ok(!text(tree).includes('did not return a valid'));
  env.button(tree, 'Generate Summary').props.onClick();
  assert.equal(env.calls.at(-1).baselineKWh, 300); assert.equal(env.calls.at(-1).anomalyCount, 0);
  env.pending[3].reject(new env.AuthError()); await tick();
  assert.ok(text(env.render()).includes('Sign in using the sidebar'));
});

test('individual start and end month changes clear summaries and errors', async () => {
  const env = setup(); let tree = await openSummary(env);
  env.button(tree, 'Generate Summary').props.onClick();
  env.pending[0].resolve({ managementSummaryPayload: { managementSummary: summary } }); await tick(); tree = env.render();
  find(tree, item => item.props?.['aria-label']?.startsWith('Analysis Period:')).props.onClick(); tree = env.render();
  find(tree, item => item.props?.['aria-label'] === 'Start month').props.onChange({ target: { value: '6' } }); tree = env.render();
  assert.ok(!text(tree).includes(summary.headline));
  env.button(tree, 'Generate Summary').props.onClick(); env.pending[1].reject(new Error('Summary failed')); await tick(); tree = env.render();
  assert.ok(text(tree).includes('Summary failed'));
  find(tree, item => item.props?.['aria-label'] === 'End month').props.onChange({ target: { value: '8' } }); tree = env.render();
  assert.ok(!text(tree).includes('Summary failed'));
  env.button(tree, 'Generate Summary').props.onClick();
  assert.equal(env.calls.at(-1).analysisPeriod, 'July – September 2026');
  assert.equal(env.calls.at(-1).anomalyCount, 1);
});

test('monthly anomalies use source readings, period and floor filtering, and monthly notification content', async () => {
  const dataModule = { exports: {} }; vm.runInNewContext(compile('data/anomaly-mock-data.ts'), dataModule);
  const anomalies = dataModule.exports.anomalyMockData.anomalies;
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile('data/CGC_Energy_2026_Mock_Only.xlsx');
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Energy_Data_2026_Mock, { range: 2 });
  for (const anomaly of anomalies) {
    assert.equal(anomaly.actualKWh, rows.find(row => row.Record_ID === `2026-${anomaly.id.slice(-2)}-${anomaly.floorId}`).Electricity_kWh);
    assert.equal(anomaly.expectedKWh, null); assert.equal(anomaly.deviationPercent, null);
    assert.equal('startTime' in anomaly, false); assert.equal('endTime' in anomaly, false);
  }
  const env = setup(anomalies); let tree = env.render(); await tick(); tree = env.render();
  env.button(tree, 'Anomalies').props.onClick(); tree = env.render();
  const cards = () => {
    const result = []; function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); if (node.props?.anomaly) result.push(node); walk(node.props?.children); } walk(tree); return result;
  };
  assert.equal(cards().length, 4);
  let card = cards().find(node => node.props.anomaly.floorId === 'F04');
  const rendered = card.type({ ...card.props, expanded: true });
  assert.ok(text(rendered).includes('July 2026')); assert.ok(text(rendered).includes('9,925 kWh'));
  assert.ok(text(rendered).includes('Deviation unavailable')); assert.ok(text(rendered).includes('Possible contributors'));
  assert.ok(!text(rendered).includes('AI explanation')); assert.ok(!text(rendered).includes('PM'));
  env.button(rendered, 'Create Energy Waste Report').props.onClick(); assert.ok(text(env.render()).includes('No report has been created.'));
  await card.props.onNotify(); assert.equal(env.emails[0].floorId, 'F04'); assert.equal(env.emails[0].analysisPeriod, 'July 2026');
  assert.ok(env.emails[0].summary.includes('Period: July 2026')); assert.ok(!env.emails[0].summary.includes('Time:'));
  find(tree, node => node.props?.['aria-label']?.startsWith('Analysis Period:')).props.onClick(); tree = env.render();
  env.button(tree, 'Q1').props.onClick(); tree = env.render(); assert.equal(cards().length, 1); assert.equal(cards()[0].props.anomaly.floorId, 'F08');
  find(tree, node => node.props?.['aria-label'] === 'Floor').props.onChange({ target: { value: 'F04' } }); tree = env.render(); assert.equal(cards().length, 0);
});
