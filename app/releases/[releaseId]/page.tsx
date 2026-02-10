"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GenerateDraftModal } from "@/components/generate-draft-modal";
import { ReleaseChangesTab } from "@/components/release-changes-tab";
import { ReleaseDraftsTab } from "@/components/release-drafts-tab";
import { ReleasePublishTab } from "@/components/release-publish-tab";
import { ReleaseReviewTab } from "@/components/release-review-tab";
import { ReleaseStatusBadge } from "@/components/release-status-badge";
import { getPublishReadiness } from "@/lib/domain/publish-readiness";
import { RELEASE_STATUSES } from "@/lib/domain/types";
import { getReleaseActiveDraft } from "@/lib/export/release-export";
import { useAppState } from "@/lib/state/app-state";
import { formatDate, formatDateWindow } from "@/lib/utils/format";

type WorkspaceTab = "changes" | "drafts" | "review" | "publish" | "audit";

const TAB_OPTIONS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "changes", label: "Changes" },
  { id: "drafts", label: "Drafts" },
  { id: "review", label: "Review" },
  { id: "publish", label: "Publish" },
  { id: "audit", label: "Audit Log" },
];

export default function ReleaseWorkspacePage() {
  const params = useParams<{ releaseId: string }>();
  const releaseId = params.releaseId;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("changes");
  const [notFoundReleaseId, setNotFoundReleaseId] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);

  const {
    isHydrated,
    releases,
    auditLog,
    getReleaseById,
    setReleaseStatus,
    publishRelease,
    logReleaseViewed,
  } =
    useAppState();

  const release = getReleaseById(releaseId);

  useEffect(() => {
    if (releaseId) {
      logReleaseViewed(releaseId);
    }
  }, [logReleaseViewed, releaseId]);

  useEffect(() => {
    if (!isHydrated || release) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotFoundReleaseId(releaseId);
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isHydrated, release, releaseId]);

  const releaseAuditEvents = useMemo(() => {
    return auditLog
      .filter((event) => event.releaseId === releaseId)
      .slice(0, 8);
  }, [auditLog, releaseId]);

  if (!isHydrated) {
    return (
      <section className="page-enter space-y-4">
        <div className="h-10 w-80 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (!release && notFoundReleaseId !== releaseId) {
    return (
      <section className="page-enter space-y-4">
        <div className="h-10 w-80 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (!release && notFoundReleaseId === releaseId) {
    return (
      <section className="page-enter rounded-2xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-semibold text-slate-900">Release not found</h2>
        <p className="mt-2 text-sm text-slate-600">
          The requested release does not exist in this workspace.
        </p>
        <Link
          href="/workspace"
          className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Back to workspace
        </Link>
      </section>
    );
  }

  if (!release) {
    return null;
  }

  const canGenerateDraft = release.changes.length > 0;
  const activeDraft = getReleaseActiveDraft(release);
  const publishReadiness = getPublishReadiness(release);
  const canExport = Boolean(activeDraft);
  const canPublish = publishReadiness.canPublish;

  return (
    <section className="page-enter space-y-6">
      {workspaceNotice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {workspaceNotice}
        </div>
      ) : null}

      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Release Workspace
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">{release.name}</h2>
          <p className="text-sm text-slate-600">
            {release.versionLabel} · {formatDateWindow(release.dateStart, release.dateEnd)}
          </p>
          <p className="text-xs text-slate-500">
            Created on {formatDate(release.createdAt)} · Updated on {formatDate(release.updatedAt)}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ReleaseStatusBadge status={release.status} />
            <select
              value={release.status}
              onChange={(event) => setReleaseStatus(release.id, event.target.value as (typeof RELEASE_STATUSES)[number])}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
            >
              {RELEASE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setWorkspaceNotice(null);
                setIsGenerateModalOpen(true);
              }}
              disabled={!canGenerateDraft}
              title={
                canGenerateDraft ? "Open draft generator" : "Add at least one change to enable generation"
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                canGenerateDraft
                  ? "border border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
                  : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("publish");
                setWorkspaceNotice(canExport ? "Publish tab opened. Choose your export format." : null);
              }}
              disabled={!canExport}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                canExport
                  ? "border border-slate-300 text-slate-700 hover:bg-slate-100"
                  : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canPublish) {
                  setActiveTab("publish");
                  setWorkspaceNotice("Publish is blocked. Resolve blockers in the Publish tab.");
                  return;
                }

                const published = publishRelease(release.id);
                if (published) {
                  setActiveTab("publish");
                  setWorkspaceNotice("Release published successfully.");
                }
              }}
              disabled={!canPublish}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                canPublish
                  ? "border border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
                  : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              Publish
            </button>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-5">
          {activeTab === "changes" ? <ReleaseChangesTab release={release} /> : null}
          {activeTab === "drafts" ? <ReleaseDraftsTab release={release} /> : null}
          {activeTab === "review" ? <ReleaseReviewTab release={release} /> : null}

          {activeTab === "publish" ? (
            <ReleasePublishTab
              release={release}
              onPublished={() => setWorkspaceNotice("Release published successfully.")}
            />
          ) : null}

          {activeTab === "audit" ? (
            <div className="space-y-2">
              {releaseAuditEvents.length === 0 ? (
                <p className="text-sm text-slate-600">No audit events for this release yet.</p>
              ) : (
                releaseAuditEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  >
                    <p className="font-medium text-slate-900">{event.event}</p>
                    <p className="text-xs text-slate-500">{formatDate(event.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeTab === "publish" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-700">
                Workspace health: {releases.length} release(s) currently tracked.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {isGenerateModalOpen ? (
        <GenerateDraftModal
          release={release}
          onClose={() => setIsGenerateModalOpen(false)}
          onGenerated={() => {
            setActiveTab("drafts");
            setWorkspaceNotice("Draft generated successfully and saved as a new version.");
          }}
        />
      ) : null}
    </section>
  );
}
