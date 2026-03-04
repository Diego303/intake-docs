---
title: "CLI Guide"
description: "Complete reference for all 13 commands with all their options."
order: 3
icon: "M4 17l6-6-6-6M12 19h8"
---

# CLI Guide

intake provides 13 commands and subcommands. All follow the pattern:

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
| `DESCRIPTION` | text | Yes | Short phrase describing what to build. It becomes a slug for the directory name (max 50 characters). |

### Options

| Flag | Short | Type | Default | Required | Description |
|------|-------|------|---------|----------|-------------|
| `--source` | `-s` | text | -- | Yes | Requirement source (repeatable). Path to a file, URL, or `-` for stdin. |
| `--mode` | | option | auto | No | Generation mode: `quick`, `standard`, `enterprise`. If not specified, it is auto-classified. |
| `--model` | `-m` | text | config or `claude-sonnet-4` | No | LLM model to use for analysis. |
| `--lang` | `-l` | text | config or `en` | No | Language of the generated content in the spec. |
| `--project-dir` | `-p` | path | `.` | No | Existing project directory (for stack auto-detection). |
| `--stack` | | text | auto-detected | No | Tech stack. E.g.: `python,fastapi,postgresql`. |
| `--output` | `-o` | path | `./specs` | No | Output directory for the spec. |
| `--format` | `-f` | option | config or none | No | Export format: `architect`, `claude-code`, `cursor`, `kiro`, `generic`. |
| `--preset` | | option | none | No | Configuration preset: `minimal`, `standard`, `enterprise`. |
| `--interactive` | `-i` | flag | false | No | Interactive mode: prompts before generating each section. |
| `--dry-run` | | flag | false | No | Shows what it would do without generating files. |
| `--verbose` | `-v` | flag | false | No | Verbose output. |

### Examples

```bash
# From a Markdown file
intake init "User API" -s requirements.md

# From multiple sources
intake init "Payment gateway" -s jira.json -s confluence.html -s notes.md

# With a specific model and enterprise preset
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

# Schema URI (preparation for future connectors)
# intake init "Feature" -s jira://PROJ-123  # shows warning "connector not available yet"

# Dry run to see what it would do
intake init "Prototype" -s ideas.txt --dry-run

# From stdin
cat requirements.txt | intake init "Feature X" -s -
```

### What It Does Internally

1. Loads the configuration (preset + `.intake.yaml` + CLI flags)
2. Auto-detects the project's tech stack (if `--stack` is not specified)
3. Slugifies the description for the directory name
4. **Source resolution**: each source is resolved via `parse_source()`:
   - Local files -> parsed with the registry
   - URLs (`http://`, `https://`) -> processed with `UrlParser`
   - Schema URIs (`jira://`, `confluence://`, `github://`) -> warning "connector not available yet"
   - Stdin (`-`) -> read as plain text
   - Free text -> treated as plaintext
5. **Complexity classification**: if `--mode` is not specified, it is auto-classified:
   - `quick`: <500 words, 1 source, no structure
   - `standard`: default case
   - `enterprise`: 4+ sources OR >5000 words
6. **Phase 1 -- Ingest**: parses all sources via the registry
7. **Phase 2 -- Analyze**: LLM extraction, deduplication, validation, risks, design
8. **Phase 3 -- Generate**: renders files based on the mode (quick: 2, standard/enterprise: 6) + `spec.lock.yaml`
9. **Phase 5 -- Export**: exports to the chosen format (if `--format` was specified)

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
| `--source` | `-s` | text | -- | New sources to add (repeatable). |
| `--regenerate` | | flag | false | Regenerate the entire spec including the new sources. |
| `--verbose` | `-v` | flag | false | Verbose output. |

### Example

```bash
# Add a new source to an existing spec
intake add specs/user-api/ -s qa-feedback.md

# Add and regenerate everything
intake add specs/user-api/ -s new-reqs.yaml --regenerate
```

---

## intake verify

Verifies that the implementation meets the spec by running the checks from `acceptance.yaml`.

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
| `--project-dir` | `-p` | path | `.` | Directory of the project to verify. |
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

# Only checks with tag "api"
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
| `--format` | `-f` | option | -- | Format: `architect`, `claude-code`, `cursor`, `kiro`, `generic`. Required. |
| `--output` | `-o` | path | `.` | Output directory. |

### Examples

```bash
# Export for architect
intake export specs/user-api/ -f architect -o output/

# Export generic format
intake export specs/user-api/ -f generic -o output/
```

---

## intake show

Displays a summary of a spec: requirements, tasks, checks, costs.

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
| `--fix` | | flag | false | Attempt to automatically fix detected issues. |
| `--verbose` | `-v` | flag | false | Verbose output. |

### Checks It Runs

| Check | What it verifies | Auto-fixable |
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
| Version | Version of the providing package |
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

Lists the tasks of a spec with their current status.

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
| `--status` | option | all | Filter by status (repeatable): `pending`, `in_progress`, `done`, `blocked`. |

### What It Shows

- Table with ID, title and status of each task
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

Updates the status of a task in `tasks.md`.

```bash
intake task update <SPEC_DIR> <TASK_ID> <STATUS> [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `SPEC_DIR` | path | Yes | Directory of the spec. |
| `TASK_ID` | integer | Yes | ID of the task to update. |
| `STATUS` | option | Yes | New status: `pending`, `in_progress`, `done`, `blocked`. |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--note` | text | none | Note or annotation to add to the update. |

### Example

```bash
# Mark task 1 as completed
intake task update specs/my-feature/ 1 done

# Mark as in progress with a note
intake task update specs/my-feature/ 2 in_progress --note "Starting implementation"

# Mark as blocked
intake task update specs/my-feature/ 3 blocked --note "Waiting for third-party API"
```

---

## Global Options

| Flag | Description |
|------|-------------|
| `--version` | Shows the intake version |
| `--help` | Shows command help |

```bash
intake --version    # intake, version 0.2.0
intake --help       # General help
intake init --help  # Help for the init command
```

---

## Exit Codes

All commands follow a consistent exit code scheme:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Required check failed (only `verify`) |
| `2` | Execution error |
