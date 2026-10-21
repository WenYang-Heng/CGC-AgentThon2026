"use client";

import { FormEvent, Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import tnbLogo from "@/public/tnb-logo.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { checkCopilotAuth, CopilotAuthRequiredError, requestCopilotRecommendations, sendChatMessage, signInToCopilot, submitChatChoice, submitChatConsent } from "@/services/chatbot-service";
import { useCopilotAuth } from "@/lib/use-copilot-auth";
import type { ChatChoice, ChatContext, ChatMessage } from "@/types/chatbot";
import styles from "./Chatbot.module.css";
import { CHAT_FILE_ACCEPT, validateChatFiles } from "@/lib/chat-attachments";

function getSuggestedQuestions(context: ChatContext): string[] {
  const floor = context.floorId ?? context.floorName ?? context.selectedFloor;
  const scope = floor && floor !== "All Floors" ? floor : "the building";
  const period = context.analysisPeriod ?? (context.month ? `${context.month} ${context.year ?? 2026}` : "the selected period");
  if (context.page === "report-energy-waste") return ["What information should I include in an energy waste report?", "How can I identify unnecessary lighting?", "How can I report air-conditioning waste?"];
  if (context.page === "insights" || context.forecastRelevant) return [
    `Explain the 2027 forecast for ${scope}.`,
    `How does ${scope} compare with the 2025 baseline for ${period}?`,
    context.hasAnomalies ? "What abnormal periods affected the forecast?" : "How is normal forecast growth calculated?",
    "Summarize the key energy insights.",
  ];
  return [
    `How did ${scope} energy usage change in ${period}?`,
    floor && floor !== "All Floors" ? `What actions could reduce ${scope} consumption?` : `Which floor consumed the most electricity in ${period}?`,
    context.hasAnomalies ? `Explain the recorded anomalies for ${scope}.` : `Are there unusual consumption patterns for ${scope}?`,
    `Compare ${scope} with the 2025 baseline for ${period}.`,
  ];
}


type ChatbotSendRequest = {
  message: string;
  background?: boolean;
  context?: ChatContext;
};

function Spark({ size = 20 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></svg>; }

function AssistantMessage({ text }: { text: string }) {
  return <div className={styles.markdown}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
      a: ({ href, children }) => href && /^(https?:\/\/|mailto:|#)/i.test(href)
        ? <a href={href} target={href.startsWith("#") ? undefined : "_blank"} rel="noopener noreferrer">{children}</a>
        : <span>{children}</span>,
      table: ({ children }) => <div className={styles.markdownTable}><table>{children}</table></div>,
    }}>{text}</ReactMarkdown>
  </div>;
}

function AttachmentCard({ attachment, onRemove, disabled = false }: {
  attachment: NonNullable<ChatMessage["attachments"]>[number]; onRemove?: () => void; disabled?: boolean;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!attachment.file || !linkRef.current) return;
    const url = URL.createObjectURL(attachment.file);
    linkRef.current.href = url;
    return () => URL.revokeObjectURL(url);
  }, [attachment.file]);
  return <div className={styles.fileCard}>
    <a ref={linkRef} download={attachment.name} aria-label={`Download ${attachment.name}`} className={styles.fileDownload}>
      <span><strong>{attachment.name}</strong><small>{Math.max(1, Math.round(attachment.size / 1024)).toLocaleString()} KB</small></span>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v13m-5-5 5 5 5-5M5 21h14" /></svg>
    </a>
    {onRemove && <button type="button" disabled={disabled} onClick={onRemove} aria-label={`Remove ${attachment.name}`}>×</button>}
  </div>;
}

export default function Chatbot({ context = {} }: { context?: ChatContext }) {
  const pathname = usePathname();
  const auth = useCopilotAuth();
  const authenticated = auth.status === "signed-in";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleLoading, setVisibleLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pageContext, setPageContext] = useState<ChatContext>({});
  const [failedRequest, setFailedRequest] = useState<{ text: string; context: ChatContext; choice?: ChatChoice; files?: File[] } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const readyRef = useRef(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pendingRef = useRef(false);
  const resumeAfterRequestRef = useRef(false);
  const pendingMessageRef = useRef<{ text: string; background: boolean; context: ChatContext; displayed?: boolean; choice?: ChatChoice; files?: File[] } | null>(null);
  const page = pathname === "/" ? "dashboard" : pathname === "/insights" ? "insights" : pathname === "/report-energy-waste" ? "report-energy-waste" : pathname;
  const activeContext: ChatContext = { ...context, ...(pageContext.page === page ? pageContext : {}), page };
  const suggestions = getSuggestedQuestions(activeContext);
  const close = () => { setOpen(false); toggleRef.current?.focus(); };
  useLayoutEffect(() => {
    if (open) followLatestRef.current = true;
  }, [open]);
  useLayoutEffect(() => {
    const container = messagesRef.current;
    if (!open || !container) return;
    const followLatest = () => { if (followLatestRef.current) container.scrollTop = container.scrollHeight; };
    followLatest();
    // Keep the latest message visible when Markdown, fonts or the composer resize.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(followLatest);
    observer.observe(container);
    Array.from(container.children).forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, [messages, visibleLoading, open, files, fileError, authenticated]);
  useEffect(() => {
    const updateContext = (event: Event) => { const detail = (event as CustomEvent<{ context?: ChatContext }>).detail; if (detail?.context) setPageContext(detail.context); };
    const openChat = (event: Event) => { updateContext(event); setOpen(true); };
    window.addEventListener("energy-chatbot-open", openChat);
    window.addEventListener("energy-chatbot-context", updateContext);
    window.dispatchEvent(new Event("energy-chatbot-context-request"));
    return () => { window.removeEventListener("energy-chatbot-open", openChat); window.removeEventListener("energy-chatbot-context", updateContext); };
  }, []);
  useEffect(() => { if (open) window.requestAnimationFrame(() => inputRef.current?.focus()); }, [open]);

  const addResponse = (response: Awaited<ReturnType<typeof sendChatMessage>>, background = false) => {
    if (response.dashboardPayload) window.dispatchEvent(new CustomEvent("copilot-dashboard-data", { detail: response.dashboardPayload }));
    if (response.recommendationsPayload) window.dispatchEvent(new CustomEvent("copilot-recommendations-data", { detail: response.recommendationsPayload }));
    if (response.consentActions) {
      window.dispatchEvent(new Event("copilot-dashboard-authorization"));
      setOpen(true);
    }
    if (!background || response.consentActions) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "assistant", text: response.text, consentActions: response.consentActions, consentActivityId: response.consentActivityId, choices: response.choices }]);
    }
  };
  const send = async (text: string, { background = false, context: requestContext = activeContext, displayed = false, choice, files: requestFiles = [] }: { background?: boolean; context?: ChatContext; displayed?: boolean; choice?: ChatChoice; files?: File[] } = {}) => {
    const trimmed = text.trim() || (requestFiles.length ? "Please review the attached files." : ""); if (!trimmed || pendingRef.current) return;
    // Only the existing background workflow maps to a deterministic application event.
    const recommendationRequest = background && trimmed.toLowerCase() === "get_recommendation";
    pendingRef.current = true;
    setLoading(true);
    try {
      if (!background) {
        followLatestRef.current = true;
        if (requestFiles.length) { setFiles([]); setUploadingCount(requestFiles.length); }
        setInput(""); setFailedRequest(null); setVisibleLoading(true); setConnecting(!readyRef.current && !requestFiles.length);
        if (!displayed) setMessages(current => [...current, { id: crypto.randomUUID(), sender: "user", text: trimmed, attachments: requestFiles.map(file => ({ name: file.name, size: file.size, file })) }]);
        displayed = true;
      }
      const checked = await checkCopilotAuth();
      if (checked.status !== "signed-in") {
        pendingMessageRef.current = { text: trimmed, background, context: requestContext, displayed, choice, files: requestFiles };
        if (!background) setOpen(true);
        return;
      }
      const response = choice ? await submitChatChoice(choice) : recommendationRequest
        ? await requestCopilotRecommendations(requestContext)
        : await sendChatMessage(trimmed, requestContext, requestFiles);
      if (!background) setMessages(current => current.map(message => message.choices ? { ...message, choices: undefined } : message));
      if (requestFiles.length) { setFiles([]); setFileError(null); }
      readyRef.current = true;
      addResponse(response, background);
      if (background && /load dashboard data/i.test(trimmed) && !response.dashboardPayload && !response.consentActions) {
        window.dispatchEvent(new CustomEvent("copilot-dashboard-error", { detail: "The agent did not return dashboard JSON." }));
      }
      if (recommendationRequest && !response.recommendationsPayload && !response.consentActions) {
        window.dispatchEvent(new CustomEvent("copilot-recommendations-error", { detail: "The agent did not return recommendations JSON." }));
      }
    }
    catch (error) {
      if (error instanceof CopilotAuthRequiredError) {
        pendingMessageRef.current = { text: trimmed, background, context: requestContext, displayed: displayed || !background, choice, files: requestFiles };
        if (!background) setOpen(true);
        return;
      }
      // Log identifiers only: exception messages may contain URLs or credentials.
      const details = error && typeof error === "object" ? error as Record<string, unknown> : {};
      const identifier = (value: unknown) => typeof value === "string" && /^[\w.-]{1,100}$/.test(value) ? value : undefined;
      console.error("[Energy Assistant] Request failed", {
        name: identifier(details.name),
        code: identifier(details.errorCode ?? details.code),
        status: typeof details.status === "number" ? details.status : undefined,
      });
      const message = "Copilot request could not be completed. Please try again.";
      if (!background) {
        setOpen(true);
        setFailedRequest({ text: trimmed, context: requestContext, choice, files: requestFiles });
        setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "system", text: "I couldn't get a response. Please try again." }]);
      }
      window.dispatchEvent(new CustomEvent("copilot-dashboard-error", { detail: message }));
      if (recommendationRequest) {
        window.dispatchEvent(new CustomEvent("copilot-recommendations-error", { detail: message }));
      }
    }
    finally {
      pendingRef.current = false; setLoading(false); setVisibleLoading(false); setConnecting(false); setUploadingCount(0);
      if (resumeAfterRequestRef.current) {
        resumeAfterRequestRef.current = false;
        queueMicrotask(() => {
          const pending = pendingMessageRef.current;
          if (pending && !pendingRef.current) {
            pendingMessageRef.current = null;
            void send(pending.text, { background: pending.background, context: pending.context, displayed: pending.displayed, choice: pending.choice, files: pending.files });
          }
        });
      }
    }
  };
  useEffect(() => {
    const resumePendingMessage = () => {
      const pending = pendingMessageRef.current;
      if (pendingRef.current) { resumeAfterRequestRef.current = true; return; }
      pendingMessageRef.current = null;
      if (pending) void send(pending.text, { background: pending.background, context: pending.context, displayed: pending.displayed, choice: pending.choice, files: pending.files });
    };
    window.addEventListener("copilot-authenticated", resumePendingMessage);
    return () => window.removeEventListener("copilot-authenticated", resumePendingMessage);
  });
  useEffect(() => {
    const stateChanged = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status;
      if (status === "signed-out") {
        pendingMessageRef.current = null; readyRef.current = false;
        setMessages([]); setInput(""); setFailedRequest(null); setFiles([]); setFileError(null);
      }
    };
    window.addEventListener("copilot-auth-state-changed", stateChanged);
    return () => window.removeEventListener("copilot-auth-state-changed", stateChanged);
  }, []);
  const submitConsent = async (message: ChatMessage, action: NonNullable<ChatMessage["consentActions"]>[number]) => {
    if (pendingRef.current) return; pendingRef.current = true; setLoading(true); setVisibleLoading(true);
    try { addResponse(await submitChatConsent(action, message.consentActivityId)); setMessages((current) => current.map((item) => item.id === message.id ? { ...item, consentActions: undefined } : item)); }
    catch { setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "system", text: "I couldn't complete that permission request. Please try again." }]); }
    finally { pendingRef.current = false; setLoading(false); setVisibleLoading(false); }
  };
  useEffect(() => {
    const sendRequestedMessage = (event: Event) => {
      const detail = (event as CustomEvent<string | ChatbotSendRequest>).detail;
      const message = typeof detail === "string" ? detail : detail?.message;
      if (!message) return;
      const background = typeof detail === "object" && detail.background === true;
      const requestContext = typeof detail === "object" && detail.context ? { ...activeContext, ...detail.context } : activeContext;
      if (!background) setOpen(true);
      void send(message, { background, context: requestContext });
    };
    window.addEventListener("energy-chatbot-send", sendRequestedMessage);
    return () => window.removeEventListener("energy-chatbot-send", sendRequestedMessage);
  });
  const submit = (event: FormEvent) => { event.preventDefault(); void send(input, { files }); };

  const hasUserMessages = messages.some(message => message.sender === "user");
  return <>
    <section id="energy-assistant-drawer" className={`${styles.panel} ${open ? styles.open : ""}`} role="dialog" aria-labelledby="energy-assistant-title" aria-hidden={!open} inert={!open} onKeyDown={event => { if (event.key === "Escape") close(); }}>
      <header><span><Spark /></span><div><strong id="energy-assistant-title">Energy Assistant</strong><small>Ask about your building energy data</small></div><button onClick={close} aria-label="Close Energy Assistant">×</button></header>
      <div ref={messagesRef} className={styles.messages} onScroll={event => { const container = event.currentTarget; followLatestRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 64; }} role="log" aria-live="polite" aria-relevant="additions text">
        {authenticated && !hasUserMessages ? <div className={styles.welcome}><span className={styles.welcomeIcon}><Spark size={28} /></span><h2>Energy Assistant</h2><p>I can help you understand electricity consumption, compare performance with the 2025 baseline, investigate anomalies, and explain forecasts.</p><div className={styles.suggestions}>{suggestions.map(question => <button key={question} disabled={loading || !authenticated} onClick={() => void send(question)}>{question}</button>)}</div></div> : null}
        {messages.map((message, index) => <Fragment key={`${message.id}-${index}`}><article className={styles[message.sender]}>{message.sender === "assistant" && <span className={styles.agentAvatar} aria-hidden="true"><Spark size={22} /></span>}{message.sender === "assistant" ? <AssistantMessage text={message.text} /> : <p>{message.text}</p>}{message.choices?.length ? <div className={styles.choices} role="group" aria-label="Answer choices">{message.choices.map((choice, choiceIndex) => <button key={`${message.id}-choice-${choiceIndex}`} type="button" disabled={loading || !authenticated} onClick={() => void send(choice.title, { choice })}>{choice.title}</button>)}</div> : null}{message.consentActions ? <div className={styles.consent}>{message.consentActions.map(action => <button key={String(action.data.action)} disabled={loading || !authenticated} onClick={() => void submitConsent(message, action)}>{action.title}</button>)}</div> : null}</article>{message.attachments?.length ? <ul className={styles.fileCards} aria-label="Message attachments">{message.attachments.map((attachment, fileIndex) => <li key={`${attachment.name}-${fileIndex}`}><AttachmentCard attachment={attachment} /></li>)}</ul> : null}</Fragment>)}
        {visibleLoading ? connecting ? <p className={styles.connection} role="status">Connecting to Energy Assistant…</p> : <article className={styles.assistant} role="status" aria-label="Assistant is typing"><span className={styles.agentAvatar} aria-hidden="true"><Spark size={22} /></span><div className={styles.typing} aria-hidden="true"><i /><i /><i /></div></article> : null}
        {failedRequest && !loading ? <button className={styles.retry} onClick={() => void send(failedRequest.text, { context: failedRequest.context, choice: failedRequest.choice, files: failedRequest.files, displayed: true })}>Retry</button> : null}
      </div>
      {!authenticated ? <div className={styles.authState} role="status"><p>{auth.status === "checking" ? "Checking your Microsoft session…" : auth.status === "signing-in" ? "Signing in…" : auth.message ?? "Sign in to use the Energy Assistant with your authorized Microsoft account."}</p>{auth.status !== "checking" && auth.status !== "signing-in" ? <button type="button" onClick={() => { void signInToCopilot().catch(() => {}); }}>Sign in with Microsoft</button> : null}</div> : null}
      {authenticated ? <>
      <form className={styles.composer} autoComplete="off" onSubmit={submit}><input ref={fileInputRef} type="file" multiple accept={CHAT_FILE_ACCEPT} className={styles.srOnly} tabIndex={-1} aria-label="Select attachments" disabled={loading} onChange={event => {
        const picked = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = "";
        const combined = [...files, ...picked.filter(file => !files.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified))];
        try { validateChatFiles(combined); setFiles(combined); setFileError(null); } catch (error) { setFileError(error instanceof Error ? error.message : "Unable to attach these files."); }
      }} />
      {files.length > 0 && <ul className={styles.pendingFileCards} aria-label="Selected attachments">{files.map((file, index) => <li key={`${file.name}-${index}`}><AttachmentCard attachment={{ name: file.name, size: file.size, file }} disabled={loading} onRemove={() => { setFiles(current => current.filter((_, i) => i !== index)); setFileError(null); setFailedRequest(null); }} /></li>)}</ul>}
      {fileError && <p className={styles.fileError} role="alert">{fileError}</p>}
      {loading && uploadingCount > 0 && <p className={styles.fileStatus} role="status">Sending {uploadingCount} {uploadingCount === 1 ? "file" : "files"} to Copilot...</p>}
      <button type="button" className={styles.attachButton} disabled={loading} onClick={() => fileInputRef.current?.click()} aria-label="Attach files" title="Attach up to 5 files (15 MB each; 20 MB total)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9a7 7 0 0 1 10 10l-9 9" /></svg></button><label className={styles.srOnly} htmlFor="energy-assistant-input">Ask Energy Assistant</label><textarea ref={inputRef} autoComplete="off" id="energy-assistant-input" rows={1} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!loading && authenticated) void send(input, { files }); } }} placeholder="Ask about your building energy data…" /><button type="submit" disabled={(!input.trim() && !files.length) || loading || !authenticated} aria-label="Send message"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg></button></form></> : null}
    </section>
    <a className={`${styles.tnbLink} ${open ? styles.toggleHidden : ""}`} href="https://myaccount.mytnb.com.my/" target="_blank" rel="noopener noreferrer" tabIndex={open ? -1 : 0} aria-hidden={open} aria-label="Open myTNB portal in a new tab" title="Open myTNB portal (new tab)">
      <Image src={tnbLogo} alt="TNB" width={96} height={32} sizes="96px" />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 3h7v7M21 3 10 14M10 5H4v15h15v-6" /></svg>
    </a>
    <button ref={toggleRef} className={`${styles.toggle} ${open ? styles.toggleHidden : ""}`} tabIndex={open ? -1 : 0} aria-hidden={open} onClick={() => setOpen(true)} aria-label="Open Energy Assistant" aria-expanded={open} aria-controls="energy-assistant-drawer"><Spark size={21} /><span>Energy Assistant</span></button>
  </>;
}
