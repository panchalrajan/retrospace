export function matchesWorkSearch(query: string, fields: (string | undefined)[]): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || fields.filter(Boolean).join(" ").toLocaleLowerCase().includes(normalized);
}
