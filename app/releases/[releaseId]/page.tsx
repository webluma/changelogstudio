"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ReleaseChangesTab } from "@/components/release-changes-tab";
import { ReleaseStatusBadge } from "@/components/release-status-badge";
import { RELEASE_STATUSES } from "@/lib/domain/types";
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

const TAB_DESCRIPTION: Record<WorkspaceTab, string> = {
  changes:
    "Structured change management lands in Phase 3. This tab is already wired to release metadata and status.",
  drafts:
    "AI generation and versioned drafts land in Phases 4 and 5 with diff support and primary draft control.",
  review:
    "Editorial checklist and section comments land in Phase 6.",
  publish:
    "Markdown/JSON exports and publish metadata land in Phase 7.",
  audit:
    "Audit events are already persisted. Phase 8 expands event coverage across all critical actions.",
};

export default function ReleaseWorkspacePage() {
  const params = useParams<{ releaseId: string }>();
  const releaseId = params.releaseId;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("changes");
  const [notFoundReleaseId, setNotFoundReleaseId] = useState<string | null>(null);

  const { isHydrated, releases, auditLog, getReleaseById, setReleaseStatus, logReleaseViewed } =
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
          href="/"
          className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Back to releases
        </Link>
      </section>
    );
  }

  if (!release) {
    return null;
  }

  return (
    <section className="page-enter space-y-6">
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
              disabled
              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500"
            >
              Generate
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500"
            >
              Export
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500"
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

          {activeTab !== "changes" ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                {TAB_OPTIONS.find((tab) => tab.id === activeTab)?.label}
              </h3>
              <p className="mt-2 text-sm text-slate-700">{TAB_DESCRIPTION[activeTab]}</p>
            </div>
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

          {activeTab !== "changes" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-700">
                Workspace health: {releases.length} release(s) currently tracked.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
