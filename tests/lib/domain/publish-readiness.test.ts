import { REVIEW_CHECKLIST_ITEMS, type Release, type ReviewChecklistItemKey } from "@/lib/domain/types";
import { getPublishReadiness } from "@/lib/domain/publish-readiness";

function buildChecklist(value = false): Record<ReviewChecklistItemKey, boolean> {
  return REVIEW_CHECKLIST_ITEMS.reduce<Record<ReviewChecklistItemKey, boolean>>(
    (accumulator, item) => {
      accumulator[item.key] = value;
      return accumulator;
    },
    {} as Record<ReviewChecklistItemKey, boolean>,
  );
}

function buildRelease(overrides?: Partial<Release>): Release {
  return {
    id: "rel_1",
    name: "Release One",
    versionLabel: "v1.0.0",
    status: "draft",
    changes: [],
    drafts: [],
    review: {
      checklist: buildChecklist(false),
      comments: [],
    },
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("getPublishReadiness", () => {
  it("returns blockers when required data is missing", () => {
    const readiness = getPublishReadiness(buildRelease());
    expect(readiness.canPublish).toBe(false);
    expect(readiness.blockers).toContain("Add at least one change before publishing.");
    expect(readiness.blockers).toContain("Generate at least one draft before publishing.");
    expect(readiness.blockers).toContain("Complete the review checklist before publishing.");
  });

  it("returns ready when change, draft, and checklist are complete", () => {
    const readiness = getPublishReadiness(
      buildRelease({
        changes: [
          {
            id: "chg_1",
            title: "Feature A",
            description: "Adds feature A",
            type: "feature",
            scope: "editor",
            audiences: ["customer"],
            risk: "low",
            isBreaking: false,
            links: [],
            createdAt: "2026-02-01T10:00:00.000Z",
            updatedAt: "2026-02-01T10:00:00.000Z",
          },
        ],
        drafts: [
          {
            id: "drf_1",
            version: 1,
            source: "ai",
            content: "# Release",
            createdAt: "2026-02-01T11:00:00.000Z",
          },
        ],
        review: {
          checklist: buildChecklist(true),
          comments: [],
        },
      }),
    );

    expect(readiness.canPublish).toBe(true);
    expect(readiness.blockers).toEqual([]);
  });
});
