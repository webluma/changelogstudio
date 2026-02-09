import type {
  DraftGenerationConfig,
  GeneratedDraftPayload,
} from "@/lib/ai/types";

function formatBulletSection(title: string, items: string[]): string {
  if (items.length === 0) {
    return "";
  }

  const lines = items.map((item) => `- ${item}`).join("\n");
  return `## ${title}\n${lines}\n`;
}

export function renderGeneratedDraft(
  payload: GeneratedDraftPayload,
  config: DraftGenerationConfig,
): string {
  if (config.format === "json") {
    return JSON.stringify(payload, null, 2);
  }

  const sections: string[] = [];
  sections.push(`# ${payload.headline}`);
  sections.push(payload.summary ? `${payload.summary}\n` : "");

  sections.push(formatBulletSection("Features", payload.sections.features));
  sections.push(formatBulletSection("Fixes", payload.sections.fixes));
  sections.push(formatBulletSection("Improvements", payload.sections.improvements));
  sections.push(formatBulletSection("Security", payload.sections.security));

  if (config.sections.includeBreakingChanges) {
    sections.push(
      formatBulletSection("Breaking Changes", payload.sections.breakingChanges),
    );
  }

  sections.push(formatBulletSection("Deprecations", payload.sections.deprecations));

  if (config.sections.includeMigrationSteps) {
    sections.push(formatBulletSection("Migration Notes", payload.sections.migrationNotes));
  }

  if (config.sections.includeKnownIssues) {
    sections.push(formatBulletSection("Known Issues", payload.sections.knownIssues));
  }

  if (config.sections.includeRolloutRollback) {
    sections.push(formatBulletSection("Rollout Plan", payload.rolloutPlan));
  }

  if (config.sections.includeSupportFaq) {
    sections.push(formatBulletSection("Support FAQ", payload.supportFaq));
  }

  if (payload.missingInfo.length > 0) {
    sections.push(formatBulletSection("Missing Info", payload.missingInfo));
  }

  return sections.filter(Boolean).join("\n").trim();
}
