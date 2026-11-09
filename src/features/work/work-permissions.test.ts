import { describe, expect, it } from "vitest";
import { canViewActionItems } from "./work-permissions";

describe("action item visibility", () => {
  it("allows the retro creator", () => {
    expect(canViewActionItems("creator", "creator")).toBe(true);
  });
  it("hides actions from other participants", () => {
    expect(canViewActionItems("participant", "creator")).toBe(false);
  });
  it("does not grant access for missing identity", () => {
    expect(canViewActionItems("", "")).toBe(false);
    expect(canViewActionItems("", "creator")).toBe(false);
  });
});
