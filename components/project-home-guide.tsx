"use client";

import Link from "next/link";

interface ProjectHomeGuideProps {
  releasesCount: number;
  primaryActionLabel: string;
  onPrimaryActionPath: string;
}

export function ProjectHomeGuide({
  releasesCount,
  primaryActionLabel,
  onPrimaryActionPath,
}: ProjectHomeGuideProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Project Overview
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            What is Changelog Studio?
          </h2>
          <p className="text-sm text-slate-700">
            Changelog Studio is a release notes copilot for product and engineering teams.
            It turns raw release inputs into clear, audience-specific outputs with editorial
            control, versioning, review workflows, and auditability.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {releasesCount} release(s) in workspace
          </span>
          <Link
            href={onPrimaryActionPath}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {primaryActionLabel}
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">
            Outputs
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>Customer-facing changelog</li>
            <li>Technical release notes</li>
            <li>Internal notes for Support/CS/QA</li>
            <li>Risk, rollout, rollback, and migration sections</li>
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">
            Workflow
          </h3>
          <ol className="mt-2 space-y-1 text-sm text-slate-700">
            <li>1. Create a release with version and date window.</li>
            <li>2. Add structured changes in the Changes tab.</li>
            <li>3. Generate drafts for the target audience.</li>
            <li>4. Compare versions and promote the primary draft.</li>
            <li>5. Run editorial review checklist and comments.</li>
          </ol>
        </article>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">
          What to Write in Each Section
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Release Setup
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Use a specific release name, semantic version label, and real date range.
              Example: <span className="font-medium">Billing Reliability Improvements · v1.8.0</span>.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Changes Tab
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Write one concrete change per entry: clear title, factual description, scope,
              risk, and audience relevance. If breaking, include migration steps.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Generate Draft
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Pick audience first, then tone and length. Enable only the sections you need
              for that audience to keep the output focused and actionable.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Review Tab
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Use comments as editorial actions, not generic feedback.
              Example: <span className="font-medium">“Clarify customer impact without API jargon.”</span>
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
