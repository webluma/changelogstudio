import type { Release } from "@/lib/domain/types";

export function getReleaseStats(release: Release) {
  const totalChanges = release.changes.length;
  const breakingCount = release.changes.filter((change) => change.isBreaking).length;
  const highRiskCount = release.changes.filter((change) => change.risk === "high").length;

  return {
    totalChanges,
    breakingCount,
    highRiskCount,
  };
}
