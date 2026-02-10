import { act, renderHook, waitFor } from "@testing-library/react";
import { AppStateProvider, useAppState } from "@/lib/state/app-state";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}

describe("AppState review status transitions", () => {
  it("moves release from draft to in_review when a review checklist item is changed", async () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    let releaseId = "";
    act(() => {
      releaseId = result.current.createRelease({
        name: "Release Checklist Transition",
        versionLabel: "v1.0.0",
      });
    });

    await waitFor(() => {
      expect(result.current.getReleaseById(releaseId)?.status).toBe("draft");
    });

    act(() => {
      result.current.setReviewChecklistItem(releaseId, "audience_match", true);
    });

    await waitFor(() => {
      expect(result.current.getReleaseById(releaseId)?.status).toBe("in_review");
    });
  });

  it("moves release from draft to in_review when a review comment is added", async () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    let releaseId = "";
    act(() => {
      releaseId = result.current.createRelease({
        name: "Release Comment Transition",
        versionLabel: "v1.0.1",
      });
    });

    await waitFor(() => {
      expect(result.current.getReleaseById(releaseId)?.status).toBe("draft");
    });

    act(() => {
      result.current.addReviewComment(releaseId, {
        section: "overview",
        message: "Clarify customer-facing wording.",
      });
    });

    await waitFor(() => {
      expect(result.current.getReleaseById(releaseId)?.status).toBe("in_review");
    });
  });
});
