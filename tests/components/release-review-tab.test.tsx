import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReleaseReviewTab } from "@/components/release-review-tab";
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
    setReviewChecklistItem: vi.fn().mockReturnValue(true),
    addReviewComment: vi.fn().mockReturnValue("rvc_1"),
    deleteReviewComment: vi.fn().mockReturnValue(true),
    getReleaseById: vi.fn(),
    logReleaseViewed: vi.fn(),
  };
}

describe("ReleaseReviewTab", () => {
  it("toggles checklist items through app state", async () => {
    const user = userEvent.setup();
    const appStateMock = buildAppStateMock();
    mockedUseAppState.mockReturnValue(appStateMock);

    render(<ReleaseReviewTab release={buildRelease()} />);

    await user.click(
      screen.getByLabelText(/Audience match \(customer-facing text avoids heavy jargon\)/i),
    );

    expect(appStateMock.setReviewChecklistItem).toHaveBeenCalledWith(
      "rel_1",
      "audience_match",
      true,
    );
  });

  it("adds a comment for the selected section", async () => {
    const user = userEvent.setup();
    const appStateMock = buildAppStateMock();
    mockedUseAppState.mockReturnValue(appStateMock);

    render(<ReleaseReviewTab release={buildRelease()} />);

    await user.selectOptions(screen.getByLabelText(/Section/i), "features");
    await user.type(screen.getByLabelText(/Comment/i), "Clarify customer impact in plain language.");
    await user.click(screen.getByRole("button", { name: /Add Comment/i }));

    expect(appStateMock.addReviewComment).toHaveBeenCalledWith("rel_1", {
      section: "features",
      message: "Clarify customer impact in plain language.",
    });
    expect(screen.getByText(/Comment added to Features/i)).toBeInTheDocument();
  });

  it("deletes an existing review comment", async () => {
    const user = userEvent.setup();
    const appStateMock = buildAppStateMock();
    mockedUseAppState.mockReturnValue(appStateMock);

    render(
      <ReleaseReviewTab
        release={buildRelease({
          review: {
            checklist: buildChecklist(false),
            comments: [
              {
                id: "rvc_1",
                section: "features",
                message: "Keep this message concise.",
                actor: "user",
                createdAt: "2026-02-01T11:00:00.000Z",
              },
            ],
          },
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Delete/i }));

    expect(appStateMock.deleteReviewComment).toHaveBeenCalledWith("rel_1", "rvc_1");
    expect(screen.getByText(/Comment removed/i)).toBeInTheDocument();
  });
});
