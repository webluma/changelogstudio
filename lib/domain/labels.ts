import type { ReleaseStatus } from "@/lib/domain/types";

export const RELEASE_STATUS_LABEL: Record<ReleaseStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  published: "Published",
};
