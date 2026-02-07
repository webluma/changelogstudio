import { APP_STORAGE_KEY, createEmptyDatabase } from "@/lib/domain/defaults";
import { loadDatabase, saveDatabase } from "@/lib/persistence/local-db";

describe("local-db persistence", () => {
  it("returns empty db when storage has no data", () => {
    const result = loadDatabase();

    expect(result.data).toEqual(createEmptyDatabase());
    expect(result.errorMessage).toBeUndefined();
  });

  it("returns empty db and message when JSON is invalid", () => {
    window.localStorage.setItem(APP_STORAGE_KEY, "{invalid json");

    const result = loadDatabase();

    expect(result.data).toEqual(createEmptyDatabase());
    expect(result.errorMessage).toMatch(/could not be parsed/i);
  });

  it("returns empty db and message when payload shape is invalid", () => {
    const malformed = {
      schemaVersion: 1,
      releases: [{ id: "bad-release" }],
      auditLog: [],
    };
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(malformed));

    const result = loadDatabase();

    expect(result.data).toEqual(createEmptyDatabase());
    expect(result.errorMessage).toMatch(/format is invalid/i);
  });

  it("loads valid database payload", () => {
    const valid = {
      schemaVersion: 1 as const,
      releases: [
        {
          id: "rel_1",
          name: "Release Alpha",
          versionLabel: "v1.0.0",
          dateStart: "2026-02-01",
          dateEnd: "2026-02-07",
          status: "draft",
          changes: [],
          drafts: [],
          createdAt: "2026-02-01T10:00:00.000Z",
          updatedAt: "2026-02-01T10:00:00.000Z",
        },
      ],
      auditLog: [
        {
          id: "evt_1",
          event: "release.created",
          actor: "user",
          timestamp: "2026-02-01T10:00:00.000Z",
          releaseId: "rel_1",
          entityId: "rel_1",
        },
      ],
    };
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(valid));

    const result = loadDatabase();

    expect(result.errorMessage).toBeUndefined();
    expect(result.data).toEqual(valid);
  });

  it("saves database payload", () => {
    const db = createEmptyDatabase();
    db.auditLog.push({
      id: "evt_1",
      event: "release.viewed",
      actor: "user",
      timestamp: "2026-02-01T10:00:00.000Z",
    });

    saveDatabase(db);

    const raw = window.localStorage.getItem(APP_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual(db);
  });
});
