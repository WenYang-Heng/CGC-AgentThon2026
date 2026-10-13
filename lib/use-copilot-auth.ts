"use client";

import { useEffect, useSyncExternalStore } from "react";
import { checkCopilotAuth, getCopilotAuthState, getServerCopilotAuthState, subscribeCopilotAuth } from "@/services/chatbot-service";

export function useCopilotAuth() {
  const state = useSyncExternalStore(subscribeCopilotAuth, getCopilotAuthState, getServerCopilotAuthState);
  useEffect(() => { void checkCopilotAuth(); }, []);
  return state;
}
