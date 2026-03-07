---
title: "CLI Guide"
description: "Complete reference of all commands and options."
order: 3
icon: "M4 17l6-6-6-6M12 19h8"
---

# CLI Guide

intake provides 22 commands and subcommands. All follow the pattern:

```bash
intake <command> [arguments] [options]
```

To see help for any command:

```bash
intake --help
intake <command> --help
```

---

## intake init

Generates a complete spec from requirement sources. This is the main command.

```bash
intake init <DESCRIPTION> -s <source> [options]
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `DESCRIPTION` | text | Yes | Short phrase describing what to build. Converted to a slug for the directory name (max 50 characters). |

### Options

| Flag | Short | Type | Default | Required | Description |
|------|-------|------|---------|----------|-------------|
| `--source` | `-s` | text | — | Yes | Requirement source (repeatable). Path to file, URL, or `-` for stdin. |
| `--mode` | | option | auto | No | Generation mode: `quick`, `standard`, `enterprise`. If not specified, auto-classified. |
| `--model` | `-m` | text | config or `claude-sonnet-4` | No | LLM model to use for analysis. |
| `--lang` | `-l` | text | config or `en` | No | Language of the generated content in the spec. |
| `--project-dir` | `-p` | path | `.` | No | Existing project directory (for stack auto-detection). |
| `--stack` | | text | auto-detected | No | Tech stack. E.g.: `python,fastapi,postgresql`. |
| `--output` | `-o` | path | `./specs` | No | Output directory for the spec. |
| `--format` | `-f` | option | config or none | No | Export format: `architect`, `claude-code`, `cursor`, `kiro`, `copilot`, `generic`. |
| `--preset` | | option | none | No | Configuration preset: `minimal`, `standard`, `enterprise`. |
| `--interactive` | `-i` | flag | false | No | Interactive mode: asks before generating each section. |
| `--dry-run` | | flag | false | No | Shows what it would do without generating files. |
| `--verbose` | `-v` | flag | false | No | Verbose output. |

### Examples

```bash
# From a Markdown file
intake init "User API" -s requirements.md

# From multiple sources
intake init "Payment gateway" -s jira.json -s confluence.html -s notes.md

# With specific model and enterprise preset
intake init "Critical system" -s reqs.yaml --model gpt-4o --preset enterprise

# With manual stack and export format
intake init "Microservice" -s reqs.md --stack python,fastapi -f architect

# Spec in Spanish
intake init "Shopping cart" -s stories.md --lang es

# Quick mode (only context.md + tasks.md)
intake init "Fix login bug" -s notes.txt --mode quick

# Enterprise mode (all files + detailed risks)
intake init "Critical system" -s reqs.yaml --mode enterprise

# From a URL
intake init "API review" -s https://wiki.company.com/rfc/auth

# From a Slack export
intake init "Sprint decisions" -s slack_export.json

# From GitHub Issues
intake init "Bug fixes" -s issues.json

# From direct API connectors (requires config in .intake.yaml)
intake init "Sprint tasks" -s jira://PROJ-123
intake init "Spec review" -s confluence://SPACE/Page-Title
intake init "Bug triage" -s github://org/repo/issues?labels=bug&state=open
intake init "Sprint review" -s gitlab://team/backend/issues?labels=sprint

# Dry run to see what it would do
intake init "Prototype" -s ideas.txt --dry-run

# From stdin
cat requirements.txt | intake init "Feature X" -s -
```

### What It Does Internally

1. Loads configuration (preset + `.intake.yaml` + CLI flags)
2. Auto-detects the project's tech stack (if `--stack` is not specified)
3. Slugifies the description for the directory name
4. **Source resolution**: each source is resolved via `parse_source()`:
   - Local files → parsed with the registry
   - URLs (`http://`, `https://`) → processed with `UrlParser`
   - Scheme URIs (`jira://`, `confluence://`, `github://`, `gitlab://`) → resolved via API connectors (see [Connectors](../connectors/))
   - Stdin (`-`) → read as plain text
   - Free text → treated as plaintext
5. **Complexity classification**: if `--mode` is not specified, auto-classified:
   - `quick`: <500 words, 1 source, no structure
   - `standard`: default case
   - `enterprise`: 4+ sources OR >5000 words
6. **Phase 1 — Ingest**: parses all sources via the registry
7. **Phase 2 — Analyze**: LLM extraction, deduplication, validation, risks, design
8. **Phase 3 — Generate**: renders files based on mode (quick: 2, standard/enterprise: 6) + `spec.lock.yaml`
9. **Phase 5 — Export**: exports to the chosen format (if `--format` was specified)

---

## intake add

Adds sources to an existing spec.

```bash
intake add <SPEC_DIR> -s <source> [options]
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the existing spec. |

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--source` | `-s` | text | — | New sources to add (repeatable). |
| `--regenerate` | | flag | false | Regenerate the entire spec including new sources. |
| `--verbose` | `-v` | flag | false | Verbose output. |

### Example

```bash
# Add a new source to an existing spec
intake add specs/user-api/ -s feedback-qa.md

# Add and regenerate everything
intake add specs/user-api/ -s new-reqs.yaml --regenerate
```

---

## intake verify

Verifies that the implementation complies with the spec by running checks from `acceptance.yaml`.

```bash
intake verify <SPEC_DIR> [options]
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec. |

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--project-dir` | `-p` | path | `.` | Project directory to verify. |
| `--format` | `-f` | option | `terminal` | Report format: `terminal`, `json`, `junit`. |
| `--tags` | `-t` | text | all | Only run checks with these tags (repeatable). |
| `--fail-fast` | | flag | false | Stop at the first required check that fails. |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All required checks passed |
| `1` | At least one required check failed |
| `2` | Execution error (spec not found, invalid YAML, etc.) |

### Examples

```bash
# Verify with terminal report
intake verify specs/user-api/ -p .

# Only checks with "api" tag
intake verify specs/user-api/ -p . -t api

# JUnit format for CI
intake verify specs/user-api/ -p . -f junit > test-results.xml

# Fail fast
intake verify specs/user-api/ -p . --fail-fast

# JSON format
intake verify specs/user-api/ -p . -f json
```

---

## intake export

Exports a spec to a format ready for an AI agent.

```bash
intake export <SPEC_DIR> -f <format> [options]
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec. |

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--format` | `-f` | option | — | Format: `architect`, `claude-code`, `cursor`, `kiro`, `copilot`, `generic`. Required. |
| `--output` | `-o` | path | `.` | Output directory. |

### Examples

```bash
# Export for architect
intake export specs/user-api/ -f architect -o output/

# Export generic format
intake export specs/user-api/ -f generic -o output/

# Export for Claude Code (generates CLAUDE.md + .intake/)
intake export specs/user-api/ -f claude-code -o .

# Export for Cursor (generates .cursor/rules/)
intake export specs/user-api/ -f cursor -o .

# Export for Kiro (native format with checkboxes)
intake export specs/user-api/ -f kiro -o .

# Export for GitHub Copilot (generates .github/copilot-instructions.md)
intake export specs/user-api/ -f copilot -o .
```

---

## intake show

Shows a summary of a spec: requirements, tasks, checks, costs.

```bash
intake show <SPEC_DIR>
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec. |

### What It Shows

- Files in the spec
- LLM model used
- Number of requirements
- Number of tasks
- Total analysis cost
- Creation date
- Number of sources
- Number of acceptance checks

### Example

```bash
intake show specs/user-api/
```

---

## intake list

Lists all specs in a directory.

```bash
intake list [options]
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--dir` | `-d` | path | `./specs` | Directory to search for specs. |

Detects subdirectories that contain `requirements.md` or `acceptance.yaml`.

### Example

```bash
# List specs in the default directory
intake list

# List specs in another directory
intake list -d ./my-project/specs
```

---

## intake diff

Compares two versions of a spec and shows the changes.

```bash
intake diff <SPEC_A> <SPEC_B> [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_A` | path | Yes | First version of the spec. |
| `SPEC_B` | path | Yes | Second version of the spec. |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--section` | option | `all` | Which section to compare: `requirements`, `design`, `tasks`, `acceptance`, `all`. |

### What It Compares

- **requirements**: Requirements by ID (FR-XX, NFR-XX)
- **tasks**: Tasks by number
- **acceptance**: Checks by ID

Changes are shown as:
- **Added** (green): new elements in SPEC_B
- **Removed** (red): elements that were in SPEC_A but not in SPEC_B
- **Modified** (yellow): elements with changes

### Example

```bash
# Compare two complete versions
intake diff specs/v1/ specs/v2/

# Only compare requirements
intake diff specs/v1/ specs/v2/ --section requirements
```

---

## intake doctor

Diagnoses the environment and configuration.

```bash
intake doctor [options]
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--fix` | | flag | false | Attempt to automatically fix detected problems. |
| `--verbose` | `-v` | flag | false | Verbose output. |

### Checks It Runs

| Check | What It Verifies | Auto-fixable |
|-------|-----------------|--------------|
| Python version | Python >= 3.12 | No |
| LLM API key | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` defined | No |
| pdfplumber | Package installed | Yes |
| python-docx | Package installed | Yes |
| beautifulsoup4 | Package installed | Yes |
| markdownify | Package installed | Yes |
| litellm | Package installed | Yes |
| jinja2 | Package installed | Yes |
| Config file | `.intake.yaml` exists and is valid YAML | Yes (creates a basic one) |

### --fix

With `--fix`, intake attempts to automatically fix:

- **Missing packages**: runs `pip install <package>` (detects `pip3.12`, `pip3` or `pip`)
- **Missing config**: creates a basic `.intake.yaml` with defaults

### Examples

```bash
# Diagnose only
intake doctor

# Diagnose and fix
intake doctor --fix

# With verbose output
intake doctor -v
```

---

## intake plugins list

Lists all discovered plugins (parsers, exporters, connectors).

```bash
intake plugins list [options]
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--verbose` | `-v` | flag | false | Show additional columns: module and load errors. |

### What It Shows

A table with:

| Column | Description |
|--------|-------------|
| Name | Plugin name |
| Group | Group: parsers, exporters, connectors |
| Version | Version of the package that provides it |
| V2 | Whether it implements the V2 protocol |
| Built-in | Whether it is a built-in intake plugin |

With `-v`, module and load error columns are added.

### Example

```bash
# Basic list
intake plugins list

# With details
intake plugins list -v
```

---

## intake plugins check

Validates the compatibility of all discovered plugins.

```bash
intake plugins check
```

Runs `check_compatibility()` on each plugin and reports OK or FAIL with error details.

---

## intake task list

Lists the tasks of a spec with their current state.

```bash
intake task list <SPEC_DIR> [options]
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec. |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--status` | option | all | Filter by state (repeatable): `pending`, `in_progress`, `done`, `blocked`. |

### What It Shows

- Table with ID, title and state of each task
- Progress summary: total, pending, in_progress, done, blocked

### Example

```bash
# List all tasks
intake task list specs/my-feature/

# Only pending and in-progress tasks
intake task list specs/my-feature/ --status pending --status in_progress
```

---

## intake task update

Updates the state of a task in `tasks.md`.

```bash
intake task update <SPEC_DIR> <TASK_ID> <STATUS> [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec. |
| `TASK_ID` | integer | Yes | ID of the task to update. |
| `STATUS` | option | Yes | New state: `pending`, `in_progress`, `done`, `blocked`. |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--note` | text | none | Note or annotation to add to the update. |

### Example

```bash
# Mark task 1 as completed
intake task update specs/my-feature/ 1 done

# Mark as in progress with note
intake task update specs/my-feature/ 2 in_progress --note "Starting implementation"

# Mark as blocked
intake task update specs/my-feature/ 3 blocked --note "Waiting for third-party API"
```

---

## intake feedback

Analyzes verification failures and suggests fixes to the spec or implementation.

```bash
intake feedback <SPEC_DIR> [options]
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec. |

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--verify-report` | `-r` | path | none | JSON file with verification report. If not provided, runs `verify` first. |
| `--project-dir` | `-p` | path | `.` | Project directory. |
| `--apply` | | flag | false | Apply suggested amendments directly to the spec. |
| `--agent-format` | | option | `generic` | Suggestion format: `generic`, `claude-code`, `cursor`. |
| `--verbose` | `-v` | flag | false | Verbose output. |

### What It Does

1. **Loads the verification report**: if `--verify-report` is not provided, runs `intake verify` first to obtain one
2. **LLM analysis**: sends failed checks along with the spec to the LLM for root cause analysis
3. **Generates suggestions**: for each failure, produces:
   - Root cause
   - Fix suggestion
   - Severity (critical, major, minor)
   - Affected tasks
   - Proposed spec amendment (optional)
4. **Applies amendments** (if `--apply` or `feedback.auto_amend_spec` in config): modifies the spec directly

### Examples

```bash
# Analyze failures with existing report
intake feedback specs/my-feature/ --verify-report report.json

# Run verify + analyze everything in one step
intake feedback specs/my-feature/ -p .

# Apply amendments automatically
intake feedback specs/my-feature/ -p . --apply

# Suggestions in Claude Code format
intake feedback specs/my-feature/ -p . --agent-format claude-code
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Analysis completed (with or without suggestions) |
| `2` | Execution error |

---

## intake mcp serve

Starts the MCP (Model Context Protocol) server for integration with AI agents.

```bash
intake mcp serve [options]
```

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--transport` | option | `stdio` | Transport: `stdio` (for CLI agents) or `sse` (HTTP for IDEs). |
| `--port` | integer | `8080` | Port for SSE transport. |
| `--specs-dir` | path | `./specs` | Base directory where specs live. |
| `--project-dir` | path | `.` | Project directory for verification. |

### What It Exposes

**9 Tools:**

| Tool | Description |
|------|-------------|
| `intake_show` | Shows spec summary with file contents |
| `intake_get_context` | Reads context.md from the spec |
| `intake_get_tasks` | Lists tasks with status filter (all/pending/in_progress/done/blocked) |
| `intake_update_task` | Updates a task's status with optional note |
| `intake_verify` | Runs acceptance checks with tag filter |
| `intake_feedback` | Verifies + generates feedback on failures |
| `intake_list_specs` | Lists available specs |
| `intake_validate` | Validates internal spec consistency (cross-references, DAG, checks) |
| `intake_estimate` | Estimates LLM cost for generating or regenerating a spec |

**6 Resources** via URIs `intake://specs/{name}/{section}`:
- `requirements`, `tasks`, `context`, `acceptance`, `design`, `sources`

**2 Prompts:**
- `implement_next_task`: spec context + next pending task + instructions
- `verify_and_fix`: verify -> fix -> re-verify loop

### Examples

```bash
# Start with stdio transport (for Claude Code, etc.)
intake mcp serve --transport stdio

# Start with SSE transport (HTTP)
intake mcp serve --transport sse --port 8080

# With custom specs directory
intake mcp serve --specs-dir ./my-specs --project-dir /path/to/project
```

### Requirements

Requires the `mcp` package: `pip install intake-ai-cli[mcp]`

---

## intake watch

Monitors project files and automatically re-runs verification when changes are detected.

```bash
intake watch <SPEC_DIR> [options]
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec with `acceptance.yaml`. |

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--project-dir` | `-p` | path | `.` | Project directory to monitor. |
| `--tags` | `-t` | text | all | Only run checks with these tags (repeatable). |
| `--debounce` | | float | `2.0` | Seconds to wait before re-running (debouncing). |
| `--verbose` | `-v` | flag | false | Verbose output with changed files. |

### What It Does

1. Loads `acceptance.yaml` from the spec directory
2. Runs an initial verification (equivalent to `run_once()`)
3. Monitors the project directory using `watchfiles` (Rust-based, efficient)
4. When file changes are detected:
   - Filters ignored files (*.pyc, __pycache__, .git, node_modules, .intake)
   - Waits for the configured debounce time
   - Re-runs acceptance checks
   - Shows results in terminal with Rich

### Default Ignored Patterns

- `*.pyc`
- `__pycache__`
- `.git`
- `node_modules`
- `.intake`

Customizable via `watch.ignore_patterns` in `.intake.yaml`.

### Examples

```bash
# Basic watch
intake watch specs/my-feature/ -p .

# With tag filter and verbose
intake watch specs/my-feature/ -p . -t tests -t lint --verbose

# With custom debounce
intake watch specs/my-feature/ -p . --debounce 5

# Only security checks
intake watch specs/my-feature/ -p . -t security
```

### Requirements

Requires the `watchfiles` package: `pip install intake-ai-cli[watch]`

---

## intake validate

Validates the internal consistency of a spec (quality gate). Checks cross-references, task dependencies, acceptance check validity and completeness. Works offline — does not require LLM.

```bash
intake validate <SPEC_DIR> [options]
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec to validate. |

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--strict` | | flag | false | Strict mode: warnings become errors. |
| `--format` | `-f` | option | `terminal` | Report format: `terminal`, `json`. |

### Check Categories

| Category | What It Verifies |
|----------|-----------------|
| `structure` | Required files exist and are not empty; YAML is valid |
| `cross_reference` | Tasks reference valid requirements; requirements are not orphaned |
| `consistency` | Task DAG has no cycles; task IDs are sequential |
| `acceptance` | Checks have valid type, non-empty commands, valid regex patterns, defined paths |
| `completeness` | Each functional requirement has at least one implementing task |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Spec is valid (no errors) |
| `1` | Spec has errors |
| `2` | Execution error |

### Examples

```bash
# Validate spec (terminal report)
intake validate specs/user-api/

# Strict mode: warnings become errors
intake validate specs/user-api/ --strict

# JSON format (for CI or automated processing)
intake validate specs/user-api/ --format json

# Use before handing off to an agent
intake validate specs/my-feature/ && intake export specs/my-feature/ -f claude-code -o .
```

---

## intake estimate

Estimates LLM cost before generating a spec. Analyzes input sources and calculates token usage and cost in dollars without making any LLM calls.

```bash
intake estimate -s <source> [options]
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--source` | `-s` | text | — | Sources to estimate (repeatable). Required. |
| `--model` | `-m` | text | config | LLM model for price calculation. |
| `--mode` | | option | auto | Mode: `quick`, `standard`, `enterprise`. Auto-detected if omitted. |
| `--format` | `-f` | option | `terminal` | Report format: `terminal`, `json`. |

### What It Shows

- LLM model used
- Generation mode (with auto-detection indicator)
- Estimated input words
- Estimated input and output tokens
- Number of LLM calls
- Estimated cost with ~30% margin
- Warnings: model not in pricing table, budget exceeded

### Models with Built-in Pricing

| Model | Input ($/1M tokens) | Output ($/1M tokens) |
|-------|---------------------|----------------------|
| `claude-sonnet-4` | $3.00 | $15.00 |
| `claude-opus-4` | $15.00 | $75.00 |
| `claude-haiku-4` | $0.80 | $4.00 |
| `gpt-4o` | $2.50 | $10.00 |
| `gpt-4o-mini` | $0.15 | $0.60 |
| `gemini-2.0-flash` | $0.10 | $0.40 |
| `deepseek-chat` | $0.14 | $0.28 |

For unlisted models, a default pricing ($3/$15 per 1M tokens) is used with a warning.

### Examples

```bash
# Estimate cost of a file
intake estimate -s requirements.md

# Multiple sources with specific model
intake estimate -s reqs.md -s notes.md --model gpt-4o-mini

# Force enterprise mode
intake estimate -s big-spec.pdf --mode enterprise

# JSON format
intake estimate -s reqs.md --format json
```

---

## intake export-ci

Generates CI configuration for automatic spec verification.

```bash
intake export-ci <SPEC_DIR> -p <platform> [options]
```

### Argument

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec. |

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--platform` | `-p` | option | — | CI platform: `github`, `gitlab`. Required. |
| `--output` | `-o` | path | `.` | Output directory. |

### What It Generates

| Platform | Generated File | Description |
|----------|---------------|-------------|
| `github` | `.github/workflows/intake-verify.yml` | GitHub Actions workflow |
| `gitlab` | `.gitlab-ci.yml` | GitLab CI pipeline |

The generated files are Jinja2 templates rendered with the spec path. They include intake installation, `intake verify` execution, and JUnit reporting.

### Examples

```bash
# Generate GitLab CI config
intake export-ci specs/auth/ -p gitlab

# Generate GitHub Actions workflow in custom directory
intake export-ci specs/auth/ -p github -o .github/workflows/

# Generate and commit
intake export-ci specs/my-feature/ -p gitlab && git add .gitlab-ci.yml
```

---

## Global Options

| Flag | Description |
|------|-------------|
| `--version` | Shows the intake version |
| `--help` | Shows command help |

```bash
intake --version    # intake, version 0.6.0
intake --help       # General help
intake init --help  # init command help
```

---

## Exit Codes

All commands follow a consistent exit code scheme:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Required check failed (only `verify`) |
| `2` | Execution error |
