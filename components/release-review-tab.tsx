"use client";

import { useMemo, useState } from "react";
import {
  REVIEW_CHECKLIST_ITEMS,
  REVIEW_SECTIONS,
  type Release,
  type ReviewSection,
} from "@/lib/domain/types";
import { useAppState } from "@/lib/state/app-state";
import { formatDate } from "@/lib/utils/format";

const SECTION_LABELS: Record<ReviewSection, string> = {
  overview: "Overview",
  features: "Features",
  fixes: "Fixes",
  improvements: "Improvements",
  security: "Security",
  breaking_changes: "Breaking Changes",
  known_issues: "Known Issues",
  support_faq: "Support FAQ",
};

export function ReleaseReviewTab({ release }: { release: Release }) {
  const { setReviewChecklistItem, addReviewComment, deleteReviewComment } = useAppState();
  const [selectedSection, setSelectedSection] = useState<ReviewSection>("overview");
  const [commentInput, setCommentInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completedItems = useMemo(() => {
    return REVIEW_CHECKLIST_ITEMS.filter((item) => release.review.checklist[item.key]).length;
  }, [release.review.checklist]);

  const commentsBySection = useMemo(() => {
    return REVIEW_SECTIONS.map((section) => ({
      section,
      comments: release.review.comments.filter((comment) => comment.section === section),
    })).filter((entry) => entry.comments.length > 0);
  }, [release.review.comments]);

  function handleAddComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setErrorMessage(null);

    const commentId = addReviewComment(release.id, {
      section: selectedSection,
      message: commentInput,
    });

    if (!commentId) {
      setErrorMessage("Write a comment before submitting.");
      return;
    }

    setCommentInput("");
    setFeedback(`Comment added to ${SECTION_LABELS[selectedSection]}.`);
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

      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <h3 className="font-semibold">How to Write Effective Review Notes</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <p>
            <span className="font-semibold">Be specific:</span> reference the exact section
            (Features, Breaking Changes, Known Issues) and the expected edit.
          </p>
          <p>
            <span className="font-semibold">Use action language:</span> &quot;Clarify&quot;,
            &quot;Shorten&quot;, &quot;Add link&quot;, &quot;Remove promise&quot;, instead of
            generic feedback.
          </p>
          <p>
            <span className="font-semibold">Keep customer notes clear:</span> avoid heavy jargon
            and internal acronyms in customer-facing sections.
          </p>
          <p>
            <span className="font-semibold">Validate risk/migration:</span> ensure breaking and
            rollout information is complete and testable.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
              Editorial Checklist
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {completedItems}/{REVIEW_CHECKLIST_ITEMS.length} complete
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {REVIEW_CHECKLIST_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={release.review.checklist[item.key]}
                  onChange={(event) => {
                    setReviewChecklistItem(release.id, item.key, event.target.checked);
                    setFeedback(null);
                    setErrorMessage(null);
                  }}
                  className="mt-0.5 h-4 w-4"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <form
            onSubmit={handleAddComment}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
              Section Comments
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Add review notes by section to keep editorial discussions organized.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-[170px_1fr]">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Section
                </span>
                <select
                  value={selectedSection}
                  onChange={(event) => setSelectedSection(event.target.value as ReviewSection)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                >
                  {REVIEW_SECTIONS.map((section) => (
                    <option key={section} value={section}>
                      {SECTION_LABELS[section]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Comment
                </span>
                <textarea
                  value={commentInput}
                  onChange={(event) => setCommentInput(event.target.value)}
                  placeholder="Example: Clarify impact for enterprise accounts and remove technical acronyms."
                  className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Add Comment
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
              Comment Threads
            </h3>
            {commentsBySection.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                No review comments yet. Add notes above to start a thread.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {commentsBySection.map((entry) => (
                  <section
                    key={entry.section}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                      {SECTION_LABELS[entry.section]}
                    </h4>
                    <div className="mt-2 space-y-2">
                      {entry.comments.map((comment) => (
                        <article
                          key={comment.id}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <p className="text-sm text-slate-700">{comment.message}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-xs text-slate-500">{formatDate(comment.createdAt)}</p>
                            <button
                              type="button"
                              onClick={() => {
                                const removed = deleteReviewComment(release.id, comment.id);
                                if (removed) {
                                  setFeedback("Comment removed.");
                                  setErrorMessage(null);
                                }
                              }}
                              className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
