import { beforeEach, describe, expect, it, vi } from "vitest";
import { callbackDestination, validateAuth } from "./validation";
import { scopeWorkStorageKey } from "@/shared/design-system/debug-settings";
const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), getUser: vi.fn(), signOut: vi.fn(), resend: vi.fn(), exchangeCodeForSession: vi.fn() }));
vi.mock("@/features/retros/service", () => ({ prepareGuestHistory: vi.fn(), finishGuestHistory: vi.fn(), loginDestination: () => "/" }));
vi.mock("@/utils/supabase/client", () => ({ createClient: () => ({ auth }) }));
vi.mock("@/utils/supabase/server", () => ({ createClient: () => ({ auth }) }));
import { submitAuth, resendConfirmation } from "./service";
import { getAccount, guestPage } from "./server";
import callback from "@/pages/api/auth/callback";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
const values = { name: "  Ada Lovelace  ", email: "ada@example.com", password: "correct horse battery" };
function response() { return { setHeader: vi.fn(), redirect: vi.fn(), status: vi.fn().mockReturnThis(), end: vi.fn() }; }
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("window", { location: { origin: "https://retro.example" } }); });
describe("auth validation", () => {
 it("rejects empty/overlong names and malformed emails", () => {
   for (const name of [" ", "x".repeat(101)]) expect(validateAuth("signup", { ...values, name })).toContain("name");
   expect(validateAuth("login", { ...values, email: "bad" })).toContain("email");
 });
 it("validates a single new password without trimming it", () => {
   expect(validateAuth("signup", { ...values, password: "short" })).toContain("8");
   expect(validateAuth("reset-password", values)).toBeNull();
   expect(validateAuth("reset-password", { ...values, password: "short" })).toContain("8");
   expect(validateAuth("signup", values)).toBeNull();
   expect(validateAuth("login", { ...values, password: "short" })).toBeNull();
 });
 it("does not require passwords for email actions", () => {
   for (const mode of ["forgot-password", "verify-email"] as const) expect(validateAuth(mode, { ...values, password: "" })).toBeNull();
 });
 it("isolates users and demo mode, leaving legacy namespace unchanged", () => {
   expect(scopeWorkStorageKey("board.v1", "a", false)).not.toBe(scopeWorkStorageKey("board.v1", "b", false));
   expect(scopeWorkStorageKey("board.v1", "a", true)).toBe("account:a:debug-empty:board.v1");
   expect(scopeWorkStorageKey("board.v1", null, false)).toBe("board.v1");
 });
});
describe("provider workflows", () => {
 it("logs in with provider credentials and hides provider errors", async () => {
   auth.signInWithPassword.mockResolvedValueOnce({ error: null });
   expect(await submitAuth("login", values)).toEqual({ redirect: true, destination: "/" });
   auth.signInWithPassword.mockResolvedValueOnce({ error: { message: "private provider detail" } });
   await expect(submitAuth("login", values)).rejects.toThrow("Unable to log in");
 });
 it("signup stores display name and handles confirmation and immediate sessions", async () => {
   auth.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
   expect((await submitAuth("signup", values)).redirect).toBe(false);
   expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { data: { full_name: "Ada Lovelace" }, emailRedirectTo: "https://retro.example/api/auth/callback" } }));
   auth.signUp.mockResolvedValueOnce({ data: { session: {} }, error: null });
   expect((await submitAuth("signup", values)).redirect).toBe(true);
 });
 it("sends recovery to fixed callback and gives neutral acknowledgement", async () => {
   auth.resetPasswordForEmail.mockResolvedValue({ error: null });
   expect((await submitAuth("forgot-password", values)).message).toContain("If an account exists");
   expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(values.email, { redirectTo: "https://retro.example/api/auth/callback?flow=recovery" });
 });
 it("resends email verification", async () => {
   auth.resend.mockResolvedValue({ error: null });
   await resendConfirmation(values.email);
   expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: "signup", email: values.email }));
 });
 it("requires valid identity before password update, then signs out", async () => {
   auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: {} });
   await expect(submitAuth("reset-password", values)).rejects.toThrow("expired");
   expect(auth.updateUser).not.toHaveBeenCalled();
   auth.getUser.mockResolvedValueOnce({ data: { user: { id: "a" } }, error: null });
   auth.updateUser.mockResolvedValueOnce({ error: null }); auth.signOut.mockResolvedValueOnce({ error: null });
   expect((await submitAuth("reset-password", values)).destination).toBe("/?auth=login&updated=1");
   expect(auth.signOut).toHaveBeenCalled();
 });
 it("validates before making provider calls", async () => {
   await expect(submitAuth("signup", { ...values, password: "short" })).rejects.toThrow("8");
   expect(auth.signUp).not.toHaveBeenCalled();
 });
});
describe("server boundary and callback", () => {
 it("fails closed for invalid sessions and disables shared caching", async () => {
   const res = response();
   auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: {} });
   expect(await getAccount({ req: {}, res } as unknown as GetServerSidePropsContext)).toBeNull();
   expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
 });
 it("returns only display identity and redirects authenticated guest pages", async () => {
   auth.getUser.mockResolvedValue({ data: { user: { id: "a", email: values.email, user_metadata: { full_name: values.name.trim() } } }, error: null });
   const ctx = { req: {}, res: response() } as unknown as GetServerSidePropsContext;
   expect(await getAccount(ctx)).toEqual({ id: "a", email: values.email, name: "Ada Lovelace", isGuest: false });
   expect(await guestPage(ctx)).toEqual({ redirect: { destination: "/", permanent: false } });
 });
 it("allows only fixed callback destinations", async () => {
   expect(callbackDestination("https://evil.example")).toBe("/");
   auth.exchangeCodeForSession.mockResolvedValue({ error: null });
   const res = response();
   await callback({ method: "GET", query: { code: "valid", flow: "recovery" } } as unknown as NextApiRequest, res as unknown as NextApiResponse);
   expect(res.redirect).toHaveBeenCalledWith(303, "/?auth=reset-password");
 });
 it("rejects missing/reused codes and non-GET requests", async () => {
   const res = response(); auth.exchangeCodeForSession.mockResolvedValue({ error: {} });
   await callback({ method: "GET", query: { code: "used" } } as unknown as NextApiRequest, res as unknown as NextApiResponse);
   expect(res.redirect).toHaveBeenCalledWith(303, "/?auth=login&error=callback");
   await callback({ method: "POST", query: {} } as unknown as NextApiRequest, res as unknown as NextApiResponse);
   expect(res.status).toHaveBeenCalledWith(405);
 });
});

import { authHref, getAuthMode } from "./modal-routing";
import { homePageProps, legacyAuthPage } from "./server";
describe("root modal routing", () => {
 it("allowlists modal modes and excludes hostile query values", () => {
   expect(getAuthMode("login")).toBe("login");
   expect(getAuthMode(["login"])).toBeNull();
   expect(getAuthMode("https://evil.example")).toBeNull();
   expect(authHref("signup", { next: "https://evil.example", error: "other", updated: "1" })).toBe("/?auth=signup&updated=1");
 });
 it("redirects old recovery URLs to the root while preserving only known feedback", async () => {
   const ctx = { query: { expired: "1", next: "https://evil.example" } } as unknown as GetServerSidePropsContext;
   expect(await legacyAuthPage("forgot-password")(ctx)).toEqual({ redirect: { destination: "/?auth=forgot-password&expired=1", permanent: false } });
 });
});

describe("root account boundary", () => {
 it("redirects unauthenticated reset requests to recovery modal", async () => {
   auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: {} });
   const ctx = { req: {}, res: response(), query: { auth: "reset-password" } } as unknown as GetServerSidePropsContext;
   expect(await homePageProps(ctx)).toEqual({ redirect: { destination: "/?auth=forgot-password&expired=1", permanent: false } });
 });
 it("allows verified reset sessions while sending normal signed-in auth links to workspace", async () => {
   auth.getUser.mockResolvedValue({ data: { user: { id: "a", email: values.email, user_metadata: {} } }, error: null });
   const ctx = { req: {}, res: response(), query: { auth: "reset-password" } } as unknown as GetServerSidePropsContext;
   expect(await homePageProps(ctx)).toHaveProperty("props.account.id", "a");
   expect(await homePageProps({ ...ctx, query: { auth: "login" } })).toEqual({ redirect: { destination: "/", permanent: false } });
 });
});

describe("dashboard at the root URL", () => {
 it("renders a signed-in dashboard at root without a redirect", async () => {
   auth.getUser.mockResolvedValue({ data: { user: { id: "a", email: values.email, user_metadata: {} } }, error: null });
   const ctx = { req: {}, res: response(), query: {} } as unknown as GetServerSidePropsContext;
   expect(await homePageProps(ctx)).toHaveProperty("props.account.id", "a");
 });
 it("allows a guest to open account modals at root", async () => {
   auth.getUser.mockResolvedValue({ data: { user: { id: "guest", is_anonymous: true, user_metadata: { full_name: "Guest User" } } }, error: null });
   const ctx = { req: {}, res: response(), query: { auth: "signup" } } as unknown as GetServerSidePropsContext;
   expect(await homePageProps(ctx)).toHaveProperty("props.account.isGuest", true);
 });
});
