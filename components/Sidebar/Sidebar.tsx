"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { energyNavigationHref } from "@/lib/energy-filters";
import { Building2, ChartNoAxesCombined, ClipboardList, LayoutDashboard, Wallet, type LucideIcon } from "lucide-react";
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

const navigationIcons: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/report-energy-waste": ClipboardList,
  "/insights": ChartNoAxesCombined,
  "/building": Building2,
  "/savings": Wallet,
};

function navigationIcon(href: string, fallback: ReactNode = null) {
  const Icon = navigationIcons[href];
  return Icon ? <Icon size={20} strokeWidth={1.7} aria-hidden="true" /> : fallback;
}

export default function Sidebar({
  items,
  activeHref = "#explorer",
  mobileOpen = false,
}: SidebarProps) {
  const searchParams = useSearchParams();
  const auth = useCopilotAuth();
  const copilotStatus = auth.status;
  const authBusy = copilotStatus === "checking" || copilotStatus === "signing-in";
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
            <Link
              key={item.href}
              href={energyNavigationHref(item.href, new URLSearchParams(searchParams.toString()))}
              className={active ? styles.active : ""}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.navIcon}>
                {navigationIcon(item.href, item.icon)}
              </span>

              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.copilotSignIn}>
        <button type="button" aria-disabled={authBusy} aria-busy={authBusy}
          onClick={() => { if (authBusy) return; if (copilotStatus === "signed-in") void signOutOfCopilot().catch(() => {}); else void signIn(); }}>
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
