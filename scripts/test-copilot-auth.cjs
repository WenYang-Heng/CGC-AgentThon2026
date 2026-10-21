const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const summaryModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/copilot-management-summary-data.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, summaryModule);

const compiled = ts.transpileModule(fs.readFileSync('services/chatbot-service.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

function setup() {
  const account = { homeAccountId: 'account-1', username: 'test-user' };
  const state = { accounts: [], active: null, silentError: null, apiStatus: null, renew: false, popup: 0, logout: 0, silent: 0, clients: 0, turns: 0, events: [], calls: [], expires: new Date(Date.now() + 3600000) };
  class InteractionRequiredAuthError extends Error {}
  class E { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  class Msal {
    constructor(configuration) { state.configuration = configuration; }
    async initialize() {}
    addEventCallback(callback) { state.callback = callback; }
    getAllAccounts() { return state.accounts; }
    getActiveAccount() { return state.active; }
    setActiveAccount(value) { state.active = value; }
    async acquireTokenSilent(request) {
      state.silent++;
      if (state.silentError) throw state.silentError;
      if (request.forceRefresh && state.renew) state.apiStatus = null;
      return { account: state.active ?? state.accounts[0], accessToken: 'mock-token', expiresOn: state.expires, fromCache: true };
    }
    async loginPopup() { state.popup++; state.accounts = [account]; return { account }; }
    async logoutPopup(request) { state.logoutRequest = request; state.logout++; state.accounts = []; state.active = null; }
  }
  class Client {
    constructor() { state.clients++; }
    async startConversationAsync() { return [{ type: 'message', text: 'Welcome', conversation: { id: 'conversation-1' } }]; }
    async askQuestionAsync(text, id) {
      state.turns++; state.calls.push({ kind: 'chat', text, id });
      if (state.apiStatus) throw new Error(`Copilot request failed: ${state.apiStatus}`);
      return state.chatActivities ?? [{ type: 'message', text: 'Agent response', conversation: { id: 'conversation-1' } }];
    }
    async sendActivity(activity, id) { state.calls.push({ kind: 'event', activity, id }); return [{ type: 'message', text: state.eventResponse ?? 'Event response' }]; }
  }
  const ctx = vm.createContext({ exports: {}, Error, Event: E, CustomEvent: E,
    window: { location: { origin: 'http://localhost:3000', protocol: 'http:', hostname: 'localhost' }, dispatchEvent: event => state.events.push(event) },
    process: { env: Object.fromEntries(['ENVIRONMENT_ID', 'TENANT_ID', 'SCHEMA_NAME', 'CLIENT_ID'].map(key => ['NEXT_PUBLIC_COPILOT_' + key, 'public-test-id'])) },
    require(name) {
      if (name === '@azure/msal-browser') return { PublicClientApplication: Msal, InteractionRequiredAuthError, EventType: { ACTIVE_ACCOUNT_CHANGED: 'active' } };
      if (name === '@microsoft/agents-copilotstudio-client') return { ConnectionSettings: class { constructor(value) { Object.assign(this, value); } }, CopilotStudioClient: Client, ScopeHelper: { getScopeFromSettings: () => 'copilot-scope' } };
      if (name === '@microsoft/agents-activity') return { Activity: { fromObject: value => value } };
      if (name === '@/lib/chat-attachments') return { prepareChatAttachments: async files => files.map(file => ({name:file.name,contentType:'application/pdf',contentUrl:'data:application/pdf;base64,VEVTVA=='})) };
      if (name === '@/lib/copilot-consent') return { readConsentCard: () => undefined };
      if (name === '@/lib/copilot-dashboard-data') return { parseCopilotDashboardPayload: () => undefined };
      if (name === '@/lib/copilot-recommendations-data') return { parseCopilotRecommendations: () => undefined };
      if (name === '@/lib/copilot-management-summary-data') return summaryModule.exports;
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  vm.runInContext(compiled, ctx);
  return { api: ctx.exports, state, account, InteractionRequiredAuthError, ctx };
}

test('Copilot choices preserve labels, values and conversation and ignore unsupported actions', async () => {
  const { api, state } = setup();
  await api.signInToCopilot();
  state.chatActivities = [{ type: 'message', id: 'question-1', text: 'Choose an issue', suggestedActions: { actions: [
    { type: 'imBack', title: 'Air conditioning', value: 'Air Conditioning' },
    { type: 'messageBack', title: 'Equipment', text: 'Equipment', value: { issue: 'Equipment' } },
    { type: 'openUrl', title: 'External link', value: 'https://example.com' },
  ] } }];
  const response = await api.sendChatMessage('Create a report');
  assert.equal(response.text, 'Choose an issue');
  assert.equal(response.choices.length, 2);
  assert.equal(response.choices[0].title, 'Air conditioning');
  await api.submitChatChoice(response.choices[0]);
  assert.equal(state.calls.at(-1).activity.type, 'message');
  assert.equal(state.calls.at(-1).activity.text, 'Air Conditioning');
  assert.equal(state.calls.at(-1).activity.replyToId, 'question-1');
  assert.equal(state.calls.at(-1).id, 'conversation-1');
  await api.submitChatChoice(response.choices[1]);
  assert.equal(state.calls.at(-1).activity.value.issue, 'Equipment');
  assert.equal(state.calls.at(-1).activity.text, 'Equipment');
  assert.equal(state.calls.at(-1).activity.channelData.postBack, true);
});

test('button-only messages are displayable and later messages supersede old choices', async () => {
  const { api, state } = setup();
  await api.signInToCopilot();
  state.chatActivities = [{ type: 'message', suggestedActions: { actions: [{ type: 'imBack', title: 'Yes', value: 'yes' }] } }];
  const response = await api.sendChatMessage('Continue');
  assert.equal(response.choices[0].value, 'yes');
  state.chatActivities.push({ type: 'message', text: 'The question has changed.' });
  assert.equal((await api.sendChatMessage('Next')).choices, undefined);
});

test('multiple files are sent together as one message in the existing conversation', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  await api.sendChatMessage('Extract these bills', {}, [{ name: 'January.pdf' }, { name: 'February.pdf' }]);
  assert.equal(state.calls.length, 1);
  const sent = state.calls[0];
  assert.equal(sent.activity.type, 'message');
  assert.equal(sent.activity.text, 'Extract these bills');
  assert.equal(sent.id, 'conversation-1');
  assert.equal(sent.activity.attachments.length, 2);
  assert.equal(sent.activity.attachments[1].name, 'February.pdf');
  assert.match(sent.activity.attachments[0].contentUrl, /^data:application\/pdf;base64,/);
});

for (const origin of ['http://localhost:3000', 'https://cgc-agent-thon2026.vercel.app']) {
  test(`sign-in and sign-out use the current origin: ${origin}`, async () => {
    const { api, state, ctx } = setup();
    const url = new URL(origin);
    ctx.window.location = { origin: url.origin, protocol: url.protocol, hostname: url.hostname };
    await api.signInToCopilot();
    assert.equal(state.configuration.auth.redirectUri, origin);
    assert.equal(state.configuration.auth.postLogoutRedirectUri, origin);
    await api.signOutOfCopilot();
    assert.equal(state.logoutRequest.postLogoutRedirectUri, origin);
  });
}

test('waste report sends the entered description and uses the agent report ID', async () => {
  const { api, state, account } = setup();
  state.accounts = [account];
  state.eventResponse = JSON.stringify({ success: true, reportId: 'AGENT-42', status: 'Active', message: 'Created' });
  const description = 'Meeting room lights remain on after everyone has left.';
  const result = await api.createEnergyWasteReport({ issueType: 'Lights', floorId: 'F06', floorName: 'Floor 6', roomType: 'Meeting Room', description });
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].kind, 'event');
  assert.equal(state.calls[0].activity.name, 'ui_create_report_request');
  assert.equal(state.calls[0].activity.value.description, description);
  assert.equal(state.calls[0].activity.value.floorId, 'F06');
  assert.equal(state.calls[0].activity.value.reportedBy, account.username);
  assert.equal(result.reportId, 'AGENT-42');
  assert.equal(result.success, true);
});

test('report failures explain a missing confirmation and never invent a ticket ID', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  const payload = { issueType: 'Lights', floorId: 'F06', floorName: 'Floor 6', roomType: 'Meeting Room', description: 'Lights left on after hours.' };
  for (const reply of ['', 'Your report has been created.', '{"unrelated": true}', 'null', '{"success":true,"reportId":""}']) {
    state.eventResponse = reply;
    await assert.rejects(api.createEnergyWasteReport(payload), /Copilot did not confirm report creation/);
  }
  state.eventResponse = JSON.stringify({ success: false, message: 'Ticket action unavailable.' });
  const failed = await api.createEnergyWasteReport(payload);
  assert.equal(failed.success, false);
  assert.equal(failed.message, 'Ticket action unavailable.');
});

test('Management summary uses the shared client and sends only the energy context as a custom event', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  const payload = { floorId: 'F04', floorName: 'Floor 4', analysisPeriod: 'January to March', baselineYear: 2025, currentYear: 2026, forecastYear: 2027, baselineKWh: 100, currentKWh: 110, changePercent: 10, forecastKWh: 120, highestForecastMonth: 'March', forecastMethod: 'baseline_growth', anomalyCount: 1, anomalyMonths: ['March'] };
  const summary = { headline: 'Heading', summary: 'Summary', keyConcern: 'Concern', recommendedFocus: 'Focus' };
  state.eventResponse = JSON.stringify({ managementSummary: summary });
  const response = await api.requestCopilotManagementSummary(payload);
  assert.equal(response.managementSummaryPayload.managementSummary.headline, 'Heading');
  assert.equal(state.calls[0].activity.name, 'ui_generate_management_summary');
  assert.equal(state.calls[0].activity.type, 'event');
  assert.deepEqual(state.calls[0].activity.value, payload);
  assert.equal(state.clients, 1);
  assert.equal(state.popup, 0);
  await api.sendChatMessage('Hello');
  await api.requestCopilotRecommendations({ floorId: 'F04' });
  assert.equal(state.clients, 1);
  assert.equal(state.calls[1].kind, 'chat');
  assert.equal(state.calls[2].activity.name, 'get_recommendation');
  state.eventResponse = 'Not JSON';
  assert.equal((await api.requestCopilotManagementSummary(payload)).managementSummaryPayload, undefined);
  state.eventResponse = '';
  await assert.rejects(api.requestCopilotManagementSummary(payload), /final Message node/);
});

test('Insights email uses one custom event with the exact payload and checks the result', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  const payload = { building: 'Menara CGC', floorId: null, floorName: 'All Floors', analysisPeriod: 'Jan–Mar', summary: 'Calculated management summary.' };
  state.eventResponse = 'Email sent successfully.';
  assert.equal((await api.emailEnergyInsights(payload)).message, state.eventResponse);
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].activity.name, 'ui.email_energy_insights');
  assert.equal(state.calls[0].activity.type, 'event');
  assert.deepEqual(state.calls[0].activity.value, payload);
  state.eventResponse = 'Email action failed.';
  assert.equal((await api.emailEnergyInsights(payload)).message, state.eventResponse);
  state.eventResponse = '';
  await assert.rejects(api.emailEnergyInsights(payload), /no email response/);
  const callsBefore = state.calls.length;
  await assert.rejects(api.emailEnergyInsights({ ...payload, summary: '' }), /summary is required/);
  assert.equal(state.calls.length, callsBefore);
});

test('signed-out checks and requests fail closed without a popup', async () => {
  const { api, state } = setup();
  assert.equal((await api.checkCopilotAuth()).status, 'signed-out');
  await assert.rejects(api.sendChatMessage('Hello'), api.CopilotAuthRequiredError);
  assert.equal(state.popup, 0); assert.equal(state.clients, 0);
});
test('valid sessions check silently, share initialization, and validate each turn', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  await Promise.all([api.checkCopilotAuth(), api.checkCopilotAuth()]); assert.equal(state.silent, 1);
  await Promise.all([api.sendChatMessage('Hello'), api.sendChatMessage('Follow-up')]); assert.equal(state.clients, 1);
  const previousChecks = state.silent;
  await api.sendChatMessage('Another turn'); assert.ok(state.silent > previousChecks);
  assert.equal(state.popup, 0); assert.equal(state.calls.at(-1).id, 'conversation-1');
});
test('renewal recreates the token-bound client while retaining conversation', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  await api.sendChatMessage('Hello'); state.expires = new Date(Date.now() + 7200000);
  await api.sendChatMessage('Follow-up'); assert.equal(state.clients, 2); assert.equal(state.calls.at(-1).id, 'conversation-1'); assert.equal(state.popup, 0);
});
test('interaction-required is distinct from network failure and never opens popup', async () => {
  const { api, state, account, InteractionRequiredAuthError } = setup(); state.accounts = [account];
  state.silentError = new InteractionRequiredAuthError('login_required');
  assert.equal((await api.checkCopilotAuth()).status, 'session-expired'); assert.equal(state.popup, 0);
  state.silentError = new Error('Network failure');
  assert.equal((await api.checkCopilotAuth()).status, 'error'); assert.equal(state.popup, 0);
});
test('explicit rapid sign-in shares a popup, selects account, and broadcasts no tokens', async () => {
  const { api, state } = setup();
  await Promise.all([api.signInToCopilot(), api.signInToCopilot()]); assert.equal(state.popup, 1);
  assert.equal(api.getCopilotAuthState().status, 'signed-in'); assert.ok(state.active);
  assert.equal(state.events.filter(event => event.type === 'copilot-authenticated').length, 1);
  assert.ok(!JSON.stringify(state.events).includes('mock-token'));
});
test('sign-out resets the client and blocks subsequent requests', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  await api.sendChatMessage('Hello'); await api.signOutOfCopilot();
  assert.equal(state.logout, 1); assert.equal(api.getCopilotAuthState().status, 'signed-out');
  await assert.rejects(api.sendChatMessage('Blocked'), api.CopilotAuthRequiredError); assert.equal(state.turns, 1);
});
test('401 recovers once silently; persistent rejection stops after two attempts', async () => {
  const { api, state, account } = setup(); state.accounts = [account]; state.apiStatus = 401; state.renew = true;
  await api.sendChatMessage('Recover'); assert.equal(state.turns, 2); assert.equal(state.popup, 0);
  state.apiStatus = 401; state.renew = false;
  await assert.rejects(api.sendChatMessage('Rejected'), api.CopilotAuthRequiredError);
  assert.equal(state.turns, 4); assert.equal(api.getCopilotAuthState().status, 'session-expired');
});
test('403 is access denied, not session expiry; normal events stay deterministic', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  await api.requestCopilotRecommendations({ page: 'insights' });
  assert.equal(state.calls[0].kind, 'event'); assert.equal(state.calls[0].activity.name, 'get_recommendation');
  state.apiStatus = 403; await assert.rejects(api.sendChatMessage('Denied'));
  assert.equal(api.getCopilotAuthState().status, 'error'); assert.equal(state.turns, 1);
});
test('ambiguous multiple accounts require explicit selection', async () => {
  const { api, state, account } = setup(); state.accounts = [account, { homeAccountId: 'account-2' }];
  assert.equal((await api.checkCopilotAuth()).status, 'signed-out'); assert.equal(state.silent, 0); assert.equal(state.popup, 0);
});
test('account change resets the client and checks the newly active account', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  await api.sendChatMessage('First account');
  state.active = { homeAccountId: 'account-2' }; state.accounts = [state.active];
  state.callback({ eventType: 'active' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(api.getCopilotAuthState().status, 'signed-in');
  await api.sendChatMessage('Second account'); assert.equal(state.clients, 2);
});
test('non-local insecure redirects fail closed without an interactive popup', async () => {
  const { api, state, account, ctx } = setup(); state.accounts = [account];
  ctx.window.location.hostname = 'production.example';
  const result = await api.checkCopilotAuth();
  assert.equal(result.status, 'error'); assert.equal(result.message, 'Copilot authentication requires HTTPS.');
  assert.equal(state.popup, 0); assert.equal(state.clients, 0);
});
test('normal conversation always uses the main agent, including event-like text', async () => {
  const { api, state, account } = setup(); state.accounts = [account];
  for (const question of ['Explain energy usage', 'Explain anomalies and forecasts', 'get_recommendation']) {
    const response = await api.sendChatMessage(question, { page: 'dashboard' });
    assert.equal(response.text, 'Agent response');
  }
  assert.equal(state.calls.length, 3);
  assert.ok(state.calls.every(call => call.kind === 'chat'));
  assert.ok(state.calls.every(call => !call.text.includes('Energy Data Conversation')));
});
