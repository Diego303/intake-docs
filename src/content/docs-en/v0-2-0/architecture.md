---
title: "Architecture"
description: "System architecture, modules, data flow and design decisions."
order: 2
icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
---

# Architecture

## Overview

intake processes requirements through a 5-phase pipeline:

```
INGEST (parsers) -> ANALYZE (LLM) -> GENERATE (spec files) -> VERIFY (checks) -> EXPORT (output)
```

Each phase is an independent module with clear responsibilities. Dependencies flow in a single direction: top to bottom.

---

## Dependency Flow Between Modules

```
cli.py                    <- Thin CLI adapter, no business logic
  |
config/                   <- Loaded first, injected into all modules
  |
plugins/                  <- Plugin discovery via entry_points (PEP 621)
  |
ingest/                   <- PHASE 1: 11 parsers + plugin discovery. No LLM dependency.
  |
analyze/                  <- PHASE 2: Only module that talks to the LLM + complexity classification
  |
generate/                 <- PHASE 3: Jinja2 templates + adaptive generation. No LLM dependency.
  |
verify/                   <- PHASE 4: Subprocess execution. No LLM dependency.
  |
export/                   <- PHASE 5: File generation + plugin discovery. No LLM dependency.

connectors/               <- Infrastructure for API connectors (Phase 2 preparation)
diff/                     <- Standalone: compares spec directories
doctor/                   <- Standalone: environment checks
llm/                      <- Shared: ONLY used by analyze/
utils/                    <- Shared: used by any module
```

### Critical Isolation Rule

The modules `ingest/`, `generate/`, `verify/`, `export/`, `diff/` and `doctor/` **never** import from `llm/` or `analyze/`. Only `analyze/` communicates with the LLM. This ensures that everything except `init` and `add` works offline.

The only exception is `ImageParser`, which accepts an injected vision callable (it does not import directly from the LLM).

---

## Directory Structure

```
src/intake/
├── cli.py                  # Click CLI — thin adapter, no logic
├── config/                 # Pydantic v2 models, presets, loader
│   ├── schema.py           #   7 config models (LLM, Project, Spec, Verification, Export, Security, Connectors)
│   ├── presets.py           #   minimal / standard / enterprise
│   ├── loader.py            #   Layered merge: defaults -> preset -> YAML -> CLI
│   └── defaults.py          #   Centralized constants
├── plugins/                # Plugin system (v0.2.0)
│   ├── protocols.py         #   V2 Protocols: ParserPlugin, ExporterPlugin, ConnectorPlugin
│   ├── discovery.py         #   Discovery via importlib.metadata.entry_points()
│   └── hooks.py             #   Pipeline hook system (HookManager)
├── connectors/             # Connector infrastructure (preparation)
│   └── base.py              #   ConnectorRegistry, ConnectorError
├── ingest/                 # Phase 1 — 11 parsers + registry + plugin discovery + auto-detection
│   ├── base.py              #   ParsedContent dataclass + Parser Protocol
│   ├── registry.py          #   Auto-detection + plugin discovery + parser dispatch
│   ├── markdown.py          #   .md with YAML front matter
│   ├── plaintext.py         #   .txt, stdin, Slack dumps
│   ├── yaml_input.py        #   .yaml/.yml/.json structured
│   ├── pdf.py               #   .pdf via pdfplumber
│   ├── docx.py              #   .docx via python-docx
│   ├── jira.py              #   Jira JSON exports (API format + list)
│   ├── confluence.py        #   Confluence HTML via BS4 + markdownify
│   ├── image.py             #   Image analysis via LLM vision
│   ├── url.py               #   HTTP/HTTPS URLs via httpx + markdownify
│   ├── slack.py             #   Slack JSON exports (messages, threads, decisions)
│   └── github_issues.py     #   GitHub Issues JSON (issues, labels, comments)
├── analyze/                # Phase 2 — LLM orchestration (async) + classification
│   ├── analyzer.py          #   Orchestrator: extraction -> dedup -> risk -> design
│   ├── prompts.py           #   3 system prompts (extraction, risk, design)
│   ├── models.py            #   10 pipeline analysis dataclasses
│   ├── complexity.py        #   Heuristic complexity classification (quick/standard/enterprise)
│   ├── extraction.py        #   LLM JSON -> typed AnalysisResult
│   ├── dedup.py             #   Deduplication by Jaccard similarity
│   ├── conflicts.py         #   Conflict validation
│   ├── questions.py         #   Open questions validation
│   ├── risks.py             #   Risk assessment parsing
│   └── design.py            #   Design parsing (tasks, checks)
├── generate/               # Phase 3 — Jinja2 template rendering + adaptive generation
│   ├── spec_builder.py      #   Orchestrates 6 spec files + lock
│   ├── adaptive.py          #   AdaptiveSpecBuilder — file selection based on mode
│   └── lock.py              #   spec.lock.yaml for reproducibility
├── verify/                 # Phase 4 — Acceptance check engine
│   ├── engine.py            #   4 types: command, files_exist, pattern_present, pattern_absent
│   └── reporter.py          #   Terminal (Rich), JSON, JUnit XML
├── export/                 # Phase 5 — Agent-ready output + plugin discovery
│   ├── base.py              #   Exporter Protocol
│   ├── registry.py          #   Plugin discovery + dispatch by format
│   ├── architect.py         #   Generates pipeline.yaml
│   └── generic.py           #   Generates SPEC.md + verify.sh
├── diff/                   # Spec comparison
│   └── differ.py            #   Compares by requirement/task IDs
├── doctor/                 # Environment health checks
│   └── checks.py            #   Python, API keys, deps, config + auto-fix
├── llm/                    # LiteLLM wrapper (only used by analyze/)
│   └── adapter.py           #   Async completion, retry, cost tracking, budget
├── templates/              # Jinja2 templates for spec generation
│   ├── requirements.md.j2
│   ├── design.md.j2
│   ├── tasks.md.j2          #   Includes Status column per task
│   ├── acceptance.yaml.j2
│   ├── context.md.j2
│   └── sources.md.j2
└── utils/                  # Shared utilities
    ├── file_detect.py       #   Format detection by extension
    ├── project_detect.py    #   Auto-detection of the tech stack
    ├── source_uri.py        #   URI parsing: file, stdin, url, jira://, github://
    ├── task_state.py        #   Task state management in tasks.md
    ├── cost.py              #   Cost tracking with per-phase breakdown
    └── logging.py           #   structlog configuration
```

---

## Data Models

intake uses two modeling systems with distinct purposes:

### Dataclasses -- Pipeline Data

All data flowing through the pipeline uses `dataclasses` from the standard library. They are lightweight and do not need validation because the data has already been processed internally.

Examples: `ParsedContent`, `Requirement`, `Conflict`, `TaskItem`, `CheckResult`, `AnalysisResult`, `DesignResult`.

### Pydantic v2 -- Configuration

Everything that comes from the outside (`.intake.yaml` file, CLI flags) is validated with Pydantic v2 models. This ensures the configuration is correct before it is used.

Examples: `IntakeConfig`, `LLMConfig`, `ProjectConfig`, `SpecConfig`.

**Rule:** They are never mixed. Config models do not appear inside pipeline data, and dataclasses do not validate user input.

---

## Extension Points: Protocol over ABC

All extension points use `typing.Protocol` with `@runtime_checkable`, not abstract base classes (ABC). This allows structural subtyping without inheritance:

```python
@runtime_checkable
class Parser(Protocol):
    def can_parse(self, source: str) -> bool: ...
    def parse(self, source: str) -> ParsedContent: ...
```

### V1 Protocols (core)

The V1 system Protocols are:

| Protocol | Module | Methods |
|----------|--------|---------|
| `Parser` | `ingest/base.py` | `can_parse(source) -> bool`, `parse(source) -> ParsedContent` |
| `Exporter` | `export/base.py` | `export(spec_dir, output_dir) -> list[str]` |
| `Reporter` | `verify/reporter.py` | `render(report) -> str` |

### V2 Protocols (plugins)

The V2 Protocols extend V1 with metadata and additional capabilities for external plugins:

| Protocol | Module | Methods |
|----------|--------|---------|
| `ParserPlugin` | `plugins/protocols.py` | `meta`, `supported_extensions`, `confidence()`, `can_parse()`, `parse()` |
| `ExporterPlugin` | `plugins/protocols.py` | `meta`, `supported_agents`, `export() -> ExportResult` |
| `ConnectorPlugin` | `plugins/protocols.py` | `meta`, `uri_schemes`, `can_handle()`, `fetch()` (async), `validate_config()` |

Existing V1 parsers continue to work. The registries accept both V1 and V2. To add a new parser, exporter or reporter, you only need to implement the correct interface -- there is no need to inherit from any base class.

See [Plugins](../plugins/) for more details.

---

## The 7 Spec Files

Each generated spec contains these files:

| File | Generated by | Content |
|------|-------------|---------|
| `requirements.md` | `requirements.md.j2` | Functional requirements (FR-XX) and non-functional requirements (NFR-XX), conflicts, open questions |
| `design.md` | `design.md.j2` | Components, files to create/modify, technical decisions, dependencies |
| `tasks.md` | `tasks.md.j2` | Summary table + detail per task: description, files, dependencies, checks |
| `acceptance.yaml` | `acceptance.yaml.j2` | Executable checks: command, files_exist, pattern_present, pattern_absent |
| `context.md` | `context.md.j2` | Project info, stack, conventions, risk summary |
| `sources.md` | `sources.md.j2` | Sources used, requirement-source mapping, conflict sources |
| `spec.lock.yaml` | `lock.py` | SHA-256 hashes of sources and specs, total cost, timestamps |

---

## Exception Hierarchy

Each module defines its own exceptions with user-oriented messages. All include `reason` (what happened) and `suggestion` (how to fix it).

```
IngestError
├── ParseError(source, reason, suggestion)
│   ├── EmptySourceError(source)
│   └── FileTooLargeError(source, size_bytes)
└── UnsupportedFormatError(source, detected_format)

AnalyzeError(reason, suggestion)

GenerateError(reason, suggestion)

VerifyError(reason, suggestion)

ExportError(reason, suggestion)

DiffError(reason, suggestion)

DoctorError

ConfigError(reason, suggestion)

PresetError(preset_name)

LLMError(reason, suggestion)
├── CostLimitError(accumulated, limit)
└── APIKeyMissingError(env_var)

PluginError
└── PluginLoadError

ConnectorError
└── ConnectorNotFoundError

TaskStateError
```

---

## External Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| `click` | >=8.1 | CLI framework |
| `rich` | >=13.0 | Terminal output (tables, colors) |
| `pydantic` | >=2.0 | Configuration validation |
| `pyyaml` | >=6.0 | YAML parsing |
| `litellm` | >=1.40 | LLM abstraction (100+ models) |
| `pdfplumber` | >=0.11 | PDF parsing |
| `python-docx` | >=1.1 | DOCX parsing |
| `beautifulsoup4` | >=4.12 | HTML parsing |
| `markdownify` | >=0.13 | HTML to Markdown conversion |
| `jinja2` | >=3.1 | Template rendering |
| `structlog` | >=24.0 | Structured logging |
| `httpx` | >=0.27 | HTTP client (URL parser, connectors) |

---

## Plugin System

Since v0.2.0, intake uses a plugin-first architecture based on Python entry_points (PEP 621).

### Discovery

Plugins are discovered automatically via `importlib.metadata.entry_points()` in three groups:

| Group | Contents |
|-------|----------|
| `intake.parsers` | 11 built-in parsers |
| `intake.exporters` | 2 built-in exporters |
| `intake.connectors` | (empty -- preparation for Phase 2) |

The registries (`ParserRegistry`, `ExporterRegistry`) attempt plugin discovery first and fall back to manual registration if it fails. This allows external plugins to register automatically simply by installing the package.

### Hooks

The `HookManager` allows registering callbacks that execute in response to pipeline events. Callbacks execute in registration order; exceptions are caught without blocking other callbacks.

See [Plugins](../plugins/) for complete documentation.

---

## Complexity Classification and Adaptive Generation

The `analyze/complexity.py` module automatically classifies source complexity to select the optimal generation mode:

| Mode | Criteria | Generated files |
|------|----------|----------------|
| `quick` | <500 words, 1 source, no structure | `context.md` + `tasks.md` |
| `standard` | Default | All 6 complete spec files |
| `enterprise` | 4+ sources OR >5000 words | All 6 files + detailed risks |

The `AdaptiveSpecBuilder` wraps the standard `SpecBuilder` and filters files based on the mode. A specific mode can be forced with `--mode` in the CLI.

---

## Design Principles

1. **Offline first** -- Everything except `init` and `add` works without an internet connection.
2. **Provider-agnostic** -- Any model that LiteLLM supports: Anthropic, OpenAI, Google, local models.
3. **Plugin-first** -- Parsers and exporters are discovered via entry_points. Fallback to manual registration.
4. **No magic strings** -- All constants are explicitly defined in `defaults.py`.
5. **Budget enforcement** -- Cost is tracked per LLM call with configurable limits.
6. **Strict typing** -- `mypy --strict` with zero errors across the entire codebase.
7. **Informative errors** -- Every exception says what happened, why, and how to fix it.
