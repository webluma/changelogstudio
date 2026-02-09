import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReleaseChangesTab } from "@/components/release-changes-tab";
import { useAppState } from "@/lib/state/app-state";
import type { Release } from "@/lib/domain/types";

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
    addChange: vi.fn().mockReturnValue("chg_1"),
    updateChange: vi.fn().mockReturnValue(true),
    bulkSetChangeScope: vi.fn().mockReturnValue(1),
    bulkSetChangeRisk: vi.fn().mockReturnValue(1),
    bulkDeleteChanges: vi.fn().mockReturnValue(1),
    addDraft: vi.fn(),
    setPrimaryDraft: vi.fn(),
    getReleaseById: vi.fn(),
    logReleaseViewed: vi.fn(),
  };
}

describe("ReleaseChangesTab", () => {
  it("renders empty state when no changes match", () => {
    mockedUseAppState.mockReturnValue(buildAppStateMock());
    render(<ReleaseChangesTab release={buildRelease()} />);

    expect(screen.getByText(/No changes found/i)).toBeInTheDocument();
  });

  it("requires migration notes for breaking changes", async () => {
    const user = userEvent.setup();
    const appStateMock = buildAppStateMock();
    mockedUseAppState.mockReturnValue(appStateMock);

    render(<ReleaseChangesTab release={buildRelease()} />);

    await user.click(screen.getByRole("button", { name: /Add Change/i }));
    const createButton = screen.getByRole("button", { name: /Create Change/i });
    const form = createButton.closest("form");
    expect(form).not.toBeNull();

    await user.type(within(form as HTMLElement).getByLabelText(/Title/i), "Auth payload changed");
    await user.type(within(form as HTMLElement).getByLabelText(/^Scope$/i), "auth");
    await user.selectOptions(within(form as HTMLElement).getByLabelText(/Breaking Change/i), "yes");
    await user.click(createButton);

    expect(
      screen.getByText(/Migration notes are required for breaking changes/i),
    ).toBeInTheDocument();
    expect(appStateMock.addChange).not.toHaveBeenCalled();

    await user.type(
      within(form as HTMLElement).getByLabelText(/Migration Notes/i),
      "Update SDK to v2.",
    );
    await user.click(createButton);

    expect(appStateMock.addChange).toHaveBeenCalledTimes(1);
  });

  it("filters changes by type and executes bulk delete", async () => {
    const user = userEvent.setup();
    const appStateMock = buildAppStateMock();
    mockedUseAppState.mockReturnValue(appStateMock);

    const release = buildRelease({
      changes: [
        {
          id: "chg_feature",
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
        {
          id: "chg_bugfix",
          title: "Bugfix B",
          description: "Fixes issue B",
          type: "bugfix",
          scope: "billing",
          audiences: ["technical"],
          risk: "high",
          isBreaking: false,
          links: [],
          createdAt: "2026-02-01T10:00:00.000Z",
          updatedAt: "2026-02-01T10:00:00.000Z",
        },
      ],
    });

    render(<ReleaseChangesTab release={release} />);

    const typeSelect = screen.getByLabelText(/Filter Type/i);
    await user.selectOptions(typeSelect, "bugfix");

    expect(screen.queryByText("Feature A")).not.toBeInTheDocument();
    expect(screen.getByText("Bugfix B")).toBeInTheDocument();

    const bugfixCard = screen.getByText("Bugfix B").closest("article");
    expect(bugfixCard).not.toBeNull();
    const checkbox = within(bugfixCard as HTMLElement).getByRole("checkbox");
    await user.click(checkbox);

    const deleteButtons = screen.getAllByRole("button", { name: /^Delete$/i });
    await user.click(deleteButtons[0]);
    expect(appStateMock.bulkDeleteChanges).toHaveBeenCalledWith("rel_1", ["chg_bugfix"]);
  });
});
