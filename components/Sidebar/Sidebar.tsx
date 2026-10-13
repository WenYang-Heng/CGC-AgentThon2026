"use client";

import { ReactNode } from "react";
import { signInToCopilot, signOutOfCopilot } from "@/services/chatbot-service";
import { useCopilotAuth } from "@/lib/use-copilot-auth";
import styles from "./Sidebar.module.css";

type SidebarItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

type SidebarProps = {
  items: SidebarItem[];
  activeHref?: string;

  userInitials?: string;
  userName?: string;
  userSubtitle?: string;

  mobileOpen?: boolean;
};

export default function Sidebar({
  items,
  activeHref = "#explorer",
  mobileOpen = false,
}: SidebarProps) {
  const auth = useCopilotAuth();
  const copilotStatus = auth.status;
  const signIn = async () => { try { await signInToCopilot(); } catch { /* Shared state supplies safe errors. */ } };

  return (
    <aside id="primary-navigation" className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" /></svg></span>
        <div><strong>CGC</strong><small>Energy Intelligence</small></div>
      </div>
      <nav aria-label="Primary navigation">
        {items.map(item => {
          const active = item.href === activeHref;
          return (
            <a
              key={item.href}
              href={item.href}
              className={active ? styles.active : ""}
            >
              <span className={styles.navIcon}>
                {item.icon}
              </span>

              {item.label}
            </a>
          );
        })}
      </nav>

      {copilotStatus !== "signed-in" ? (
        <div className={styles.copilotSignIn}>
          <strong>Copilot Studio</strong>
          <small>{copilotStatus === "checking" ? "Checking Microsoft session…" : copilotStatus === "session-expired" ? "Session expired. Sign in again." : "Sign in to use Copilot features."}</small>
          {auth.message ? <small className={styles.copilotError} role="alert">{auth.message}</small> : null}
          {copilotStatus === "checking" || copilotStatus === "signing-in" ? <small role="status">{copilotStatus === "checking" ? "Checking session…" : "Signing in…"}</small> : <button type="button" onClick={() => void signIn()}>
            Sign in
          </button>}
        </div>
      ) : <div className={styles.copilotSignIn}><small>Microsoft session verified</small><button type="button" onClick={() => { void signOutOfCopilot().catch(() => {}); }}>Sign out</button></div>}

    </aside>
  );
}
