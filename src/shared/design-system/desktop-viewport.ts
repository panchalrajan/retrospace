export const MIN_DESKTOP_WIDTH = 744; // Includes iPad mini in portrait.
export function supportsDesktopLayout(width: number, height: number, coarseTouch: boolean): boolean {
  return width >= MIN_DESKTOP_WIDTH && !(coarseTouch && height <= 500);
}
