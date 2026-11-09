import { prepareGuestHistory, finishGuestHistory, loginDestination } from "@/features/retros/service";
import { createClient } from "@/utils/supabase/client";
import { validateAuth, type AuthMode, type AuthValues } from "./validation";
export async function submitAuth(mode: AuthMode, values: AuthValues) {
  const invalid = validateAuth(mode, values);
  if (invalid) throw new Error(invalid);
  const supabase = createClient();
  const email = values.email.trim();
  const callback = `${window.location.origin}/api/auth/callback`;
  if (mode === "login") {
    await prepareGuestHistory();
    const { error } = await supabase.auth.signInWithPassword({ email, password: values.password });
    if (error) throw new Error("Unable to log in. Check your email and password, and confirm your email if needed.");
    await finishGuestHistory();
    return { redirect: true, destination: loginDestination() };
  }
  if (mode === "signup") {
    await prepareGuestHistory();
    const { data, error } = await supabase.auth.signUp({ email, password: values.password, options: { data: { full_name: values.name.trim() }, emailRedirectTo: callback } });
    if (error) throw new Error("Unable to create your account. Try again or log in if you already have an account.");
    if (data.session) await finishGuestHistory();
    return { redirect: Boolean(data.session), destination: data.session ? loginDestination() : undefined, message: "Check your email for a confirmation link. If you already have an account, you can log in." };
  }
  if (mode === "verify-email") {
    await resendConfirmation(email);
    return { redirect: false, message: "If your account needs confirmation, a new email is on its way." };
  }
  if (mode === "forgot-password") {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${callback}?flow=recovery` });
    if (error) throw new Error("Unable to send a recovery email right now. Please try again shortly.");
    return { redirect: false, message: "If an account exists for this email, you’ll receive a password reset link shortly." };
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Your reset session has expired. Request a new password reset link.");
  const { error } = await supabase.auth.updateUser({ password: values.password });
  if (error) throw new Error("Unable to update your password. Use a different password or request a new link.");
  const { error: logoutError } = await supabase.auth.signOut();
  if (logoutError) throw new Error("Password updated. Please retry signing out before continuing.");
  return { redirect: true, destination: "/?auth=login&updated=1" };
}
export async function resendConfirmation(email: string) {
  const { error } = await createClient().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` } });
  if (error) throw new Error("Unable to resend right now. Please wait a moment and try again.");
}
