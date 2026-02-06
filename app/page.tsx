"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ReleaseStatusBadge } from "@/components/release-status-badge";
import { getReleaseStats } from "@/lib/domain/release-stats";
import { useAppState } from "@/lib/state/app-state";
import { formatDateWindow, formatRelativeTime } from "@/lib/utils/format";

export default function Home() {
  const router = useRouter();
  const { isHydrated, storageError, releases, createRelease, duplicateRelease } = useAppState();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [openingReleaseId, setOpeningReleaseId] = useState<string | null>(null);
  const [showOpeningOverlay, setShowOpeningOverlay] = useState(false);
  const openTimerRef = useRef<number | null>(null);
  const overlayTimerRef = useRef<number | null>(null);

  const orderedReleases = useMemo(() => {
    return [...releases].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [releases]);

  function clearForm() {
    setName("");
    setVersionLabel("");
    setDateStart("");
    setDateEnd("");
  }

  function clearNavigationTimers() {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (overlayTimerRef.current) {
      window.clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearNavigationTimers();
    };
  }, []);

  function handleCreateRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !versionLabel.trim()) {
      return;
    }

    const releaseId = createRelease({
      name: name.trim(),
      versionLabel: versionLabel.trim(),
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
    });

    clearForm();
    setIsCreateOpen(false);
    openReleaseWorkspace(releaseId);
  }

  function handleDuplicateRelease(releaseId: string) {
    const duplicatedReleaseId = duplicateRelease(releaseId);
    if (duplicatedReleaseId) {
      openReleaseWorkspace(duplicatedReleaseId);
    }
  }

  function handleOpenRelease(releaseId: string) {
    openReleaseWorkspace(releaseId);
  }

  function openReleaseWorkspace(releaseId: string) {
    if (openingReleaseId) {
      return;
    }

    clearNavigationTimers();
    setOpeningReleaseId(releaseId);
    setShowOpeningOverlay(false);
    const targetPath = `/releases/${releaseId}`;
    router.prefetch(targetPath);

    // Show a loading message only if navigation is not instantly resolved.
    overlayTimerRef.current = window.setTimeout(() => {
      setShowOpeningOverlay(true);
    }, 260);

    // Keep navigation snappy while still giving a subtle exit transition.
    openTimerRef.current = window.setTimeout(() => {
      router.push(targetPath);
    }, 120);
  }

  return (
    <section className={`page-enter space-y-6 ${openingReleaseId ? "page-exit" : ""}`}>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Releases
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Release Planning Workspace</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Create releases, organize the editorial workflow, and keep technical communication
            consistent from draft to publication.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen((current) => !current)}
          disabled={Boolean(openingReleaseId)}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {isCreateOpen ? "Close Form" : "Create Release"}
        </button>
      </header>

      {storageError ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {storageError}
        </div>
      ) : null}

      {isCreateOpen ? (
        <form
          onSubmit={handleCreateRelease}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2"
        >
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Release Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Q1 Experience Improvements"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 transition focus:ring-4"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Version Label</span>
            <input
              required
              value={versionLabel}
              onChange={(event) => setVersionLabel(event.target.value)}
              placeholder="v1.8.0"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 transition focus:ring-4"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Start Date</span>
            <input
              type="date"
              value={dateStart}
              onChange={(event) => setDateStart(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 transition focus:ring-4"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">End Date</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(event) => setDateEnd(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 transition focus:ring-4"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={Boolean(openingReleaseId)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Save Release
            </button>
            <button
              type="button"
              onClick={() => {
                clearForm();
                setIsCreateOpen(false);
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!isHydrated ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : orderedReleases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-xl font-semibold text-slate-900">Create your first release</h3>
          <p className="mt-2 text-sm text-slate-600">
            Start with release metadata and build the workflow from ingestion to publishing.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create your first release
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1.3fr_1.1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <span>Release</span>
            <span>Date Window</span>
            <span>Status</span>
            <span>Counts</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>

          <div>
            {orderedReleases.map((release) => {
              const stats = getReleaseStats(release);

              return (
                <div
                  key={release.id}
                  className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1.3fr_1.1fr] items-center gap-3 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{release.name}</p>
                    <p className="truncate text-xs text-slate-500">{release.versionLabel}</p>
                  </div>
                  <p className="text-slate-700">{formatDateWindow(release.dateStart, release.dateEnd)}</p>
                  <div>
                    <ReleaseStatusBadge status={release.status} />
                  </div>
                  <p className="text-xs text-slate-600">
                    {stats.totalChanges} changes
                    <br />
                    {stats.breakingCount} breaking
                    <br />
                    {stats.highRiskCount} high risk
                  </p>
                  <p className="text-slate-600">{formatRelativeTime(release.updatedAt)}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicateRelease(release.id)}
                      disabled={Boolean(openingReleaseId)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRelease(release.id)}
                      disabled={Boolean(openingReleaseId)}
                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-slate-700"
                    >
                      Open
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showOpeningOverlay ? (
        <div className="pointer-events-none fixed inset-0 z-50 bg-slate-950/12 backdrop-blur-[1px]">
          <div className="flex h-full items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-lg">
              <p className="text-sm font-semibold text-slate-900">Opening release workspace...</p>
              <p className="mt-1 text-xs text-slate-600">
                Preparing your release context and editorial tabs.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
