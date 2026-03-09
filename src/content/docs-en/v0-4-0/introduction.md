---
title: "Introduction"
description: "Install intake and generate your first spec in minutes."
order: 1
icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z"
---
# intake Documentation

> From requirements in any format to verified implementation.

**intake** is an open-source CLI tool that transforms requirements from multiple sources and formats (Jira, Confluence, PDFs, Markdown, YAML, images, DOCX, free text) into a normalized and verifiable specification that any AI agent can consume.

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
| [CLI Guide](../cli-guide/) | Complete reference for all 19 commands/subcommands with all their options |
| [Configuration](../configuration/) | All `.intake.yaml` options, presets and environment variables |

**Pipeline:**

| Document | Description |
|----------|-------------|
| [Pipeline](../pipeline/) | How the 5-phase pipeline + feedback loop works in detail |
| [Input Formats](../input-formats/) | The 11 parsers + 3 API connectors, what they extract and how they auto-detect |
| [Connectors](../connectors/) | Direct API connectors: Jira, Confluence, GitHub |
| [Plugins](../plugins/) | Plugin system: protocols, discovery, hooks and how to create plugins |
| [Verification](../verification/) | Acceptance checks engine, reporters and CI/CD |
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
| [Troubleshooting](../troubleshooting/) | Common errors, diagnostics and FAQ |

---

## Quick start

```bash
# 1. Verify that the environment is ready
intake doctor

# 2. Generate a spec from a Markdown file
intake init "OAuth2 authentication system" -s requirements.md

# 3. Generate from multiple sources
intake init "Payment gateway" -s jira.json -s confluence.html -s notes.md

# 4. Quick mode for simple tasks (only context.md + tasks.md)
intake init "Fix login bug" -s notes.txt --mode quick

# 5. From a URL
intake init "API review" -s https://wiki.company.com/rfc/auth

# 6. Verify the implementation against the spec
intake verify specs/payment-gateway/ -p .

# 7. Export for a specific agent
intake export specs/payment-gateway/ -f claude-code -o .
intake export specs/payment-gateway/ -f cursor -o .
intake export specs/payment-gateway/ -f copilot -o .

# 8. From direct API connectors (requires config)
intake init "Sprint tasks" -s jira://PROJ/sprint/42
intake init "RFC review" -s confluence://ENG/Architecture-RFC

# 9. Feedback loop: analyze failures and suggest corrections
intake feedback specs/payment-gateway/ -p .

# 10. Manage plugins
intake plugins list

# 11. Task tracking
intake task list specs/payment-gateway/
intake task update specs/payment-gateway/ 1 done --note "Implemented"

# 12. MCP server for AI agents
intake mcp serve --transport stdio

# 13. Watch mode: re-verify on file changes
intake watch specs/payment-gateway/ --project-dir . --verbose
```

---

## The 6 spec files

Each generated spec contains:

| File | Purpose |
|------|---------|
| `requirements.md` | What to build. Functional and non-functional requirements. |
| `design.md` | How to build it. Architecture, interfaces, technical decisions. |
| `tasks.md` | In what order. Atomic tasks with dependencies. |
| `acceptance.yaml` | How to verify. Executable checks: commands, patterns, files. |
| `context.md` | Project context for the agent: stack, conventions, state. |
| `sources.md` | Complete traceability: each requirement mapped to its original source. |

Additionally, `spec.lock.yaml` is generated for reproducibility (source hashes, costs, timestamps).
