export const RETRO_CATEGORIES = ["Kudos", "Liked", "Learned", "Lacked", "Longed For", "Start", "Stop", "Continue"] as const;
export const DURATIONS = [0, 5, 10, 15, 30] as const;
export type Category = typeof RETRO_CATEGORIES[number];
export type Retro = { id: string; invite_slug: string; title: string; host_id: string; created_by: string; duration_minutes: number; ends_at: string | null; allow_guests: boolean; revision: number; created_at: string; updated_at: string };
export type Member = { id: string; display_name: string; joined_at: string };
export type RetroItem = { id: string; ticket_id: string; retro_id: string; author_id: string; kind: "reflection" | "action"; category: Category; title: string; description: string; owner_id: string | null; status: "To do" | "In progress" | "Done"; due_date: string | null; version: number; created_at: string; updated_at: string };
export type RetroComment = { id: string; retro_id: string; item_id: string; author_id: string; body: string; version: number; created_at: string; updated_at: string };
export type Vote = { item_id: string; user_id: string };
export type CommentVote = { comment_id: string; user_id: string };
export type Snapshot = { retro: Retro; members: Member[]; items: RetroItem[]; votes: Vote[]; comments: RetroComment[]; comment_votes: CommentVote[] };
export type InviteInfo = { title: string; invite_slug: string; allow_guests: boolean };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The server returned invalid data. Please refresh."); return value as Record<string, unknown>; }
function text(value: unknown): string { if (typeof value !== "string") throw new Error("The server returned invalid text."); return value; }
function id(value: unknown): string { const v = text(value); if (!UUID.test(v)) throw new Error("The server returned an invalid identity."); return v; }
function nullable(value: unknown): string | null { return value === null ? null : text(value); }
function number(value: unknown): number { if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("The server returned an invalid number."); return value; }
function list<T>(value: unknown, parse: (v: Record<string, unknown>) => T): T[] { if (!Array.isArray(value)) throw new Error("The server returned an invalid list."); return value.map(v => parse(object(v))); }
export function parseRetro(value: unknown): Retro {
  const v = object(value); if (typeof v.allow_guests !== "boolean") throw new Error("Invalid guest settings.");
  return { id: id(v.id), invite_slug: text(v.invite_slug), title: text(v.title), host_id: id(v.host_id), created_by: id(v.created_by), duration_minutes: number(v.duration_minutes), ends_at: nullable(v.ends_at), allow_guests: v.allow_guests, revision: number(v.revision), created_at: text(v.created_at), updated_at: text(v.updated_at) };
}
export function parseSnapshot(value: unknown): Snapshot {
  const s = object(value);
  return { retro: parseRetro(s.retro), members: list(s.members, v => ({ id: id(v.id), display_name: text(v.display_name), joined_at: text(v.joined_at) })),
    items: list(s.items, v => {
      if (!RETRO_CATEGORIES.includes(v.category as Category) || !["reflection", "action"].includes(String(v.kind)) || !["To do", "In progress", "Done"].includes(String(v.status))) throw new Error("Invalid item state.");
      return { id: id(v.id), ticket_id: text(v.ticket_id), retro_id: id(v.retro_id), author_id: id(v.author_id), kind: v.kind as RetroItem["kind"], category: v.category as Category, title: text(v.title), description: text(v.description), owner_id: v.owner_id === null ? null : id(v.owner_id), status: v.status as RetroItem["status"], due_date: nullable(v.due_date), version: number(v.version), created_at: text(v.created_at), updated_at: text(v.updated_at) };
    }), votes: list(s.votes, v => ({ item_id: id(v.item_id), user_id: id(v.user_id) })),
    comments: list(s.comments, v => ({ id: id(v.id), retro_id: id(v.retro_id), item_id: id(v.item_id), author_id: id(v.author_id), body: text(v.body), version: number(v.version), created_at: text(v.created_at), updated_at: text(v.updated_at) })),
    comment_votes: list(s.comment_votes, v => ({ comment_id: id(v.comment_id), user_id: id(v.user_id) })) };
}
export function canEditItem(item: Pick<RetroItem, "kind" | "author_id">, userId: string, hostId: string) { return userId === hostId || (item.kind === "reflection" && item.author_id === userId); }
export function validateCreate(name: string, title: string, duration: number): string | null {
  if (!name.trim() || name.trim().length > 100) return "Enter your full name (up to 100 characters).";
  if (!title.trim() || title.trim().length > 120) return "Enter a sprint name (up to 120 characters).";
  if (!DURATIONS.includes(duration as typeof DURATIONS[number])) return "Choose a valid duration.";
  return null;
}
export function remainingTime(endsAt: string | null, now: number) { if (!endsAt) return "No timer"; const deadline = Date.parse(endsAt); if (!Number.isFinite(deadline)) return "No timer"; const seconds = Math.max(0, Math.ceil((deadline - now) / 1000)); return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`; }
