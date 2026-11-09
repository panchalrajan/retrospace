export function getBoardColumnWidth(availableWidth: number, gap: number, visibleColumns = 4, minimumWidth = 300): number {
  const count = Math.max(1, Math.min(visibleColumns, Math.floor((availableWidth + gap) / (minimumWidth + gap))));
  return Math.max(0, (availableWidth - gap * (count - 1)) / count);
}
