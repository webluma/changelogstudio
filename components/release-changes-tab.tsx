"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  type Audience,
  AUDIENCES,
  CHANGE_RISKS,
  CHANGE_TYPES,
  type ChangeItem,
  type ChangeRisk,
  type ChangeType,
  type Release,
} from "@/lib/domain/types";
import { useAppState } from "@/lib/state/app-state";
import { formatDate } from "@/lib/utils/format";

interface ReleaseChangesTabProps {
  release: Release;
}

interface ChangeFormValues {
  title: string;
  description: string;
  type: ChangeType;
  scope: string;
  audiences: Audience[];
  risk: ChangeRisk;
  isBreaking: boolean;
  migrationNotes: string;
  customerImpact: string;
  supportNotes: string;
  prUrl: string;
  ticketUrl: string;
}

type FilterState = {
  type: "all" | ChangeType;
  risk: "all" | ChangeRisk;
  scope: string;
  isBreaking: "all" | "yes" | "no";
};

const INITIAL_FILTERS: FilterState = {
  type: "all",
  risk: "all",
  scope: "",
  isBreaking: "all",
};

const INITIAL_FORM: ChangeFormValues = {
  title: "",
  description: "",
  type: "feature",
  scope: "",
  audiences: ["customer", "technical"],
  risk: "low",
  isBreaking: false,
  migrationNotes: "",
  customerImpact: "",
  supportNotes: "",
  prUrl: "",
  ticketUrl: "",
};

function buildFormFromChange(change: ChangeItem): ChangeFormValues {
  const prLink = change.links.find((link) => link.label === "PR");
  const ticketLink = change.links.find((link) => link.label === "Ticket");

  return {
    title: change.title,
    description: change.description,
    type: change.type,
    scope: change.scope,
    audiences: change.audiences,
    risk: change.risk,
    isBreaking: change.isBreaking,
    migrationNotes: change.migrationNotes ?? "",
    customerImpact: change.customerImpact ?? "",
    supportNotes: change.supportNotes ?? "",
    prUrl: prLink?.url ?? "",
    ticketUrl: ticketLink?.url ?? "",
  };
}

export function ReleaseChangesTab({ release }: ReleaseChangesTabProps) {
  const {
    addChange,
    updateChange,
    bulkSetChangeScope,
    bulkSetChangeRisk,
    bulkDeleteChanges,
  } = useAppState();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChangeId, setEditingChangeId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<ChangeFormValues>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkScopeValue, setBulkScopeValue] = useState("");
  const [bulkRiskValue, setBulkRiskValue] = useState<ChangeRisk>("low");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const filteredChanges = useMemo(() => {
    return release.changes.filter((change) => {
      if (filters.type !== "all" && change.type !== filters.type) {
        return false;
      }
      if (filters.risk !== "all" && change.risk !== filters.risk) {
        return false;
      }
      if (filters.scope.trim()) {
        const normalizedScopeFilter = filters.scope.trim().toLowerCase();
        if (!change.scope.toLowerCase().includes(normalizedScopeFilter)) {
          return false;
        }
      }
      if (filters.isBreaking === "yes" && !change.isBreaking) {
        return false;
      }
      if (filters.isBreaking === "no" && change.isBreaking) {
        return false;
      }
      return true;
    });
  }, [filters, release.changes]);

  const selectedVisibleCount = filteredChanges.filter((change) =>
    selectedIds.includes(change.id),
  ).length;

  function resetForm() {
    setFormValues(INITIAL_FORM);
    setEditingChangeId(null);
    setFormError(null);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function openEditForm(change: ChangeItem) {
    setFormValues(buildFormFromChange(change));
    setEditingChangeId(change.id);
    setFormError(null);
    setIsFormOpen(true);
  }

  function buildLinks(values: ChangeFormValues) {
    const links: ChangeItem["links"] = [];
    if (values.prUrl.trim()) {
      links.push({ label: "PR", url: values.prUrl.trim() });
    }
    if (values.ticketUrl.trim()) {
      links.push({ label: "Ticket", url: values.ticketUrl.trim() });
    }
    return links;
  }

  function validateChangeForm(values: ChangeFormValues): string | null {
    if (!values.title.trim()) {
      return "Title is required.";
    }
    if (!values.scope.trim()) {
      return "Scope is required.";
    }
    if (values.audiences.length === 0) {
      return "Select at least one audience.";
    }
    if (values.isBreaking && !values.migrationNotes.trim()) {
      return "Migration notes are required for breaking changes.";
    }
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateChangeForm(formValues);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const payload = {
      title: formValues.title.trim(),
      description: formValues.description.trim(),
      type: formValues.type,
      scope: formValues.scope.trim(),
      audiences: formValues.audiences,
      risk: formValues.risk,
      isBreaking: formValues.isBreaking,
      migrationNotes: formValues.isBreaking
        ? formValues.migrationNotes.trim()
        : undefined,
      links: buildLinks(formValues),
      customerImpact: formValues.customerImpact.trim() || undefined,
      supportNotes: formValues.supportNotes.trim() || undefined,
    };

    if (!editingChangeId) {
      addChange(release.id, payload);
      setFeedbackMessage("Change added.");
    } else {
      updateChange(release.id, editingChangeId, payload);
      setFeedbackMessage("Change updated.");
    }

    resetForm();
    setIsFormOpen(false);
  }

  function toggleAudience(audience: Audience) {
    setFormValues((current) => {
      if (current.audiences.includes(audience)) {
        const nextAudiences = current.audiences.filter((item) => item !== audience);
        return { ...current, audiences: nextAudiences };
      }

      return { ...current, audiences: [...current.audiences, audience] };
    });
  }

  function toggleSelection(changeId: string) {
    setSelectedIds((current) =>
      current.includes(changeId)
        ? current.filter((item) => item !== changeId)
        : [...current, changeId],
    );
  }

  function toggleAllVisible() {
    const visibleIds = filteredChanges.map((change) => change.id);
    if (visibleIds.length === 0) {
      return;
    }

    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
    }
  }

  function handleBulkScopeApply() {
    const scope = bulkScopeValue.trim();
    if (!scope) {
      return;
    }
    const updatedCount = bulkSetChangeScope(release.id, selectedIds, scope);
    if (updatedCount > 0) {
      setFeedbackMessage(`${updatedCount} change(s) tagged with scope "${scope}".`);
      setBulkScopeValue("");
    }
  }

  function handleBulkRiskApply() {
    const updatedCount = bulkSetChangeRisk(release.id, selectedIds, bulkRiskValue);
    if (updatedCount > 0) {
      setFeedbackMessage(`${updatedCount} change(s) updated to ${bulkRiskValue} risk.`);
    }
  }

  function handleBulkDelete() {
    const deletedCount = bulkDeleteChanges(release.id, selectedIds);
    if (deletedCount > 0) {
      setFeedbackMessage(`${deletedCount} change(s) removed.`);
      setSelectedIds([]);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Changes
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              Manage raw changes before draft generation. Breaking changes must include
              migration notes.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Add Change
          </button>
        </div>
      </div>

      {feedbackMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedbackMessage}
        </div>
      ) : null}

      {isFormOpen ? (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2"
        >
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              value={formValues.title}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Improve onboarding completion tracking"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              rows={3}
              value={formValues.description}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Raw implementation detail, PR context, and behavior changes."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Type</span>
            <select
              value={formValues.type}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  type: event.target.value as ChangeType,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {CHANGE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Risk</span>
            <select
              value={formValues.risk}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  risk: event.target.value as ChangeRisk,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {CHANGE_RISKS.map((risk) => (
                <option key={risk} value={risk}>
                  {risk}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Scope</span>
            <input
              value={formValues.scope}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, scope: event.target.value }))
              }
              placeholder="billing"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Breaking Change</span>
            <select
              value={formValues.isBreaking ? "yes" : "no"}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  isBreaking: event.target.value === "yes",
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>

          <fieldset className="space-y-2 md:col-span-2">
            <legend className="text-sm font-medium text-slate-700">Audience Relevance</legend>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((audience) => {
                const checked = formValues.audiences.includes(audience);
                return (
                  <button
                    key={audience}
                    type="button"
                    onClick={() => toggleAudience(audience)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      checked
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {audience}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {formValues.isBreaking ? (
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Migration Notes</span>
              <textarea
                rows={2}
                value={formValues.migrationNotes}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    migrationNotes: event.target.value,
                  }))
                }
                placeholder="Describe migration steps for affected users."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>
          ) : null}

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">PR URL (optional)</span>
            <input
              value={formValues.prUrl}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, prUrl: event.target.value }))
              }
              placeholder="https://github.com/org/repo/pull/123"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Ticket URL (optional)</span>
            <input
              value={formValues.ticketUrl}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, ticketUrl: event.target.value }))
              }
              placeholder="https://linear.app/team/issue/ABC-123"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Customer Impact (optional)</span>
            <input
              value={formValues.customerImpact}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  customerImpact: event.target.value,
                }))
              }
              placeholder="Users can complete onboarding in fewer steps."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Support Notes (optional)</span>
            <input
              value={formValues.supportNotes}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  supportNotes: event.target.value,
                }))
              }
              placeholder="If customers ask about X, mention Y."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          {formError ? (
            <p className="md:col-span-2 text-sm font-medium text-rose-600">{formError}</p>
          ) : null}

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {editingChangeId ? "Save Change" : "Create Change"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Filter Type
          </span>
          <select
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                type: event.target.value as FilterState["type"],
              }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {CHANGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Filter Risk
          </span>
          <select
            value={filters.risk}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                risk: event.target.value as FilterState["risk"],
              }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {CHANGE_RISKS.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Filter Scope
          </span>
          <input
            value={filters.scope}
            onChange={(event) =>
              setFilters((current) => ({ ...current, scope: event.target.value }))
            }
            placeholder="billing"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Breaking
          </span>
          <select
            value={filters.isBreaking}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                isBreaking: event.target.value as FilterState["isBreaking"],
              }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="yes">Only breaking</option>
            <option value="no">Only non-breaking</option>
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={toggleAllVisible}
            className="w-fit rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {selectedVisibleCount === filteredChanges.length && filteredChanges.length > 0
              ? "Unselect visible"
              : "Select visible"}
          </button>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {selectedIds.length} selected
            </span>
            <input
              value={bulkScopeValue}
              onChange={(event) => setBulkScopeValue(event.target.value)}
              placeholder="New scope tag"
              className="rounded-lg border border-slate-300 px-2.5 py-1.5"
            />
            <button
              type="button"
              onClick={handleBulkScopeApply}
              disabled={selectedIds.length === 0 || !bulkScopeValue.trim()}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tag Scope
            </button>
            <select
              value={bulkRiskValue}
              onChange={(event) => setBulkRiskValue(event.target.value as ChangeRisk)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5"
            >
              {CHANGE_RISKS.map((risk) => (
                <option key={risk} value={risk}>
                  {risk}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkRiskApply}
              disabled={selectedIds.length === 0}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set Risk
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0}
              className="rounded-lg border border-rose-300 px-2.5 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {filteredChanges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h4 className="text-lg font-semibold text-slate-900">No changes found</h4>
          <p className="mt-1 text-sm text-slate-600">
            Adjust filters or create a new change to continue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChanges.map((change) => {
            const selected = selectedIds.includes(change.id);
            return (
              <article
                key={change.id}
                className={`rounded-2xl border bg-white p-4 transition ${
                  selected ? "border-slate-900" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelection(change.id)}
                        className="h-4 w-4 rounded border-slate-300"
                        aria-label={`Select ${change.title}`}
                      />
                      <p className="text-base font-semibold text-slate-900">{change.title}</p>
                    </div>
                    <p className="text-sm text-slate-700">{change.description || "-"}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                        {change.type}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                        scope: {change.scope}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                        risk: {change.risk}
                      </span>
                      {change.isBreaking ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700">
                          breaking
                        </span>
                      ) : null}
                    </div>
                    {change.isBreaking && !change.migrationNotes ? (
                      <p className="text-xs font-semibold text-rose-600">
                        Missing migration notes.
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      Updated {formatDate(change.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(change)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        bulkDeleteChanges(release.id, [change.id]);
                        setSelectedIds((current) =>
                          current.filter((id) => id !== change.id),
                        );
                        setFeedbackMessage("Change removed.");
                      }}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
