import { describe, expect, it } from "vitest";
import { getItemsBelow, getItemsAbove } from "./use-column-scroll";

describe("column scroll nudge", () => {
  it("counts cards above the visible area after scrolling down", () => {
    expect(getItemsAbove([-220, -100, 20, 140], 0)).toBe(2);
    expect(getItemsAbove([0, 120], 0)).toBe(0);
    expect(getItemsAbove([-1.5], 0)).toBe(0);
  });
  it("counts cards below the visible area", () => {
    expect(getItemsBelow([100, 220, 340, 460], 220)).toBe(2);
  });
  it("includes a partially visible card", () => {
    expect(getItemsBelow([100, 220, 340], 180)).toBe(2);
  });
  it("shows no nudge when all cards are visible", () => {
    expect(getItemsBelow([100, 220], 220)).toBe(0);
    expect(getItemsBelow([], 220)).toBe(0);
  });
  it("ignores subpixel rounding at the bottom edge", () => {
    expect(getItemsBelow([221.5], 220)).toBe(0);
  });
});
