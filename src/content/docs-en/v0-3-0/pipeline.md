---
title: "Pipeline"
description: "How the 5-phase pipeline works in detail."
order: 5
icon: "M5 12h14M12 5l7 7-7 7"
---

# Pipeline

intake processes requirements through a 5-phase pipeline. Each phase transforms the data and passes it to the next one.

```
Sources             Phase 1       Phase 2       Phase 3        Phase 4         Phase 5
(files/URLs) ----> INGEST -----> ANALYZE ----> GENERATE ----> VERIFY -------> EXPORT
                   (parsers)     (LLM)        (templates)    (checks)        (output)
                      |             |              |              |               |
                ParsedContent  AnalysisResult  Spec files   VerifyReport   Agent output
                                    |              |
                             Complexity      Adaptive
                            Assessment      Generation
```

---

## Phase 1: Ingest

**Module:** `ingest/` (11 parsers)
**Requires LLM:** No (except `ImageParser`)

### What It Does

Takes requirement files in any format and converts them into a normalized structure (`ParsedContent`). Supports local files, URLs, and stdin.

### Flow

```
Source --> parse_source() --> Registry --> Detects format --> Selects parser --> ParsedContent
```

1. **Source resolution**: `parse_source()` determines the source type:
   - Local files -> passed to the registry
   - HTTP/HTTPS URLs -> processed with `UrlParser`
   - Scheme URIs (`jira://`, `confluence://`, `github://`) -> resolved via API connectors (downloaded to temporary files)
   - Stdin (`-`) -> read as plaintext
   - Free text -> treated as plaintext
2. The **Registry** receives the file path
3. **Auto-detects the format** by extension and content:
   - Direct extension: `.md` -> markdown, `.pdf` -> pdf, `.docx` -> docx
   - JSON subtypes: Jira > GitHub Issues > Slack > generic YAML
   - HTML subtypes: if it contains "confluence" or "atlassian" -> confluence
   - Fallback: plaintext
4. **Selects the parser** registered for that format (via plugin discovery or manual registration)
5. The parser produces a normalized **`ParsedContent`**

### ParsedContent

Each parsed source produces:

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Clean extracted text |
| `format` | string | Format identifier (e.g.: `"jira"`, `"markdown"`) |
| `source` | string | Path to the original file |
| `metadata` | dict | Key-value pairs (author, date, priority, etc.) |
| `sections` | list[dict] | Structured sections (title, level, content) |
| `relations` | list[dict] | Relationships between items (blocks, depends on, relates to) |

### Validations

Before parsing, each file goes through centralized validations:

- The file must exist and be a regular file (not a directory)
- Maximum size: **50 MB** (`MAX_FILE_SIZE_BYTES`)
- If the file is empty or only has whitespace: `EmptySourceError` error
- Encoding: tries UTF-8 first, fallback to latin-1

See [Input Formats](../input-formats/) for details on each parser.

---

## Phase 2: Analyze

**Module:** `analyze/`
**Requires LLM:** Yes (async via `litellm.acompletion`)

### What It Does

Takes the `ParsedContent` from all sources and uses the LLM to extract structured requirements, detect conflicts, assess risks and produce a technical design.

### Sub-phases

```
ParsedContent[] --> Combine --> Extraction --> Dedup --> Validate --> Risk --> Design --> AnalysisResult
```

#### 1. Combine Sources

Concatenates text from all sources with separators:

```
=== SOURCE 1: path/to/file.md (format: markdown) ===
[content]

---

=== SOURCE 2: path/to/jira.json (format: jira) ===
[content]
```

#### 2. Extraction (LLM call)

Sends the combined text to the LLM with `EXTRACTION_PROMPT`. The LLM returns JSON with:

- **Functional requirements** (FR-01, FR-02, ...)
- **Non-functional requirements** (NFR-01, NFR-02, ...)
- **Conflicts** between sources (CONFLICT-01, ...)
- **Open questions** (Q-01, Q-02, ...)

The prompt is configured with: number of sources, language, requirements format (`ears`, `user-stories`, etc.).

#### 3. Deduplication

Compares requirement titles using **Jaccard similarity** (word intersection / word union):

- Threshold: **0.75** (75% of words in common = duplicate)
- Normalizes: lowercase, strip, collapse whitespace
- Deduplicates functional and non-functional separately
- Keeps the first occurrence

#### 4. Validation

- **Conflicts**: those without description, sources, or recommendation are filtered out
- **Open questions**: those without question text or context are filtered out

#### 5. Risk Assessment (optional)

If `config.spec.risk_assessment = true`, makes another LLM call with `RISK_ASSESSMENT_PROMPT`. Produces a list of risks (RISK-01, ...) with:

- Associated requirement IDs
- Probability and impact (low/medium/high)
- Category (technical, scope, integration, security, performance)
- Suggested mitigation

#### 6. Design (LLM call)

Third LLM call with `DESIGN_PROMPT`. Produces:

- Architecture **components**
- **Files to create and modify** (path + description + action)
- **Technical decisions** (decision, justification, associated requirement)
- **Tasks** with dependencies (DAG), time estimate in minutes, files, checks
- **Acceptance checks** (command, files_exist, pattern_present, pattern_absent)
- External project **dependencies**

### AnalysisResult

The complete result contains:

| Field | Type | Description |
|-------|------|-------------|
| `functional_requirements` | list[Requirement] | Functional requirements (FR-XX) |
| `non_functional_requirements` | list[Requirement] | Non-functional requirements (NFR-XX) |
| `conflicts` | list[Conflict] | Conflicts between sources |
| `open_questions` | list[OpenQuestion] | Unanswered questions |
| `risks` | list[RiskItem] | Risk assessment |
| `design` | DesignResult | Technical design with tasks and checks |
| `duplicates_removed` | int | Number of duplicates removed |
| `total_cost` | float | Total analysis cost in USD |
| `model_used` | string | LLM model used |

### Cost Control

The `LLMAdapter` tracks the cost of each call:

- Accumulates `total_cost`, `total_input_tokens`, `total_output_tokens`
- After each call, compares against `max_cost_per_spec`
- If the budget is exceeded, raises `CostLimitError` and the analysis stops
- Cost is calculated via `litellm.completion_cost()`

---

## Phase 2.5: Complexity Classification

**Module:** `analyze/complexity.py`
**Requires LLM:** No

### What It Does

Before generating, source complexity is classified to select the optimal generation mode. This classification is heuristic (does not use LLM).

### Criteria

| Mode | Conditions | Confidence |
|------|-----------|------------|
| `quick` | <500 words AND 1 source AND no structured content | High |
| `enterprise` | 4+ sources OR >5000 words | High |
| `standard` | Everything that is not quick or enterprise | Medium |

**Structured content** includes formats such as `jira`, `confluence`, `yaml`, `github_issues`, `slack`.

The classification can be overridden with `--mode` in the CLI.

---

## Phase 3: Generate

**Module:** `generate/`
**Requires LLM:** No

### What It Does

Takes the `AnalysisResult` and renders Markdown/YAML files using Jinja2 templates, plus a `spec.lock.yaml` for reproducibility. The number of files generated depends on the mode.

### Adaptive Generation

The `AdaptiveSpecBuilder` wraps the standard `SpecBuilder` and filters files based on mode:

| Mode | Generated Files |
|------|----------------|
| `quick` | `context.md`, `tasks.md` |
| `standard` | All 6 complete files |
| `enterprise` | All 6 files + detailed risks |

### Templates

| Generated File | Template | Main Content |
|---------------|----------|--------------|
| `requirements.md` | `requirements.md.j2` | FR, NFR, conflicts, open questions |
| `design.md` | `design.md.j2` | Components, files, decisions, dependencies |
| `tasks.md` | `tasks.md.j2` | Summary table + detail per task |
| `acceptance.yaml` | `acceptance.yaml.j2` | Executable checks by type |
| `context.md` | `context.md.j2` | Project info, stack, risks |
| `sources.md` | `sources.md.j2` | Sources, traceability, conflicts |

### spec.lock.yaml

Reproducibility file with:

| Field | Description |
|-------|-------------|
| `version` | Lock format version (currently "1") |
| `created_at` | ISO creation timestamp |
| `model` | LLM model used |
| `config_hash` | Hash of the configuration used |
| `source_hashes` | Map of file -> SHA-256 (first 16 hex chars) |
| `spec_hashes` | Map of spec file -> SHA-256 |
| `total_cost` | Total analysis cost in USD |
| `requirement_count` | Number of requirements |
| `task_count` | Number of tasks |

Used to detect if sources have changed since the last generation (`is_stale()`).

---

## Phase 4: Verify

**Module:** `verify/`
**Requires LLM:** No

### What It Does

Runs the checks defined in `acceptance.yaml` against the project directory. Produces a report with results.

### Check Types

| Type | What it verifies | Fields used |
|------|-----------------|-------------|
| `command` | Runs a shell command and verifies exit code == 0 | `command` |
| `files_exist` | Verifies that all listed paths exist | `paths` |
| `pattern_present` | Verifies that regex patterns exist in files matching the glob | `glob`, `patterns` |
| `pattern_absent` | Verifies that regex patterns DO NOT exist in files matching the glob | `glob`, `patterns` |

### Report Formats

| Format | Class | Usage |
|--------|-------|-------|
| `terminal` | `TerminalReporter` | Rich table with colors in the terminal |
| `json` | `JsonReporter` | Machine-readable JSON |
| `junit` | `JunitReporter` | JUnit XML for CI (GitHub Actions, Jenkins) |

See [Verification](../verification/) for complete details.

---

## Phase 5: Export

**Module:** `export/`
**Requires LLM:** No

### What It Does

Takes the generated spec files and transforms them into a format ready for a specific AI agent.

### Available Formats

| Format | What it generates | Best for |
|--------|------------------|----------|
| `architect` | `pipeline.yaml` + spec copy | Architect-based agents |
| `generic` | `SPEC.md` + `verify.sh` + spec copy | Any agent / manual use |
| `claude-code` | `CLAUDE.md` + `.intake/tasks/` + `verify.sh` | Claude Code |
| `cursor` | `.cursor/rules/intake-spec.mdc` | Cursor |
| `kiro` | `requirements.md` + `design.md` + `tasks.md` (native format) | Kiro |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot |

See [Export](../export/) for complete details.

---

## Complete Data Flow

```
.md / .json / .pdf / .docx / .html / .yaml / .txt / .png / URLs
                           |
                   [ SOURCE RESOLUTION ]
                   (parse_source -> file, url, stdin, text)
                           |
                      [ INGEST ]
                      (11 parsers via plugin discovery)
                           |
                   list[ParsedContent]
                           |
                  [ COMPLEXITY CLASSIFICATION ]
                  (quick / standard / enterprise)
                           |
                      [ ANALYZE ]
                      (3 LLM calls)
                           |
                     AnalysisResult
                           |
                  [ ADAPTIVE GENERATE ]
                  (2-6 templates based on mode)
                           |
              specs/my-feature/
              ├── requirements.md    (standard, enterprise)
              ├── design.md          (standard, enterprise)
              ├── tasks.md           (always)
              ├── acceptance.yaml    (standard, enterprise)
              ├── context.md         (always)
              ├── sources.md         (standard, enterprise)
              └── spec.lock.yaml
                           |
                      [ VERIFY ]         [ EXPORT ]
                           |                  |
                  VerificationReport     output/
                  (pass/fail/skip)       ├── pipeline.yaml  (architect)
                                         ├── SPEC.md        (generic)
                                         ├── verify.sh      (generic)
                                         ├── CLAUDE.md      (claude-code)
                                         ├── .cursor/rules/ (cursor)
                                         ├── .github/       (copilot)
                                         └── spec/          (copy)
                                                |
                                         [ FEEDBACK ]  (optional)
                                                |
                                        FeedbackResult
                                        (suggestions + amendments)
```

---

## Feedback Loop (optional)

**Module:** `feedback/`
**Requires LLM:** Yes (async via `litellm.acompletion`)

### What It Does

Closes the cycle between verification and implementation. When checks fail, it analyzes the causes and suggests fixes to both the implementation and the spec.

### Flow

```
VerificationReport (failed checks)
         |
   [ ANALYZE FAILURES ]     (LLM call)
         |
   FeedbackResult
   ├── FailureAnalysis[]     (root cause + suggestion per failure)
   ├── SpecAmendment[]       (proposed amendments to the spec)
   ├── summary               (general summary)
   └── estimated_effort      (small / medium / large)
         |
   [ APPLY? ]               (if --apply or auto_amend_spec)
         |
   Updated spec
```

### Components

| Component | What it does |
|-----------|-------------|
| `FeedbackAnalyzer` | Analyzes failures with LLM, produces `FeedbackResult` |
| `SuggestionFormatter` | Formats suggestions for terminal or agent (generic, claude-code, cursor) |
| `SpecUpdater` | Preview and application of amendments to spec files |

### Data Model

| Dataclass | Main Fields |
|-----------|------------|
| `FailureAnalysis` | check_name, root_cause, suggestion, severity, affected_tasks, spec_amendment |
| `SpecAmendment` | target_file, section, action (add/modify/remove), content |
| `FeedbackResult` | failures, summary, estimated_effort, total_cost |
| `AmendmentPreview` | amendment, current_content, proposed_content, applicable, reason |
| `ApplyResult` | applied, skipped, details |

See [Feedback](../feedback/) for complete documentation.
