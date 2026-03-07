---
title: "Input Formats"
description: "The 11 supported parsers + 3 API connectors, what they extract and how they auto-detect."
order: 6
icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"
---
# Input Formats

intake supports 11 input formats through specialized parsers. The format is auto-detected by file extension and content. Parsers are automatically discovered via the [plugin system](../plugins/).

---

## Summary table

| Format | Parser | Extensions / Source | Dependency | What it extracts |
|--------|--------|---------------------|------------|-----------------|
| Markdown | `MarkdownParser` | `.md`, `.markdown` | — | YAML front matter, sections by headings |
| Plain text | `PlaintextParser` | `.txt`, stdin (`-`) | — | Paragraphs as sections |
| YAML / JSON | `YamlInputParser` | `.yaml`, `.yml`, `.json` | — | Top-level keys as sections |
| PDF | `PdfParser` | `.pdf` | pdfplumber | Text per page, tables as Markdown |
| DOCX | `DocxParser` | `.docx` | python-docx | Paragraphs, tables, metadata, sections by headings |
| Jira | `JiraParser` | `.json` (auto-detected) | — | Issues, comments, links, labels, priority |
| Confluence | `ConfluenceParser` | `.html`, `.htm` (auto-detected) | bs4, markdownify | Clean content as Markdown |
| Images | `ImageParser` | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` | LLM vision | Description of visual content |
| URLs | `UrlParser` | `http://`, `https://` | httpx, bs4, markdownify | Web page content as Markdown |
| Slack | `SlackParser` | `.json` (auto-detected) | — | Messages, threads, decisions, action items |
| GitHub Issues | `GithubIssuesParser` | `.json` (auto-detected) | — | Issues, labels, comments, cross-references |

---

## Format auto-detection

The registry detects the format automatically following this order:

1. **Stdin** (`-`): always treated as `plaintext`
2. **File extension**: direct mapping (`.md` -> markdown, `.pdf` -> pdf, etc.)
3. **JSON subtype**: if the extension is `.json`, the content is inspected in this order:
   - If it has key `"issues"` or is a list with objects that have `"key"` + `"fields"` -> `jira`
   - If it is a list with objects that have `"number"` + (`"html_url"` or `"labels"`) -> `github_issues`
   - If it is a list with objects that have `"type": "message"` + `"ts"` -> `slack`
   - If it does not match any subtype -> `yaml` (treated as structured data)
4. **HTML subtype**: if the extension is `.html` or `.htm`:
   - If the first 2000 characters contain "confluence" or "atlassian" -> `confluence`
   - If not -> fallback to `plaintext`
5. **URLs**: if the source starts with `http://` or `https://` -> `url`
6. **Fallback**: if there is no parser for the detected format -> `plaintext`

**Note:** JSON subtype detection follows a strict priority order: Jira > GitHub Issues > Slack > generic YAML. This avoids ambiguities when a JSON file has fields that could match multiple formats.

---

## Parsers in detail

### Markdown

**Extensions:** `.md`, `.markdown`

**What it extracts:**

- **YAML front matter**: if the file starts with `---`, extracts metadata as key-value pairs
- **Sections by headings**: each `#`, `##`, `###`, etc. becomes a section with title, level and content
- **Full text**: the content without the front matter

**Source example:**

```markdown
---
project: User API
version: 2.0
priority: high
---

# Functional Requirements

## FR-01: User registration
The system must allow registration with email and password...

## FR-02: Authentication
The system must support OAuth2 and JWT...
```

**Extracted metadata:** `project`, `version`, `priority` (from the front matter)

---

### Plain text

**Extensions:** `.txt`, stdin (`-`), files without extension

**What it extracts:**

- **Sections by paragraphs**: each block separated by blank lines becomes a section
- **Metadata**: `source_type` ("stdin" or "file")

**Ideal for:**

- Quick notes
- Slack dumps
- Raw ideas
- Text copied from any source

**Example:**

```text
We need a real-time notification system.
It must support WebSocket for immediate updates.

Users must be able to configure their preferences:
- Email for important notifications
- Push for real-time updates
- Silence by schedule
```

---

### YAML / JSON

**Extensions:** `.yaml`, `.yml`, `.json` (when not Jira)

**What it extracts:**

- **Sections by top-level keys**: each first-level key becomes a section
- **Text**: YAML representation of the complete content
- **Metadata**: `top_level_keys` (count) or `item_count`

**Source example:**

```yaml
functional_requirements:
  - id: FR-01
    title: User Registration
    description: Users must be able to register...
    priority: high
    acceptance_criteria:
      - Email validation
      - Password strength check

non_functional_requirements:
  - id: NFR-01
    title: API Response Time
    description: All API endpoints must respond in under 200ms
```

---

### PDF

**Extensions:** `.pdf`
**Requires:** `pdfplumber`

**What it extracts:**

- **Text per page**: each page becomes a section
- **Tables**: automatically converted to Markdown format
- **Metadata**: `page_count`

**Limitations:**

- Only works with PDFs that have extractable text
- Scanned PDFs (images only) are not directly supported — use the image parser instead

---

### DOCX

**Extensions:** `.docx`
**Requires:** `python-docx`

**What it extracts:**

- **Paragraphs**: text from each paragraph
- **Sections by headings**: Word headings are converted to structured sections
- **Tables**: converted to Markdown format
- **Document metadata**: author, title, subject, creation date

---

### Jira

**Extensions:** `.json` (auto-detected by structure)

Supports two Jira export formats:

**REST API format** (`{"issues": [...]}`):

```json
{
  "issues": [
    {
      "key": "PROJ-001",
      "fields": {
        "summary": "Implement login",
        "description": "The user must be able to...",
        "priority": {"name": "High"},
        "status": {"name": "To Do"},
        "labels": ["auth", "mvp"],
        "comment": {
          "comments": [...]
        },
        "issuelinks": [...]
      }
    }
  ]
}
```

**List format** (`[{"key": "...", "fields": {...}}, ...]`):

```json
[
  {
    "key": "PROJ-001",
    "fields": {
      "summary": "Implement login",
      "description": "..."
    }
  }
]
```

**What it extracts per issue:**

| Data | Jira field | Limit |
|------|-----------|-------|
| Summary | `fields.summary` | — |
| Description | `fields.description` | — |
| Priority | `fields.priority.name` | — |
| Status | `fields.status.name` | — |
| Labels | `fields.labels` | — |
| Comments | `fields.comment.comments` | Last 5, max 500 chars each |
| Issue links | `fields.issuelinks` | Type, direction, target |

**ADF support:** Comments in Atlassian Document Format (nested JSON) are automatically converted to plain text.

**Extracted relationships:**

- `blocks` / `is blocked by`
- `depends on`
- `relates to`

---

### Confluence

**Extensions:** `.html`, `.htm` (auto-detected by content)
**Requires:** `beautifulsoup4`, `markdownify`

**Detection:** The first 2000 characters of the file are inspected looking for "confluence" or "atlassian".

**What it extracts:**

- **Main content**: looks for the main content div (by id, class, or role)
- **Markdown conversion**: converts HTML to clean Markdown with ATX headings
- **Sections by headings**: from the resulting Markdown
- **Metadata**: title, author, date, description (from `<meta>` tags)

**Content selectors** (in priority order):

1. `div#main-content`
2. `div.wiki-content`
3. `div.confluence-information-macro`
4. `div#content`
5. `div[role=main]`
6. `<body>` (fallback)

---

### Images

**Extensions:** `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`
**Requires:** LLM with vision capability

**What it does:**

1. Encodes the image in base64
2. Sends to the LLM vision with a prompt asking to describe:
   - UI mockups / wireframes
   - Architecture diagrams
   - Visible text in the image
3. Returns the description as text

**Metadata:** `image_format`, `file_size_bytes`

**Note:** By default uses a stub that returns placeholder text. Real vision is activated when the `LLMAdapter` is configured with a model that supports vision.

---

### URLs

**Source:** URLs starting with `http://` or `https://`
**Requires:** `httpx`, `beautifulsoup4`, `markdownify`

**What it does:**

1. Downloads the page via `httpx` (sync, configurable timeout)
2. Converts HTML to clean Markdown via BeautifulSoup4 + markdownify
3. Extracts page title, sections by headings
4. Auto-detects source type by URL patterns

**Type auto-detection:**

| URL pattern | Detected type |
|-------------|--------------|
| `confluence`, `wiki` | confluence |
| `jira`, `atlassian` | jira |
| `github.com` | github |
| Others | webpage |

**Extracted metadata:** `url`, `title`, `source_type`, `section_count`

**Error handling:**

- Timeout -> `ParseError` with suggestion to verify the URL
- HTTP 4xx/5xx -> `ParseError` with the status code
- Connection error -> `ParseError` with suggestion to verify the network

**Example:**

```bash
intake init "API review" -s https://wiki.company.com/rfc/auth
```

---

### Slack

**Extensions:** `.json` (auto-detected by structure)

**Detection:** The JSON file must be a list of objects with `"type": "message"` and a `"ts"` field (Slack timestamp).

**What it extracts:**

- **Messages**: text of each message with user and timestamp
- **Threads**: messages grouped by `thread_ts`
- **Decisions**: messages with specific reactions (thumbsup, white_check_mark) or keywords like "decided", "agreed"
- **Action items**: messages with keywords like "TODO", "action item", "we need"

**Metadata:**

| Field | Description |
|-------|-------------|
| `message_count` | Total messages |
| `thread_count` | Number of threads |
| `decision_count` | Detected decisions |
| `action_item_count` | Detected action items |

**Source example:**

```json
[
  {"type": "message", "user": "U123", "text": "We need to use PostgreSQL", "ts": "1700000000.000"},
  {"type": "message", "user": "U456", "text": "Agreed", "ts": "1700000001.000",
   "reactions": [{"name": "thumbsup", "count": 3}]},
  {"type": "message", "user": "U789", "text": "TODO: configure the database", "ts": "1700000002.000",
   "thread_ts": "1700000000.000"}
]
```

---

### GitHub Issues

**Extensions:** `.json` (auto-detected by structure)

**Detection:** The JSON file must contain objects with a `"number"` field and at least `"html_url"`, `"title"` + `"labels"`, or `"title"` + `"body"`. Supports both a single issue and a list.

**What it extracts:**

- **Issues**: number, title, body, state (open/closed)
- **Labels**: issue labels
- **Assignees**: assigned users
- **Milestones**: associated milestone
- **Comments**: issue comments
- **Cross-references**: detects `#NNN` in text as references to other issues

**Supported formats:**

```json
// List format (multiple issues)
[
  {
    "number": 1,
    "title": "Login bug",
    "body": "Login fails when...",
    "html_url": "https://github.com/org/repo/issues/1",
    "state": "open",
    "labels": [{"name": "bug"}, {"name": "priority:high"}],
    "comments": [
      {"body": "Reproduced in production", "user": {"login": "dev1"}}
    ]
  }
]

// Individual format (single issue)
{
  "number": 42,
  "title": "Feature request",
  "body": "We need...",
  "html_url": "https://github.com/org/repo/issues/42"
}
```

**Metadata:** `source_type` ("github_issues"), `issue_count`, `labels` (comma-separated list), `milestone` (if exists)

**Extracted relationships:** cross-references via `#NNN` in body and comments.

---

## Direct API connectors

In addition to local files, intake can fetch data directly from APIs using scheme URIs. Connectors require configuration in `.intake.yaml` and credentials via environment variables.

### Jira

**Supported URIs:**

| Pattern | What it does |
|---------|-------------|
| `jira://PROJ-123` | Single issue |
| `jira://PROJ-123,PROJ-124,PROJ-125` | Multiple issues |
| `jira://PROJ?jql=sprint%20%3D%2042` | JQL search |
| `jira://PROJ/sprint/42` | All issues in a sprint |

**Dependency:** `atlassian-python-api` (install with `pip install "intake-ai-cli[connectors]"`)

**Example:**

```bash
intake init "Sprint 42 tasks" -s jira://PROJ/sprint/42
```

Issues are downloaded as temporary JSON and parsed with `JiraParser`. Comments are included according to `connectors.jira.include_comments`.

### Confluence

**Supported URIs:**

| Pattern | What it does |
|---------|-------------|
| `confluence://page/123456789` | Page by ID |
| `confluence://SPACE/Page-Title` | Page by space and title |
| `confluence://search?cql=space.key%3DENG` | CQL search |

**Dependency:** `atlassian-python-api`

**Example:**

```bash
intake init "Architecture RFC" -s confluence://ENG/Architecture-RFC-2025
```

Pages are downloaded as temporary HTML and parsed with `ConfluenceParser`.

### GitHub

**Supported URIs:**

| Pattern | What it does |
|---------|-------------|
| `github://org/repo/issues/42` | Single issue |
| `github://org/repo/issues/42,43,44` | Multiple issues |
| `github://org/repo/issues?labels=bug&state=open` | Issues filtered by labels, state, milestone |

**Dependency:** `PyGithub` (install with `pip install "intake-ai-cli[connectors]"`)

**Example:**

```bash
intake init "Bug triage" -s github://org/repo/issues?labels=bug&state=open
```

Issues are downloaded as temporary JSON and parsed with `GithubIssuesParser`. Maximum 50 issues per query, 10 comments per issue.

### Connector configuration

See [Configuration > Connectors](../configuration/#seccion-connectors) for complete configuration fields. Connectors need:

1. Base URL of the instance (Jira/Confluence) or token (GitHub)
2. Credentials via environment variables
3. `intake doctor` verifies that credentials are configured

---

## General limitations

| Limit | Value | Description |
|-------|-------|-------------|
| Maximum size | 50 MB | Files larger than 50 MB are rejected with `FileTooLargeError` |
| Empty files | Error | Empty files or whitespace-only files produce `EmptySourceError` |
| Encoding | UTF-8 + fallback | Tries UTF-8 first, fallback to latin-1 |
| Directories | Error | Passing a directory as a source produces an error |

---

## Adding support for more formats

There are two ways to add a new parser:

### Option 1: Built-in parser (V1 Protocol)

1. Create a file in `src/intake/ingest/` (e.g.: `asana.py`)
2. Implement the methods `can_parse(source: str) -> bool` and `parse(source: str) -> ParsedContent`
3. Register it in `create_default_registry()` and as an entry_point in `pyproject.toml`

### Option 2: External plugin (V2 ParserPlugin)

1. Create a separate Python package
2. Implement the `ParserPlugin` protocol from `intake.plugins.protocols`
3. Register as an entry_point in the `intake.parsers` group in your `pyproject.toml`

The parser will be automatically discovered when the package is installed. See [Plugins](../plugins/) for details.

There is no need to inherit from any base class — just implement the correct interface (structural subtyping via `typing.Protocol`).
