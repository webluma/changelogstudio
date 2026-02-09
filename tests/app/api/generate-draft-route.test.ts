// @vitest-environment node

import { NextRequest } from "next/server";
import { POST } from "@/app/api/generate-draft/route";
import type { GenerateDraftRequest } from "@/lib/ai/types";

function buildValidPayload(): GenerateDraftRequest {
  return {
    release: {
      id: "rel_1",
      name: "Release 1",
      versionLabel: "v1.0.0",
      dateStart: "2026-02-01",
      dateEnd: "2026-02-10",
    },
    changes: [
      {
        id: "chg_1",
        title: "Add API retries",
        description: "Retries for transient API failures.",
        type: "feature",
        scope: "api",
        audiences: ["technical"],
        risk: "low",
        isBreaking: false,
        links: [],
        createdAt: "2026-02-01T10:00:00.000Z",
        updatedAt: "2026-02-01T10:00:00.000Z",
      },
    ],
    config: {
      audience: "technical",
      tone: "direct",
      length: "standard",
      format: "markdown",
      sections: {
        includeBreakingChanges: true,
        includeMigrationSteps: true,
        includeRolloutRollback: true,
        includeKnownIssues: true,
        includeSupportFaq: false,
      },
    },
  };
}

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/generate-draft", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate-draft", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns 400 when payload is invalid", async () => {
    const response = await POST(createRequest({ invalid: true }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Invalid generate draft payload/i);
  });

  it("returns 503 when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const response = await POST(createRequest(buildValidPayload()));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/OPENAI_API_KEY is missing/i);
  });

  it("returns rendered draft when OpenAI returns valid JSON schema", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");

    const openAiResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              headline: "Release 1",
              summary: "Technical updates for release 1.",
              sections: {
                features: ["Added retries for transient failures."],
                fixes: [],
                improvements: [],
                security: [],
                breakingChanges: [],
                deprecations: [],
                knownIssues: [],
                migrationNotes: [],
              },
              supportFaq: [],
              rolloutPlan: ["Start with canary deployment."],
              missingInfo: [],
            }),
          },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(openAiResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest(buildValidPayload()));
    const body = (await response.json()) as { rendered: string; format: string };

    expect(response.status).toBe(200);
    expect(body.format).toBe("markdown");
    expect(body.rendered).toContain("# Release 1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
    expect(
      (fetchMock.mock.calls[0][1] as { headers?: Record<string, string> }).headers?.Authorization,
    ).toBe("Bearer test-key");
  });
});
