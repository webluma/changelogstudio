"use client";

import { useMemo, useState } from "react";
import type { Release } from "@/lib/domain/types";
import { useAppState } from "@/lib/state/app-state";
import { formatDate } from "@/lib/utils/format";

export function ReleaseDraftsTab({ release }: { release: Release }) {
  const { setPrimaryDraft } = useAppState();
  const [selectedDraftId, setSelectedDraftId] = useState<string | undefined>(
    release.primaryDraftId ?? release.drafts[release.drafts.length - 1]?.id,
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const orderedDrafts = useMemo(() => {
    return [...release.drafts].sort((a, b) => b.version - a.version);
  }, [release.drafts]);

  const fallbackDraftId = release.primaryDraftId ?? orderedDrafts[0]?.id;
  const resolvedSelectedDraftId = orderedDrafts.some((draft) => draft.id === selectedDraftId)
    ? selectedDraftId
    : fallbackDraftId;
  const selectedDraft = orderedDrafts.find((draft) => draft.id === resolvedSelectedDraftId);

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
            const isSelected = selectedDraftId === draft.id;
            return (
              <button
                key={draft.id}
                type="button"
                onClick={() => setSelectedDraftId(draft.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
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
                <button
                  type="button"
                  onClick={() => {
                    const promoted = setPrimaryDraft(release.id, selectedDraft.id);
                    if (promoted) {
                      setFeedback(`Draft v${selectedDraft.version} is now primary.`);
                    }
                  }}
                  className="ml-auto rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Set as Primary
                </button>
              </div>
              <pre className="mt-3 max-h-[560px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-wrap">
                {selectedDraft.content}
              </pre>
            </>
          ) : (
            <p className="text-sm text-slate-600">Select a draft to preview.</p>
          )}
        </div>
      </div>
    </section>
  );
}
