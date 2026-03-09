---
title: "Plugins"
description: "Plugin system: protocols, discovery, hooks and how to create plugins."
order: 7
icon: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a2 2 0 012 2v3a1 1 0 01-1 1 2 2 0 100 4 1 1 0 011 1v3a2 2 0 01-2 2h-3a1 1 0 01-1-1 2 2 0 10-4 0 1 1 0 01-1 1H7a2 2 0 01-2-2v-3a1 1 0 00-1-1 2 2 0 010-4 1 1 0 001-1V7a2 2 0 012-2h3a1 1 0 001-1V4z"
---

# Plugins

Since v0.2.0, intake uses an extensible architecture based on plugins. Parsers, exporters, and connectors are automatically discovered via Python entry_points (PEP 621).

---

## How It Works

### Automatic Discovery

intake uses `importlib.metadata.entry_points()` to discover installed plugins. Each plugin is registered in an **entry_points group**:

| Group | Type | Example |
|-------|------|---------|
| `intake.parsers` | Input format parsers | `markdown = "intake.ingest.markdown:MarkdownParser"` |
| `intake.exporters` | Output format exporters | `architect = "intake.export.architect:ArchitectExporter"` |
| `intake.connectors` | Direct API connectors | `jira = "intake.connectors.jira_api:JiraConnector"` |

When intake loads a registry (`ParserRegistry`, `ExporterRegistry`), it tries to discover plugins first. If discovery fails, it falls back to manual (hardcoded) registration.

### Verify Installed Plugins

```bash
# List all discovered plugins
intake plugins list

# With details (module, load errors)
intake plugins list -v

# Verify compatibility
intake plugins check
```

---

## Built-in Plugins

intake includes 22 built-in plugins registered as entry_points in `pyproject.toml`:

### Parsers (12)

| Name | Module | Format |
|------|--------|--------|
| `markdown` | `intake.ingest.markdown:MarkdownParser` | `.md`, `.markdown` |
| `plaintext` | `intake.ingest.plaintext:PlaintextParser` | `.txt`, stdin |
| `yaml` | `intake.ingest.yaml_input:YamlInputParser` | `.yaml`, `.yml`, `.json` |
| `pdf` | `intake.ingest.pdf:PdfParser` | `.pdf` |
| `docx` | `intake.ingest.docx:DocxParser` | `.docx` |
| `jira` | `intake.ingest.jira:JiraParser` | `.json` (auto-detected) |
| `confluence` | `intake.ingest.confluence:ConfluenceParser` | `.html` (auto-detected) |
| `image` | `intake.ingest.image:ImageParser` | `.png`, `.jpg`, `.webp`, `.gif` |
| `url` | `intake.ingest.url:UrlParser` | `http://`, `https://` |
| `slack` | `intake.ingest.slack:SlackParser` | `.json` (auto-detected) |
| `github_issues` | `intake.ingest.github_issues:GithubIssuesParser` | `.json` (auto-detected) |
| `gitlab_issues` | `intake.ingest.gitlab_issues:GitlabIssuesParser` | `.json` (auto-detected) |

### Exporters (6)

| Name | Module | Format | Protocol |
|------|--------|--------|----------|
| `architect` | `intake.export.architect:ArchitectExporter` | `pipeline.yaml` + spec | V1 |
| `generic` | `intake.export.generic:GenericExporter` | `SPEC.md` + `verify.sh` + spec | V1 |
| `claude-code` | `intake.export.claude_code:ClaudeCodeExporter` | `CLAUDE.md` + `.intake/tasks/` + `verify.sh` | V2 |
| `cursor` | `intake.export.cursor:CursorExporter` | `.cursor/rules/intake-spec.mdc` | V2 |
| `kiro` | `intake.export.kiro:KiroExporter` | `requirements.md` + `design.md` + `tasks.md` (Kiro format) | V2 |
| `copilot` | `intake.export.copilot:CopilotExporter` | `.github/copilot-instructions.md` | V2 |

### Connectors (4)

| Name | Module | URIs |
|------|--------|------|
| `jira` | `intake.connectors.jira_api:JiraConnector` | `jira://` |
| `confluence` | `intake.connectors.confluence_api:ConfluenceConnector` | `confluence://` |
| `github` | `intake.connectors.github_api:GithubConnector` | `github://` |
| `gitlab` | `intake.connectors.gitlab_api:GitlabConnector` | `gitlab://` |

---

## Protocols

intake defines two generations of protocols:

### V1 — Core Protocols

The V1 protocols are the original system protocols. They are minimal and sufficient for simple parsers and exporters:

```python
# Parser V1
@runtime_checkable
class Parser(Protocol):
    def can_parse(self, source: str) -> bool: ...
    def parse(self, source: str) -> ParsedContent: ...

# Exporter V1
@runtime_checkable
class Exporter(Protocol):
    def export(self, spec_dir: str, output_dir: str) -> list[str]: ...
```

All built-in parsers and exporters use V1. The registries accept both V1 and V2.

### V2 — Plugin Protocols

The V2 protocols extend V1 with metadata, discovery capabilities, and additional functionality. They are designed for external plugins:

```python
@runtime_checkable
class ParserPlugin(Protocol):
    @property
    def meta(self) -> PluginMeta: ...

    @property
    def supported_extensions(self) -> set[str]: ...

    def confidence(self, source: str) -> float: ...
    def can_parse(self, source: str) -> bool: ...
    def parse(self, source: str) -> ParsedContent: ...
```

```python
@runtime_checkable
class ExporterPlugin(Protocol):
    @property
    def meta(self) -> PluginMeta: ...

    @property
    def supported_agents(self) -> list[str]: ...

    def export(self, spec_dir: str, output_dir: str) -> ExportResult: ...
```

```python
@runtime_checkable
class ConnectorPlugin(Protocol):
    @property
    def meta(self) -> PluginMeta: ...

    @property
    def uri_schemes(self) -> list[str]: ...

    def can_handle(self, uri: str) -> bool: ...
    async def fetch(self, uri: str) -> list[FetchedSource]: ...
    def validate_config(self) -> list[str]: ...
```

### Supporting Dataclasses

```python
@dataclass
class PluginMeta:
    name: str
    version: str
    description: str
    author: str

@dataclass
class ExportResult:
    files_created: list[str]
    primary_file: str
    instructions: str

@dataclass
class FetchedSource:
    local_path: str
    original_uri: str
    format_hint: str
    metadata: dict[str, str]
```

---

## Creating an External Plugin

### Step 1: Create the Package

```
mi-plugin-intake/
├── pyproject.toml
└── src/
    └── mi_plugin/
        ├── __init__.py
        └── parser.py
```

### Step 2: Implement the Protocol

```python
# src/mi_plugin/parser.py
from __future__ import annotations

from intake.ingest.base import ParsedContent


class AsanaParser:
    """Parser for Asana JSON exports."""

    def can_parse(self, source: str) -> bool:
        # Detect if the file is an Asana export
        ...

    def parse(self, source: str) -> ParsedContent:
        # Parse the file and return normalized ParsedContent
        ...
```

You can implement the V1 protocol (`Parser`) or V2 (`ParserPlugin`). The registry accepts both.

### Step 3: Register as an Entry Point

```toml
# pyproject.toml
[project.entry-points."intake.parsers"]
asana = "mi_plugin.parser:AsanaParser"
```

### Step 4: Install

```bash
pip install mi-plugin-intake
```

The plugin is automatically discovered:

```bash
intake plugins list    # "asana" should appear
intake plugins check   # should report OK
```

Now you can use Asana files as a source:

```bash
intake init "Sprint review" -s asana-export.json
```

---

## Hooks

The `HookManager` allows registering callbacks that execute in response to pipeline events:

```python
from intake.plugins.hooks import HookManager

manager = HookManager()

# Register a callback
def on_parse_complete(data: dict) -> None:
    print(f"Parsed: {data['source']}")

manager.register("parse_complete", on_parse_complete)

# Emit an event
manager.emit("parse_complete", {"source": "reqs.md", "format": "markdown"})
```

### Features

- Callbacks execute in registration order
- Exceptions are caught and logged without blocking other callbacks
- `registered_events` returns the names of events with registered callbacks
- Ready for wiring in future pipeline phases

---

## PluginRegistry API

```python
from intake.plugins.discovery import PluginRegistry

registry = PluginRegistry()

# Discover all plugins
registry.discover_all()

# Discover by group
registry.discover_group("intake.parsers")

# Get plugins by type
parsers = registry.get_parsers()       # dict[str, object]
exporters = registry.get_exporters()   # dict[str, object]
connectors = registry.get_connectors() # dict[str, object]

# List plugin information
for info in registry.list_plugins():
    print(f"{info.name} ({info.group}) v{info.version} - V2: {info.is_v2}")

# Verify compatibility
issues = registry.check_compatibility(info)
```

### PluginInfo

| Field | Type | Description |
|-------|------|-------------|
| `name` | str | Plugin name |
| `group` | str | Entry point group |
| `module` | str | Python module |
| `distribution` | str | Package that provides it |
| `version` | str | Package version |
| `is_builtin` | bool | Whether it is a built-in intake plugin |
| `is_v2` | bool | Whether it implements the V2 protocol |
| `load_error` | str \| None | Load error (if it failed) |

---

## Exceptions

| Exception | Description |
|-----------|-------------|
| `PluginError` | Base plugin error |
| `PluginLoadError` | Failed to load a plugin (import error, module not found) |
