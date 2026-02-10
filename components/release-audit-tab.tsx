"use client";

import { useMemo, useState } from "react";
import {
  AUDIT_CATEGORY_OPTIONS,
  getAuditCategory,
  getAuditMetadataPairs,
  getAuditTitle,
  type AuditCategory,
} from "@/lib/domain/audit-log";
import type { AuditEvent } from "@/lib/domain/types";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";

interface ReleaseAuditTabProps {
  events: AuditEvent[];
}

export function ReleaseAuditTab({ events }: ReleaseAuditTabProps) {
  const [activeCategory, setActiveCategory] = useState<AuditCategory>("all");

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeCategory === "all") {
      return sortedEvents;
    }
    return sortedEvents.filter((event) => getAuditCategory(event.event) === activeCategory);
  }, [activeCategory, sortedEvents]);

  if (sortedEvents.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Audit Log</h3>
        <p className="mt-2 text-sm text-slate-700">No audit events for this release yet.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Audit Log</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {filteredEvents.length} event(s)
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {AUDIT_CATEGORY_OPTIONS.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                activeCategory === category.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filteredEvents.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            No events found for this filter.
          </p>
        ) : (
          filteredEvents.map((event) => {
            const metadataPairs = getAuditMetadataPairs(event.metadata);
            return (
              <article
                key={event.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{getAuditTitle(event.event)}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {getAuditCategory(event.event)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    actor: {event.actor}
                  </span>
                  <p className="ml-auto text-xs text-slate-500">{formatRelativeTime(event.timestamp)}</p>
                </div>

                <p className="mt-1 text-xs text-slate-500">{formatDate(event.timestamp)}</p>

                {metadataPairs.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {metadataPairs.map((pair) => (
                      <span
                        key={`${event.id}-${pair.key}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                      >
                        {pair.label}: {pair.value}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
