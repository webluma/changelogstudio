import { REVIEW_CHECKLIST_ITEMS, type Release } from "@/lib/domain/types";

export interface PublishReadiness {
  canPublish: boolean;
  blockers: string[];
  completedChecklistItems: number;
  totalChecklistItems: number;
}

export function getPublishReadiness(release: Release): PublishReadiness {
  const totalChecklistItems = REVIEW_CHECKLIST_ITEMS.length;
  const completedChecklistItems = REVIEW_CHECKLIST_ITEMS.filter(
    (item) => release.review.checklist[item.key],
  ).length;

  const blockers: string[] = [];

  if (release.changes.length === 0) {
    blockers.push("Add at least one change before publishing.");
  }

  if (release.drafts.length === 0) {
    blockers.push("Generate at least one draft before publishing.");
  }

  if (completedChecklistItems < totalChecklistItems) {
    blockers.push("Complete the review checklist before publishing.");
  }

  return {
    canPublish: blockers.length === 0,
    blockers,
    completedChecklistItems,
    totalChecklistItems,
  };
}
