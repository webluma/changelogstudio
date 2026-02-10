import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReleaseAuditTab } from "@/components/release-audit-tab";
import type { AuditEvent } from "@/lib/domain/types";

function buildEvents(): AuditEvent[] {
  return [
    {
      id: "evt_1",
      event: "release.created",
      actor: "user",
      timestamp: "2026-02-10T10:00:00.000Z",
      releaseId: "rel_1",
      metadata: { releaseName: "Release One", versionLabel: "v1.0.0" },
    },
    {
      id: "evt_2",
      event: "draft.generated",
      actor: "ai",
      timestamp: "2026-02-10T11:00:00.000Z",
      releaseId: "rel_1",
      metadata: { version: 1, format: "markdown" },
    },
    {
      id: "evt_3",
      event: "export.downloaded",
      actor: "user",
      timestamp: "2026-02-10T12:00:00.000Z",
      releaseId: "rel_1",
      metadata: { format: "json" },
    },
  ];
}

describe("ReleaseAuditTab", () => {
  it("renders empty state when no events exist", () => {
    render(<ReleaseAuditTab events={[]} />);
    expect(screen.getByText(/No audit events for this release yet/i)).toBeInTheDocument();
  });

  it("renders readable event titles and metadata", () => {
    render(<ReleaseAuditTab events={buildEvents()} />);
    expect(screen.getByText("Release created")).toBeInTheDocument();
    expect(screen.getByText("Draft generated")).toBeInTheDocument();
    expect(screen.getByText("Export downloaded")).toBeInTheDocument();
    expect(screen.getByText(/Format: json/i)).toBeInTheDocument();
  });

  it("filters events by category", async () => {
    const user = userEvent.setup();
    render(<ReleaseAuditTab events={buildEvents()} />);

    await user.click(screen.getByRole("button", { name: "Exports" }));

    expect(screen.getByText("Export downloaded")).toBeInTheDocument();
    expect(screen.queryByText("Release created")).not.toBeInTheDocument();
    expect(screen.queryByText("Draft generated")).not.toBeInTheDocument();
  });
});
