import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/router";
import Button from "@atlaskit/button/new";
import Textfield from "@atlaskit/textfield";
import { AuthLink } from "./auth-link";
import { submitAuth, resendConfirmation } from "./service";
import { type AuthMode, validateAuth } from "./validation";
export const authCopy = {
  "verify-email": ["Confirm your email", "Need a new confirmation link? Enter your email below.", "Resend confirmation"],
  login: ["Welcome back", "Log in to your Retrospace account.", "Log in"],
  signup: ["Create your account", "A better next sprint starts here.", "Create account"],
  "forgot-password": ["Forgot your password?", "Enter your email and we’ll send you a reset link.", "Send reset link"],
  "reset-password": ["Set a new password", "Choose a strong password for your account.", "Update password"],
};
export function AuthFeedback({ children, error = false }: { children: React.ReactNode; error?: boolean }) { return <p className={`auth-feedback${error ? " auth-feedback--error" : ""}`} role={error ? "alert" : "status"}>{children}</p>; }
function AuthField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return <div className="auth-field"><label htmlFor={props.id}>{label}<span aria-hidden="true"> *</span></label><Textfield {...props} isRequired /></div>;
}
export function AuthForm({ mode, onBusyChange }: { mode: AuthMode; onBusyChange?: (busy: boolean) => void }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [busy, updateBusy] = useState(false);
  function setBusy(value: boolean) { updateBusy(value); onBusyChange?.(value); }
  useEffect(() => { document.querySelector<HTMLInputElement>("[data-auth-form] input")?.focus(); }, [mode]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const action = authCopy[mode][2];
  const change = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => setValues(current => ({ ...current, [key]: event.target.value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setError(""); setMessage("");
    const invalid = validateAuth(mode, values); if (invalid) { setError(invalid); return; }
    setBusy(true);
    try {
      const result = await submitAuth(mode, values);
      if (result.redirect) { window.location.assign(result.destination ?? "/"); return; }
      setMessage(result.message ?? "Check your email."); setSent(true);
      setValues(current => ({ ...current, password: "" }));
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError("");
    try { await resendConfirmation(values.email); setMessage("If your account needs confirmation, a new email is on its way."); }
    catch (err) { setError(err instanceof Error ? err.message : "Please try again later."); }
    finally { setBusy(false); }
  }
  return <>
    {router.query.error === "callback" && <AuthFeedback error>This link has expired or is invalid. Request a new link below.</AuthFeedback>}
    {router.query.updated === "1" && <AuthFeedback>Password updated. Log in with your new password.</AuthFeedback>}
    {router.query.expired === "1" && <AuthFeedback error>Your reset session has expired. Request a new link.</AuthFeedback>}
    {error && <AuthFeedback error>{error}</AuthFeedback>}{message && <AuthFeedback>{message}</AuthFeedback>}
    <form data-auth-form onSubmit={submit} className="auth-form" aria-busy={busy}>
      {mode === "signup" && <AuthField id="name" label="Full name" autoComplete="name" value={values.name} onChange={change("name")} maxLength={100} disabled={busy} />}
      {mode !== "reset-password" && <AuthField id="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={change("email")} maxLength={254} disabled={busy} />}
      {mode !== "forgot-password" && mode !== "verify-email" && <AuthField id="password" label={mode === "reset-password" ? "New password" : "Password"} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={values.password} onChange={change("password")} maxLength={128} disabled={busy} />}
      {mode === "login" && <AuthLink isDisabled={busy} className="auth-forgot" mode="forgot-password">Forgot password?</AuthLink>}
      <Button type="submit" appearance="primary" shouldFitContainer isLoading={busy} isDisabled={busy}>{action}</Button>
    </form>
    {sent && mode === "signup" && <Button appearance="subtle" onClick={resend} isDisabled={busy}>Resend confirmation email</Button>}
    <div className="auth-switch">{mode === "login" ? <>New to Retrospace? <AuthLink isDisabled={busy} mode="signup">Create an account</AuthLink></> : mode === "signup" ? <>Already have an account? <AuthLink isDisabled={busy} mode="login">Log in</AuthLink></> : <AuthLink isDisabled={busy} mode="login">Back to log in</AuthLink>}</div>
  </>;
}
