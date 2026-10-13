"use client";

import { useEffect, useRef } from "react";
import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

export default function AuthPopupBridge() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;

    const responses = [
      new URLSearchParams(window.location.hash.slice(1)),
      new URLSearchParams(window.location.search),
    ];
    const hasAuthResponse = responses.some(
      (params) => params.has("state") && (params.has("code") || params.has("error")),
    );
    if (!hasAuthResponse) return;

    started.current = true;
    void broadcastResponseToMainFrame().catch(() => {
      // Do not log the callback URL: it can contain an authorization code.
      console.error("Sign-in callback failed. Close this popup and retry from the Copilot test page.");
    });
  }, []);

  return null;
}
