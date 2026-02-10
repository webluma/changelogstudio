"use client";

import { useEffect, useMemo, useState } from "react";
import type { DraftGenerationConfig, GenerateDraftResponse } from "@/lib/ai/types";
import {
  AUDIENCES,
  DRAFT_FORMATS,
  GENERATION_LENGTHS,
  GENERATION_TONES,
  type Audience,
  type DraftFormat,
  type GenerationLength,
  type GenerationTone,
  type Release,
} from "@/lib/domain/types";
import { useAppState } from "@/lib/state/app-state";

const PROGRESS_MESSAGES = [
  "Analyzing release changes...",
  "Organizing by audience and risk...",
  "Drafting release sections...",
  "Finalizing output format...",
];

function defaultConfig(): DraftGenerationConfig {
  return {
    audience: "customer",
    tone: "professional",
    length: "standard",
    format: "markdown",
    sections: {
      includeBreakingChanges: true,
      includeMigrationSteps: true,
      includeRolloutRollback: true,
      includeKnownIssues: true,
      includeSupportFaq: true,
    },
  };
}

export function GenerateDraftModal({
  release,
  onClose,
  onGenerated,
}: {
  release: Release;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const { addDraft } = useAppState();
  const [config, setConfig] = useState<DraftGenerationConfig>(defaultConfig);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);

  const hasChanges = release.changes.length > 0;
  const qualitySummary = useMemo(() => {
    return release.changes.reduce(
      (accumulator, change) => {
        if (!change.description.trim()) {
          accumulator.missingDescription += 1;
        }
        if (!change.scope.trim()) {
          accumulator.missingScope += 1;
        }
        if (change.audiences.length === 0) {
          accumulator.missingAudience += 1;
        }
        if (change.isBreaking && !(change.migrationNotes ?? "").trim()) {
          accumulator.missingMigration += 1;
        }
        if (!change.customerImpact?.trim()) {
          accumulator.missingCustomerImpact += 1;
        }
        if (!change.supportNotes?.trim()) {
          accumulator.missingSupportNotes += 1;
        }
        if (change.links.length === 0) {
          accumulator.missingLinks += 1;
        }
        return accumulator;
      },
      {
        missingDescription: 0,
        missingScope: 0,
        missingAudience: 0,
        missingMigration: 0,
        missingCustomerImpact: 0,
        missingSupportNotes: 0,
        missingLinks: 0,
      },
    );
  }, [release.changes]);
  const criticalMissingTotal =
    qualitySummary.missingDescription +
    qualitySummary.missingScope +
    qualitySummary.missingAudience +
    qualitySummary.missingMigration;
  const canGenerate = hasChanges && !isGenerating && criticalMissingTotal === 0;

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgressIndex((current) => (current + 1) % PROGRESS_MESSAGES.length);
    }, 1100);

    return () => {
      window.clearInterval(interval);
    };
  }, [isGenerating]);

  const progressMessage = useMemo(() => {
    return PROGRESS_MESSAGES[progressIndex];
  }, [progressIndex]);

  async function handleGenerate() {
    if (!canGenerate) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setProgressIndex(0);

    try {
      const payload = {
        release: {
          id: release.id,
          name: release.name,
          versionLabel: release.versionLabel,
          dateStart: release.dateStart,
          dateEnd: release.dateEnd,
        },
        changes: release.changes,
        config,
      };

      const response = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GenerateDraftResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Draft generation failed.");
      }

      const draftId = addDraft(release.id, {
        source: "ai",
        content: data.rendered,
        format: data.format,
        audience: config.audience,
        tone: config.tone,
        length: config.length,
        title: data.structured.headline,
      });

      if (!draftId) {
        throw new Error("Could not save generated draft.");
      }

      onGenerated();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Draft generation failed.";
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleSection(key: keyof DraftGenerationConfig["sections"]) {
    setConfig((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [key]: !current.sections[key],
      },
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-xl font-semibold text-slate-900">Generate Draft</h3>
          <p className="mt-1 text-sm text-slate-600">
            Configure audience, tone, and sections. Guardrails are enforced: no inventions,
            no future commitments, explicit missing details when needed.
          </p>
        </header>

        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">How to Configure This Step</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <p>
                <span className="font-semibold">Audience:</span> Choose who will read this output
                first (customer, technical, internal, support).
              </p>
              <p>
                <span className="font-semibold">Tone:</span> Use professional for formal releases,
                direct for concise technical notes, friendly for customer updates.
              </p>
              <p>
                <span className="font-semibold">Length:</span> Short for highlights, standard for
                most releases, detailed for complex rollouts.
              </p>
              <p>
                <span className="font-semibold">Sections:</span> Enable only what this audience
                needs to reduce noise and improve clarity.
              </p>
            </div>
          </div>

          {!hasChanges ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Add at least one change before generating a draft.
            </div>
          ) : null}

          {hasChanges ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                criticalMissingTotal === 0
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              <p className="font-semibold">AI Input Quality Check</p>
              {criticalMissingTotal === 0 ? (
                <p className="mt-1">
                  Critical fields are complete. Draft generation is ready.
                </p>
              ) : (
                <p className="mt-1">
                  Complete critical fields in Changes before generating drafts.
                </p>
              )}
              <ul className="mt-2 grid gap-1 text-xs md:grid-cols-2">
                <li>Missing descriptions: {qualitySummary.missingDescription}</li>
                <li>Missing scope: {qualitySummary.missingScope}</li>
                <li>Missing audience relevance: {qualitySummary.missingAudience}</li>
                <li>Breaking changes without migration: {qualitySummary.missingMigration}</li>
                <li>Missing customer impact (recommended): {qualitySummary.missingCustomerImpact}</li>
                <li>Missing support notes (recommended): {qualitySummary.missingSupportNotes}</li>
                <li>Changes without links (recommended): {qualitySummary.missingLinks}</li>
              </ul>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Audience
              </legend>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((audience) => (
                  <button
                    key={audience}
                    type="button"
                    onClick={() =>
                      setConfig((current) => ({
                        ...current,
                        audience: audience as Audience,
                      }))
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      config.audience === audience
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {audience}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Tone</span>
              <select
                value={config.tone}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    tone: event.target.value as GenerationTone,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {GENERATION_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Length</span>
              <select
                value={config.length}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    length: event.target.value as GenerationLength,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {GENERATION_LENGTHS.map((length) => (
                  <option key={length} value={length}>
                    {length}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Format</span>
              <select
                value={config.format}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    format: event.target.value as DraftFormat,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {DRAFT_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Include Sections
            </legend>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.sections.includeBreakingChanges}
                  onChange={() => toggleSection("includeBreakingChanges")}
                />
                Breaking changes
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.sections.includeMigrationSteps}
                  onChange={() => toggleSection("includeMigrationSteps")}
                />
                Migration steps
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.sections.includeRolloutRollback}
                  onChange={() => toggleSection("includeRolloutRollback")}
                />
                Rollout / rollback
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.sections.includeKnownIssues}
                  onChange={() => toggleSection("includeKnownIssues")}
                />
                Known issues
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.sections.includeSupportFaq}
                  onChange={() => toggleSection("includeSupportFaq")}
                />
                Support FAQ
              </label>
            </div>
          </fieldset>

          {isGenerating ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {progressMessage}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Draft"}
          </button>
        </footer>
      </div>
    </div>
  );
}
