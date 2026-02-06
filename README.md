# Changelog Studio

Changelog Studio is a release notes copilot for product and engineering teams.

It turns raw change inputs (PRs, commits, tickets, internal notes) into structured, audience-specific outputs:
- Customer-facing changelog
- Technical release notes
- Internal support/CS/QA notes
- Risk, rollout, and rollback sections
- Breaking changes and migration notes

## Product Goal

Ship high-quality release communication with editorial control, technical accuracy, and consistent voice.

## Target Users

- PM / Product Ops: communicate change clearly
- Tech Lead / Eng Manager: ensure precision and risk visibility
- Support / CS / QA: understand impact and prepare responses
- Founder: publish fast without lowering quality

## Core Workflow

1. Ingest: create a release and add changes
2. Normalize: classify by type, scope, audience relevance, risk, breaking status
3. Generate: produce structured drafts for a selected audience and tone
4. Review: edit, lint style, and run editorial checklist
5. Approve & Publish: move status from Draft to Published and export outputs
6. Versioning: keep v1/v2/v3 drafts and compare diffs

## MVP Scope

The MVP is complete when it supports:
- Release creation
- Change creation and editing
- Draft generation (customer + technical)
- Draft versioning and diff
- Review checklist
- Markdown export
- Local persistence and audit log

## AI Provider

Changelog Studio uses the OpenAI API as its generation engine.

### Integration Principles

- Server-side API calls only (no API keys in client code)
- Structured output with schema validation
- Deterministic generation settings for consistency
- Explicit missing-info handling instead of guessing
- Audience-aware and policy-aware prompt templates

### Required Environment Variables

- OPENAI_API_KEY

## Quality Bar

- Workflow-first product behavior (not just text generation)
- Multi-audience outputs
- Guardrails against hallucinations
- Consistent style and tone controls
- Explicit risk and rollout sections
- Strong empty/loading/error states

## Guardrails

- Do not invent facts
- Do not include future promises
- If required information is missing, return explicit missing details

## Language Policy

- Repository artifacts (UI, code, docs): English (en-US)
- Team communication in this build process: Portuguese (pt-BR)

## Roadmap (Phased Execution)

1. README and product contract
2. App foundation and layout
3. Releases and changes management
4. Draft generation pipeline
5. Versioning and diff
6. Review workflows
7. Publish and export
8. Audit log and final polish

## Manual Validation (Baseline)

- Project starts locally
- Home route loads without template leftovers
- README reflects the product scope and workflow

## License

MIT

## Author

Author: Gabriella Andrade  
Created & Developed by [WebLuma](https://webluma.tech/)
