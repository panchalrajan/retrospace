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

describe("homepage demo sizing", () => {
  it("fits two readable demo columns without narrowing workspace defaults", () => {
    const available = 560;
    expect(getBoardColumnWidth(available, 12, 2, 240)).toBe(274);
    expect(getBoardColumnWidth(available, 12, 2)).toBe(560);
  });
  it("keeps a complete column on narrow screens and returns to two when space allows", () => {
    expect(getBoardColumnWidth(298, 12, 2, 240)).toBe(298);
    expect(getBoardColumnWidth(492, 12, 2, 240)).toBe(240);
  });
});
