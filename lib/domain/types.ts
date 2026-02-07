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

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];
export type ChangeType = (typeof CHANGE_TYPES)[number];
export type ChangeRisk = (typeof CHANGE_RISKS)[number];
export type Audience = (typeof AUDIENCES)[number];

export type AuditEventName =
  | "release.created"
  | "release.duplicated"
  | "release.status_changed"
  | "release.viewed"
  | "change.added"
  | "change.updated"
  | "change.deleted"
  | "change.scope_tagged"
  | "change.risk_updated"
  | "change.bulk_deleted";

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
  createdAt: string;
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
