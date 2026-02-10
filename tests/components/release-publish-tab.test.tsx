import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReleasePublishTab } from "@/components/release-publish-tab";
import {
  REVIEW_CHECKLIST_ITEMS,
  type Release,
  type ReviewChecklistItemKey,
} from "@/lib/domain/types";
import { useAppState } from "@/lib/state/app-state";

vi.mock("@/lib/state/app-state", () => ({
  useAppState: vi.fn(),
}));

const mockedUseAppState = vi.mocked(useAppState);

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

function buildAppStateMock() {
  return {
    isHydrated: true,
    storageError: undefined,
    releases: [],
    auditLog: [],
    createRelease: vi.fn(),
    duplicateRelease: vi.fn(),
    setReleaseStatus: vi.fn(),
    publishRelease: vi.fn().mockReturnValue(true),
    logExportDownloaded: vi.fn(),
    addChange: vi.fn(),
    updateChange: vi.fn(),
    bulkSetChangeScope: vi.fn(),
    bulkSetChangeRisk: vi.fn(),
    bulkDeleteChanges: vi.fn(),
    addDraft: vi.fn(),
    setPrimaryDraft: vi.fn(),
    setReviewChecklistItem: vi.fn(),
    addReviewComment: vi.fn(),
    deleteReviewComment: vi.fn(),
    getReleaseById: vi.fn(),
    logReleaseViewed: vi.fn(),
  };
}

describe("ReleasePublishTab", () => {
  it("shows readiness blockers when release is incomplete", () => {
    mockedUseAppState.mockReturnValue(buildAppStateMock());

    render(<ReleasePublishTab release={buildRelease()} />);

    expect(screen.getByText(/Add at least one change before publishing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish Release/i })).toBeDisabled();
  });

  it("publishes release when readiness checks pass", async () => {
    const user = userEvent.setup();
    const appStateMock = buildAppStateMock();
    mockedUseAppState.mockReturnValue(appStateMock);

    render(
      <ReleasePublishTab
        release={buildRelease({
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
              format: "markdown",
              createdAt: "2026-02-01T11:00:00.000Z",
            },
          ],
          review: {
            checklist: buildChecklist(true),
            comments: [],
          },
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Publish Release/i }));
    expect(appStateMock.publishRelease).toHaveBeenCalledWith("rel_1");
    expect(screen.getByText(/Release published successfully/i)).toBeInTheDocument();
  });

  it("downloads json export and logs audit event", async () => {
    const user = userEvent.setup();
    const appStateMock = buildAppStateMock();
    mockedUseAppState.mockReturnValue(appStateMock);
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const createObjectUrl = vi.fn().mockReturnValue("blob:test");
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    });

    render(
      <ReleasePublishTab
        release={buildRelease({
          drafts: [
            {
              id: "drf_1",
              version: 1,
              source: "ai",
              content: "# Release",
              format: "markdown",
              createdAt: "2026-02-01T11:00:00.000Z",
            },
          ],
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Download \.json/i }));

    expect(appStateMock.logExportDownloaded).toHaveBeenCalledWith("rel_1", "json");
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    anchorClickSpy.mockRestore();
  });
});
