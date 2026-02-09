import { NextRequest, NextResponse } from "next/server";
import {
  DRAFT_FORMATS,
  GENERATION_LENGTHS,
  GENERATION_TONES,
  AUDIENCES,
  type ChangeItem,
} from "@/lib/domain/types";
import {
  type GenerateDraftRequest,
  type GeneratedDraftPayload,
  isValidGeneratedDraftPayload,
} from "@/lib/ai/types";
import { renderGeneratedDraft } from "@/lib/ai/render-draft";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOneOf(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return typeof value === "undefined" || typeof value === "string";
}

function isChangeItem(value: unknown): value is ChangeItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.description) &&
    isString(value.type) &&
    isString(value.scope) &&
    Array.isArray(value.audiences) &&
    value.audiences.every((audience) => isString(audience)) &&
    isString(value.risk) &&
    typeof value.isBreaking === "boolean" &&
    isOptionalString(value.migrationNotes) &&
    Array.isArray(value.links)
  );
}

function isValidGenerateDraftRequest(value: unknown): value is GenerateDraftRequest {
  if (!isRecord(value)) {
    return false;
  }
  if (!isRecord(value.release) || !isRecord(value.config) || !isRecord(value.config.sections)) {
    return false;
  }
  if (!Array.isArray(value.changes) || !value.changes.every(isChangeItem)) {
    return false;
  }

  const config = value.config as Record<string, unknown>;
  const sections = config.sections as Record<string, unknown>;
  return (
    isString(value.release.id) &&
    isString(value.release.name) &&
    isString(value.release.versionLabel) &&
    isOptionalString(value.release.dateStart) &&
    isOptionalString(value.release.dateEnd) &&
    isString(config.audience) &&
    isOneOf(config.audience, AUDIENCES) &&
    isString(config.tone) &&
    isOneOf(config.tone, GENERATION_TONES) &&
    isString(config.length) &&
    isOneOf(config.length, GENERATION_LENGTHS) &&
    isString(config.format) &&
    isOneOf(config.format, DRAFT_FORMATS) &&
    typeof sections.includeBreakingChanges === "boolean" &&
    typeof sections.includeMigrationSteps === "boolean" &&
    typeof sections.includeRolloutRollback === "boolean" &&
    typeof sections.includeKnownIssues === "boolean" &&
    typeof sections.includeSupportFaq === "boolean"
  );
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const firstLineBreak = trimmed.indexOf("\n");
  const lastFence = trimmed.lastIndexOf("```");
  if (firstLineBreak === -1 || lastFence === -1 || lastFence <= firstLineBreak) {
    return trimmed;
  }

  return trimmed.slice(firstLineBreak + 1, lastFence).trim();
}

async function requestOpenAiDraft(
  payload: GenerateDraftRequest,
): Promise<GeneratedDraftPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  const systemPrompt = [
    "You are a release notes copilot.",
    "Return strict JSON only.",
    "Never invent facts.",
    "Do not make promises about future delivery.",
    "If data is missing, include explicit, objective items in missingInfo.",
    "Use concise and clear en-US language.",
  ].join(" ");

  const userPrompt = [
    "Generate release draft data with this exact JSON shape:",
    "{ headline, summary, sections:{ features, fixes, improvements, security, breakingChanges, deprecations, knownIssues, migrationNotes }, supportFaq, rolloutPlan, missingInfo }",
    "All fields must be present and array fields must be arrays of strings.",
    "",
    "Input payload:",
    JSON.stringify(payload),
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OPENAI_REQUEST_FAILED:${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("OpenAI did not return completion content.");
  }

  const parsed = JSON.parse(stripCodeFences(rawContent)) as unknown;
  if (!isValidGeneratedDraftPayload(parsed)) {
    throw new Error("OpenAI response does not match required draft schema.");
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    if (!isValidGenerateDraftRequest(body)) {
      return NextResponse.json(
        { error: "Invalid generate draft payload." },
        { status: 400 },
      );
    }

    if (body.changes.length === 0) {
      return NextResponse.json(
        { error: "Add at least one change before generating a draft." },
        { status: 400 },
      );
    }

    const structured = await requestOpenAiDraft(body);
    const rendered = renderGeneratedDraft(structured, body.config);

    return NextResponse.json({
      structured,
      rendered,
      format: body.config.format,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draft generation failed.";
    if (message.startsWith("OPENAI_REQUEST_FAILED:")) {
      const statusText = message.replace("OPENAI_REQUEST_FAILED:", "");
      const statusNumber = Number.parseInt(statusText, 10);
      const mappedMessage =
        statusNumber === 401 || statusNumber === 403
          ? "OpenAI authentication failed on the server."
          : statusNumber === 429
            ? "OpenAI rate limit reached. Please try again in a few moments."
            : "OpenAI request failed. Please try again.";
      return NextResponse.json({ error: mappedMessage }, { status: 502 });
    }

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing on the server." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
