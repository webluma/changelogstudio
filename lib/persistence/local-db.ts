"use client";

import { APP_STORAGE_KEY, createEmptyDatabase } from "@/lib/domain/defaults";
import type { AppDatabase } from "@/lib/domain/types";

interface LoadResult {
  data: AppDatabase;
  errorMessage?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidDatabase(value: unknown): value is AppDatabase {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    Array.isArray(value.releases) &&
    Array.isArray(value.auditLog)
  );
}

export function loadDatabase(): LoadResult {
  if (typeof window === "undefined") {
    return { data: createEmptyDatabase() };
  }

  const raw = window.localStorage.getItem(APP_STORAGE_KEY);
  if (!raw) {
    return { data: createEmptyDatabase() };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidDatabase(parsed)) {
      return {
        data: createEmptyDatabase(),
        errorMessage:
          "Stored data format is invalid. A clean workspace was loaded instead.",
      };
    }

    return { data: parsed };
  } catch {
    return {
      data: createEmptyDatabase(),
      errorMessage:
        "Stored data could not be parsed. A clean workspace was loaded instead.",
    };
  }
}

export function saveDatabase(data: AppDatabase): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
}
