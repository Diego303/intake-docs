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
git clone https://github.com/your-org/intake-cli.git
cd intake-cli
pip install -e ".[dev]"
```

---

## Guides

| Document | Description |
|----------|-------------|
| [Architecture](../architecture/) | System architecture, modules, data flow and design decisions |
| [CLI Guide](../cli-guide/) | Complete reference for all 8 commands with all their options |
| [Configuration](../configuration/) | All `.intake.yaml` options, presets and environment variables |
| [Pipeline](../pipeline/) | How the 5-phase pipeline works in detail |
| [Input Formats](../input-formats/) | The 8 supported parsers, what they extract and how they are auto-detected |
| [Verification](../verification/) | Acceptance check engine, reporters and CI/CD |
| [Export](../export/) | Export formats for AI agents |
| [Best Practices](../best-practices/) | Tips, recommended patterns and how to get the most out of it |
| [Troubleshooting](../troubleshooting/) | Common errors, diagnostics and FAQ |

---

## Quick Start

```bash
# 1. Verify that the environment is ready
intake doctor

# 2. Generate a spec from a Markdown file
intake init "OAuth2 authentication system" -s requirements.md

# 3. Generate from multiple sources
intake init "Payment gateway" -s jira.json -s confluence.html -s notes.md

# 4. Verify the implementation against the spec
intake verify specs/payment-gateway/ -p .

# 5. Export for a specific agent
intake export specs/payment-gateway/ -f architect -o output/
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
| `sources.md` | Complete traceability: each requirement mapped to its original source. |

Additionally, `spec.lock.yaml` is generated for reproducibility (source hashes, costs, timestamps).
