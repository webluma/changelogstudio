"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { createEmptyDatabase } from "@/lib/domain/defaults";
import type {
  AppDatabase,
  AuditEvent,
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

interface AppStateValue {
  isHydrated: boolean;
  storageError?: string;
  releases: Release[];
  auditLog: AuditEvent[];
  createRelease: (input: CreateReleaseInput) => string;
  duplicateRelease: (releaseId: string) => string | null;
  setReleaseStatus: (releaseId: string, status: ReleaseStatus) => void;
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
      type: "add_audit_event";
      event: AuditEvent;
    };

const AppStateContext = createContext<AppStateValue | null>(null);

const INITIAL_STATE: AppState = {
  isHydrated: false,
  storageError: undefined,
  database: createEmptyDatabase(),
};

function appStateReducer(state: AppState, action: AppAction): AppState {
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
                  updatedAt: new Date().toISOString(),
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
    createdAt: now,
    updatedAt: now,
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

  const value = useMemo<AppStateValue>(() => {
    return {
      isHydrated: state.isHydrated,
      storageError: state.storageError,
      releases: state.database.releases,
      auditLog: state.database.auditLog,
      createRelease,
      duplicateRelease,
      setReleaseStatus,
      getReleaseById,
      logReleaseViewed,
    };
  }, [
    createRelease,
    duplicateRelease,
    getReleaseById,
    logReleaseViewed,
    setReleaseStatus,
    state.database.auditLog,
    state.database.releases,
    state.isHydrated,
    state.storageError,
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
