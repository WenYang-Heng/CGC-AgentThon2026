import { ConfidentialClientApplication } from "@azure/msal-node";
import {
  ConnectionSettings,
  CopilotStudioClient,
  ScopeHelper,
} from "@microsoft/agents-copilotstudio-client";

const required = {
  environmentId: process.env.NEXT_PUBLIC_COPILOT_ENVIRONMENT_ID,
  tenantId: process.env.NEXT_PUBLIC_COPILOT_TENANT_ID,
  schemaName: process.env.NEXT_PUBLIC_COPILOT_SCHEMA_NAME,
  clientId: process.env.NEXT_PUBLIC_COPILOT_CLIENT_ID,
  clientSecret: process.env.COPILOT_CLIENT_SECRET,
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  throw new Error(`Missing configuration: ${missing.join(", ")}`);
}

const settings = new ConnectionSettings({
  environmentId: required.environmentId,
  schemaName: required.schemaName,
  enableDiagnostics: false,
});

console.log("Acquiring app-only Power Platform token...");

const msal = new ConfidentialClientApplication({
  auth: {
    clientId: required.clientId,
    authority: `https://login.microsoftonline.com/${required.tenantId}`,
    clientSecret: required.clientSecret,
  },
});

const tokenResult = await msal.acquireTokenByClientCredential({
  scopes: [ScopeHelper.getScopeFromSettings(settings)],
});

if (!tokenResult?.accessToken) {
  throw new Error("Microsoft Entra returned no access token.");
}

const tokenPayload = JSON.parse(
  Buffer.from(tokenResult.accessToken.split(".")[1], "base64url").toString("utf8"),
);
console.log(`Token tenant matches: ${tokenPayload.tid === required.tenantId}`);
console.log(`Token application matches: ${tokenPayload.appid === required.clientId || tokenPayload.azp === required.clientId}`);
console.log(`Token roles: ${(tokenPayload.roles ?? []).join(", ") || "none"}`);

console.log("Token acquired. Starting Copilot Studio conversation...");

const client = new CopilotStudioClient(settings, tokenResult.accessToken);
const opening = await client.startConversationAsync(true);
const openingText = opening
  .map((activity) => activity.text)
  .filter((text) => typeof text === "string" && text.trim());

console.log(`Conversation started (${opening.length} activities).`);
for (const text of openingText) console.log(`Agent: ${text}`);

console.log("Sending test message...");
const replies = await client.askQuestionAsync(
  "Reply with a short confirmation that the Energy Analytics Assistant connection is working.",
);
const replyText = replies
  .map((activity) => activity.text)
  .filter((text) => typeof text === "string" && text.trim());

console.log(`Test turn completed (${replies.length} activities).`);
for (const text of replyText) console.log(`Agent: ${text}`);

if (!replyText.length) {
  console.log("The agent returned activities but no text response.");
}
