import type { ReleaseStatus } from "@/lib/domain/types";
import { RELEASE_STATUS_LABEL } from "@/lib/domain/labels";

const STATUS_CLASS: Record<ReleaseStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  in_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  published: "bg-blue-100 text-blue-800",
};

export function ReleaseStatusBadge({ status }: { status: ReleaseStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[status]}`}
    >
      {RELEASE_STATUS_LABEL[status]}
    </span>
  );
}
