---
title: "Deployment"
description: "Docker, pre-commit hooks and deployment patterns for teams."
order: 14
icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
---

# Deployment

Guide for deploying intake in team environments, containers, and CI pipelines.

---

## Team installation

### Standard installation

```bash
pip install intake-ai-cli
```

With API connectors (Jira, Confluence, GitHub, GitLab):

```bash
pip install "intake-ai-cli[connectors]"
```

### Installation in a dedicated virtualenv

Recommended for isolating intake from the system Python:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install intake-ai-cli
```

### Pinning version for teams

In a `requirements.txt` or `pyproject.toml` for the project:

```text
# requirements-tools.txt
intake-ai-cli==1.0.0
```

```bash
pip install -r requirements-tools.txt
```

This ensures the entire team uses the same version of intake.

---

## Docker

### Dockerfile

Multi-stage Dockerfile optimized for production:

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /build
RUN pip install --no-cache-dir --prefix=/install intake-ai-cli

# Stage 2: Runtime
FROM python:3.12-slim

COPY --from=builder /install /usr/local

# intake does not need root
RUN useradd --create-home intake
USER intake
WORKDIR /workspace

ENTRYPOINT ["intake"]
```

With connectors:

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /build
RUN pip install --no-cache-dir --prefix=/install "intake-ai-cli[connectors]"

FROM python:3.12-slim
COPY --from=builder /install /usr/local
RUN useradd --create-home intake
USER intake
WORKDIR /workspace
ENTRYPOINT ["intake"]
```

### Using with Docker

```bash
# Build the image
docker build -t intake .

# Generate a spec (mount sources and output)
docker run --rm \
  -v $(pwd):/workspace \
  -e ANTHROPIC_API_KEY \
  intake init "Mi feature" -s /workspace/reqs.md

# Verify a spec (no API key needed)
docker run --rm \
  -v $(pwd):/workspace \
  intake verify /workspace/specs/mi-feature/ -p /workspace

# Export for Claude Code
docker run --rm \
  -v $(pwd):/workspace \
  intake export /workspace/specs/mi-feature/ -f claude-code -o /workspace

# Doctor check
docker run --rm intake doctor
```

**Important:** API keys are passed via `-e`, never included in the image.

### docker-compose.yml

For teams that prefer docker-compose:

```yaml
services:
  intake:
    build: .
    volumes:
      - .:/workspace
    env_file:
      - .env
    working_dir: /workspace
```

```bash
# Generate spec
docker compose run --rm intake init "Feature" -s reqs.md

# Verify
docker compose run --rm intake verify specs/feature/ -p .

# Export
docker compose run --rm intake export specs/feature/ -f cursor -o .

# Feedback
docker compose run --rm intake feedback specs/feature/ -p .
```

### .env for Docker

```bash
# .env (do not commit)
ANTHROPIC_API_KEY=sk-ant-api03-tu-key
JIRA_API_TOKEN=tu-token
JIRA_EMAIL=dev@company.com
GITHUB_TOKEN=ghp_tu-token
GITLAB_TOKEN=glpat-tu-token
```

```bash
# .env.example (commit as reference)
ANTHROPIC_API_KEY=
JIRA_API_TOKEN=
JIRA_EMAIL=
GITHUB_TOKEN=
GITLAB_TOKEN=
```

### .dockerignore

```
.git
.venv
__pycache__
*.pyc
.env
.env.*
*.pem
*.key
node_modules
.mypy_cache
.pytest_cache
```

---

## Pre-commit hooks

### intake verify as a hook

Run verification automatically on every commit:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: intake-verify
        name: Verify spec compliance
        entry: intake verify specs/mi-feature/ -p . --fail-fast
        language: system
        pass_filenames: false
        stages: [pre-commit]
        # Only run if source code changed
        files: ^src/
```

### intake doctor as a hook

Lightweight environment check on every commit:

```yaml
  - repo: local
    hooks:
      - id: intake-doctor
        name: Check intake environment
        entry: intake doctor
        language: system
        pass_filenames: false
        stages: [pre-commit]
        always_run: true
```

### Installing pre-commit

```bash
pip install pre-commit
pre-commit install
```

**Note:** Checks of type `command` in `acceptance.yaml` can be slow (tests, lint). Use `--tags` to run only fast checks in pre-commit:

```yaml
entry: intake verify specs/mi-feature/ -p . --fail-fast -t structure -t security
```

---

## Deployment patterns

### As a step in CI pipelines

The most common use case: verify specs on every PR and export on merge.

```
PR opened → intake verify (CI) → Review → Merge → intake export (CI)
```

See [CI/CD Integration](../ci-cd-integration/) for complete examples with GitHub Actions, GitLab CI, Jenkins, and Azure DevOps.

### As a scheduled job (spec drift)

Detect when sources change and the spec becomes outdated:

```bash
# Weekly cron job: check if sources have changed
# (spec.lock.yaml has hashes of the sources)
intake show specs/mi-feature/
# If staleness detected → create issue / notify
```

See [CI/CD Integration > Spec drift detection](../ci-cd-integration/#spec-drift-detection) for the implementation.

### In AI agent pipelines

```
1. intake init (generate spec)
2. intake export -f claude-code (export for agent)
3. Agent implements
4. intake verify (verify compliance)
5. intake feedback (analyze failures)
6. Agent fixes
7. Repeat 4-6 until all checks pass
```

See [Workflows > Workflow with AI agents](../workflows/#workflow-with-ai-agents) for details.

---

## Environment variables by use case

| Use case | Required variables |
|----------|-------------------|
| `intake verify` | None |
| `intake export` | None |
| `intake show/list/diff` | None |
| `intake doctor` | None |
| `intake task` | None |
| `intake init/add` | `ANTHROPIC_API_KEY` (or the configured LLM provider's key) |
| `intake feedback` | `ANTHROPIC_API_KEY` (or the LLM provider's key) |
| Jira connector | `JIRA_API_TOKEN` + `JIRA_EMAIL` |
| Confluence connector | `CONFLUENCE_API_TOKEN` + `CONFLUENCE_EMAIL` |
| GitHub connector | `GITHUB_TOKEN` |
| GitLab connector | `GITLAB_TOKEN` |

**Note:** Variable names are configurable in `.intake.yaml`. The default values are listed above.

See [Security](../security/) for secrets management best practices.

---

## System requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Python | 3.12+ | 3.12+ |
| RAM | 256 MB | 512 MB |
| Disk | 50 MB (installation) | 100 MB (with connectors) |
| Network | Only for init/add/feedback/connectors | — |
| CPU | 1 core | 2+ cores (for parallel checks in verify) |

intake is a lightweight tool. The most expensive resource is the LLM call, which depends on the external provider.
