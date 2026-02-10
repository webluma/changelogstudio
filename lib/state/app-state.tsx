"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { createDefaultReviewState, createEmptyDatabase } from "@/lib/domain/defaults";
import type {
  Audience,
  AppDatabase,
  AuditEvent,
  ChangeItem,
  ChangeRisk,
  ChangeType,
  DraftFormat,
  GenerationLength,
  GenerationTone,
  ReviewChecklistItemKey,
  ReviewComment,
  ReviewSection,
  Release,
  ReleaseStatus,
} from "@/lib/domain/types";
import { loadDatabase, saveDatabase } from "@/lib/persistence/local-db";
import { createId } from "@/lib/utils/id";

interface CreateReleaseInput {
  name: string;
  versionLabel: string;
  dateStart?: string;
  dateEnd?: string;
}

interface CreateChangeInput {
  title: string;
  description: string;
  type: ChangeType;
  scope: string;
  audiences: Audience[];
  risk: ChangeRisk;
  isBreaking: boolean;
  migrationNotes?: string;
  links?: ChangeItem["links"];
  customerImpact?: string;
  supportNotes?: string;
}

interface UpdateChangeInput {
  title?: string;
  description?: string;
  type?: ChangeType;
  scope?: string;
  audiences?: Audience[];
  risk?: ChangeRisk;
  isBreaking?: boolean;
  migrationNotes?: string;
  links?: ChangeItem["links"];
  customerImpact?: string;
  supportNotes?: string;
}

interface AddDraftInput {
  source: "ai" | "user";
  content: string;
  format: DraftFormat;
  audience?: Audience;
  tone?: GenerationTone;
  length?: GenerationLength;
  title?: string;
}

interface AddReviewCommentInput {
  section: ReviewSection;
  message: string;
}

interface AppStateValue {
  isHydrated: boolean;
  storageError?: string;
  releases: Release[];
  auditLog: AuditEvent[];
  createRelease: (input: CreateReleaseInput) => string;
  duplicateRelease: (releaseId: string) => string | null;
  setReleaseStatus: (releaseId: string, status: ReleaseStatus) => void;
  publishRelease: (releaseId: string) => boolean;
  logExportDownloaded: (releaseId: string, format: "markdown" | "json") => void;
  addChange: (releaseId: string, input: CreateChangeInput) => string | null;
  updateChange: (
    releaseId: string,
    changeId: string,
    updates: UpdateChangeInput,
  ) => boolean;
  bulkSetChangeScope: (
    releaseId: string,
    changeIds: string[],
    scope: string,
  ) => number;
  bulkSetChangeRisk: (
    releaseId: string,
    changeIds: string[],
    risk: ChangeRisk,
  ) => number;
  bulkDeleteChanges: (releaseId: string, changeIds: string[]) => number;
  addDraft: (releaseId: string, input: AddDraftInput) => string | null;
  setPrimaryDraft: (releaseId: string, draftId: string) => boolean;
  setReviewChecklistItem: (
    releaseId: string,
    itemKey: ReviewChecklistItemKey,
    checked: boolean,
  ) => boolean;
  addReviewComment: (releaseId: string, input: AddReviewCommentInput) => string | null;
  deleteReviewComment: (releaseId: string, commentId: string) => boolean;
  getReleaseById: (releaseId: string) => Release | undefined;
  logReleaseViewed: (releaseId: string) => void;
}

interface AppState {
  isHydrated: boolean;
  storageError?: string;
  database: AppDatabase;
}

type AppAction =
  | {
      type: "hydrate";
      payload: AppDatabase;
      storageError?: string;
    }
  | {
      type: "create_release";
      payload: Release;
      event: AuditEvent;
    }
  | {
      type: "duplicate_release";
      payload: Release;
      event: AuditEvent;
    }
  | {
      type: "set_release_status";
      releaseId: string;
      status: ReleaseStatus;
      event: AuditEvent;
    }
  | {
      type: "publish_release";
      releaseId: string;
      event: AuditEvent;
    }
  | {
      type: "add_audit_event";
      event: AuditEvent;
    }
  | {
      type: "add_change";
      releaseId: string;
      change: ChangeItem;
      event: AuditEvent;
    }
  | {
      type: "update_change";
      releaseId: string;
      changeId: string;
      updates: UpdateChangeInput;
      event: AuditEvent;
    }
  | {
      type: "bulk_set_change_scope";
      releaseId: string;
      changeIds: string[];
      scope: string;
      event: AuditEvent;
    }
  | {
      type: "bulk_set_change_risk";
      releaseId: string;
      changeIds: string[];
      risk: ChangeRisk;
      event: AuditEvent;
    }
  | {
      type: "bulk_delete_changes";
      releaseId: string;
      changeIds: string[];
      event: AuditEvent;
    }
  | {
      type: "add_draft";
      releaseId: string;
      draft: Release["drafts"][number];
      event: AuditEvent;
    }
  | {
      type: "set_primary_draft";
      releaseId: string;
      draftId: string;
      event: AuditEvent;
    }
  | {
      type: "set_review_checklist_item";
      releaseId: string;
      itemKey: ReviewChecklistItemKey;
      checked: boolean;
      event: AuditEvent;
    }
  | {
      type: "add_review_comment";
      releaseId: string;
      comment: ReviewComment;
      event: AuditEvent;
    }
  | {
      type: "delete_review_comment";
      releaseId: string;
      commentId: string;
      event: AuditEvent;
    };

const AppStateContext = createContext<AppStateValue | null>(null);

const INITIAL_STATE: AppState = {
  isHydrated: false,
  storageError: undefined,
  database: createEmptyDatabase(),
};

function appStateReducer(state: AppState, action: AppAction): AppState {
  const now = new Date().toISOString();

  switch (action.type) {
    case "hydrate":
      return {
        isHydrated: true,
        storageError: action.storageError,
        database: action.payload,
      };
    case "create_release":
    case "duplicate_release":
      return {
        ...state,
        database: {
          ...state.database,
          releases: [action.payload, ...state.database.releases],
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "set_release_status":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
                ? {
                    ...release,
                    status: action.status,
                    publishedAt:
                      action.status === "published"
                        ? (release.publishedAt ?? now)
                        : undefined,
                    updatedAt: now,
                  }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "publish_release":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  status: "published",
                  publishedAt: now,
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "add_change":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  changes: [action.change, ...release.changes],
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "update_change":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  changes: release.changes.map((change) =>
                    change.id === action.changeId
                      ? {
                          ...change,
                          ...action.updates,
                          updatedAt: now,
                        }
                      : change,
                  ),
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "bulk_set_change_scope":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  changes: release.changes.map((change) =>
                    action.changeIds.includes(change.id)
                      ? {
                          ...change,
                          scope: action.scope,
                          updatedAt: now,
                        }
                      : change,
                  ),
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "bulk_set_change_risk":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  changes: release.changes.map((change) =>
                    action.changeIds.includes(change.id)
                      ? {
                          ...change,
                          risk: action.risk,
                          updatedAt: now,
                        }
                      : change,
                  ),
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "bulk_delete_changes":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  changes: release.changes.filter(
                    (change) => !action.changeIds.includes(change.id),
                  ),
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "add_draft":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  drafts: [...release.drafts, action.draft],
                  primaryDraftId: release.primaryDraftId ?? action.draft.id,
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "set_primary_draft":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  primaryDraftId: action.draftId,
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "set_review_checklist_item":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  review: {
                    ...release.review,
                    checklist: {
                      ...release.review.checklist,
                      [action.itemKey]: action.checked,
                    },
                  },
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "add_review_comment":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  review: {
                    ...release.review,
                    comments: [action.comment, ...release.review.comments],
                  },
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "delete_review_comment":
      return {
        ...state,
        database: {
          ...state.database,
          releases: state.database.releases.map((release) =>
            release.id === action.releaseId
              ? {
                  ...release,
                  review: {
                    ...release.review,
                    comments: release.review.comments.filter(
                      (comment) => comment.id !== action.commentId,
                    ),
                  },
                  updatedAt: now,
                }
              : release,
          ),
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    case "add_audit_event":
      return {
        ...state,
        database: {
          ...state.database,
          auditLog: [action.event, ...state.database.auditLog],
        },
      };
    default:
      return state;
  }
}

function createAuditEvent(params: {
  event: AuditEvent["event"];
  releaseId?: string;
  entityId?: string;
  metadata?: AuditEvent["metadata"];
}): AuditEvent {
  return {
    id: createId("evt"),
    event: params.event,
    actor: "user",
    timestamp: new Date().toISOString(),
    releaseId: params.releaseId,
    entityId: params.entityId,
    metadata: params.metadata,
  };
}

function buildRelease(input: CreateReleaseInput): Release {
  const now = new Date().toISOString();
  return {
    id: createId("rel"),
    name: input.name,
    versionLabel: input.versionLabel,
    dateStart: input.dateStart,
    dateEnd: input.dateEnd,
    status: "draft",
    changes: [],
    drafts: [],
    review: createDefaultReviewState(),
    createdAt: now,
    updatedAt: now,
  };
}

function buildChange(input: CreateChangeInput): ChangeItem {
  const now = new Date().toISOString();
  return {
    id: createId("chg"),
    title: input.title,
    description: input.description,
    type: input.type,
    scope: input.scope,
    audiences: input.audiences,
    risk: input.risk,
    isBreaking: input.isBreaking,
    migrationNotes: input.migrationNotes,
    links: input.links ?? [],
    customerImpact: input.customerImpact,
    supportNotes: input.supportNotes,
    createdAt: now,
    updatedAt: now,
  };
}

function buildDraft(
  release: Release,
  input: AddDraftInput,
): Release["drafts"][number] {
  const latestVersion = release.drafts.reduce((max, draft) => {
    return Math.max(max, draft.version);
  }, 0);

  return {
    id: createId("drf"),
    version: latestVersion + 1,
    source: input.source,
    content: input.content,
    format: input.format,
    audience: input.audience,
    tone: input.tone,
    length: input.length,
    title: input.title,
    createdAt: new Date().toISOString(),
  };
}

function buildReviewComment(input: AddReviewCommentInput): ReviewComment {
  return {
    id: createId("rvc"),
    section: input.section,
    message: input.message,
    actor: "user",
    createdAt: new Date().toISOString(),
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, INITIAL_STATE);

  useEffect(() => {
    const loaded = loadDatabase();
    dispatch({
      type: "hydrate",
      payload: loaded.data,
      storageError: loaded.errorMessage,
    });
  }, []);

  useEffect(() => {
    if (!state.isHydrated) {
      return;
    }
    saveDatabase(state.database);
  }, [state.database, state.isHydrated]);

  const createRelease = useCallback((input: CreateReleaseInput) => {
    const release = buildRelease(input);
    const event = createAuditEvent({
      event: "release.created",
      releaseId: release.id,
      entityId: release.id,
      metadata: { releaseName: release.name, versionLabel: release.versionLabel },
    });

    dispatch({
      type: "create_release",
      payload: release,
      event,
    });

    return release.id;
  }, []);

  const duplicateRelease = useCallback(
    (releaseId: string) => {
      const existingRelease = state.database.releases.find(
        (release) => release.id === releaseId,
      );
      if (!existingRelease) {
        return null;
      }

      const now = new Date().toISOString();
      const duplicatedRelease: Release = {
        ...existingRelease,
        id: createId("rel"),
        name: `${existingRelease.name} (Copy)`,
        status: "draft",
        publishedAt: undefined,
        review: createDefaultReviewState(),
        createdAt: now,
        updatedAt: now,
        changes: existingRelease.changes.map((change) => ({
          ...change,
          id: createId("chg"),
          createdAt: now,
          updatedAt: now,
        })),
        drafts: existingRelease.drafts.map((draft) => ({
          ...draft,
          id: createId("drf"),
          createdAt: now,
        })),
      };

      const event = createAuditEvent({
        event: "release.duplicated",
        releaseId: duplicatedRelease.id,
        entityId: existingRelease.id,
      });

      dispatch({
        type: "duplicate_release",
        payload: duplicatedRelease,
        event,
      });

      return duplicatedRelease.id;
    },
    [state.database.releases],
  );

  const setReleaseStatus = useCallback((releaseId: string, status: ReleaseStatus) => {
    const event = createAuditEvent({
      event: "release.status_changed",
      releaseId,
      entityId: releaseId,
      metadata: { status },
    });

    dispatch({
      type: "set_release_status",
      releaseId,
      status,
      event,
    });
  }, []);

  const publishRelease = useCallback(
    (releaseId: string) => {
      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return false;
      }

      const event = createAuditEvent({
        event: "release.published",
        releaseId,
        entityId: releaseId,
        metadata: {
          draftCount: release.drafts.length,
          primaryDraftId: release.primaryDraftId ?? "",
        },
      });

      dispatch({
        type: "publish_release",
        releaseId,
        event,
      });

      return true;
    },
    [state.database.releases],
  );

  const addChange = useCallback(
    (releaseId: string, input: CreateChangeInput) => {
      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return null;
      }

      const change = buildChange(input);
      const event = createAuditEvent({
        event: "change.added",
        releaseId,
        entityId: change.id,
        metadata: { type: change.type, risk: change.risk },
      });

      dispatch({
        type: "add_change",
        releaseId,
        change,
        event,
      });

      return change.id;
    },
    [state.database.releases],
  );

  const updateChange = useCallback(
    (releaseId: string, changeId: string, updates: UpdateChangeInput) => {
      const release = state.database.releases.find((item) => item.id === releaseId);
      const change = release?.changes.find((item) => item.id === changeId);
      if (!release || !change) {
        return false;
      }

      const event = createAuditEvent({
        event: "change.updated",
        releaseId,
        entityId: changeId,
      });

      dispatch({
        type: "update_change",
        releaseId,
        changeId,
        updates,
        event,
      });

      return true;
    },
    [state.database.releases],
  );

  const bulkSetChangeScope = useCallback(
    (releaseId: string, changeIds: string[], scope: string) => {
      if (changeIds.length === 0) {
        return 0;
      }

      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return 0;
      }

      const existingCount = release.changes.filter((change) =>
        changeIds.includes(change.id),
      ).length;
      if (existingCount === 0) {
        return 0;
      }

      const event = createAuditEvent({
        event: "change.scope_tagged",
        releaseId,
        metadata: { scope, count: existingCount },
      });

      dispatch({
        type: "bulk_set_change_scope",
        releaseId,
        changeIds,
        scope,
        event,
      });

      return existingCount;
    },
    [state.database.releases],
  );

  const bulkSetChangeRisk = useCallback(
    (releaseId: string, changeIds: string[], risk: ChangeRisk) => {
      if (changeIds.length === 0) {
        return 0;
      }

      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return 0;
      }

      const existingCount = release.changes.filter((change) =>
        changeIds.includes(change.id),
      ).length;
      if (existingCount === 0) {
        return 0;
      }

      const event = createAuditEvent({
        event: "change.risk_updated",
        releaseId,
        metadata: { risk, count: existingCount },
      });

      dispatch({
        type: "bulk_set_change_risk",
        releaseId,
        changeIds,
        risk,
        event,
      });

      return existingCount;
    },
    [state.database.releases],
  );

  const bulkDeleteChanges = useCallback(
    (releaseId: string, changeIds: string[]) => {
      if (changeIds.length === 0) {
        return 0;
      }

      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return 0;
      }

      const existingCount = release.changes.filter((change) =>
        changeIds.includes(change.id),
      ).length;
      if (existingCount === 0) {
        return 0;
      }

      const event = createAuditEvent({
        event: "change.bulk_deleted",
        releaseId,
        metadata: { count: existingCount },
      });

      dispatch({
        type: "bulk_delete_changes",
        releaseId,
        changeIds,
        event,
      });

      return existingCount;
    },
    [state.database.releases],
  );

  const addDraft = useCallback(
    (releaseId: string, input: AddDraftInput) => {
      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return null;
      }

      const draft = buildDraft(release, input);
      const event = createAuditEvent({
        event: "draft.generated",
        releaseId,
        entityId: draft.id,
        metadata: {
          version: draft.version,
          source: draft.source,
          format: draft.format ?? "markdown",
        },
      });

      dispatch({
        type: "add_draft",
        releaseId,
        draft,
        event,
      });

      return draft.id;
    },
    [state.database.releases],
  );

  const setPrimaryDraft = useCallback(
    (releaseId: string, draftId: string) => {
      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return false;
      }

      const draftExists = release.drafts.some((draft) => draft.id === draftId);
      if (!draftExists) {
        return false;
      }

      const event = createAuditEvent({
        event: "draft.promoted",
        releaseId,
        entityId: draftId,
      });

      dispatch({
        type: "set_primary_draft",
        releaseId,
        draftId,
        event,
      });

      return true;
    },
    [state.database.releases],
  );

  const setReviewChecklistItem = useCallback(
    (releaseId: string, itemKey: ReviewChecklistItemKey, checked: boolean) => {
      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return false;
      }

      if (release.status === "draft") {
        setReleaseStatus(releaseId, "in_review");
      }

      const event = createAuditEvent({
        event: "review.checklist_updated",
        releaseId,
        metadata: { itemKey, checked },
      });

      dispatch({
        type: "set_review_checklist_item",
        releaseId,
        itemKey,
        checked,
        event,
      });

      return true;
    },
    [setReleaseStatus, state.database.releases],
  );

  const addReviewComment = useCallback(
    (releaseId: string, input: AddReviewCommentInput) => {
      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return null;
      }

      const message = input.message.trim();
      if (!message) {
        return null;
      }

      if (release.status === "draft") {
        setReleaseStatus(releaseId, "in_review");
      }

      const comment = buildReviewComment({
        ...input,
        message,
      });

      const event = createAuditEvent({
        event: "review.comment_added",
        releaseId,
        entityId: comment.id,
        metadata: { section: comment.section },
      });

      dispatch({
        type: "add_review_comment",
        releaseId,
        comment,
        event,
      });

      return comment.id;
    },
    [setReleaseStatus, state.database.releases],
  );

  const deleteReviewComment = useCallback(
    (releaseId: string, commentId: string) => {
      const release = state.database.releases.find((item) => item.id === releaseId);
      if (!release) {
        return false;
      }

      const existingComment = release.review.comments.find((comment) => comment.id === commentId);
      if (!existingComment) {
        return false;
      }

      const event = createAuditEvent({
        event: "review.comment_deleted",
        releaseId,
        entityId: commentId,
        metadata: { section: existingComment.section },
      });

      dispatch({
        type: "delete_review_comment",
        releaseId,
        commentId,
        event,
      });

      return true;
    },
    [state.database.releases],
  );

  const getReleaseById = useCallback(
    (releaseId: string) => {
      return state.database.releases.find((release) => release.id === releaseId);
    },
    [state.database.releases],
  );

  const logReleaseViewed = useCallback((releaseId: string) => {
    const event = createAuditEvent({
      event: "release.viewed",
      releaseId,
      entityId: releaseId,
    });

    dispatch({
      type: "add_audit_event",
      event,
    });
  }, []);

  const logExportDownloaded = useCallback(
    (releaseId: string, format: "markdown" | "json") => {
      const event = createAuditEvent({
        event: "export.downloaded",
        releaseId,
        entityId: releaseId,
        metadata: { format },
      });

      dispatch({
        type: "add_audit_event",
        event,
      });
    },
    [],
  );

  const value = useMemo<AppStateValue>(() => {
    return {
      isHydrated: state.isHydrated,
      storageError: state.storageError,
      releases: state.database.releases,
      auditLog: state.database.auditLog,
      createRelease,
      duplicateRelease,
      setReleaseStatus,
      publishRelease,
      logExportDownloaded,
      addChange,
      updateChange,
      bulkSetChangeScope,
      bulkSetChangeRisk,
      bulkDeleteChanges,
      addDraft,
      setPrimaryDraft,
      setReviewChecklistItem,
      addReviewComment,
      deleteReviewComment,
      getReleaseById,
      logReleaseViewed,
    };
  }, [
    addReviewComment,
    addDraft,
    addChange,
    bulkDeleteChanges,
    bulkSetChangeRisk,
    bulkSetChangeScope,
    createRelease,
    deleteReviewComment,
    duplicateRelease,
    logExportDownloaded,
    getReleaseById,
    logReleaseViewed,
    publishRelease,
    setReviewChecklistItem,
    setPrimaryDraft,
    setReleaseStatus,
    state.database.auditLog,
    state.database.releases,
    state.isHydrated,
    state.storageError,
    updateChange,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider.");
  }

  return context;
}
