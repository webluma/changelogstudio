import { getReleaseStats } from "@/lib/domain/release-stats";
import type { DraftVersion, Release } from "@/lib/domain/types";

export interface ReleaseJsonExport {
  generatedAt: string;
  release: {
    id: string;
    name: string;
    versionLabel: string;
    status: string;
    publishedAt?: string;
    dateStart?: string;
    dateEnd?: string;
    stats: {
      totalChanges: number;
      breakingCount: number;
      highRiskCount: number;
    };
  };
  draft?: {
    id: string;
    version: number;
    source: "ai" | "user";
    format?: string;
    audience?: string;
    tone?: string;
    length?: string;
    title?: string;
    createdAt: string;
    content: string;
  };
  changes: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    scope: string;
    audiences: string[];
    risk: string;
    isBreaking: boolean;
    migrationNotes?: string;
    customerImpact?: string;
    supportNotes?: string;
    links: Array<{ label: string; url: string }>;
  }>;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}

function sanitizeFileToken(value: string): string {
  return normalizeWhitespace(value).replace(/[^a-z0-9-]/g, "");
}

export function getReleaseActiveDraft(release: Release): DraftVersion | undefined {
  if (release.drafts.length === 0) {
    return undefined;
  }

  const primaryDraft = release.primaryDraftId
    ? release.drafts.find((draft) => draft.id === release.primaryDraftId)
    : undefined;

  if (primaryDraft) {
    return primaryDraft;
  }

  return [...release.drafts].sort((a, b) => b.version - a.version)[0];
}

export function createReleaseExportBaseName(release: Release): string {
  const nameToken = sanitizeFileToken(release.name);
  const versionToken = sanitizeFileToken(release.versionLabel);
  const fallback = sanitizeFileToken(release.id);
  const composed = [nameToken || fallback, versionToken].filter(Boolean).join("-");

  return composed || "release";
}

export function buildReleaseMarkdownExport(release: Release): string {
  const draft = getReleaseActiveDraft(release);

  if (!draft) {
    return `# ${release.name}\nNo draft content is available for export yet.`;
  }

  if (draft.format !== "json") {
    return draft.content;
  }

  return [
    `# ${release.name} (${release.versionLabel})`,
    "",
    "Primary draft was generated in JSON format.",
    "```json",
    draft.content,
    "```",
  ].join("\n");
}

export function buildReleaseJsonExport(release: Release): ReleaseJsonExport {
  const draft = getReleaseActiveDraft(release);
  const stats = getReleaseStats(release);

  return {
    generatedAt: new Date().toISOString(),
    release: {
      id: release.id,
      name: release.name,
      versionLabel: release.versionLabel,
      status: release.status,
      publishedAt: release.publishedAt,
      dateStart: release.dateStart,
      dateEnd: release.dateEnd,
      stats,
    },
    draft: draft
      ? {
          id: draft.id,
          version: draft.version,
          source: draft.source,
          format: draft.format,
          audience: draft.audience,
          tone: draft.tone,
          length: draft.length,
          title: draft.title,
          createdAt: draft.createdAt,
          content: draft.content,
        }
      : undefined,
    changes: release.changes.map((change) => ({
      id: change.id,
      title: change.title,
      description: change.description,
      type: change.type,
      scope: change.scope,
      audiences: change.audiences,
      risk: change.risk,
      isBreaking: change.isBreaking,
      migrationNotes: change.migrationNotes,
      customerImpact: change.customerImpact,
      supportNotes: change.supportNotes,
      links: change.links,
    })),
  };
}
