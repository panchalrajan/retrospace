export const AVATAR_COLOR_COUNT = 12;

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

export function getUserAvatarColorIndex(name: string): number {
  let hash = 0;
  for (const character of name.trim().toLowerCase()) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % AVATAR_COLOR_COUNT;
}

export function UserAvatar({ name }: { name: string }) {
  return (
    <span className={`work-avatar work-avatar--${getUserAvatarColorIndex(name)}`} aria-hidden="true">
      {getUserInitials(name)}
    </span>
  );
}
