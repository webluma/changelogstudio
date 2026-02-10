import {
  REVIEW_CHECKLIST_ITEMS,
  type AppDatabase,
  type ReviewChecklistItemKey,
  type ReviewState,
} from "@/lib/domain/types";

export const APP_STORAGE_KEY = "changelog_studio_db_v1";

export function createEmptyDatabase(): AppDatabase {
  return {
    schemaVersion: 1,
    releases: [],
    auditLog: [],
  };
}

export function createDefaultReviewState(): ReviewState {
  const checklist = REVIEW_CHECKLIST_ITEMS.reduce<Record<ReviewChecklistItemKey, boolean>>(
    (accumulator, item) => {
      accumulator[item.key] = false;
      return accumulator;
    },
    {} as Record<ReviewChecklistItemKey, boolean>,
  );

  return {
    checklist,
    comments: [],
  };
}
