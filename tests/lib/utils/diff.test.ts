import { buildLineDiff } from "@/lib/utils/diff";

describe("buildLineDiff", () => {
  it("detects added, removed and unchanged lines", () => {
    const before = ["# Release 1", "- Added SSO login", "- Fixed export race"].join("\n");
    const after = [
      "# Release 1",
      "- Added SSO login",
      "- Added API key rotation",
      "- Fixed export race condition",
    ].join("\n");

    const diff = buildLineDiff(before, after);
    const added = diff.filter((line) => line.type === "add");
    const removed = diff.filter((line) => line.type === "remove");
    const context = diff.filter((line) => line.type === "context");

    expect(added.length).toBe(2);
    expect(removed.length).toBe(1);
    expect(context.length).toBe(2);
    expect(added.some((line) => line.value.includes("API key rotation"))).toBe(true);
    expect(removed.some((line) => line.value.includes("Fixed export race"))).toBe(true);
  });

  it("returns only additions when source is empty", () => {
    const diff = buildLineDiff("", "Line A\nLine B");
    expect(diff.every((line) => line.type === "add")).toBe(true);
    expect(diff).toHaveLength(2);
  });
});
