import {
  getAuditCategory,
  getAuditMetadataPairs,
  getAuditTitle,
} from "@/lib/domain/audit-log";

describe("audit-log domain helpers", () => {
  it("resolves user-facing titles and categories", () => {
    expect(getAuditTitle("release.published")).toBe("Release published");
    expect(getAuditCategory("release.published")).toBe("publish");
    expect(getAuditCategory("change.added")).toBe("change");
    expect(getAuditCategory("draft.generated")).toBe("draft");
  });

  it("maps metadata keys to readable labels", () => {
    const pairs = getAuditMetadataPairs({
      status: "approved",
      count: 2,
      custom_token: "abc",
    });

    expect(pairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "status", label: "Status", value: "approved" }),
        expect.objectContaining({ key: "count", label: "Count", value: "2" }),
        expect.objectContaining({ key: "custom_token", label: "Custom Token", value: "abc" }),
      ]),
    );
  });
});
