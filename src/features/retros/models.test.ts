import { describe, expect, it } from "vitest";
import { validateCreate, canEditItem, parseSnapshot, remainingTime } from "./models";
const host = "00000000-0000-0000-0000-000000000001";
const attendee = "00000000-0000-0000-0000-000000000002";
const other = "00000000-0000-0000-0000-000000000003";
const retro = { id: host, invite_slug: "a".repeat(32), title: "Sprint", host_id: host, created_by: host, duration_minutes: 0, ends_at: null, allow_guests: true, revision: 1, created_at: "2026-11-09T00:00:00Z", updated_at: "2026-11-09T00:00:00Z" };
const empty = { retro, members: [{ id: host, display_name: "Host", joined_at: retro.created_at }], items: [], votes: [], comments: [], comment_votes: [] };
describe("retro creation", () => {
 it("validates names, titles and the exact duration choices", () => {
   for (const duration of [0, 5, 10, 15, 30]) expect(validateCreate("Host", "Sprint", duration)).toBeNull();
   expect(validateCreate(" ", "Sprint", 0)).toContain("name");
   expect(validateCreate("Host", " ", 0)).toContain("sprint");
   expect(validateCreate("Host", "x".repeat(121), 0)).toContain("120");
   expect(validateCreate("Host", "Sprint", 45)).toContain("duration");
 });
});
describe("UUID ownership", () => {
 it("keeps actions host-only, even for their former host/author", () => {
   expect(canEditItem({ kind: "action", author_id: attendee }, attendee, host)).toBe(false);
   expect(canEditItem({ kind: "action", author_id: attendee }, host, host)).toBe(true);
 });
 it("allows reflection authors or host, never an unrelated attendee", () => {
   expect(canEditItem({ kind: "reflection", author_id: attendee }, attendee, host)).toBe(true);
   expect(canEditItem({ kind: "reflection", author_id: attendee }, host, host)).toBe(true);
   expect(canEditItem({ kind: "reflection", author_id: attendee }, other, host)).toBe(false);
 });
});
describe("external snapshot validation", () => {
 it("accepts an empty real board and rejects missing or invalid lists", () => {
   expect(parseSnapshot(empty).retro.title).toBe("Sprint");
   expect(() => parseSnapshot({ ...empty, members: null })).toThrow();
   expect(() => parseSnapshot({ ...empty, votes: [{ item_id: "invalid", user_id: host }] })).toThrow("identity");
 });
 it("rejects unrecognized item states before the UI trusts them", () => {
   expect(() => parseSnapshot({ ...empty, items: [{ category: "Injected status", kind: "reflection", status: "To do" }] })).toThrow("Invalid item state");
   expect(() => parseSnapshot({ ...empty, retro: { ...retro, allow_guests: "true" } })).toThrow("guest settings");
 });
});
describe("authoritative timer display", () => {
 it("uses the shared deadline and handles no timer, expiry and invalid input", () => {
   const now = Date.parse("2026-11-09T00:00:00Z");
   expect(remainingTime(null, now)).toBe("No timer");
   expect(remainingTime("2026-11-09T00:05:00Z", now)).toBe("05:00");
   expect(remainingTime("2026-11-08T23:59:00Z", now)).toBe("00:00");
   expect(remainingTime("invalid", now)).toBe("No timer");
 });
});
