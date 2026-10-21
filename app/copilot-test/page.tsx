"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { PublicClientApplication } from "@azure/msal-browser";
import { Activity } from "@microsoft/agents-activity";
import { readConsentCard, type ConsentCard, type ConsentAction } from "@/lib/copilot-consent";
import {
  ConnectionSettings,
  CopilotStudioClient,
  ScopeHelper,
} from "@microsoft/agents-copilotstudio-client";
import styles from "./copilot-test.module.css";

type Message = {
  id: number;
  role: "agent" | "user" | "system";
  text: string;
  consent?: ConsentCard;
  activityId?: string;
  submitted?: boolean;
};

const config = {
  environmentId: process.env.NEXT_PUBLIC_COPILOT_ENVIRONMENT_ID ?? "",
  tenantId: process.env.NEXT_PUBLIC_COPILOT_TENANT_ID ?? "",
  schemaName: process.env.NEXT_PUBLIC_COPILOT_SCHEMA_NAME ?? "",
  clientId: process.env.NEXT_PUBLIC_COPILOT_CLIENT_ID ?? "",
};

const connectionSettings = new ConnectionSettings({
  environmentId: config.environmentId,
  schemaName: config.schemaName,
  enableDiagnostics: true,
});

function activityMessages(
  activities: Awaited<ReturnType<CopilotStudioClient["askQuestionAsync"]>>,
  startingId: number,
) {
  return activities
    .filter((activity) => activity.type === "message")
    .map((activity) => {
      const consent = activity.attachments
        ?.filter((attachment) => attachment.contentType === "application/vnd.microsoft.card.adaptive")
        .map((attachment) => readConsentCard(attachment.content))
        .find((card) => card !== undefined);
      return { activity, consent };
    })
    .filter(({ activity, consent }) => activity.text?.trim() || consent || activity.attachments?.length)
    .map(({ activity, consent }, index): Message => ({
      id: startingId + index,
      role: "agent",
      text: consent?.text || activity.text?.trim() || "The agent returned an attachment. See the returned activities log for its contents.",
      consent,
      activityId: activity.id,
    }));
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export default function CopilotTestPage() {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [accountName, setAccountName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const requestPendingRef = useRef(false);
  const clientRef = useRef<CopilotStudioClient | null>(null);
  const nextIdRef = useRef(1);

  const connect = async () => {
    setStatus("connecting");
    setError("");

    try {
      if (Object.values(config).some((value) => !value)) {
        throw new Error("One or more Copilot test environment variables are missing.");
      }

      const msal = new PublicClientApplication({
        auth: {
          clientId: config.clientId,
          authority: `https://login.microsoftonline.com/${config.tenantId}`,
          redirectUri: window.location.origin,
        },
        cache: { cacheLocation: "sessionStorage" },
      });

      await msal.initialize();
      const auth = await msal.acquireTokenPopup({
        scopes: [ScopeHelper.getScopeFromSettings(connectionSettings)],
        prompt: "select_account",
      });

      const client = new CopilotStudioClient(connectionSettings, auth.accessToken);
      const openingActivities = await client.startConversationAsync(true);
      if (process.env.NODE_ENV === "development") {
        console.log("[Copilot] Conversation opening activities:", JSON.stringify(openingActivities, null, 2));
      }
      const openingMessages = activityMessages(openingActivities, nextIdRef.current);
      nextIdRef.current += openingMessages.length;
      clientRef.current = client;
      setAccountName(auth.account?.name || auth.account?.username || "Signed-in user");
      setMessages(openingMessages);
      setStatus("connected");
    } catch (connectError) {
      setError(readableError(connectError));
      setStatus("error");
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const question = message.trim();
    const client = clientRef.current;
    if (!question || !client || requestPendingRef.current) return;
    requestPendingRef.current = true;
    setSending(true);

    const userMessage: Message = { id: nextIdRef.current++, role: "user", text: question };
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setError("");

    try {
      const replies = await client.askQuestionAsync(question);
      if (process.env.NODE_ENV === "development") {
        console.log("[Copilot] Returned activities:", JSON.stringify(replies, null, 2));
      }
      const agentMessages = activityMessages(replies, nextIdRef.current);
      nextIdRef.current += agentMessages.length;
      setMessages((current) => [
        ...current,
        ...(agentMessages.length ? agentMessages : [{ id: nextIdRef.current++, role: "system", text: "The agent returned no text response." } as Message]),
      ]);
    } catch (sendError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Copilot] Message request failed:", readableError(sendError));
      }
      setError(readableError(sendError));
    } finally {
      requestPendingRef.current = false;
      setSending(false);
    }
  };

  const submitConsent = async (item: Message, action: ConsentAction) => {
    const client = clientRef.current;
    if (!client || item.submitted || requestPendingRef.current) return;
    requestPendingRef.current = true;
    setSending(true);
    setError("");
    try {
      const replies = await client.sendActivity(Activity.fromObject({
        type: "message",
        replyToId: item.activityId,
        channelData: { postBack: true },
        value: action.data,
      }));
      if (process.env.NODE_ENV === "development") {
        console.log("[Copilot] Returned activities:", JSON.stringify(replies, null, 2));
      }
      const agentMessages = activityMessages(replies, nextIdRef.current);
      nextIdRef.current += agentMessages.length;
      setMessages((current) => [
        ...current.map((entry) => entry.id === item.id ? { ...entry, submitted: true } : entry),
        { id: nextIdRef.current++, role: "user", text: action.title },
        ...agentMessages,
      ]);
    } catch (submitError) {
      setError(readableError(submitError));
    } finally {
      requestPendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.testBadge}>Temporary local test</span>
          <h1>Copilot Studio connection test</h1>
        </div>
        <Link href="/">Return to dashboard</Link>
      </header>

      <section className={styles.connection} aria-labelledby="connection-heading">
        <div>
          <h2 id="connection-heading">Connection</h2>
          <dl>
            <div><dt>Environment</dt><dd>{config.environmentId}</dd></div>
            <div><dt>Schema</dt><dd>{config.schemaName}</dd></div>
            <div><dt>Tenant</dt><dd>{config.tenantId}</dd></div>
          </dl>
        </div>
        <div className={styles.connectionAction}>
          <span className={`${styles.status} ${styles[status]}`}><i />{status === "connecting" ? "Connecting…" : status}</span>
          {accountName && <small>{accountName}</small>}
          <button type="button" onClick={connect} disabled={status === "connecting" || status === "connected"}>
            {status === "connecting" ? "Waiting for sign-in" : status === "connected" ? "Connected" : "Connect and sign in"}
          </button>
        </div>
      </section>

      {error && <div className={styles.error} role="alert"><strong>Connection error</strong><span>{error}</span></div>}

      <section className={styles.chat} aria-labelledby="conversation-heading">
        <div className={styles.chatHeader}>
          <h2 id="conversation-heading">Conversation</h2>
          <span>{messages.length} messages</span>
        </div>
        <div className={styles.transcript} aria-live="polite">
          {messages.length === 0 ? (
            <div className={styles.empty}><strong>No conversation yet</strong><span>Connect to receive the agent greeting and enable the message field.</span></div>
          ) : messages.map((item) => (
            <article key={item.id} className={styles[item.role]}>
              <span>{item.role === "user" ? "You" : item.role === "agent" ? "Agent" : "System"}</span>
              <p>{item.text}</p>
              {item.consent && (
                <div className={styles.consentActions}>
                  {item.consent.actions.map((action) => (
                    <button key={String(action.data.action)} type="button"
                      disabled={sending || item.submitted || status !== "connected"}
                      onClick={() => void submitConsent(item, action)}>
                      {action.title}
                    </button>
                  ))}
                  {item.submitted && <small>Choice sent</small>}
                </div>
              )}
            </article>
          ))}
        </div>
        <form className={styles.composer} onSubmit={sendMessage}>
          <label htmlFor="copilot-test-message">Test message</label>
          <div>
            <textarea id="copilot-test-message" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} disabled={status !== "connected"} placeholder={status === "connected" ? "Ask the energy analytics assistant a question…" : "Connect to the agent first"} />
            <button type="submit" disabled={status !== "connected" || !message.trim() || sending}>{sending ? "Waiting for agent…" : "Send message"}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
