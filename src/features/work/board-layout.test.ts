import { describe, expect, it } from "vitest";
import { getBoardColumnWidth } from "./board-layout";

describe("board columns", () => {
  it.each([3, 4])("shows %s complete columns", (visibleColumns) => {
    const width = 1280;
    const gap = 16;
    const columnWidth = getBoardColumnWidth(width, gap, visibleColumns);
    expect(visibleColumns * columnWidth + (visibleColumns - 1) * gap).toBeCloseTo(width);
  });
  it("preserves readable card width when less room is available", () => {
    expect(getBoardColumnWidth(640, 16, 3)).toBe(312);
    expect(getBoardColumnWidth(640, 16, 4)).toBe(312);
  });
  it("fills a narrow viewport with a single column", () => {
    expect(getBoardColumnWidth(240, 16)).toBe(240);
  });
});
