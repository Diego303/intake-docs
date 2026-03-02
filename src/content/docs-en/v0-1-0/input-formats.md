---
title: "Input Formats"
description: "The 8 supported parsers, what they extract and how they auto-detect."
order: 6
icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"
---

# Input Formats

intake supports 8 input formats through specialized parsers. The format is auto-detected by file extension and content.

---

## Summary table

| Format | Parser | Extensions | Dependency | What it extracts |
|--------|--------|------------|------------|------------------|
| Markdown | `MarkdownParser` | `.md`, `.markdown` | -- | YAML front matter, sections by headings |
| Plain text | `PlaintextParser` | `.txt`, stdin (`-`) | -- | Paragraphs as sections |
| YAML / JSON | `YamlInputParser` | `.yaml`, `.yml`, `.json` | -- | Top-level keys as sections |
| PDF | `PdfParser` | `.pdf` | pdfplumber | Text by page, tables as Markdown |
| DOCX | `DocxParser` | `.docx` | python-docx | Paragraphs, tables, metadata, sections by headings |
| Jira | `JiraParser` | `.json` (auto-detected) | -- | Issues, comments, links, labels, priority |
| Confluence | `ConfluenceParser` | `.html`, `.htm` (auto-detected) | bs4, markdownify | Clean content as Markdown |
| Images | `ImageParser` | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` | LLM vision | Description of visual content |

---

## Format auto-detection

The registry detects the format automatically following this order:

1. **Stdin** (`-`): always treated as `plaintext`
2. **File extension**: direct mapping (`.md` -> markdown, `.pdf` -> pdf, etc.)
3. **JSON subtype**: if the extension is `.json`:
   - If it has key `"issues"` or is a list with objects that have `"key"` + `"fields"` -> `jira`
   - Otherwise -> `yaml` (treated as structured data)
4. **HTML subtype**: if the extension is `.html` or `.htm`:
   - If the first 2000 characters contain "confluence" or "atlassian" -> `confluence`
   - Otherwise -> fallback to `plaintext`
5. **Fallback**: if there is no parser for the detected format -> `plaintext`

---

## Parsers in detail

### Markdown

**Extensions:** `.md`, `.markdown`

**What it extracts:**

- **YAML front matter**: if the file starts with `---`, it extracts the metadata as key-value pairs
- **Sections by headings**: each `#`, `##`, `###`, etc. becomes a section with title, level, and content
- **Full text**: the content without the front matter

**Source example:**

```markdown
---
project: Users API
version: 2.0
priority: high
---

# Functional Requirements

## FR-01: User Registration
The system must allow registration with email and password...

## FR-02: Authentication
The system must support OAuth2 and JWT...
```

**Extracted metadata:** `project`, `version`, `priority` (from front matter)

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
- Mute by schedule
```

---

### YAML / JSON

**Extensions:** `.yaml`, `.yml`, `.json` (when not Jira)

**What it extracts:**

- **Sections by top-level keys**: each first-level key becomes a section
- **Text**: YAML representation of the full content
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

- **Text by page**: each page becomes a section
- **Tables**: automatically converted to Markdown format
- **Metadata**: `page_count`

**Limitations:**

- Only works with PDFs that have extractable text
- Scanned PDFs (images only) are not directly supported -- use the image parser instead

---

### DOCX

**Extensions:** `.docx`
**Requires:** `python-docx`

**What it extracts:**

- **Paragraphs**: text from each paragraph
- **Sections by headings**: Word headings are converted into structured sections
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
|------|------------|-------|
| Summary | `fields.summary` | -- |
| Description | `fields.description` | -- |
| Priority | `fields.priority.name` | -- |
| Status | `fields.status.name` | -- |
| Labels | `fields.labels` | -- |
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

**Content selectors** (in order of priority):

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
2. Sends it to the vision LLM with a prompt asking to describe:
   - UI mockups / wireframes
   - Architecture diagrams
   - Visible text in the image
3. Returns the description as text

**Metadata:** `image_format`, `file_size_bytes`

**Note:** By default it uses a stub that returns placeholder text. Real vision is activated when the `LLMAdapter` is configured with a model that supports vision.

---

## General limitations

| Limit | Value | Description |
|-------|-------|-------------|
| Maximum size | 50 MB | Files larger than 50 MB are rejected with `FileTooLargeError` |
| Empty files | Error | Empty files or files with only whitespace produce `EmptySourceError` |
| Encoding | UTF-8 + fallback | Tries UTF-8 first, fallback to latin-1 |
| Directories | Error | Passing a directory as a source produces an error |

---

## Adding support for more formats

intake uses the `Protocol` pattern for parsers. To add a new parser:

1. Create a file in `src/intake/ingest/` (e.g.: `asana.py`)
2. Implement the methods `can_parse(source: str) -> bool` and `parse(source: str) -> ParsedContent`
3. Register it in `registry.py` inside `create_default_registry()`

There is no need to inherit from any base class -- just implement the correct interface.
