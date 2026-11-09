import { describe, expect, it } from "vitest";
import { supportsDesktopLayout } from "./desktop-viewport";
describe("desktop-only viewport policy", () => {
  it("blocks phone portrait and coarse-touch phone landscape", () => {
    expect(supportsDesktopLayout(390, 844, true)).toBe(false);
    expect(supportsDesktopLayout(743, 1000, false)).toBe(false);
    expect(supportsDesktopLayout(844, 390, true)).toBe(false);
    expect(supportsDesktopLayout(932, 430, true)).toBe(false);
  });
  it("supports iPad mini, iPad and desktop layouts", () => {
    expect(supportsDesktopLayout(744, 1133, true)).toBe(true);
    expect(supportsDesktopLayout(768, 1024, true)).toBe(true);
    expect(supportsDesktopLayout(1024, 768, true)).toBe(true);
    expect(supportsDesktopLayout(1440, 900, false)).toBe(true);
    expect(supportsDesktopLayout(844, 390, false)).toBe(true);
  });
});
