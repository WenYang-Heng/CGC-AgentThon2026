"use client";

import { EventType, InteractionRequiredAuthError, PublicClientApplication, type AuthenticationResult } from "@azure/msal-browser";
import { Activity } from "@microsoft/agents-activity";
import { ConnectionSettings, CopilotStudioClient, ScopeHelper } from "@microsoft/agents-copilotstudio-client";
import { readConsentCard, type ConsentAction } from "@/lib/copilot-consent";
import { parseCopilotDashboardPayload } from "@/lib/copilot-dashboard-data";
import { parseCopilotRecommendations } from "@/lib/copilot-recommendations-data";
import type { CopilotAuthState } from "@/types/copilot-auth";
import type { ChatContext, ChatResponse } from "@/types/chatbot";

const config = {
  environmentId: process.env.NEXT_PUBLIC_COPILOT_ENVIRONMENT_ID ?? "",
  tenantId: process.env.NEXT_PUBLIC_COPILOT_TENANT_ID ?? "",
  schemaName: process.env.NEXT_PUBLIC_COPILOT_SCHEMA_NAME ?? "",
  clientId: process.env.NEXT_PUBLIC_COPILOT_CLIENT_ID ?? "",
};
const settings = new ConnectionSettings({ environmentId: config.environmentId, schemaName: config.schemaName, enableDiagnostics: false });
const initialAuthState: CopilotAuthState = { status: "checking" };
let authState = initialAuthState;
const authListeners = new Set<() => void>();
let client: CopilotStudioClient | null = null;
let clientAccountId: string | null = null;
let clientExpiresAt: number | null = null;
let conversationId: string | undefined;
let clientEpoch = 0;
let authEpoch = 0;
let connectionPromise: Promise<CopilotStudioClient> | null = null;
let tokenPromise: Promise<AuthenticationResult> | null = null;
let msalPromise: Promise<PublicClientApplication> | null = null;
let interactiveSignInPromise: Promise<void> | null = null;
let logoutPromise: Promise<void> | null = null;

export const getCopilotAuthState = () => authState;
export const getServerCopilotAuthState = () => initialAuthState;
export function subscribeCopilotAuth(listener: () => void) { authListeners.add(listener); return () => { authListeners.delete(listener); }; }
function setAuthState(next: CopilotAuthState) {
  if (next.status === authState.status && next.message === authState.message) return;
  authState = next;
  authListeners.forEach(listener => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("copilot-auth-state-changed", { detail: next }));
    if (next.status === "signed-out" || next.status === "session-expired") window.dispatchEvent(new Event("copilot-auth-required"));
  }
}
export class CopilotAuthRequiredError extends Error {
  constructor() { super("Sign in to use Copilot features."); this.name = "CopilotAuthRequiredError"; }
}
class CopilotConfigurationError extends Error {}
export function resetCopilotClient() {
  clientEpoch++;
  client = null; clientAccountId = null; clientExpiresAt = null; conversationId = undefined; connectionPromise = null;
}
function validateConfiguration() {
  if (Object.values(config).some(value => !value.trim())) throw new CopilotConfigurationError("Copilot authentication is not configured.");
  if (typeof window !== "undefined" && window.location.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) throw new CopilotConfigurationError("Copilot authentication requires HTTPS.");
}
async function getMsal() {
  validateConfiguration();
  if (!msalPromise) {
    msalPromise = (async () => {
      const instance = new PublicClientApplication({
        auth: { clientId: config.clientId, authority: `https://login.microsoftonline.com/${config.tenantId}`, redirectUri: window.location.origin },
        // Retain the existing MSAL-managed refresh/tab persistence. No additional token storage.
        cache: { cacheLocation: "localStorage" },
      });
      await instance.initialize();
      instance.addEventCallback(event => {
        if (event.eventType === EventType.ACTIVE_ACCOUNT_CHANGED && !interactiveSignInPromise && !logoutPromise) {
          authEpoch++; resetCopilotClient(); setAuthState({ status: "checking" });
          const pending = tokenPromise;
          void (async () => { if (pending) { try { await pending; } catch { /* Discard old-account acquisition. */ } } await checkCopilotAuth(); })();
        }
      });
      return instance;
    })().catch(error => { msalPromise = null; throw error; });
  }
  return msalPromise;
}
function getCurrentAccount(msal: PublicClientApplication) {
  const accounts = msal.getAllAccounts();
  const active = msal.getActiveAccount();
  if (active && accounts.some(account => account.homeAccountId === active.homeAccountId)) return active;
  if (accounts.length === 1) return accounts[0];
  return null; // Multiple accounts require explicit user selection.
}
async function acquireCopilotToken(forceRefresh = false): Promise<AuthenticationResult> {
  if (logoutPromise) throw new CopilotAuthRequiredError();
  if (tokenPromise) {
    if (!forceRefresh) return tokenPromise;
    await tokenPromise;
  }
  const epoch = authEpoch;
  const promise = (async () => {
    try {
      const msal = await getMsal();
      const account = getCurrentAccount(msal);
      if (!account) {
        resetCopilotClient(); setAuthState({ status: "signed-out" }); throw new CopilotAuthRequiredError();
      }
      const result = await msal.acquireTokenSilent({ scopes: [ScopeHelper.getScopeFromSettings(settings)], account, forceRefresh });
      if (epoch !== authEpoch || logoutPromise) throw new CopilotAuthRequiredError();
      if (!result.accessToken) throw new Error("No Copilot access token is available.");
      setAuthState({ status: "signed-in" });
      return result;
    } catch (error) {
      if (epoch === authEpoch) {
        resetCopilotClient();
        if (error instanceof InteractionRequiredAuthError) {
          setAuthState({ status: "session-expired", message: "Your Energy Assistant session has expired. Sign in again to continue." });
          throw new CopilotAuthRequiredError();
        }
        if (!(error instanceof CopilotAuthRequiredError)) setAuthState({ status: "error", message: error instanceof CopilotConfigurationError ? error.message : "Authentication could not be verified. Check your connection and try again." });
      }
      throw error;
    }
  })();
  tokenPromise = promise;
  try { return await promise; } finally { if (tokenPromise === promise) tokenPromise = null; }
}
export async function checkCopilotAuth(): Promise<CopilotAuthState> {
  if (interactiveSignInPromise || logoutPromise) return authState;
  try { await acquireCopilotToken(); } catch { /* State is updated centrally; checks never launch popups. */ }
  return authState;
}
export function signInToCopilot(): Promise<void> {
  if (interactiveSignInPromise) return interactiveSignInPromise;
  if (logoutPromise) return Promise.reject(new Error("Sign-out is still in progress."));
  authEpoch++; resetCopilotClient(); setAuthState({ status: "signing-in" });
  interactiveSignInPromise = (async () => {
    try {
      const msal = await getMsal();
      const result = await msal.loginPopup({ scopes: [ScopeHelper.getScopeFromSettings(settings)], prompt: "select_account" });
      if (!result.account) throw new Error("Sign-in did not return an account.");
      msal.setActiveAccount(result.account);
      if (tokenPromise) { try { await tokenPromise; } catch { /* Discard pre-login check. */ } }
      await acquireCopilotToken();
      window.dispatchEvent(new Event("copilot-authenticated"));
    } catch (error) {
      const details = error && typeof error === "object" ? error as Record<string, unknown> : {};
      const code = typeof details.errorCode === "string" && /^[\w.-]{1,100}$/.test(details.errorCode) ? details.errorCode : undefined;
      resetCopilotClient();
      if (code === "user_cancelled") {
        setAuthState({ status: "signed-out", message: "Sign-in was canceled. Sign in when you are ready." });
      } else {
        console.error("[Copilot authentication] Sign-in failed", { code });
        setAuthState({ status: "error", message: code === "popup_window_error" ? "The sign-in window could not open. Allow popups for this site and try again." : code === "interaction_in_progress" ? "Another Microsoft sign-in is in progress. Complete or close that window, then try again." : "Microsoft sign-in could not be completed. Please try again." });
      }
      throw new Error("Microsoft sign-in could not be completed.");
    }
  })().finally(() => { interactiveSignInPromise = null; });
  return interactiveSignInPromise;
}
export function signOutOfCopilot(): Promise<void> {
  if (logoutPromise) return logoutPromise;
  if (interactiveSignInPromise) return Promise.reject(new Error("Sign-in is still in progress."));
  authEpoch++; resetCopilotClient(); setAuthState({ status: "checking" });
  logoutPromise = (async () => {
    try {
      const msal = await getMsal();
      const account = getCurrentAccount(msal);
      await msal.logoutPopup({ account: account ?? undefined, postLogoutRedirectUri: window.location.origin });
      msal.setActiveAccount(null);
      setAuthState({ status: "signed-out" });
    } catch {
      setAuthState({ status: "error", message: "Sign-out could not be completed. Please try again." });
      throw new Error("Sign-out could not be completed.");
    }
  })().finally(() => { logoutPromise = null; });
  return logoutPromise;
}
async function connect(forceRefresh = false): Promise<CopilotStudioClient> {
  if (connectionPromise) return connectionPromise;
  const epoch = clientEpoch;
  const promise = (async () => {
    const auth = await acquireCopilotToken(forceRefresh);
    const accountId = auth.account?.homeAccountId ?? null;
    const expiresAt = auth.expiresOn?.getTime() ?? null;
    if (client && clientAccountId === accountId && clientExpiresAt === expiresAt && auth.fromCache && !forceRefresh) return client;
    const previousConversation = clientAccountId === accountId ? conversationId : undefined;
    const connected = new CopilotStudioClient(settings, auth.accessToken);
    if (!previousConversation) {
      const activities = await connected.startConversationAsync(true);
      conversationId = activities.find(activity => activity.conversation?.id)?.conversation?.id;
    } else conversationId = previousConversation;
    if (epoch !== clientEpoch) throw new CopilotAuthRequiredError();
    client = connected; clientAccountId = accountId; clientExpiresAt = expiresAt;
    return connected;
  })();
  connectionPromise = promise;
  try { return await promise; } finally { if (connectionPromise === promise) connectionPromise = null; }
}
function copilotHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const details = error as Record<string, unknown>;
  if (typeof details.status === "number") return details.status;
  // This SDK wraps the HTTP status in a generated Error message.
  const match = error instanceof Error ? error.message.match(/\b(401|403)\b/) : null;
  return match ? Number(match[1]) : undefined;
}
async function withCopilotClient<T>(operation: (connected: CopilotStudioClient, id?: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const connected = await connect(attempt === 1);
      const epoch = clientEpoch;
      const result = await operation(connected, conversationId);
      if (epoch !== clientEpoch) throw new CopilotAuthRequiredError();
      if (Array.isArray(result)) conversationId = (result as Activity[]).find(activity => activity.conversation?.id)?.conversation?.id ?? conversationId;
      return result;
    } catch (error) {
      const status = copilotHttpStatus(error);
      if (status !== 401 && status !== 403) throw error;
      resetCopilotClient();
      if (status === 403) { setAuthState({ status: "error", message: "Your account does not have access to this Copilot feature." }); throw new Error("Copilot access was denied."); }
      if (attempt === 1) { setAuthState({ status: "session-expired", message: "Sign in again to continue using Energy Assistant." }); throw new CopilotAuthRequiredError(); }
    }
  }
  throw new CopilotAuthRequiredError();
}
function readActivities(activities: Awaited<ReturnType<CopilotStudioClient["askQuestionAsync"]>>): ChatResponse {
  const messages = activities.filter((activity) => activity.type === "message" && activity.text?.trim()).map((activity) => activity.text!.trim());
  const consent = activities.flatMap((activity) => activity.attachments?.map((attachment) => ({ activityId: activity.id, card: attachment.contentType === "application/vnd.microsoft.card.adaptive" ? readConsentCard(attachment.content) : undefined })) ?? []).find((item) => item.card);
  if (consent?.card) return { text: messages.join("\n\n") || consent.card.text, consentActions: consent.card.actions, consentActivityId: consent.activityId };
  const dashboardPayload = parseCopilotDashboardPayload(messages);
  const recommendationsPayload = parseCopilotRecommendations(messages);
  // Keep the agent's wording and all message activities, including clarifying questions.
  const text = messages.join("\n\n");
  if (!text && !dashboardPayload && !recommendationsPayload) throw new Error("Copilot returned no displayable text response.");
  return { text, dashboardPayload, recommendationsPayload };
}

export async function requestCopilotRecommendations(context: ChatContext = {}) {
  return readActivities(await withCopilotClient((connected, id) => connected.sendActivity(Activity.fromObject({
    type: "event",
    name: "get_recommendation",
    value: { page: "insights", ...context },
  }), id)));
}

export async function sendChatMessage(message: string, context: ChatContext = {}) {
  // Conversational topic selection belongs to the agent's orchestration.
  const contextLine = Object.keys(context).length
    ? `\n\nApplication context for resolving references only:\n${JSON.stringify(context)}\n\nUse this context when relevant. Do not treat it as a separate user request.`
    : "";
  return readActivities(await withCopilotClient((connected, id) => connected.askQuestionAsync(`${message}${contextLine}`, id)));
}

export type CreateEnergyWasteReportRequest = {
  issueType: "Lights" | "Air Conditioning" | "Equipment";
  floorId: string;
  floorName: string;
  roomType: string;
  description: string;
  reportedBy?: string;
};

export type CreateEnergyWasteReportResponse = {
  success: boolean;
  reportId: string | null;
  status: "Active" | "Under Review" | "Resolved" | null;
  message: string;
};

function parseJsonMessage(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate) return null;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createEnergyWasteReport(payload: CreateEnergyWasteReportRequest): Promise<CreateEnergyWasteReportResponse> {
  const msal = await getMsal();
  const reportedBy = payload.reportedBy ?? getCurrentAccount(msal)?.username ?? "Unknown";
  const activities = await withCopilotClient((connected, id) => connected.sendActivity(Activity.fromObject({
    type: "event",
    name: "ui.create_energy_waste_report",
    value: { ...payload, reportedBy },
  }), id));
  const messages = activities.filter((activity) => activity.type === "message" && activity.text?.trim()).map((activity) => activity.text!.trim());
  const parsed = messages.map(parseJsonMessage).find((value) => value !== null);
  if (!parsed) throw new Error(messages.at(-1) ?? "The agent did not return a report-creation response.");
  const status = parsed.status === "Active" || parsed.status === "Under Review" || parsed.status === "Resolved" ? parsed.status : null;
  return {
    success: parsed.success === true,
    reportId: typeof parsed.reportId === "string" ? parsed.reportId : null,
    status,
    message: typeof parsed.message === "string" ? parsed.message : "The agent returned an incomplete response.",
  };
}

export async function submitChatConsent(action: ConsentAction, activityId?: string) {
  return readActivities(await withCopilotClient((connected, id) => connected.sendActivity(Activity.fromObject({ type: "message", replyToId: activityId, channelData: { postBack: true }, value: action.data }), id)));
}
