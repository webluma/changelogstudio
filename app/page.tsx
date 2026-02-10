"use client";

import Link from "next/link";
import { ProjectHomeGuide } from "@/components/project-home-guide";
import { useAppState } from "@/lib/state/app-state";

export default function HomePage() {
  const { releases } = useAppState();

  return (
    <section className="page-enter space-y-6">
      <ProjectHomeGuide
        releasesCount={releases.length}
        primaryActionLabel="Open Workspace"
        onPrimaryActionPath="/workspace"
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
          Start Here
        </h3>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          <li>1. Open the Workspace and create a release (or load the example release).</li>
          <li>2. Add changes with title, scope, risk, and audience relevance.</li>
          <li>3. Generate draft notes with audience/tone configuration.</li>
          <li>4. Compare versions in Drafts and select the primary draft.</li>
          <li>5. Complete Review checklist and section comments before publish.</li>
        </ol>
        <Link
          href="/workspace"
          className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Go to Workspace
        </Link>
      </div>
    </section>
  );
}
