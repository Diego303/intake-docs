---
title: "Introduction"
description: "Install intake and generate your first spec in minutes."
order: 1
icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z"
---

# intake Documentation

> From requirements in any format to verified implementation.

**intake** is an open-source CLI tool that transforms requirements from multiple sources and formats (Jira, Confluence, GitHub, GitLab, PDFs, Markdown, YAML, images, DOCX, free text) into a normalized, verifiable specification that any AI agent can consume.

```
intake = Chaotic requirements (N sources, N formats) -> Executable spec -> Any AI agent
```

---

## Prerequisites

- **Python 3.12+**
- **API key from an LLM provider** (Anthropic, OpenAI, Google, etc.)

## Installation

```bash
pip install intake-ai-cli
```

The CLI command is called `intake`:

```bash
intake --version
intake doctor
```

For local development:

```bash
git clone https://github.com/Diego303/intake-cli.git
cd intake-cli
pip install -e ".[dev]"
```

---

## Guides

| Document | Description |
|----------|-------------|
**Core:**

| Document | Description |
|----------|-------------|
| [Architecture](../architecture/) | System architecture, modules, data flow and design decisions |
| [CLI Guide](../cli-guide/) | Complete reference of all 22 commands/subcommands with options and examples |
| [Configuration](../configuration/) | All `.intake.yaml` options, presets and environment variables |

**Pipeline:**

| Document | Description |
|----------|-------------|
| [Pipeline](../pipeline/) | How the 5-phase pipeline + feedback loop works in detail |
| [Input Formats](../input-formats/) | The 12 parsers + 4 API connectors, what they extract and how they are auto-detected |
| [Connectors](../connectors/) | Direct API connectors: Jira, Confluence, GitHub, GitLab |
| [Plugins](../plugins/) | Plugin system: protocols, discovery, hooks and how to create plugins |
| [Verification](../verification/) | Acceptance check engine, reporters and CI/CD |
| [Export](../export/) | 6 export formats for AI agents |
| [Feedback](../feedback/) | Feedback loop: failure analysis and spec amendments |
| [MCP Server](../mcp-server/) | MCP server for AI agents: tools, resources, prompts and transports |
| [Watch Mode](../watch-mode/) | Watch mode: file monitoring and automatic re-verification |

**Operations and enterprise:**

| Document | Description |
|----------|-------------|
| [Deployment](../deployment/) | Docker, pre-commit hooks and deployment patterns for teams |
| [CI/CD Integration](../ci-cd-integration/) | GitHub Actions, GitLab CI, Jenkins, Azure DevOps |
| [Security](../security/) | Threat model, secrets management, redaction, compliance |
| [Workflows](../workflows/) | Patterns for teams of all sizes: individual to enterprise |

**Reference:**

| Document | Description |
|----------|-------------|
| [Best Practices](../best-practices/) | Tips, recommended patterns and how to get the most out of it |
| [Custom Templates](../custom-templates/) | Customize Jinja2 templates: variables, overrides and examples |
| [Troubleshooting](../troubleshooting/) | Common errors, diagnostics and FAQ |

**Release notes:**

| Version | Description |
|---------|-------------|
| v1.0.0 | Production ready: 12 bug fixes, `regenerate` command, 902 tests |
| v0.6.0 | GitLab connector + parser, validate, estimate, custom templates, CI export |
| v0.5.0 | Polish, CI/CD, GitHub Actions action, mypy --strict, 5 examples |
| v0.4.0 | MCP server + Watch mode |
| v0.3.0 | Connectors + Exporters + Feedback loop |
| v0.2.0 | Plugin system + New parsers + Adaptive generation |
| v0.1.0 | Initial release |

---

## Quick Start

```bash
# 1. Verify that the environment is ready
intake doctor

# 2. Generate a spec from a Markdown file
intake init "Sistema de autenticacion OAuth2" -s requirements.md

# 3. Generate from multiple sources
intake init "Pasarela de pagos" -s jira.json -s confluence.html -s notas.md

# 4. Quick mode for simple tasks (only context.md + tasks.md)
intake init "Fix login bug" -s notas.txt --mode quick

# 5. From a URL
intake init "API review" -s https://wiki.company.com/rfc/auth

# 6. Regenerate a spec from scratch
intake regenerate specs/pasarela-de-pagos/ -s reqs-actualizados.md

# 7. Verify the implementation against the spec
intake verify specs/pasarela-de-pagos/ -p .

# 8. Export for a specific agent
intake export specs/pasarela-de-pagos/ -f claude-code -o .
intake export specs/pasarela-de-pagos/ -f cursor -o .
intake export specs/pasarela-de-pagos/ -f copilot -o .

# 9. From direct API connectors (requires config)
intake init "Sprint tasks" -s jira://PROJ/sprint/42
intake init "RFC review" -s confluence://ENG/Architecture-RFC
intake init "Sprint review" -s gitlab://team/backend/issues?labels=sprint

# 10. Feedback loop: analyze failures and suggest fixes
intake feedback specs/pasarela-de-pagos/ -p .

# 11. Manage plugins
intake plugins list

# 12. Task tracking
intake task list specs/pasarela-de-pagos/
intake task update specs/pasarela-de-pagos/ 1 done --note "Implementado"

# 13. MCP server for AI agents
intake mcp serve --transport stdio

# 14. Watch mode: re-verify when files change
intake watch specs/pasarela-de-pagos/ --project-dir . --verbose

# 15. Validate internal consistency of a spec
intake validate specs/pasarela-de-pagos/

# 16. Estimate cost before generating
intake estimate -s requirements.md -s notas.md

# 17. Generate CI config for verification
intake export-ci specs/pasarela-de-pagos/ -p gitlab
```

---

## The 6 Spec Files

Each generated spec contains:

| File | Purpose |
|------|---------|
| `requirements.md` | What to build. Functional and non-functional requirements. |
| `design.md` | How to build it. Architecture, interfaces, technical decisions. |
| `tasks.md` | In what order. Atomic tasks with dependencies. |
| `acceptance.yaml` | How to verify. Executable checks: commands, patterns, files. |
| `context.md` | Project context for the agent: stack, conventions, state. |
| `sources.md` | Full traceability: each requirement mapped to its original source. |

Additionally, `spec.lock.yaml` is generated for reproducibility (source hashes, costs, timestamps).
