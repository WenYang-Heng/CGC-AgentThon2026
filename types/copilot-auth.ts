export type CopilotAuthStatus = "checking" | "signed-out" | "signing-in" | "signed-in" | "session-expired" | "error";
export type CopilotAuthState = { status: CopilotAuthStatus; message?: string };
