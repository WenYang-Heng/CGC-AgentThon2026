"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { PublicClientApplication } from "@azure/msal-browser";
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
    .filter((activity) => typeof activity.text === "string" && activity.text.trim())
    .map((activity, index): Message => ({
      id: startingId + index,
      role: "agent",
      text: activity.text!.trim(),
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
    if (!question || !client) return;

    const userMessage: Message = { id: nextIdRef.current++, role: "user", text: question };
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setError("");

    try {
      const replies = await client.askQuestionAsync(question);
      const agentMessages = activityMessages(replies, nextIdRef.current);
      nextIdRef.current += agentMessages.length;
      setMessages((current) => [
        ...current,
        ...(agentMessages.length ? agentMessages : [{ id: nextIdRef.current++, role: "system", text: "The agent returned no text response." } as Message]),
      ]);
    } catch (sendError) {
      setError(readableError(sendError));
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.testBadge}>Temporary local test</span>
          <h1>Copilot Studio connection test</h1>
          <p>Sign in with an authorized tenant account, start a conversation, and send messages directly to the published agent.</p>
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
            </article>
          ))}
        </div>
        <form className={styles.composer} onSubmit={sendMessage}>
          <label htmlFor="copilot-test-message">Test message</label>
          <div>
            <textarea id="copilot-test-message" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} disabled={status !== "connected"} placeholder={status === "connected" ? "Ask the energy analytics assistant a question…" : "Connect to the agent first"} />
            <button type="submit" disabled={status !== "connected" || !message.trim()}>Send message</button>
          </div>
        </form>
      </section>
    </main>
  );
}
