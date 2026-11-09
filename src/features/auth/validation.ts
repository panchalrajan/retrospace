export type AuthMode = "verify-email" | "login" | "signup" | "forgot-password" | "reset-password";
export type AuthValues = { name: string; email: string; password: string };
export function validateAuth(mode: AuthMode, values: AuthValues): string | null {
  if (mode === "signup" && (!values.name.trim() || values.name.trim().length > 100)) return "Enter your name (up to 100 characters).";
  if (mode !== "reset-password" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return "Enter a valid email address.";
  if ((mode === "forgot-password" || mode === "verify-email")) return null;
  if (!values.password || values.password.length > 128) return "Enter a password of up to 128 characters.";
  if (mode !== "login" && values.password.length < 8) return "Use at least 8 characters for your password.";
  return null;
}
export function callbackDestination(flow: unknown) { return flow === "recovery" ? "/?auth=reset-password" : "/"; }
