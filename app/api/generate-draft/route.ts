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

const DEFAULT_OPENAI_MODEL = "gpt-5-nano";

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

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function getFieldByAliases(
  record: Record<string, unknown>,
  aliases: string[],
): unknown {
  for (const alias of aliases) {
    if (alias in record) {
      return record[alias];
    }
  }
  return undefined;
}

function normalizeGeneratedDraftPayload(value: unknown): GeneratedDraftPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const sectionsCandidate = isRecord(value.sections)
    ? value.sections
    : isRecord(value.section)
      ? value.section
      : {};

  const normalized: GeneratedDraftPayload = {
    headline: toStringValue(getFieldByAliases(value, ["headline", "title"])),
    summary: toStringValue(getFieldByAliases(value, ["summary", "overview"])),
    sections: {
      features: toStringArray(getFieldByAliases(sectionsCandidate, ["features", "feature"])),
      fixes: toStringArray(getFieldByAliases(sectionsCandidate, ["fixes", "bugfixes"])),
      improvements: toStringArray(
        getFieldByAliases(sectionsCandidate, ["improvements", "improvement"]),
      ),
      security: toStringArray(getFieldByAliases(sectionsCandidate, ["security"])),
      breakingChanges: toStringArray(
        getFieldByAliases(sectionsCandidate, [
          "breakingChanges",
          "breaking_changes",
          "breaking changes",
        ]),
      ),
      deprecations: toStringArray(getFieldByAliases(sectionsCandidate, ["deprecations"])),
      knownIssues: toStringArray(
        getFieldByAliases(sectionsCandidate, ["knownIssues", "known_issues", "known issues"]),
      ),
      migrationNotes: toStringArray(
        getFieldByAliases(sectionsCandidate, [
          "migrationNotes",
          "migration_notes",
          "migration notes",
        ]),
      ),
    },
    supportFaq: toStringArray(
      getFieldByAliases(value, ["supportFaq", "support_faq", "support faq", "faq"]),
    ),
    rolloutPlan: toStringArray(
      getFieldByAliases(value, ["rolloutPlan", "rollout_plan", "rollout plan"]),
    ),
    missingInfo: toStringArray(
      getFieldByAliases(value, ["missingInfo", "missing_info", "missing info", "todos"]),
    ),
  };

  if (!normalized.headline) {
    normalized.headline = "Release draft";
  }
  if (!normalized.summary) {
    normalized.summary = "No summary provided.";
  }

  return isValidGeneratedDraftPayload(normalized) ? normalized : null;
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

function parsePossiblyWrappedJson(text: string): unknown {
  const direct = stripCodeFences(text);
  try {
    return JSON.parse(direct) as unknown;
  } catch {
    const firstBrace = direct.indexOf("{");
    const lastBrace = direct.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("OpenAI response is not valid JSON.");
    }
    const sliced = direct.slice(firstBrace, lastBrace + 1);
    return JSON.parse(sliced) as unknown;
  }
}

function resolveOpenAiModel(): string {
  const configured = process.env.OPENAI_MODEL?.trim();
  if (configured) {
    return configured;
  }
  return DEFAULT_OPENAI_MODEL;
}

function sanitizeErrorDetail(detail: string): string {
  return detail.replace(/\s+/g, " ").trim().slice(0, 240);
}

function extractResponseText(data: unknown): string | undefined {
  if (!isRecord(data)) {
    return undefined;
  }

  if (isString(data.output_text) && data.output_text.trim()) {
    return data.output_text;
  }

  const output = data.output;
  if (!Array.isArray(output)) {
    return undefined;
  }

  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (!isRecord(contentItem)) {
        continue;
      }

      if (isString(contentItem.text) && contentItem.text.trim()) {
        return contentItem.text;
      }

      if (isRecord(contentItem.text) && isString(contentItem.text.value)) {
        return contentItem.text.value;
      }
    }
  }

  return undefined;
}

async function requestOpenAiDraft(
  payload: GenerateDraftRequest,
): Promise<GeneratedDraftPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = resolveOpenAiModel();
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

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: systemPrompt,
      input: userPrompt,
    }),
  });

  if (!response.ok) {
    const detail = sanitizeErrorDetail(await response.text());
    throw new Error(`OPENAI_REQUEST_FAILED:${response.status}:${detail}`);
  }

  const data = (await response.json()) as unknown;
  const rawContent = extractResponseText(data);
  if (!rawContent) {
    throw new Error("OpenAI did not return completion content.");
  }

  const parsed = parsePossiblyWrappedJson(rawContent);
  if (isValidGeneratedDraftPayload(parsed)) {
    return parsed;
  }

  const normalized = normalizeGeneratedDraftPayload(parsed);
  if (!normalized) {
    throw new Error("OpenAI response does not match required draft schema.");
  }

  return normalized;
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
      const [, statusText = "", detail = ""] = message.split(":");
      const statusNumber = Number.parseInt(statusText, 10);
      const detailLower = detail.toLowerCase();
      const mappedMessage =
        statusNumber === 401 || statusNumber === 403
          ? "OpenAI authentication failed on the server."
          : statusNumber === 429
            ? "OpenAI rate limit reached. Please try again in a few moments."
            : statusNumber === 400 && detailLower.includes("model")
              ? `OpenAI model is not available. Confirm access to ${resolveOpenAiModel()}.`
              : statusNumber === 404
                ? "OpenAI endpoint or model was not found. Check model availability."
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
