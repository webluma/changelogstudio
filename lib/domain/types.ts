export const RELEASE_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "published",
] as const;

export const CHANGE_TYPES = [
  "feature",
  "bugfix",
  "improvement",
  "performance",
  "security",
  "docs",
  "chore",
] as const;

export const CHANGE_RISKS = ["low", "medium", "high"] as const;

export const AUDIENCES = ["customer", "technical", "internal", "support"] as const;
export const DRAFT_FORMATS = ["markdown", "json"] as const;
export const GENERATION_TONES = [
  "professional",
  "friendly",
  "direct",
  "brand_voice",
] as const;
export const GENERATION_LENGTHS = ["short", "standard", "detailed"] as const;
export const REVIEW_SECTIONS = [
  "overview",
  "features",
  "fixes",
  "improvements",
  "security",
  "breaking_changes",
  "known_issues",
  "support_faq",
] as const;
export const REVIEW_CHECKLIST_ITEMS = [
  {
    key: "audience_match",
    label: "Audience match (customer-facing text avoids heavy jargon)",
  },
  {
    key: "no_promises",
    label: "No future commitments or delivery promises",
  },
  {
    key: "breaking_listed",
    label: "Breaking changes are explicitly listed",
  },
  {
    key: "migration_steps_present",
    label: "Migration steps are present when required",
  },
  {
    key: "links_attached",
    label: "Relevant links to PRs and tickets are attached",
  },
  {
    key: "risks_rollout_reviewed",
    label: "Risk, rollout, and rollback were reviewed",
  },
  {
    key: "grammar_checked",
    label: "Grammar and readability were reviewed",
  },
] as const;

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];
export type ChangeType = (typeof CHANGE_TYPES)[number];
export type ChangeRisk = (typeof CHANGE_RISKS)[number];
export type Audience = (typeof AUDIENCES)[number];
export type DraftFormat = (typeof DRAFT_FORMATS)[number];
export type GenerationTone = (typeof GENERATION_TONES)[number];
export type GenerationLength = (typeof GENERATION_LENGTHS)[number];
export type ReviewSection = (typeof REVIEW_SECTIONS)[number];
export type ReviewChecklistItemKey = (typeof REVIEW_CHECKLIST_ITEMS)[number]["key"];

export type AuditEventName =
  | "release.created"
  | "release.duplicated"
  | "release.status_changed"
  | "release.published"
  | "release.viewed"
  | "change.added"
  | "change.updated"
  | "change.deleted"
  | "change.scope_tagged"
  | "change.risk_updated"
  | "change.bulk_deleted"
  | "draft.generated"
  | "draft.promoted"
  | "review.checklist_updated"
  | "review.comment_added"
  | "review.comment_deleted"
  | "export.downloaded";

export interface ChangeLink {
  label: string;
  url: string;
}

export interface ChangeItem {
  id: string;
  title: string;
  description: string;
  type: ChangeType;
  scope: string;
  audiences: Audience[];
  risk: ChangeRisk;
  isBreaking: boolean;
  migrationNotes?: string;
  links: ChangeLink[];
  customerImpact?: string;
  supportNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftVersion {
  id: string;
  version: number;
  source: "ai" | "user";
  content: string;
  format?: DraftFormat;
  audience?: Audience;
  tone?: GenerationTone;
  length?: GenerationLength;
  title?: string;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  section: ReviewSection;
  message: string;
  actor: "user";
  createdAt: string;
}

export interface ReviewState {
  checklist: Record<ReviewChecklistItemKey, boolean>;
  comments: ReviewComment[];
}

export interface Release {
  id: string;
  name: string;
  versionLabel: string;
  dateStart?: string;
  dateEnd?: string;
  status: ReleaseStatus;
  changes: ChangeItem[];
  drafts: DraftVersion[];
  review: ReviewState;
  primaryDraftId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AuditEvent {
  id: string;
  event: AuditEventName;
  actor: "user" | "ai" | "system";
  timestamp: string;
  releaseId?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface AppDatabase {
  schemaVersion: 1;
  releases: Release[];
  auditLog: AuditEvent[];
}
