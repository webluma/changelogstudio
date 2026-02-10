import type { AuditEvent, AuditEventName } from "@/lib/domain/types";

export type AuditCategory =
  | "all"
  | "release"
  | "change"
  | "draft"
  | "review"
  | "publish"
  | "export";

const AUDIT_TITLE_MAP: Record<AuditEventName, string> = {
  "release.created": "Release created",
  "release.duplicated": "Release duplicated",
  "release.status_changed": "Release status updated",
  "release.published": "Release published",
  "release.viewed": "Release viewed",
  "change.added": "Change added",
  "change.updated": "Change updated",
  "change.deleted": "Change deleted",
  "change.scope_tagged": "Change scope tagged",
  "change.risk_updated": "Change risk updated",
  "change.bulk_deleted": "Changes bulk deleted",
  "draft.generated": "Draft generated",
  "draft.promoted": "Draft promoted to primary",
  "review.checklist_updated": "Review checklist updated",
  "review.comment_added": "Review comment added",
  "review.comment_deleted": "Review comment deleted",
  "export.downloaded": "Export downloaded",
};

const METADATA_LABEL_MAP: Record<string, string> = {
  status: "Status",
  count: "Count",
  scope: "Scope",
  risk: "Risk",
  source: "Source",
  format: "Format",
  checked: "Checked",
  itemKey: "Checklist item",
  section: "Section",
  version: "Draft version",
  releaseName: "Release",
  versionLabel: "Version",
  draftCount: "Draft count",
  primaryDraftId: "Primary draft",
};

export const AUDIT_CATEGORY_OPTIONS: Array<{ id: AuditCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "release", label: "Release" },
  { id: "change", label: "Changes" },
  { id: "draft", label: "Drafts" },
  { id: "review", label: "Review" },
  { id: "publish", label: "Publish" },
  { id: "export", label: "Exports" },
];

function prettifyToken(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getAuditCategory(event: AuditEventName): Exclude<AuditCategory, "all"> {
  if (event.startsWith("change.")) {
    return "change";
  }
  if (event.startsWith("draft.")) {
    return "draft";
  }
  if (event.startsWith("review.")) {
    return "review";
  }
  if (event.startsWith("export.")) {
    return "export";
  }
  if (event === "release.published") {
    return "publish";
  }
  return "release";
}

export function getAuditTitle(event: AuditEventName): string {
  return AUDIT_TITLE_MAP[event] ?? event;
}

export function getAuditMetadataPairs(
  metadata?: AuditEvent["metadata"],
): Array<{ key: string; label: string; value: string }> {
  if (!metadata) {
    return [];
  }

  return Object.entries(metadata)
    .filter(([, value]) => String(value).trim().length > 0)
    .map(([key, value]) => ({
      key,
      label: METADATA_LABEL_MAP[key] ?? prettifyToken(key),
      value: String(value),
    }));
}
