---
title: "Configuration"
description: "All .intake.yaml options, presets and environment variables."
order: 4
icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
---

# Configuration

intake works without configuration — it only needs an LLM API key. To customize behavior, use an `.intake.yaml` file at the root of your project.

---

## Loading priority

Configuration is loaded in layers. Each layer overrides the previous one:

```
CLI flags  >  .intake.yaml  >  preset  >  defaults
```

1. **Defaults**: default values in the code
2. **Preset**: if `--preset` is used, a predefined set is applied
3. **`.intake.yaml`**: project configuration file
4. **CLI flags**: command-line options always win

---

## .intake.yaml file

Create an `.intake.yaml` file at the root of your project. Full example:

```yaml
# LLM model configuration
llm:
  model: claude-sonnet-4         # Any model supported by LiteLLM
  api_key_env: ANTHROPIC_API_KEY  # Environment variable with the API key
  max_cost_per_spec: 0.50         # Maximum budget per spec (USD)
  temperature: 0.2                # 0.0 = deterministic, 1.0 = creative
  max_retries: 3                  # Retries on failure
  timeout: 120                    # Timeout per LLM call (seconds)

# Project configuration
project:
  name: my-project                # Name (auto-detected if empty)
  stack: []                       # Technology stack (auto-detected if empty)
  language: en                    # Language of generated content
  conventions: {}                 # Custom conventions (key: value)

# Spec configuration
spec:
  output_dir: ./specs             # Where to save generated specs
  requirements_format: ears       # ears | user-stories | bdd | free
  design_depth: moderate          # minimal | moderate | detailed
  task_granularity: medium        # coarse | medium | fine
  include_sources: true           # Include source traceability
  version_specs: true             # Create versioned directories
  generate_lock: true             # Generate spec.lock.yaml
  risk_assessment: true           # Include risk assessment
  auto_mode: true                 # Auto-detect quick/standard/enterprise

# Verification configuration
verification:
  auto_generate_tests: true       # Generate acceptance checks
  test_output_dir: ./tests/generated
  checks: []                      # Additional custom checks
  timeout_per_check: 120          # Timeout per check (seconds)

# Export configuration
export:
  default_format: generic         # architect | claude-code | cursor | kiro | generic
  architect_include_guardrails: true
  architect_pipeline_template: standard
  claude_code_generate_claude_md: true

# Connectors (preparation for Phase 2)
connectors:
  jira:
    url: ""                       # Jira base URL
    email: ""                     # Authentication email
    api_token_env: JIRA_API_TOKEN # Environment variable with the API token
  confluence:
    url: ""                       # Confluence base URL
    email: ""                     # Authentication email
    api_token_env: CONFLUENCE_API_TOKEN  # Environment variable with the API token
  github:
    token_env: GITHUB_TOKEN       # Environment variable with the token

# Security
security:
  redact_patterns: []             # Regex patterns to redact from output
  redact_files:                   # Files to never include
    - "*.env"
    - "*.pem"
    - "*.key"
```

---

## Complete field reference

### `llm` section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `model` | string | `claude-sonnet-4` | LLM model. Any model that [LiteLLM](https://docs.litellm.ai/docs/providers) supports. |
| `api_key_env` | string | `ANTHROPIC_API_KEY` | Name of the environment variable containing the API key. |
| `max_cost_per_spec` | float | `0.50` | Maximum budget per spec in USD. If exceeded, analysis stops. |
| `temperature` | float | `0.2` | Model temperature. Lower = more deterministic. |
| `max_retries` | int | `3` | Number of retries on LLM failures. |
| `timeout` | int | `120` | Timeout per LLM call in seconds. |

**Supported models:**

| Provider | Examples | Environment variable |
|----------|----------|----------------------|
| Anthropic | `claude-sonnet-4`, `claude-opus-4`, `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| OpenAI | `gpt-4o`, `gpt-4`, `gpt-3.5-turbo` | `OPENAI_API_KEY` |
| Google | `gemini/gemini-pro`, `gemini/gemini-flash` | `GEMINI_API_KEY` |
| Local | `ollama/llama3`, `ollama/mistral` | (no key needed) |

### `project` section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | `""` | Project name. If empty, it is generated from the `init` description. |
| `stack` | list[string] | `[]` | Technology stack. If empty, it is auto-detected from project files. |
| `language` | string | `en` | Language for generated content (e.g.: `en`, `es`, `fr`). |
| `conventions` | dict | `{}` | Project conventions as key-value pairs. |

Stack auto-detection looks for 28+ marker files in the project directory:

| File | Detected stack |
|------|----------------|
| `package.json` | javascript, node |
| `tsconfig.json` | typescript |
| `pyproject.toml` | python |
| `Cargo.toml` | rust |
| `go.mod` | go |
| `pom.xml` | java, maven |
| `Dockerfile` | docker |
| `next.config.js` | nextjs |
| ... | ... |

It also inspects the contents of `pyproject.toml` and `package.json` to detect frameworks (fastapi, django, react, vue, etc.).

### `spec` section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `output_dir` | string | `./specs` | Output directory for specs. |
| `requirements_format` | string | `ears` | Requirements format. Options: `ears`, `user-stories`, `bdd`, `free`. |
| `design_depth` | string | `moderate` | Level of design detail. Options: `minimal`, `moderate`, `detailed`. |
| `task_granularity` | string | `medium` | Task granularity. Options: `coarse`, `medium`, `fine`. |
| `include_sources` | bool | `true` | Include `sources.md` with requirement-to-source traceability. |
| `version_specs` | bool | `true` | Create versioned subdirectories for specs. |
| `generate_lock` | bool | `true` | Generate `spec.lock.yaml` with hashes and metadata. |
| `risk_assessment` | bool | `true` | Run risk assessment (additional LLM phase). |
| `auto_mode` | bool | `true` | Auto-detect generation mode (quick/standard/enterprise) based on source complexity. Ignored if `--mode` is used in the CLI. |

**Generation modes:**

| Mode | Auto-detection criteria | Generated files |
|------|------------------------|-----------------|
| `quick` | <500 words, 1 source, no structure | `context.md` + `tasks.md` |
| `standard` | Everything that is not quick or enterprise | All 6 complete spec files |
| `enterprise` | 4+ sources OR >5000 words | All 6 files + detailed risks |

**Requirements formats:**

| Format | Description | Best for |
|--------|-------------|----------|
| `ears` | Easy Approach to Requirements Syntax. Structured format with conditions. | Formal specifications |
| `user-stories` | "As a [role], I want [action] so that [benefit]". | Agile teams |
| `bdd` | Given/When/Then. Behavior-driven development. | Acceptance tests |
| `free` | Free format. No imposed structure. | Quick prototypes |

**Design levels:**

| Level | Description |
|-------|-------------|
| `minimal` | Only main components and critical decisions. |
| `moderate` | Components, files, technical decisions, and dependencies. |
| `detailed` | All of the above plus interaction diagrams, edge cases, and performance considerations. |

**Task granularity:**

| Level | Description |
|-------|-------------|
| `coarse` | Large, few tasks. Each task covers a complete component. |
| `medium` | Balance between granularity and quantity. |
| `fine` | Small, atomic tasks. Each task is ~15-30 minutes of work. |

### `verification` section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `auto_generate_tests` | bool | `true` | Automatically generate acceptance checks from requirements. |
| `test_output_dir` | string | `./tests/generated` | Directory for generated tests. |
| `checks` | list[string] | `[]` | Additional custom checks. |
| `timeout_per_check` | int | `120` | Maximum timeout per individual check in seconds. |

### `export` section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default_format` | string | `generic` | Default export format. Options: `architect`, `claude-code`, `cursor`, `kiro`, `generic`. |
| `architect_include_guardrails` | bool | `true` | Include guardrails in architect pipelines. |
| `architect_pipeline_template` | string | `standard` | Pipeline template for architect. |
| `claude_code_generate_claude_md` | bool | `true` | Generate CLAUDE.md when exporting for Claude Code. |

### `connectors` section (preparation)

Configuration for direct API connectors. Connectors are not yet implemented (they will arrive in a future version), but the configuration infrastructure is already in place.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `jira.url` | string | `""` | Base URL of the Jira instance. |
| `jira.email` | string | `""` | Email for Jira authentication. |
| `jira.api_token_env` | string | `"JIRA_API_TOKEN"` | Environment variable with the Jira API token. |
| `confluence.url` | string | `""` | Base URL of the Confluence instance. |
| `confluence.email` | string | `""` | Email for Confluence authentication. |
| `confluence.api_token_env` | string | `"CONFLUENCE_API_TOKEN"` | Environment variable with the Confluence API token. |
| `github.token_env` | string | `"GITHUB_TOKEN"` | Environment variable with the GitHub token. |

**Note:** Currently, when using URIs like `jira://PROJ-123` in `-s`, intake shows a warning indicating that the connector is not available. In the meantime, export the data from the web interface and use JSON files.

### `security` section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `redact_patterns` | list[string] | `[]` | Regex patterns that will be removed from generated content. |
| `redact_files` | list[string] | `["*.env", "*.pem", "*.key"]` | Glob patterns of files that will never be included. |

---

## Presets

Presets are predefined configurations for common use cases. They are applied with `--preset`:

```bash
intake init "My feature" -s reqs.md --preset minimal
```

### Comparison

| Field | `minimal` | `standard` | `enterprise` |
|-------|-----------|------------|--------------|
| **Use case** | Quick prototype | Normal teams | Regulated / critical |
| `max_cost_per_spec` | $0.10 | $0.50 | $2.00 |
| `temperature` | 0.3 | 0.2 | 0.1 |
| `requirements_format` | `free` | `ears` | `ears` |
| `design_depth` | `minimal` | `moderate` | `detailed` |
| `task_granularity` | `coarse` | `medium` | `fine` |
| `include_sources` | false | true | true |
| `risk_assessment` | false | true | true |
| `generate_lock` | false | true | true |

### When to use each preset

- **`minimal`**: Quick prototyping, exploratory ideas, solo developer. Low cost, minimal output.
- **`standard`**: The default option. Good balance between detail and cost for teams of 2-5 people.
- **`enterprise`**: For large teams, regulated projects, or when complete traceability and exhaustive risk assessment are needed.

---

## Environment variables

intake looks for these environment variables for LLM provider authentication:

| Variable | Provider | Example |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic (Claude) | `sk-ant-api03-...` |
| `OPENAI_API_KEY` | OpenAI (GPT) | `sk-...` |

Set the variable according to your provider:

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# OpenAI
export OPENAI_API_KEY=sk-your-key-here
```

If you use a different provider, configure `llm.api_key_env` in `.intake.yaml`:

```yaml
llm:
  model: gemini/gemini-pro
  api_key_env: GEMINI_API_KEY
```

---

## Generate config automatically

If you don't have an `.intake.yaml`, intake uses sensible defaults. To create a basic configuration file:

```bash
intake doctor --fix
```

This creates a minimal `.intake.yaml` that you can customize:

```yaml
# intake configuration
llm:
  model: claude-sonnet-4
  # max_cost_per_spec: 0.50
project:
  name: ""
  language: en
  # stack: []
spec:
  output_dir: ./specs
```
