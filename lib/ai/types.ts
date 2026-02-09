import type {
  Audience,
  ChangeItem,
  DraftFormat,
  GenerationLength,
  GenerationTone,
} from "@/lib/domain/types";

export interface GenerationSectionsConfig {
  includeBreakingChanges: boolean;
  includeMigrationSteps: boolean;
  includeRolloutRollback: boolean;
  includeKnownIssues: boolean;
  includeSupportFaq: boolean;
}

export interface DraftGenerationConfig {
  audience: Audience;
  tone: GenerationTone;
  length: GenerationLength;
  format: DraftFormat;
  sections: GenerationSectionsConfig;
}

export interface GenerateDraftRequest {
  release: {
    id: string;
    name: string;
    versionLabel: string;
    dateStart?: string;
    dateEnd?: string;
  };
  changes: ChangeItem[];
  config: DraftGenerationConfig;
}

export interface GeneratedSections {
  features: string[];
  fixes: string[];
  improvements: string[];
  security: string[];
  breakingChanges: string[];
  deprecations: string[];
  knownIssues: string[];
  migrationNotes: string[];
}

export interface GeneratedDraftPayload {
  headline: string;
  summary: string;
  sections: GeneratedSections;
  supportFaq: string[];
  rolloutPlan: string[];
  missingInfo: string[];
}

export interface GenerateDraftResponse {
  structured: GeneratedDraftPayload;
  rendered: string;
  format: DraftFormat;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isValidGeneratedDraftPayload(value: unknown): value is GeneratedDraftPayload {
  if (!isRecord(value)) {
    return false;
  }

  if (!isRecord(value.sections)) {
    return false;
  }

  const sections = value.sections;
  return (
    typeof value.headline === "string" &&
    typeof value.summary === "string" &&
    isStringArray(sections.features) &&
    isStringArray(sections.fixes) &&
    isStringArray(sections.improvements) &&
    isStringArray(sections.security) &&
    isStringArray(sections.breakingChanges) &&
    isStringArray(sections.deprecations) &&
    isStringArray(sections.knownIssues) &&
    isStringArray(sections.migrationNotes) &&
    isStringArray(value.supportFaq) &&
    isStringArray(value.rolloutPlan) &&
    isStringArray(value.missingInfo)
  );
}

export function createEmptyGeneratedDraft(): GeneratedDraftPayload {
  return {
    headline: "",
    summary: "",
    sections: {
      features: [],
      fixes: [],
      improvements: [],
      security: [],
      breakingChanges: [],
      deprecations: [],
      knownIssues: [],
      migrationNotes: [],
    },
    supportFaq: [],
    rolloutPlan: [],
    missingInfo: [],
  };
}
