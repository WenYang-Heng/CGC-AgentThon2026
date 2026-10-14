const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync('services/forecast-service.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(baseUrl, hostname, nodeEnv = 'production') {
  const calls = [];
  const context = vm.createContext({
    exports: {}, URL,
    process: { env: { NEXT_PUBLIC_FORECAST_API_URL: baseUrl, NODE_ENV: nodeEnv } },
    ...(hostname ? { window: { location: { hostname } } } : {}),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ scope: 'building' }) };
    },
  });
  vm.runInContext(compiled, context);
  return { api: context.exports, calls };
}

test('local browser uses local backend; all requests share configuration and cancellation', async () => {
  const { api, calls } = setup(' http://localhost:8000/// ', 'localhost');
  const signal = new AbortController().signal;
  await api.getForecast(null, signal);
  await api.getForecast('F04');
  await api.getForecastComparison('F04');
  assert.deepEqual(calls.map(call => call.url), [
    'http://localhost:8000/api/forecast/building',
    'http://localhost:8000/api/forecast/floor/F04',
    'http://localhost:8000/api/forecast/floor/F04/compare',
  ]);
  assert.equal(calls[0].options.signal, signal);
  assert.equal(calls[0].options.cache, 'no-store');
});

test('production browser and server use the configured production backend', async () => {
  const baseUrl = 'https://cgc-agent-thon2026-api-ws4c-iota.vercel.app';
  for (const hostname of ['cgc-agent-thon2026.vercel.app', undefined]) {
    const { api, calls } = setup(baseUrl, hostname);
    await api.getForecast(null);
    assert.equal(calls[0].url, `${baseUrl}/api/forecast/building`);
  }
});

test('missing and malformed settings fail before fetching', async () => {
  for (const value of [undefined, '', ' ', '/api', 'invalid', 'ftp://example.com', 'https://user:pass@example.com', 'https://example.com?q=1', 'https://example.com#fragment']) {
    const { api, calls } = setup(value, 'localhost');
    await assert.rejects(api.getForecast(null), /NEXT_PUBLIC_FORECAST_API_URL/);
    assert.equal(calls.length, 0);
  }
});

test('production rejects loopback and insecure backends without fetching', async () => {
  for (const hostname of ['cgc-agent-thon2026.vercel.app', undefined]) {
    for (const value of ['http://localhost:8000', 'https://localhost:8000', 'http://127.0.0.1:8000', 'https://127.1.2.3', 'https://[::1]', 'https://api.localhost', 'http://api.example.com']) {
      const { api, calls } = setup(value, hostname);
      await assert.rejects(api.getForecast(null), /public HTTPS backend in production/);
      assert.equal(calls.length, 0);
    }
  }
});
