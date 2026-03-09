---
title: "Configuration"
description: "All .intake.yaml options, presets and environment variables."
order: 4
icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
---

# Configuration

intake works without configuration -- it only needs an LLM API key. To customize behavior, use a `.intake.yaml` file in the project root.

---

## Loading Priority

Configuration is loaded in layers. Each layer overrides the previous one:

```
CLI flags  >  .intake.yaml  >  preset  >  defaults
```

1. **Defaults**: default values in the code
2. **Preset**: if `--preset` is used, a predefined set is applied
3. **`.intake.yaml`**: project configuration file
4. **CLI flags**: command-line options always win

---

## .intake.yaml File

Create a `.intake.yaml` file in your project root. Full example:

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
  name: mi-proyecto               # Name (auto-detected if empty)
  stack: []                       # Tech stack (auto-detected if empty)
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
  default_format: generic         # architect | claude-code | cursor | kiro | copilot | generic
  architect_include_guardrails: true
  architect_pipeline_template: standard
  claude_code_generate_claude_md: true

# Direct API connectors
connectors:
  jira:
    url: "https://company.atlassian.net"
    auth_type: token              # token | oauth | api_key
    token_env: JIRA_API_TOKEN     # Environment variable with the API token
    email_env: JIRA_EMAIL         # Environment variable with the email
    default_project: ""           # Default project (e.g.: "PROJ")
    include_comments: true        # Include issue comments
    max_comments: 5               # Max comments per issue
    fields:                       # Fields to retrieve
      - summary
      - description
      - labels
      - priority
      - status
      - issuelinks
      - comment
  confluence:
    url: "https://company.atlassian.net/wiki"
    auth_type: token              # token | oauth
    token_env: CONFLUENCE_API_TOKEN
    email_env: CONFLUENCE_EMAIL
    default_space: ""             # Default space (e.g.: "ENG")
    include_child_pages: false    # Include child pages
    max_depth: 1                  # Maximum child page depth
  github:
    token_env: GITHUB_TOKEN       # Environment variable with the PAT
    default_repo: ""              # Default repo (e.g.: "org/repo")
  gitlab:
    url: "https://gitlab.example.com"  # GitLab instance URL
    token_env: GITLAB_TOKEN            # Environment variable with the access token
    auth_type: token                    # token | oauth
    default_project: ""                 # Default project
    include_comments: true              # Include discussion notes
    include_merge_requests: false       # Include linked MRs
    max_notes: 10                       # Max notes per issue
    ssl_verify: true                    # Verify SSL certificates

# Feedback loop
feedback:
  auto_amend_spec: false          # Apply amendments automatically
  max_suggestions: 10             # Max suggestions per analysis
  include_code_snippets: true     # Include code in suggestions

# MCP server
mcp:
  specs_dir: ./specs            # Base specs directory
  project_dir: .                # Project directory for verification
  transport: stdio              # stdio | sse
  sse_port: 8080                # Port for SSE transport

# Watch mode
watch:
  debounce_seconds: 2.0         # Seconds to wait after the last change
  ignore_patterns:              # Glob patterns to ignore
    - "*.pyc"
    - "__pycache__"
    - ".git"
    - "node_modules"
    - ".intake"

# Spec validation
validate:
  strict: false                 # Strict mode: warnings are errors
  required_sections:            # Required files
    - requirements.md
    - tasks.md
    - acceptance.yaml

# Cost estimation
estimate:
  tokens_per_word: 1.35         # Token/word ratio
  prompt_overhead_tokens: 2000  # Overhead per LLM call
  calls_per_mode:               # LLM calls per mode
    quick: 1
    standard: 3
    enterprise: 4

# Custom templates
templates:
  user_dir: ".intake/templates"   # User templates directory
  warn_on_override: true          # Warning when overriding a built-in template

# Security
security:
  redact_patterns: []             # Regex patterns to redact from output
  redact_files:                   # Files to never include
    - "*.env"
    - "*.pem"
    - "*.key"
```

---

## Complete Field Reference

### `llm` Section

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
|----------|----------|---------------------|
| Anthropic | `claude-sonnet-4`, `claude-opus-4`, `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| OpenAI | `gpt-4o`, `gpt-4`, `gpt-3.5-turbo` | `OPENAI_API_KEY` |
| Google | `gemini/gemini-pro`, `gemini/gemini-flash` | `GEMINI_API_KEY` |
| Local | `ollama/llama3`, `ollama/mistral` | (no key needed) |

### `project` Section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | `""` | Project name. If empty, generated from the `init` description. |
| `stack` | list[string] | `[]` | Tech stack. If empty, auto-detected from project files. |
| `language` | string | `en` | Language for generated content (e.g.: `en`, `es`, `fr`). |
| `conventions` | dict | `{}` | Project conventions as key-value pairs. |

Stack auto-detection looks for 28+ marker files in the project directory:

| File | Detected stack |
|------|---------------|
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

### `spec` Section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `output_dir` | string | `./specs` | Output directory for specs. |
| `requirements_format` | string | `ears` | Requirements format. Options: `ears`, `user-stories`, `bdd`, `free`. |
| `design_depth` | string | `moderate` | Design detail level. Options: `minimal`, `moderate`, `detailed`. |
| `task_granularity` | string | `medium` | Task granularity. Options: `coarse`, `medium`, `fine`. |
| `include_sources` | bool | `true` | Include `sources.md` with requirement-to-source traceability. |
| `version_specs` | bool | `true` | Create versioned subdirectories for specs. |
| `generate_lock` | bool | `true` | Generate `spec.lock.yaml` with hashes and metadata. |
| `risk_assessment` | bool | `true` | Run risk assessment (additional LLM phase). |
| `auto_mode` | bool | `true` | Auto-detect generation mode (quick/standard/enterprise) based on source complexity. Ignored if `--mode` is used on the CLI. |

**Generation modes:**

| Mode | Auto-detection criteria | Generated files |
|------|------------------------|----------------|
| `quick` | <500 words, 1 source, no structure | `context.md` + `tasks.md` |
| `standard` | Everything that is neither quick nor enterprise | All 6 complete spec files |
| `enterprise` | 4+ sources OR >5000 words | All 6 files + detailed risks |

**Requirements formats:**

| Format | Description | Best for |
|--------|-------------|----------|
| `ears` | Easy Approach to Requirements Syntax. Structured format with conditions. | Formal specifications |
| `user-stories` | "As a [role], I want [action] so that [benefit]". | Agile teams |
| `bdd` | Given/When/Then. Behavior-driven development. | Acceptance tests |
| `free` | Free-form. No imposed structure. | Quick prototypes |

**Design levels:**

| Level | Description |
|-------|-------------|
| `minimal` | Only main components and critical decisions. |
| `moderate` | Components, files, technical decisions and dependencies. |
| `detailed` | All of the above plus interaction diagrams, edge cases, performance considerations. |

**Task granularity:**

| Level | Description |
|-------|-------------|
| `coarse` | Large tasks, few in number. Each task covers a complete component. |
| `medium` | Balance between granularity and quantity. |
| `fine` | Small, atomic tasks. Each task is ~15-30 minutes of work. |

### `verification` Section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `auto_generate_tests` | bool | `true` | Automatically generate acceptance checks from requirements. |
| `test_output_dir` | string | `./tests/generated` | Directory for generated tests. |
| `checks` | list[string] | `[]` | Additional custom checks. |
| `timeout_per_check` | int | `120` | Maximum timeout per individual check in seconds. |

### `export` Section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default_format` | string | `generic` | Default export format. Options: `architect`, `claude-code`, `cursor`, `kiro`, `copilot`, `generic`. |
| `architect_include_guardrails` | bool | `true` | Include guardrails in architect pipelines. |
| `architect_pipeline_template` | string | `standard` | Pipeline template for architect. |
| `claude_code_generate_claude_md` | bool | `true` | Generate CLAUDE.md when exporting for Claude Code. |
| `claude_code_task_dir` | string | `.intake/tasks` | Directory for Claude Code task files. |
| `cursor_rules_dir` | string | `.cursor/rules` | Directory for Cursor rules. |

### `connectors` Section

Configuration for direct API connectors. They allow using URIs like `jira://PROJ-123` directly with `-s`. See [Connectors](../connectors/) for usage details.

**Jira:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `jira.url` | string | `""` | Jira instance base URL. Required to use `jira://`. |
| `jira.auth_type` | string | `"token"` | Authentication type: `token`, `oauth`, `api_key`. |
| `jira.token_env` | string | `"JIRA_API_TOKEN"` | Environment variable with the API token. |
| `jira.email_env` | string | `"JIRA_EMAIL"` | Environment variable with the authentication email. |
| `jira.default_project` | string | `""` | Default project. |
| `jira.include_comments` | bool | `true` | Include issue comments. |
| `jira.max_comments` | int | `5` | Maximum comments per issue. |
| `jira.fields` | list[string] | see example | Jira fields to retrieve. |

**Confluence:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `confluence.url` | string | `""` | Confluence instance base URL. Required to use `confluence://`. |
| `confluence.auth_type` | string | `"token"` | Authentication type: `token`, `oauth`. |
| `confluence.token_env` | string | `"CONFLUENCE_API_TOKEN"` | Environment variable with the API token. |
| `confluence.email_env` | string | `"CONFLUENCE_EMAIL"` | Environment variable with the email. |
| `confluence.default_space` | string | `""` | Default space. |
| `confluence.include_child_pages` | bool | `false` | Include child pages recursively. |
| `confluence.max_depth` | int | `1` | Maximum child page depth. |

**GitHub:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `github.token_env` | string | `"GITHUB_TOKEN"` | Environment variable with the Personal Access Token. |
| `github.default_repo` | string | `""` | Default repository (e.g.: `org/repo`). |

**GitLab:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `gitlab.url` | string | `"https://gitlab.com"` | GitLab instance URL. Required to use `gitlab://`. |
| `gitlab.token_env` | string | `"GITLAB_TOKEN"` | Environment variable with the Personal Access Token. |
| `gitlab.auth_type` | string | `"token"` | Authentication type: `token`, `oauth`. |
| `gitlab.default_project` | string | `""` | Default project (e.g.: `group/project`). |
| `gitlab.include_comments` | bool | `true` | Include discussion notes on issues. |
| `gitlab.include_merge_requests` | bool | `false` | Include merge requests linked to issues. |
| `gitlab.max_notes` | int | `10` | Maximum notes per issue. |
| `gitlab.ssl_verify` | bool | `true` | Verify SSL certificates. Disable for instances with self-signed certificates. |

### `feedback` Section

Feedback loop configuration. See [Feedback](../feedback/) for details.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `feedback.auto_amend_spec` | bool | `false` | Automatically apply amendments to the spec after analysis. |
| `feedback.max_suggestions` | int | `10` | Maximum suggestions to generate per analysis. |
| `feedback.include_code_snippets` | bool | `true` | Include code snippets in suggestions. |

### `mcp` Section

MCP (Model Context Protocol) server configuration. See [MCP Server](../mcp-server/) for full details.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mcp.specs_dir` | string | `"./specs"` | Base directory where specs are located. |
| `mcp.project_dir` | string | `"."` | Project directory for verification. |
| `mcp.transport` | string | `"stdio"` | Server transport: `stdio` (local) or `sse` (HTTP). |
| `mcp.sse_port` | int | `8080` | Port for SSE transport. |

**Note:** The MCP server requires the `mcp` package. Install with: `pip install "intake-ai-cli[mcp]"`. SSE transport additionally requires `starlette` and `uvicorn`.

### `watch` Section

Watch mode configuration for automatic re-verification. See [Watch Mode](../watch-mode/) for full details.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `watch.debounce_seconds` | float | `2.0` | Wait time after the last file change before re-verifying. |
| `watch.ignore_patterns` | list[string] | `["*.pyc", "__pycache__", ".git", "node_modules", ".intake"]` | Glob patterns for files/directories to ignore. Compared against each path component. |

**Note:** Watch mode requires the `watchfiles` package. Install with: `pip install "intake-ai-cli[watch]"`.

### `validate` Section

Internal spec validation configuration (quality gate). See [CLI Guide > validate](../cli-guide/#intake-validate) for usage details.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `validate.strict` | bool | `false` | Strict mode: warnings become errors. |
| `validate.required_sections` | list[string] | `["requirements.md", "tasks.md", "acceptance.yaml"]` | Required files in the spec. |
| `validate.max_orphaned_requirements` | int | `0` | Maximum orphaned requirements (without a task) allowed without warning. |

### `estimate` Section

LLM cost estimation configuration. See [CLI Guide > estimate](../cli-guide/#intake-estimate) for usage details.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `estimate.tokens_per_word` | float | `1.35` | Token-per-word ratio for estimating input tokens. |
| `estimate.prompt_overhead_tokens` | int | `2000` | Additional tokens per LLM call (system prompt, format, etc.). |
| `estimate.calls_per_mode` | dict | `{"quick": 1, "standard": 3, "enterprise": 4}` | Number of LLM calls per generation mode. |

### `templates` Section

Jinja2 template configuration with per-project override support. Users can override any built-in template by placing a file with the same name in the configured directory.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `templates.user_dir` | string | `".intake/templates"` | Directory relative to the project where custom templates are searched. |
| `templates.warn_on_override` | bool | `true` | Log a warning when a built-in template is overridden by a user template. |

### `security` Section

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `redact_patterns` | list[string] | `[]` | Regex patterns that will be removed from generated content. |
| `redact_files` | list[string] | `["*.env", "*.pem", "*.key"]` | Glob patterns for files that will never be included. |

---

## Presets

Presets are predefined configurations for common use cases. They are applied with `--preset`:

```bash
intake init "Mi feature" -s reqs.md --preset minimal
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
- **`enterprise`**: For large teams, regulated projects, or when full traceability and exhaustive risk assessment are needed.

---

## Environment Variables

### LLM Providers

| Variable | Provider | Example |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic (Claude) | `sk-ant-api03-...` |
| `OPENAI_API_KEY` | OpenAI (GPT) | `sk-...` |

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui

# OpenAI
export OPENAI_API_KEY=sk-tu-key-aqui
```

If you use a different provider, configure `llm.api_key_env` in `.intake.yaml`:

```yaml
llm:
  model: gemini/gemini-pro
  api_key_env: GEMINI_API_KEY
```

### API Connectors

| Variable | Connector | Purpose |
|----------|-----------|---------|
| `JIRA_API_TOKEN` | Jira | Atlassian API token |
| `JIRA_EMAIL` | Jira | Authentication email |
| `CONFLUENCE_API_TOKEN` | Confluence | Atlassian API token |
| `CONFLUENCE_EMAIL` | Confluence | Authentication email |
| `GITHUB_TOKEN` | GitHub | Personal Access Token |
| `GITLAB_TOKEN` | GitLab | Personal Access Token (scope: `read_api`) |

```bash
# Jira / Confluence
export JIRA_API_TOKEN=tu-api-token
export JIRA_EMAIL=dev@company.com
export CONFLUENCE_API_TOKEN=tu-api-token
export CONFLUENCE_EMAIL=dev@company.com

# GitHub
export GITHUB_TOKEN=ghp_tu-personal-access-token

# GitLab
export GITLAB_TOKEN=glpat-tu-personal-access-token
```

The variable names are configurable via `connectors.*.token_env` and `connectors.*.email_env` in `.intake.yaml`.

---

## Auto-generating Config

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
