import { renderGeneratedDraft } from "@/lib/ai/render-draft";
import type { DraftGenerationConfig, GeneratedDraftPayload } from "@/lib/ai/types";

function buildPayload(): GeneratedDraftPayload {
  return {
    headline: "Changelog Studio v1.2.0",
    summary: "This release improves reliability and release authoring speed.",
    sections: {
      features: ["Added bulk risk tagging in Changes tab."],
      fixes: ["Fixed duplicate release timestamp mismatch."],
      improvements: ["Improved workspace transition smoothness."],
      security: ["Hardened server-side key handling."],
      breakingChanges: ["API scope field renamed to componentScope."],
      deprecations: ["Legacy release metadata endpoint is deprecated."],
      knownIssues: ["JSON export schema diff view is pending."],
      migrationNotes: ["Rename scope references to componentScope in clients."],
    },
    supportFaq: ["How can I access the latest published notes? Use Export > Markdown."],
    rolloutPlan: ["Enable for internal team first, then customer-facing rollout."],
    missingInfo: ["Missing support macro link for billing questions."],
  };
}

function buildConfig(overrides?: Partial<DraftGenerationConfig>): DraftGenerationConfig {
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
    ...overrides,
  };
}

describe("renderGeneratedDraft", () => {
  it("renders markdown sections according to config toggles", () => {
    const output = renderGeneratedDraft(
      buildPayload(),
      buildConfig({
        sections: {
          includeBreakingChanges: false,
          includeMigrationSteps: true,
          includeRolloutRollback: true,
          includeKnownIssues: false,
          includeSupportFaq: true,
        },
      }),
    );

    expect(output).toContain("# Changelog Studio v1.2.0");
    expect(output).toContain("## Features");
    expect(output).toContain("## Migration Notes");
    expect(output).toContain("## Support FAQ");
    expect(output).not.toContain("## Breaking Changes");
    expect(output).not.toContain("## Known Issues");
  });

  it("returns structured JSON when format is json", () => {
    const payload = buildPayload();
    const output = renderGeneratedDraft(payload, buildConfig({ format: "json" }));

    expect(() => JSON.parse(output)).not.toThrow();
    expect(JSON.parse(output)).toEqual(payload);
  });
});
