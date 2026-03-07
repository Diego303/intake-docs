---
title: "MCP Server"
description: "MCP server for AI agents: tools, resources, prompts and transports."
order: 16
icon: "M5 12h14M5 12a7 7 0 0114 0M5 12a7 7 0 0014 0M12 5v14"
---
# MCP Server

intake exposes specs as an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server so that AI agents can consume specs programmatically. This enables direct integration with agents like Claude Code, Cursor, and any compatible MCP client.

```bash
intake mcp serve [OPTIONS]
```

---

## General description

The intake MCP server (name: `intake-spec`) provides:

- **7 tools** -- operations on specs: query, verify, update tasks, analyze failures
- **6 resources** -- direct access to spec files via `intake://` URIs
- **2 prompts** -- structured templates for implementation and fix workflows
- **2 transports** -- stdio (local) and SSE (network)

The server allows an AI agent to access the complete spec, query pending tasks, update task status, run verification, and get fix suggestions -- all without leaving its workflow.

---

## Installation

The MCP server requires optional dependencies:

```bash
pip install "intake-ai-cli[mcp]"
```

This installs the `mcp` package required for the protocol.

For SSE (HTTP) transport, additional dependencies are needed:

```bash
pip install "intake-ai-cli[mcp]" starlette uvicorn
```

### Verify installation

```bash
intake doctor    # verifies that the mcp package is available
```

---

## CLI command

```bash
intake mcp serve [OPTIONS]
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--specs-dir` | `./specs` | Base directory where specs reside |
| `--project-dir` | `.` | Project directory for verification |
| `--transport` | `stdio` | Transport: `stdio` or `sse` |
| `--port` | `8080` | Port for SSE transport |

### Examples

```bash
# stdio (default, for local agents like Claude Code)
intake mcp serve

# Custom specs directory
intake mcp serve --specs-dir ./output/specs

# SSE (for remote or network agents)
intake mcp serve --transport sse --port 9090

# Combination of options
intake mcp serve --specs-dir ./specs --project-dir /path/to/project --transport sse --port 8080
```

---

## Tools

The server exposes 7 tools that agents can invoke:

### intake_list_specs

Lists all available specs in the specs directory.

| Parameter | Required | Description |
|-----------|----------|-------------|
| *(none)* | -- | No input required |

Returns the list of spec names found.

---

### intake_show

Shows a spec summary: number of requirements, tasks, acceptance checks, risks, and costs.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `spec_name` | Yes | Name of the spec |

---

### intake_get_context

Gets the content of a spec's `context.md`.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `spec_name` | Yes | Name of the spec |

---

### intake_get_tasks

Gets the task list with optional status filtering.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `spec_name` | Yes | -- | Name of the spec |
| `status_filter` | No | `"all"` | Status filter: `pending`, `in_progress`, `done`, `blocked`, `all` |

Example usage by an agent:

```json
{
  "spec_name": "mi-feature",
  "status_filter": "pending"
}
```

---

### intake_update_task

Updates a task's status.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `spec_name` | Yes | Name of the spec |
| `task_id` | Yes | Task ID (e.g., `"1"`, `"TASK-001"`) |
| `status` | Yes | New status: `pending`, `in_progress`, `done`, `blocked` |
| `note` | No | Optional note about the update |

---

### intake_verify

Runs the spec's verification checks. Returns the pass/fail result of each check.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `spec_name` | Yes | Name of the spec |
| `tags` | No | Array of tags to filter checks (e.g., `["api", "tests"]`) |

---

### intake_feedback

Analyzes verification failures and suggests fixes. Internally runs verification, filters the failed checks, and uses the feedback module to generate suggestions.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `spec_name` | Yes | Name of the spec |

---

## Resources

Resources allow direct access to a spec's files through URIs with the `intake://` scheme. Resources are auto-discovered: the server scans the specs directory and registers all available files.

### Available URIs

| URI | File |
|-----|------|
| `intake://specs/{name}/requirements` | `requirements.md` |
| `intake://specs/{name}/tasks` | `tasks.md` |
| `intake://specs/{name}/context` | `context.md` |
| `intake://specs/{name}/acceptance` | `acceptance.yaml` |
| `intake://specs/{name}/design` | `design.md` |
| `intake://specs/{name}/sources` | `sources.md` |

Where `{name}` is the name of the spec directory within the base specs directory.

### Example

If the specs directory is `./specs` and contains:

```
specs/
├── auth-module/
│   ├── requirements.md
│   ├── tasks.md
│   ├── context.md
│   ├── acceptance.yaml
│   ├── design.md
│   └── sources.md
└── payment-api/
    ├── requirements.md
    └── ...
```

The available resources would be:

- `intake://specs/auth-module/requirements`
- `intake://specs/auth-module/tasks`
- `intake://specs/auth-module/context`
- `intake://specs/auth-module/acceptance`
- `intake://specs/auth-module/design`
- `intake://specs/auth-module/sources`
- `intake://specs/payment-api/requirements`
- ...

---

## Prompts

The server provides 2 structured prompts that guide the agent through common workflows.

### implement_next_task

A structured prompt that loads `context.md`, `requirements.md`, and `tasks.md`, and instructs the agent to:

1. Find the next pending task
2. Implement it following the spec
3. Run verification
4. Update the task status
5. Repeat until all tasks are completed

| Parameter | Required | Description |
|-----------|----------|-------------|
| `spec_name` | Yes | Name of the spec |

### verify_and_fix

A prompt that instructs the agent to:

1. Run full verification
2. Analyze failed checks
3. Fix the code
4. Re-verify until all checks pass

| Parameter | Required | Description |
|-----------|----------|-------------|
| `spec_name` | Yes | Name of the spec |

---

## Configuration

The MCP server is configured in `.intake.yaml`:

```yaml
mcp:
  specs_dir: ./specs        # Base directory for specs
  project_dir: .            # Project directory for verification
  transport: stdio           # stdio | sse
  sse_port: 8080            # Port for SSE transport
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `specs_dir` | string | `"./specs"` | Directory where specs generated by intake reside |
| `project_dir` | string | `"."` | Project directory against which to run verification |
| `transport` | string | `"stdio"` | Transport protocol: `stdio` for local agents, `sse` for network |
| `sse_port` | int | `8080` | TCP port for the SSE server |

CLI flags (`--specs-dir`, `--project-dir`, `--transport`, `--port`) override configuration values.

---

## Agent integration

### Claude Code

**Option 1: `.mcp.json` in the project** (recommended for Claude Code CLI)

```json
{
  "mcpServers": {
    "intake": {
      "command": "intake",
      "args": ["mcp", "serve", "--specs-dir", "./specs"]
    }
  }
}
```

Commit `.mcp.json` in the repo so the entire team has automatic access to the MCP server.

**Option 2: `claude_desktop_config.json`** (for Claude Desktop)

```json
{
  "mcpServers": {
    "intake": {
      "command": "intake",
      "args": ["mcp", "serve", "--specs-dir", "./specs"]
    }
  }
}
```

With this configuration, Claude Code can:

1. List available specs with `intake_list_specs`
2. Read context and requirements via `intake://` resources
3. Query pending tasks with `intake_get_tasks`
4. Mark tasks as completed with `intake_update_task`
5. Verify the implementation with `intake_verify`
6. Get fix suggestions with `intake_feedback`

### Other MCP clients

Any MCP-compatible client can connect:

**stdio** -- the client launches the process directly:

```bash
intake mcp serve --specs-dir ./specs
```

**SSE** -- the client connects via HTTP:

```bash
# Start the server
intake mcp serve --transport sse --port 9090

# The client connects to http://localhost:9090/sse
```

---

## Architecture

### Modules

| File | Responsibility |
|------|---------------|
| `mcp/__init__.py` | `MCPError` exception and public exports |
| `mcp/server.py` | Server creation, stdio and SSE transports |
| `mcp/tools.py` | Definition and handlers for the 7 tools |
| `mcp/resources.py` | Listing and reading resources (spec files) |
| `mcp/prompts.py` | 2 structured prompt templates |

### Dependencies

The `mcp/` module uses:

- `verify/` -- for running acceptance checks (`intake_verify`)
- `utils/task_state` -- for reading and updating task state (`intake_get_tasks`, `intake_update_task`)
- `feedback/` -- for failure analysis (`intake_feedback`)

The `mcp/` module **does not import** directly from `analyze/` or `llm/`. The `intake_feedback` tool delegates to the feedback module, which manages its own interaction with the LLM.

```
mcp/
  ├── tools.py → verify/, utils/task_state, feedback/
  ├── resources.py → (direct file reading)
  └── prompts.py → (static templates)
```

---

## Troubleshooting

### The `mcp` package is not installed

```
Error: MCP dependencies not installed. Run: pip install "intake-ai-cli[mcp]"
```

**Solution:** Install the MCP dependencies:

```bash
pip install "intake-ai-cli[mcp]"
```

Verify with `intake doctor`.

### Spec not found

```
Error: Spec 'mi-feature' not found in ./specs
```

**Solution:** Verify that the specs directory exists and contains subdirectories with spec files:

```bash
ls ./specs/
# Should show directories like: mi-feature/

ls ./specs/mi-feature/
# Should contain: requirements.md, tasks.md, context.md, etc.
```

If the specs are in a different directory, use `--specs-dir`:

```bash
intake mcp serve --specs-dir /path/to/specs
```

### SSE port in use

```
Error: Address already in use: port 8080
```

**Solution:** Another process is using the port. Options:

1. Use a different port:
   ```bash
   intake mcp serve --transport sse --port 9090
   ```

2. Find and stop the process occupying the port:
   ```bash
   lsof -i :8080
   kill <PID>
   ```

### Missing SSE dependencies

If SSE transport is used without `starlette` or `uvicorn`:

```
Error: SSE transport requires 'starlette' and 'uvicorn'. Install them with: pip install starlette uvicorn
```

**Solution:**

```bash
pip install starlette uvicorn
```

### Verification fails from MCP

If `intake_verify` returns errors, verify that `--project-dir` points to the correct project directory:

```bash
intake mcp serve --specs-dir ./specs --project-dir /path/to/project
```

Acceptance checks are executed relative to the project directory.
