export type ProjectPhaseStatus = "planned" | "in_progress" | "completed";

interface ProjectPhase {
  number: number;
  title: string;
  status: ProjectPhaseStatus;
}

export const PROJECT_PHASES: ProjectPhase[] = [
  { number: 1, title: "README and product contract", status: "completed" },
  { number: 2, title: "App foundation and layout", status: "completed" },
  { number: 3, title: "Releases and changes management", status: "completed" },
  { number: 4, title: "Draft generation pipeline", status: "completed" },
  { number: 5, title: "Versioning and diff", status: "completed" },
  { number: 6, title: "Review workflows", status: "completed" },
  { number: 7, title: "Publish and export", status: "in_progress" },
  { number: 8, title: "Audit log and final polish", status: "planned" },
];

export function getCurrentPhase(): ProjectPhase {
  return (
    PROJECT_PHASES.find((phase) => phase.status === "in_progress") ??
    PROJECT_PHASES[PROJECT_PHASES.length - 1]
  );
}

export function getNextPhase(): ProjectPhase | undefined {
  const current = getCurrentPhase();
  return PROJECT_PHASES.find((phase) => phase.number === current.number + 1);
}

export function getPhaseStatusLabel(status: ProjectPhaseStatus): string {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "in_progress") {
    return "In progress";
  }
  return "Planned";
}
