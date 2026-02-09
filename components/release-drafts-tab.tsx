"use client";

import { useMemo, useState } from "react";
import type { Release } from "@/lib/domain/types";
import { useAppState } from "@/lib/state/app-state";
import { buildLineDiff } from "@/lib/utils/diff";
import { formatDate } from "@/lib/utils/format";

export function ReleaseDraftsTab({ release }: { release: Release }) {
  const { setPrimaryDraft } = useAppState();
  const [selectedDraftId, setSelectedDraftId] = useState<string | undefined>(
    release.primaryDraftId ?? release.drafts[release.drafts.length - 1]?.id,
  );
  const [compareDraftId, setCompareDraftId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"preview" | "diff">("preview");
  const [feedback, setFeedback] = useState<string | null>(null);

  const orderedDrafts = useMemo(() => {
    return [...release.drafts].sort((a, b) => b.version - a.version);
  }, [release.drafts]);

  const fallbackDraftId = release.primaryDraftId ?? orderedDrafts[0]?.id;
  const resolvedSelectedDraftId = orderedDrafts.some((draft) => draft.id === selectedDraftId)
    ? selectedDraftId
    : fallbackDraftId;
  const selectedDraft = orderedDrafts.find((draft) => draft.id === resolvedSelectedDraftId);
  const compareCandidates = useMemo(() => {
    if (!resolvedSelectedDraftId) {
      return orderedDrafts;
    }
    return orderedDrafts.filter((draft) => draft.id !== resolvedSelectedDraftId);
  }, [orderedDrafts, resolvedSelectedDraftId]);
  const defaultCompareDraftId = useMemo(() => {
    if (!selectedDraft || compareCandidates.length === 0) {
      return undefined;
    }
    const previousVersion = compareCandidates.find(
      (draft) => draft.version === selectedDraft.version - 1,
    );
    return previousVersion?.id ?? compareCandidates[0]?.id;
  }, [compareCandidates, selectedDraft]);

  const resolvedCompareDraftId = compareCandidates.some(
    (draft) => draft.id === compareDraftId,
  )
    ? compareDraftId
    : defaultCompareDraftId;
  const compareDraft = compareCandidates.find((draft) => draft.id === resolvedCompareDraftId);
  const diffLines = useMemo(() => {
    if (!selectedDraft || !compareDraft) {
      return [];
    }
    return buildLineDiff(compareDraft.content, selectedDraft.content);
  }, [compareDraft, selectedDraft]);
  const diffStats = useMemo(() => {
    return diffLines.reduce(
      (accumulator, line) => {
        if (line.type === "add") {
          accumulator.added += 1;
        }
        if (line.type === "remove") {
          accumulator.removed += 1;
        }
        return accumulator;
      },
      { added: 0, removed: 0 },
    );
  }, [diffLines]);

  if (orderedDrafts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">No drafts generated yet</h3>
        <p className="mt-2 text-sm text-slate-600">
          Use Generate to create the first AI draft from the release changes.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {feedback ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {orderedDrafts.map((draft) => {
            const isPrimary = release.primaryDraftId === draft.id;
            const isSelected = resolvedSelectedDraftId === draft.id;
            return (
              <article
                key={draft.id}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDraftId(draft.id);
                    setFeedback(null);
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">v{draft.version}</p>
                    {isPrimary ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Primary
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {draft.source === "ai" ? "AI generated" : "User authored"}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(draft.createdAt)}</p>
                </button>

                {!isSelected && selectedDraft ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCompareDraftId(draft.id);
                        setViewMode("diff");
                        setFeedback(
                          `Comparing draft v${selectedDraft.version} against v${draft.version}.`,
                        );
                      }}
                      aria-label={`Diff against draft v${draft.version}`}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Diff
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {selectedDraft ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  Draft v{selectedDraft.version}
                </p>
                {selectedDraft.format ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {selectedDraft.format}
                  </span>
                ) : null}
                {selectedDraft.audience ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {selectedDraft.audience}
                  </span>
                ) : null}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("preview")}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                      viewMode === "preview"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("diff")}
                    disabled={!compareDraft}
                    aria-label="Show diff view"
                    className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                      viewMode === "diff"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Diff
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const promoted = setPrimaryDraft(release.id, selectedDraft.id);
                    if (promoted) {
                      setFeedback(`Draft v${selectedDraft.version} is now primary.`);
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Set as Primary
                </button>
              </div>
              {compareCandidates.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Compare against
                  </label>
                  <select
                    value={compareDraft?.id ?? ""}
                    onChange={(event) => {
                      setCompareDraftId(event.target.value || undefined);
                    }}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                  >
                    {compareCandidates.map((draft) => (
                      <option key={draft.id} value={draft.id}>
                        v{draft.version}
                      </option>
                    ))}
                  </select>
                  {compareDraft ? (
                    <p className="text-xs text-slate-600">
                      Comparing v{selectedDraft.version} against v{compareDraft.version} (
                      <span className="text-emerald-700">+{diffStats.added}</span> /{" "}
                      <span className="text-rose-700">-{diffStats.removed}</span>)
                    </p>
                  ) : null}
                </div>
              ) : null}

              {viewMode === "preview" ? (
                <pre className="mt-3 max-h-[560px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-800">
                  {selectedDraft.content}
                </pre>
              ) : compareDraft ? (
                <div className="mt-3 max-h-[560px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  {diffLines.length === 0 ? (
                    <p className="text-slate-600">No changes between selected versions.</p>
                  ) : (
                    <div className="space-y-0.5 font-mono">
                      {diffLines.map((line, index) => (
                        <div
                          key={`${line.type}-${line.oldLineNumber ?? 0}-${line.newLineNumber ?? 0}-${index}`}
                          className={`grid grid-cols-[52px_52px_1fr] gap-2 rounded px-2 py-0.5 ${
                            line.type === "add"
                              ? "bg-emerald-50 text-emerald-900"
                              : line.type === "remove"
                                ? "bg-rose-50 text-rose-900"
                                : "text-slate-600"
                          }`}
                        >
                          <span className="text-[10px] opacity-70">
                            {line.oldLineNumber ?? ""}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {line.newLineNumber ?? ""}
                          </span>
                          <span className="whitespace-pre-wrap break-words">
                            {line.type === "add"
                              ? `+ ${line.value}`
                              : line.type === "remove"
                                ? `- ${line.value}`
                                : `  ${line.value}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Add at least one more draft version to enable diff view.
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-600">Select a draft to preview.</p>
          )}
        </div>
      </div>
    </section>
  );
}
