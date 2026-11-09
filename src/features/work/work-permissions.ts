export function canViewActionItems(currentUser: string, retroCreator: string): boolean {
  return Boolean(currentUser) && currentUser === retroCreator;
}
