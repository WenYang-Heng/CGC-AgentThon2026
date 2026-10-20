"use client";

import { ReactNode } from "react";
import Image from "next/image";
import cgcLogo from "@/public/cgc-logo.jpeg";
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

const navigationIconPaths: Record<string, ReactNode> = {
  "/": <><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" /></>,
  "/report-energy-waste": <><path d="M8 4h8M9 3h6v3H9zM7 5H5v16h14V5h-2" /><path d="M8 11h8M8 15h5" /></>,
  "/insights": <><path d="M4 18V9m5 9V5m5 13v-6m5 6V3" /><path d="m3 8 6-4 5 6 6-8" /></>,
  "/building": <path d="M4 21V3h12v18M8 7h4M8 11h4M8 15h4M16 9h4v12M2 21h20" />,
  "/savings": <path d="M3 5h18v15H3zM3 9h18M15 13h6M6 16h5" />,
};

function navigationIcon(href: string, fallback: ReactNode = null) {
  return navigationIconPaths[href] ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{navigationIconPaths[href]}</svg> : fallback;
}

export default function Sidebar({
  items,
  activeHref = "#explorer",
  mobileOpen = false,
}: SidebarProps) {
  const auth = useCopilotAuth();
  const copilotStatus = auth.status;
  const signIn = async () => { try { await signInToCopilot(); } catch { /* Shared state supplies safe errors. */ } };
  const buildingItem = { label: "Building View", href: "/building", icon: navigationIcon("/building") };
  const navigationItems = items.some(item => item.href === "/building") ? items : [...items.filter(item => item.href !== "/savings"), buildingItem, ...items.filter(item => item.href === "/savings")];

  return (
    <aside id="primary-navigation" className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
      <div className={styles.logo}>
        <Image src={cgcLogo} alt="CGC" className={styles.brandImage} width={144} height={96} sizes="144px" preload />
        <small>Energy Intelligence</small>
      </div>
      <nav aria-label="Primary navigation">
        {(navigationItems.some(item => item.href === "/savings") ? navigationItems : [...navigationItems, {
          label: "Savings & Cost", href: "/savings",
          icon: navigationIcon("/savings"),
        }]).map(item => {
          const active = item.href === activeHref;
          return (
            <a
              key={item.href}
              href={item.href}
              className={active ? styles.active : ""}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.navIcon}>
                {navigationIcon(item.href, item.icon)}
              </span>

              {item.label}
            </a>
          );
        })}
      </nav>

      <div className={styles.copilotSignIn}>
        <button type="button" disabled={copilotStatus === "checking" || copilotStatus === "signing-in"} aria-busy={copilotStatus === "checking" || copilotStatus === "signing-in"}
          onClick={() => { if (copilotStatus === "signed-in") void signOutOfCopilot().catch(() => {}); else void signIn(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 4H6a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h4" />
            {copilotStatus === "signed-in" ? <path d="M8 12h13m-4-4 4 4-4 4" /> : <path d="M21 12H8m4-4-4 4 4 4" />}
          </svg>
          <span>{copilotStatus === "checking" ? "Checking session..." : copilotStatus === "signing-in" ? "Logging in..." : copilotStatus === "signed-in" ? "Logout" : "Login"}</span>
        </button>
        {copilotStatus === "session-expired" && !auth.message && <small>Session expired. Please log in again.</small>}
        {auth.message ? <small className={styles.copilotError} role="alert">{auth.message}</small> : null}
      </div>

    </aside>
  );
}
