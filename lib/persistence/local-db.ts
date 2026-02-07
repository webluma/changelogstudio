"use client";

import { APP_STORAGE_KEY, createEmptyDatabase } from "@/lib/domain/defaults";
import {
  AUDIENCES,
  CHANGE_RISKS,
  CHANGE_TYPES,
  RELEASE_STATUSES,
  type AppDatabase,
} from "@/lib/domain/types";

interface LoadResult {
  data: AppDatabase;
  errorMessage?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOneOf(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): value is string | undefined {
  return typeof value === "undefined" || typeof value === "string";
}

function isChangeLink(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.label) && isString(value.url);
}

function isChangeItem(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const audiencesValid =
    Array.isArray(value.audiences) &&
    value.audiences.every(
      (audience) => isString(audience) && isOneOf(audience, AUDIENCES),
    );
  const linksValid = Array.isArray(value.links) && value.links.every(isChangeLink);
  const typeValid = isString(value.type) && isOneOf(value.type, CHANGE_TYPES);
  const riskValid = isString(value.risk) && isOneOf(value.risk, CHANGE_RISKS);

  return (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.description) &&
    typeValid &&
    isString(value.scope) &&
    audiencesValid &&
    riskValid &&
    typeof value.isBreaking === "boolean" &&
    isOptionalString(value.migrationNotes) &&
    linksValid &&
    isOptionalString(value.customerImpact) &&
    isOptionalString(value.supportNotes) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDraftVersion(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const sourceValid =
    value.source === "ai" || value.source === "user";

  return (
    isString(value.id) &&
    typeof value.version === "number" &&
    sourceValid &&
    isString(value.content) &&
    isString(value.createdAt)
  );
}

function isRelease(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const statusValid =
    isString(value.status) && isOneOf(value.status, RELEASE_STATUSES);
  const changesValid = Array.isArray(value.changes) && value.changes.every(isChangeItem);
  const draftsValid = Array.isArray(value.drafts) && value.drafts.every(isDraftVersion);

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.versionLabel) &&
    isOptionalString(value.dateStart) &&
    isOptionalString(value.dateEnd) &&
    statusValid &&
    changesValid &&
    draftsValid &&
    isOptionalString(value.primaryDraftId) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isOptionalString(value.publishedAt)
  );
}

function isAuditEvent(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const metadataValid =
    typeof value.metadata === "undefined" || isRecord(value.metadata);

  return (
    isString(value.id) &&
    isString(value.event) &&
    isString(value.actor) &&
    isString(value.timestamp) &&
    isOptionalString(value.releaseId) &&
    isOptionalString(value.entityId) &&
    metadataValid
  );
}

function isValidDatabase(value: unknown): value is AppDatabase {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    Array.isArray(value.releases) &&
    value.releases.every(isRelease) &&
    Array.isArray(value.auditLog) &&
    value.auditLog.every(isAuditEvent)
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
