import type { AuthMode } from "./validation";
const modes: readonly string[] = ["login", "signup", "forgot-password", "verify-email", "reset-password"];
export function getAuthMode(value: unknown): AuthMode | null {
  return typeof value === "string" && modes.includes(value) ? value as AuthMode : null;
}
export function authHref(mode: AuthMode, query: Record<string, unknown> = {}) {
  const params = new URLSearchParams({ auth: mode });
  if (query.error === "callback") params.set("error", "callback");
  if (query.updated === "1") params.set("updated", "1");
  if (query.expired === "1") params.set("expired", "1");
  return `/?${params}`;
}
