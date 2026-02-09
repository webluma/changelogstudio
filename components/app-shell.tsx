"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentPhase, getNextPhase, getPhaseStatusLabel } from "@/lib/project-phase";
import { useAppState } from "@/lib/state/app-state";

const NAVIGATION_ITEMS = [{ href: "/", label: "Releases" }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { releases } = useAppState();
  const currentPhase = getCurrentPhase();
  const nextPhase = getNextPhase();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f6fbff,_#f5f7fb_42%,_#eef2ff_100%)] text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1400px] grid-cols-1 gap-4 p-4 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Changelog Studio
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Workspace</h1>
          </div>

          <nav className="mt-6 space-y-1">
            {NAVIGATION_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/releases")
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Scope
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Phase {currentPhase.number}: {currentPhase.title}
            </p>
            <p className="text-xs text-slate-600">
              Status: {getPhaseStatusLabel(currentPhase.status)}
            </p>
            {nextPhase ? (
              <p className="mt-1 text-xs text-slate-600">
                Next: Phase {nextPhase.number} ({nextPhase.title})
              </p>
            ) : null}
            <p className="mt-2 text-xs text-slate-600">{releases.length} release(s) in workspace</p>
          </div>
        </aside>

        <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <header className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Product
              </p>
              <p className="text-lg font-semibold text-slate-900">Release Notes Copilot</p>
            </div>
            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Professional MVP track
            </p>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
