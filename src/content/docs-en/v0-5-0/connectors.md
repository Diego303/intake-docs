---
title: "Connectors"
description: "Direct API connectors for Jira, Confluence and GitHub."
order: 10
icon: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
---
# Connectors

Direct API connectors allow fetching data from Jira, Confluence and GitHub without manually exporting files. They are used through scheme URIs in the `-s` flag.

```bash
intake init "Sprint tasks" -s jira://PROJ/sprint/42
intake init "RFC review" -s confluence://ENG/Architecture-RFC
intake init "Bug triage" -s github://org/repo/issues?labels=bug
```

---

## Prerequisites

### Installation

Connectors require optional dependencies:

```bash
pip install "intake-ai-cli[connectors]"
```

This installs `atlassian-python-api` (Jira, Confluence) and `PyGithub` (GitHub).

### Configuration

Configure credentials in `.intake.yaml` and environment variables:

```yaml
connectors:
  jira:
    url: "https://company.atlassian.net"
    token_env: JIRA_API_TOKEN
    email_env: JIRA_EMAIL
  confluence:
    url: "https://company.atlassian.net/wiki"
    token_env: CONFLUENCE_API_TOKEN
    email_env: CONFLUENCE_EMAIL
  github:
    token_env: GITHUB_TOKEN
```

```bash
export JIRA_API_TOKEN=your-api-token
export JIRA_EMAIL=dev@company.com
export CONFLUENCE_API_TOKEN=your-api-token
export CONFLUENCE_EMAIL=dev@company.com
export GITHUB_TOKEN=ghp_your-personal-access-token
```

### Verification

```bash
intake doctor    # verifies credentials if connectors are configured
```

---

## Jira

Fetches issues directly from the Jira Cloud or Server REST API.

### Supported URIs

| URI | What it does |
|-----|-------------|
| `jira://PROJ-123` | A single issue |
| `jira://PROJ-123,PROJ-124,PROJ-125` | Multiple issues separated by comma |
| `jira://PROJ?jql=sprint%20%3D%2042` | JQL search |
| `jira://PROJ/sprint/42` | All issues in a sprint |

### Examples

```bash
# A specific issue
intake init "Fix auth bug" -s jira://AUTH-456

# Multiple issues
intake init "Sprint review" -s jira://AUTH-456,AUTH-457,AUTH-458

# JQL search
intake init "P1 bugs" -s "jira://PROJ?jql=priority=Highest AND status!=Done"

# Complete sprint
intake init "Sprint 42" -s jira://PROJ/sprint/42
```

### Full configuration

```yaml
connectors:
  jira:
    url: "https://company.atlassian.net"     # Required
    auth_type: token                          # token | oauth | api_key
    token_env: JIRA_API_TOKEN                 # Environment variable name
    email_env: JIRA_EMAIL                     # Email for authentication
    default_project: ""                       # Default project
    include_comments: true                    # Include comments
    max_comments: 5                           # Maximum comments per issue
    fields:                                   # Fields to retrieve
      - summary
      - description
      - labels
      - priority
      - status
      - issuelinks
      - comment
```

### What it extracts

For each issue, the connector retrieves the same data that `JiraParser` extracts from JSON files:

- Summary, description, priority, status
- Labels and issue links (dependencies)
- Comments (up to `max_comments`, with ADF support)

The data is saved as temporary JSON files compatible with `JiraParser`.

---

## Confluence

Fetches pages directly from the Confluence Cloud or Server API.

### Supported URIs

| URI | What it does |
|-----|-------------|
| `confluence://page/123456789` | Page by ID |
| `confluence://SPACE/Page-Title` | Page by space and title |
| `confluence://search?cql=space.key%3DENG` | CQL search |

### Examples

```bash
# Page by ID
intake init "RFC review" -s confluence://page/123456789

# Page by space and title
intake init "Architecture" -s confluence://ENG/System-Architecture

# CQL search
intake init "Team docs" -s "confluence://search?cql=space.key=ENG AND label=requirements"
```

### Full configuration

```yaml
connectors:
  confluence:
    url: "https://company.atlassian.net/wiki"  # Required
    auth_type: token                            # token | oauth
    token_env: CONFLUENCE_API_TOKEN
    email_env: CONFLUENCE_EMAIL
    default_space: ""                           # Default space
    include_child_pages: false                  # Include child pages
    max_depth: 1                                # Maximum depth
```

### What it extracts

The connector downloads the page body in HTML format (storage or view format) and saves it as a temporary HTML file compatible with `ConfluenceParser`. It extracts:

- HTML content of the page
- Title and metadata
- Child pages (if `include_child_pages: true`)

---

## GitHub

Fetches issues directly from the GitHub API.

### Supported URIs

| URI | What it does |
|-----|-------------|
| `github://org/repo/issues/42` | A single issue |
| `github://org/repo/issues/42,43,44` | Multiple issues separated by comma |
| `github://org/repo/issues?labels=bug&state=open` | Filtered issues |

### Filter parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `labels` | Filter by labels (comma-separated) | `labels=bug,urgent` |
| `state` | Issue state | `state=open`, `state=closed`, `state=all` |
| `milestone` | Filter by milestone | `milestone=v2.0` |

### Examples

```bash
# A specific issue
intake init "Fix #42" -s github://org/repo/issues/42

# Multiple issues
intake init "Sprint items" -s github://org/repo/issues/42,43,44

# All open bugs
intake init "Bug triage" -s "github://org/repo/issues?labels=bug&state=open"

# Issues from a milestone
intake init "v2.0 features" -s "github://org/repo/issues?milestone=v2.0&state=all"
```

### Full configuration

```yaml
connectors:
  github:
    token_env: GITHUB_TOKEN      # Environment variable with the PAT
    default_repo: ""              # Default repo (e.g.: "org/repo")
```

### Limits

- Maximum **50 issues** per query
- Maximum **10 comments** per issue
- Requires a Personal Access Token with read permissions on the repository

### What it extracts

Issues are saved as temporary JSON compatible with `GithubIssuesParser`:

- Number, title, body, state
- Labels, assignees, milestone
- Comments (up to 10 per issue)
- Cross-references (`#NNN`) in body and comments

---

## Protocol

Connectors implement the `ConnectorPlugin` protocol:

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

The `fetch()` method is async and returns a list of `FetchedSource`:

```python
@dataclass
class FetchedSource:
    local_path: str          # Path to the downloaded temporary file
    original_uri: str        # Original URI (e.g.: "jira://PROJ-123")
    format_hint: str         # Hint for the parser (e.g.: "jira", "confluence")
    metadata: dict[str, str] # Additional metadata
```

Temporary files are passed to the parser registry to be processed normally.

---

## Creating an external connector

1. Create a Python package that implements `ConnectorPlugin`
2. Register as an entry_point in the `intake.connectors` group
3. The connector will be automatically discovered

```toml
# pyproject.toml
[project.entry-points."intake.connectors"]
asana = "my_plugin.connector:AsanaConnector"
```

See [Plugins](../plugins/) for more details.
