import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReleaseDraftsTab } from "@/components/release-drafts-tab";
import type { Release } from "@/lib/domain/types";
import { useAppState } from "@/lib/state/app-state";

vi.mock("@/lib/state/app-state", () => ({
  useAppState: vi.fn(),
}));

const mockedUseAppState = vi.mocked(useAppState);

function buildRelease(overrides?: Partial<Release>): Release {
  return {
    id: "rel_1",
    name: "Release One",
    versionLabel: "v1.0.0",
    status: "draft",
    changes: [],
    drafts: [],
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
    addChange: vi.fn(),
    updateChange: vi.fn(),
    bulkSetChangeScope: vi.fn(),
    bulkSetChangeRisk: vi.fn(),
    bulkDeleteChanges: vi.fn(),
    addDraft: vi.fn(),
    setPrimaryDraft: vi.fn().mockReturnValue(true),
    getReleaseById: vi.fn(),
    logReleaseViewed: vi.fn(),
  };
}

describe("ReleaseDraftsTab", () => {
  it("shows diff mode and compares selected version against another draft", async () => {
    const user = userEvent.setup();
    mockedUseAppState.mockReturnValue(buildAppStateMock());

    const release = buildRelease({
      drafts: [
        {
          id: "drf_1",
          version: 1,
          source: "ai",
          content: "# Release\n- Added login",
          createdAt: "2026-02-01T10:00:00.000Z",
        },
        {
          id: "drf_2",
          version: 2,
          source: "ai",
          content: "# Release\n- Added login\n- Improved retries",
          createdAt: "2026-02-02T10:00:00.000Z",
        },
      ],
      primaryDraftId: "drf_2",
    });

    render(<ReleaseDraftsTab release={release} />);

    expect(screen.getByText("Draft v2")).toBeInTheDocument();
    expect(screen.getByText(/Comparing v2 against v1/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Diff against draft v1/i }));
    expect(screen.getByText(/Comparing draft v2 against v1/i)).toBeInTheDocument();
    expect(screen.getByText("+ - Improved retries")).toBeInTheDocument();
  });

  it("promotes selected draft to primary", async () => {
    const user = userEvent.setup();
    const appStateMock = buildAppStateMock();
    mockedUseAppState.mockReturnValue(appStateMock);

    const release = buildRelease({
      drafts: [
        {
          id: "drf_1",
          version: 1,
          source: "ai",
          content: "# Release\n- Added login",
          createdAt: "2026-02-01T10:00:00.000Z",
        },
      ],
      primaryDraftId: "drf_1",
    });

    render(<ReleaseDraftsTab release={release} />);

    await user.click(screen.getByRole("button", { name: /Set as Primary/i }));
    expect(appStateMock.setPrimaryDraft).toHaveBeenCalledWith("rel_1", "drf_1");
    expect(screen.getByText(/is now primary/i)).toBeInTheDocument();
  });
});
