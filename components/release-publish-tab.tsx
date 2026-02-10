"use client";

import { useMemo, useState } from "react";
import type { Release } from "@/lib/domain/types";
import { getPublishReadiness } from "@/lib/domain/publish-readiness";
import {
  buildReleaseJsonExport,
  buildReleaseMarkdownExport,
  createReleaseExportBaseName,
  getReleaseActiveDraft,
} from "@/lib/export/release-export";
import { useAppState } from "@/lib/state/app-state";
import { formatDate, formatDateWindow } from "@/lib/utils/format";

interface ReleasePublishTabProps {
  release: Release;
  onPublished?: () => void;
}

function triggerFileDownload(filename: string, content: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export function ReleasePublishTab({ release, onPublished }: ReleasePublishTabProps) {
  const { publishRelease, logExportDownloaded } = useAppState();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const readiness = useMemo(() => getPublishReadiness(release), [release]);
  const activeDraft = useMemo(() => getReleaseActiveDraft(release), [release]);
  const exportBaseName = useMemo(() => createReleaseExportBaseName(release), [release]);

  function clearMessages() {
    setFeedback(null);
    setErrorMessage(null);
  }

  async function handleCopyMarkdown() {
    clearMessages();

    if (!activeDraft) {
      setErrorMessage("Generate a draft before exporting.");
      return;
    }

    try {
      const markdown = buildReleaseMarkdownExport(release);
      await navigator.clipboard.writeText(markdown);
      logExportDownloaded(release.id, "markdown");
      setFeedback("Markdown copied to clipboard.");
    } catch {
      setErrorMessage("Clipboard copy failed in this browser. Use Download .md instead.");
    }
  }

  function handleDownloadMarkdown() {
    clearMessages();

    if (!activeDraft) {
      setErrorMessage("Generate a draft before exporting.");
      return;
    }

    const markdown = buildReleaseMarkdownExport(release);
    triggerFileDownload(`${exportBaseName}.md`, markdown, "text/markdown;charset=utf-8");
    logExportDownloaded(release.id, "markdown");
    setFeedback("Markdown file downloaded.");
  }

  function handleDownloadJson() {
    clearMessages();

    const payload = buildReleaseJsonExport(release);
    const json = JSON.stringify(payload, null, 2);
    triggerFileDownload(`${exportBaseName}.json`, json, "application/json;charset=utf-8");
    logExportDownloaded(release.id, "json");
    setFeedback("JSON export downloaded.");
  }

  function handlePublish() {
    clearMessages();

    if (!readiness.canPublish) {
      setErrorMessage("Resolve publish blockers before publishing.");
      return;
    }

    const published = publishRelease(release.id);
    if (!published) {
      setErrorMessage("Release was not found.");
      return;
    }

    setFeedback(
      release.status === "published"
        ? "Release republished and timestamp refreshed."
        : "Release published successfully.",
    );
    onPublished?.();
  }

  return (
    <section className="space-y-4">
      {feedback ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
            Publish Readiness
          </h3>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              readiness.canPublish
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {readiness.canPublish ? "Ready to publish" : "Blocked"}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            Checklist {readiness.completedChecklistItems}/{readiness.totalChecklistItems}
          </span>
        </div>

        {readiness.blockers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-700">
            Publish guardrails are satisfied. You can publish this release.
          </p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {readiness.blockers.map((blocker) => (
              <li key={blocker}>- {blocker}</li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={handlePublish}
          disabled={!readiness.canPublish}
          className={`mt-4 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            readiness.canPublish
              ? "bg-slate-900 text-white hover:bg-slate-700"
              : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
          }`}
        >
          {release.status === "published" ? "Republish Release" : "Publish Release"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
          Export Outputs
        </h3>
        <p className="mt-2 text-sm text-slate-700">
          Export uses the primary draft (or latest version if none is marked as primary).
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            disabled={!activeDraft}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy Markdown
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            disabled={!activeDraft}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download .md
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Download .json
          </button>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500"
          >
            Generate RSS (coming soon)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
          Publish Metadata
        </h3>
        <p className="mt-2">
          Release window: {formatDateWindow(release.dateStart, release.dateEnd)}
        </p>
        <p>
          Active draft:{" "}
          {activeDraft ? `v${activeDraft.version} (${activeDraft.source})` : "No draft available"}
        </p>
        <p>Published at: {release.publishedAt ? formatDate(release.publishedAt) : "Not published"}</p>
        <p>Changelog URL: https://example.com/changelog/{release.versionLabel}</p>
      </div>
    </section>
  );
}
