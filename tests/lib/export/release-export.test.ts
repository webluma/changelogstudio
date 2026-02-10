import { REVIEW_CHECKLIST_ITEMS, type Release, type ReviewChecklistItemKey } from "@/lib/domain/types";
import {
  buildReleaseJsonExport,
  buildReleaseMarkdownExport,
  createReleaseExportBaseName,
  getReleaseActiveDraft,
} from "@/lib/export/release-export";

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
    name: "Billing Reliability Improvements",
    versionLabel: "v1.8.0",
    status: "draft",
    changes: [
      {
        id: "chg_1",
        title: "Add retry for failed webhooks",
        description: "Retries webhook delivery for transient failures.",
        type: "improvement",
        scope: "billing-api",
        audiences: ["customer", "technical"],
        risk: "medium",
        isBreaking: false,
        links: [],
        createdAt: "2026-02-01T10:00:00.000Z",
        updatedAt: "2026-02-01T10:00:00.000Z",
      },
    ],
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

describe("release-export helpers", () => {
  it("selects primary draft when available", () => {
    const release = buildRelease({
      drafts: [
        {
          id: "drf_1",
          version: 1,
          source: "ai",
          content: "v1",
          format: "markdown",
          createdAt: "2026-02-01T11:00:00.000Z",
        },
        {
          id: "drf_2",
          version: 2,
          source: "ai",
          content: "v2",
          format: "markdown",
          createdAt: "2026-02-01T12:00:00.000Z",
        },
      ],
      primaryDraftId: "drf_1",
    });

    expect(getReleaseActiveDraft(release)?.id).toBe("drf_1");
  });

  it("falls back to latest draft when no primary is set", () => {
    const release = buildRelease({
      drafts: [
        {
          id: "drf_1",
          version: 1,
          source: "ai",
          content: "v1",
          createdAt: "2026-02-01T11:00:00.000Z",
        },
        {
          id: "drf_2",
          version: 2,
          source: "ai",
          content: "v2",
          createdAt: "2026-02-01T12:00:00.000Z",
        },
      ],
    });

    expect(getReleaseActiveDraft(release)?.id).toBe("drf_2");
  });

  it("generates a stable export base name", () => {
    const release = buildRelease({
      name: "Q1 Release: Billing + Auth",
      versionLabel: "v1.8.0-beta",
    });

    expect(createReleaseExportBaseName(release)).toBe("q1-release-billing--auth-v180-beta");
  });

  it("exports markdown directly from markdown draft", () => {
    const release = buildRelease({
      drafts: [
        {
          id: "drf_2",
          version: 2,
          source: "ai",
          content: "# Release\n- Added retries",
          format: "markdown",
          createdAt: "2026-02-01T12:00:00.000Z",
        },
      ],
    });

    expect(buildReleaseMarkdownExport(release)).toContain("- Added retries");
  });

  it("wraps json draft content in markdown export", () => {
    const release = buildRelease({
      drafts: [
        {
          id: "drf_2",
          version: 2,
          source: "ai",
          content: "{\"headline\":\"Release\"}",
          format: "json",
          createdAt: "2026-02-01T12:00:00.000Z",
        },
      ],
    });

    const markdown = buildReleaseMarkdownExport(release);
    expect(markdown).toContain("```json");
    expect(markdown).toContain("\"headline\"");
  });

  it("builds json export with release metadata and changes", () => {
    const release = buildRelease({
      drafts: [
        {
          id: "drf_2",
          version: 2,
          source: "ai",
          content: "# Release\n- Added retries",
          format: "markdown",
          createdAt: "2026-02-01T12:00:00.000Z",
        },
      ],
    });

    const payload = buildReleaseJsonExport(release);

    expect(payload.release.id).toBe("rel_1");
    expect(payload.release.stats.totalChanges).toBe(1);
    expect(payload.draft?.version).toBe(2);
    expect(payload.changes).toHaveLength(1);
  });
});
