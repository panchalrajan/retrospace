import { describe, expect, it } from "vitest";
import { matchesWorkSearch } from "./work-search";

describe("shared work search", () => {
  it("matches ticket IDs and titles without case sensitivity", () => {
    expect(matchesWorkSearch(" action-0002 ", ["ACTION-0002", "Write a runbook"])).toBe(true);
    expect(matchesWorkSearch("RUNBOOK", ["ACTION-0002", "Write a runbook"])).toBe(true);
  });
  it("matches optional details", () => {
    expect(matchesWorkSearch("billing", ["Task", undefined, "Update billing notes"])).toBe(true);
  });
  it("includes everything for an empty query", () => {
    expect(matchesWorkSearch("  ", ["Task"])).toBe(true);
  });
  it("excludes non-matching items", () => {
    expect(matchesWorkSearch("missing", ["ACTION-0002", "Write a runbook"])).toBe(false);
  });
});
