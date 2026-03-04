---
title: "Architecture"
description: "System architecture, modules, data flow and design decisions."
order: 2
icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
---

# Architecture

## General Overview

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

connectors/               <- 3 API connectors: Jira, Confluence, GitHub (async fetch)
  |
feedback/                 <- Feedback loop: failure analysis + spec amendments (requires LLM)

diff/                     <- Standalone: compares spec directories
doctor/                   <- Standalone: environment checks + credential validation
llm/                      <- Shared: used by analyze/ and feedback/
utils/                    <- Shared: used by any module
```

### Critical Isolation Rule

The modules `ingest/`, `generate/`, `verify/`, `export/`, `diff/` and `doctor/` **never** import from `llm/` or `analyze/`. This guarantees that everything except `init`, `add` and `feedback` works offline.

Documented exceptions:
- `ImageParser` accepts an injected vision callable (does not import directly from the LLM)
- `feedback/` uses the LLM to analyze verification failures, but does not analyze requirements — it is a module independent from `analyze/`

---

## Directory Structure

```
src/intake/
├── cli.py                  # Click CLI — thin adapter, no logic
├── config/                 # Pydantic v2 models, presets, loader
│   ├── schema.py           #   9 config models (LLM, Project, Spec, Verification, Export, Security, Connectors, Feedback, Intake)
│   ├── presets.py           #   minimal / standard / enterprise
│   ├── loader.py            #   Layered merge: defaults -> preset -> YAML -> CLI
│   └── defaults.py          #   Centralized constants
├── plugins/                # Plugin system (v0.2.0)
│   ├── protocols.py         #   V2 Protocols: ParserPlugin, ExporterPlugin, ConnectorPlugin
│   ├── discovery.py         #   Discovery via importlib.metadata.entry_points()
│   └── hooks.py             #   Pipeline hook system (HookManager)
├── connectors/             # 3 direct API connectors (async fetch + plugin protocol)
│   ├── base.py              #   ConnectorRegistry, ConnectorError
│   ├── jira_api.py          #   Jira: issues, JQL, sprints via atlassian-python-api
│   ├── confluence_api.py    #   Confluence: pages by ID, space/title, CQL
│   └── github_api.py        #   GitHub: individual issues, filtered, by labels
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
│   ├── models.py            #   10 dataclasses for the analysis pipeline
│   ├── complexity.py        #   Heuristic complexity classification (quick/standard/enterprise)
│   ├── extraction.py        #   JSON from LLM -> typed AnalysisResult
│   ├── dedup.py             #   Deduplication by Jaccard similarity
│   ├── conflicts.py         #   Conflict validation
│   ├── questions.py         #   Open questions validation
│   ├── risks.py             #   Risk assessment parsing
│   └── design.py            #   Design parsing (tasks, checks)
├── generate/               # Phase 3 — Jinja2 template rendering + adaptive generation
│   ├── spec_builder.py      #   Orchestrates 6 spec files + lock
│   ├── adaptive.py          #   AdaptiveSpecBuilder — file selection based on mode
│   └── lock.py              #   spec.lock.yaml for reproducibility
├── verify/                 # Phase 4 — Acceptance checks engine
│   ├── engine.py            #   4 types: command, files_exist, pattern_present, pattern_absent
│   └── reporter.py          #   Terminal (Rich), JSON, JUnit XML
├── export/                 # Phase 5 — Agent-ready output + plugin discovery (6 exporters)
│   ├── base.py              #   Exporter Protocol
│   ├── registry.py          #   Plugin discovery + format dispatch
│   ├── _helpers.py          #   Shared utilities (read_spec_file, parse_tasks, etc.)
│   ├── architect.py         #   Generates pipeline.yaml (V1)
│   ├── generic.py           #   Generates SPEC.md + verify.sh (V1)
│   ├── claude_code.py       #   CLAUDE.md + .intake/tasks/ + verify.sh (V2)
│   ├── cursor.py            #   .cursor/rules/intake-spec.mdc (V2)
│   ├── kiro.py              #   requirements/design/tasks in Kiro format (V2)
│   └── copilot.py           #   .github/copilot-instructions.md (V2)
├── diff/                   # Spec comparison
│   └── differ.py            #   Compares by requirement/task IDs
├── doctor/                 # Environment health checks
│   └── checks.py            #   Python, API keys, deps, config + auto-fix
├── llm/                    # LiteLLM wrapper (only used by analyze/)
│   └── adapter.py           #   Async completion, retry, cost tracking, budget
├── feedback/               # Feedback loop: failure analysis + amendments (requires LLM)
│   ├── analyzer.py          #   FeedbackAnalyzer: LLM analysis of failed checks
│   ├── prompts.py           #   FEEDBACK_ANALYSIS_PROMPT
│   ├── suggestions.py       #   SuggestionFormatter: generic, claude-code, cursor
│   └── spec_updater.py      #   SpecUpdater: preview + apply amendments to the spec
├── templates/              # 15 Jinja2 templates (6 spec + 3 claude-code + 3 kiro + 1 cursor + 1 copilot + 1 feedback)
│   ├── requirements.md.j2
│   ├── design.md.j2
│   ├── tasks.md.j2          #   Includes Status column per task
│   ├── acceptance.yaml.j2
│   ├── context.md.j2
│   ├── sources.md.j2
│   ├── claude_md.j2         #   Section for CLAUDE.md
│   ├── claude_task.md.j2    #   Individual task for Claude Code
│   ├── verify_sh.j2         #   Verification script
│   ├── cursor_rules.mdc.j2  #   Cursor rules
│   ├── kiro_requirements.md.j2  #   Requirements in Kiro format
│   ├── kiro_design.md.j2    #   Design in Kiro format
│   ├── kiro_tasks.md.j2     #   Tasks in Kiro format
│   ├── copilot_instructions.md.j2  #   Instructions for Copilot
│   └── feedback.md.j2       #   Feedback suggestions format
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

### Dataclasses — Pipeline Data

All data flowing through the pipeline uses `dataclasses` from the standard library. They are lightweight and do not need validation because the data is already processed internally.

Examples: `ParsedContent`, `Requirement`, `Conflict`, `TaskItem`, `CheckResult`, `AnalysisResult`, `DesignResult`.

### Pydantic v2 — Configuration

Everything coming from the outside (`.intake.yaml` file, CLI flags) is validated with Pydantic v2 models. This ensures the configuration is correct before using it.

Examples: `IntakeConfig`, `LLMConfig`, `ProjectConfig`, `SpecConfig`.

**Rule:** They are never mixed. Config models do not appear inside pipeline data, and dataclasses do not validate user input.

---

## Extension Points: Protocol over ABC

All extension points use `typing.Protocol` with `@runtime_checkable`, not abstract classes (ABC). This enables structural subtyping without inheritance:

```python
@runtime_checkable
class Parser(Protocol):
    def can_parse(self, source: str) -> bool: ...
    def parse(self, source: str) -> ParsedContent: ...
```

### V1 Protocols (core)

The system's V1 Protocols are:

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

Existing parsers (V1) continue to work. Registries accept both V1 and V2. To add a new parser, exporter or reporter, you just need to implement the correct interface — inheriting from a base class is not required.

See [Plugins](../plugins/) for more details.

---

## The 7 Spec Files

Each generated spec contains these files:

| File | Generated by | Content |
|------|-------------|---------|
| `requirements.md` | `requirements.md.j2` | Functional requirements (FR-XX) and non-functional (NFR-XX), conflicts, open questions |
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

FeedbackError

SpecUpdateError

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

**Optional dependencies (connectors):**

| Package | Version | Usage |
|---------|---------|-------|
| `atlassian-python-api` | >=3.40 | Jira and Confluence connectors |
| `PyGithub` | >=2.0 | GitHub connector |

---

## Plugin System

Since v0.2.0, intake uses a plugin-first architecture based on Python entry_points (PEP 621).

### Discovery

Plugins are automatically discovered via `importlib.metadata.entry_points()` in three groups:

| Group | Content |
|-------|---------|
| `intake.parsers` | 11 built-in parsers |
| `intake.exporters` | 6 built-in exporters (2 V1 + 4 V2) |
| `intake.connectors` | 3 built-in connectors (Jira, Confluence, GitHub) |

The registries (`ParserRegistry`, `ExporterRegistry`) attempt plugin discovery first and fall back to manual registration if it fails. This allows external plugins to register automatically just by installing the package.

### Hooks

The `HookManager` allows registering callbacks that execute in response to pipeline events. Callbacks execute in registration order; exceptions are caught without blocking other callbacks.

See [Plugins](../plugins/) for complete documentation.

---

## Complexity Classification and Adaptive Generation

The `analyze/complexity.py` module automatically classifies source complexity to select the optimal generation mode:

| Mode | Criteria | Generated Files |
|------|----------|----------------|
| `quick` | <500 words, 1 source, no structure | `context.md` + `tasks.md` |
| `standard` | Default | All 6 complete spec files |
| `enterprise` | 4+ sources OR >5000 words | All 6 files + detailed risks |

The `AdaptiveSpecBuilder` wraps the standard `SpecBuilder` and filters files based on mode. A specific mode can be forced with `--mode` in the CLI.

---

## Design Principles

1. **Offline first** — Everything except `init` and `add` works without an internet connection.
2. **Provider-agnostic** — Any model that LiteLLM supports: Anthropic, OpenAI, Google, local models.
3. **Plugin-first** — Parsers and exporters are discovered via entry_points. Fallback to manual registration.
4. **No magic strings** — All constants are explicitly defined in `defaults.py`.
5. **Budget enforcement** — Cost is tracked per LLM call with configurable limits.
6. **Strict typing** — `mypy --strict` with zero errors across the entire codebase.
7. **Informative errors** — Every exception says what happened, why, and how to fix it.
