---
title: "Troubleshooting"
description: "Common errors, diagnostics and FAQ."
order: 19
icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"
---

# Troubleshooting

Guide for diagnosing and resolving common problems with intake.

---

## intake doctor

The first step for any problem is to run `intake doctor`:

```bash
intake doctor
```

This verifies:

| Check | What it verifies | Auto-fixable |
|-------|-----------------|--------------|
| Python version | Python >= 3.12 | No |
| LLM API key | Environment variable configured | No |
| pdfplumber | Package installed | Yes |
| python-docx | Package installed | Yes |
| beautifulsoup4 | Package installed | Yes |
| markdownify | Package installed | Yes |
| litellm | Package installed | Yes |
| jinja2 | Package installed | Yes |
| mcp package | `mcp` package installed (if mcp configured) | Yes |
| watchfiles | `watchfiles` package installed (if watch configured) | Yes |
| Config file | Valid `.intake.yaml` | Yes |
| Jira credentials | `JIRA_API_TOKEN` + `JIRA_EMAIL` (if jira configured) | No |
| Confluence credentials | `CONFLUENCE_API_TOKEN` + `CONFLUENCE_EMAIL` (if confluence configured) | No |
| GitHub token | `GITHUB_TOKEN` (if github configured) | No |

### Auto-fix

To automatically fix problems that can be resolved:

```bash
intake doctor --fix
```

This:

- **Installs missing packages** using `pip3.12`, `pip3`, or `pip` (in that order of preference)
- **Creates `.intake.yaml`** if it doesn't exist, with basic configuration

---

## Common errors

### API key not configured

**Error:**
```
LLM error: Environment variable ANTHROPIC_API_KEY is not set.
  Hint: Set it with: export ANTHROPIC_API_KEY=your-api-key
```

**Solution:**

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# OpenAI
export OPENAI_API_KEY=sk-your-key-here
```

If you use another provider, configure `llm.api_key_env` in `.intake.yaml`:

```yaml
llm:
  model: gemini/gemini-pro
  api_key_env: GEMINI_API_KEY
```

Verify with:
```bash
intake doctor
```

---

### File not found

**Error:**
```
Failed to parse 'reqs.md': File not found: reqs.md
  Hint: Check that the file exists and the path is correct.
```

**Solution:** Verify that the file path is correct. Use relative paths from the current directory or absolute paths:

```bash
# Relative
intake init "Feature" -s ./docs/reqs.md

# Absolute
intake init "Feature" -s /home/user/project/docs/reqs.md
```

---

### Empty file

**Error:**
```
Failed to parse 'empty.md': File is empty or contains only whitespace
  Hint: Provide a file with actual content.
```

**Solution:** The file exists but has no useful content. Add content to the file before using it as a source.

---

### File too large

**Error:**
```
Failed to parse 'huge.pdf': File size 52428800 bytes exceeds limit of 50 MB
  Hint: Split the file into smaller parts or extract the relevant sections.
```

**Solution:** The limit is 50 MB. Options:

- Split the file into smaller parts
- Extract only the relevant sections
- If it's a PDF, extract the needed pages with another tool

---

### URL not accessible

**Error:**
```
Failed to parse 'https://example.com/page': Connection error: ...
  Hint: Check that the URL is correct and accessible.
```

**Solution:** intake could not download the page. Verify:

1. That the URL is correct and accessible from your network
2. That it does not require authentication (intake does not support URLs with login)
3. That there is no firewall or proxy blocking the connection

If the page requires authentication, download the content manually and use the local file:

```bash
# Instead of
intake init "Feature" -s https://internal-wiki.com/page  # fails if login required

# Download manually and use the file
curl -o page.html https://internal-wiki.com/page
intake init "Feature" -s page.html
```

---

### Connector cannot connect

**Error:**
```
Connector error: Failed to connect to Jira at https://company.atlassian.net
  Hint: Check connectors.jira.url and credentials in .intake.yaml
```

**Solution:**

1. Verify that the base URL is correct in `.intake.yaml`:
   ```yaml
   connectors:
     jira:
       url: "https://company.atlassian.net"
   ```

2. Verify that the environment variables are configured:
   ```bash
   echo $JIRA_API_TOKEN    # must have a value
   echo $JIRA_EMAIL        # must have a value
   ```

3. Run `intake doctor` to validate connector credentials.

4. If the API requires VPN or firewall, verify the network connection.

### Connector not available (missing dependency)

**Error:**
```
Connector 'jira' requires atlassian-python-api.
  Hint: Install with: pip install "intake-ai-cli[connectors]"
```

**Solution:**

```bash
# Install connector dependencies
pip install "intake-ai-cli[connectors]"
```

Optional packages for connectors:

| Connector | Package | Installation |
|-----------|---------|-------------|
| Jira | atlassian-python-api | `pip install atlassian-python-api` |
| Confluence | atlassian-python-api | `pip install atlassian-python-api` |
| GitHub | PyGithub | `pip install PyGithub` |

**Alternative without installing connectors:** Export the data manually:

1. **Jira**: Export issues as JSON from the web interface
2. **Confluence**: Export the page as HTML
3. **GitHub**: Use `gh api repos/org/repo/issues > issues.json`

---

### Unsupported format

**Error:**
```
Unsupported format: 'xlsx' for source 'data.xlsx'
```

**Solution:** intake does not support Excel files directly. Options:

- Export to CSV or JSON from Excel
- Copy the content to a text or Markdown file
- Convert to another supported format (see [Input Formats](../input-formats/))

---

### Budget exceeded

**Error:**
```
LLM error: Accumulated cost $0.5123 exceeds limit of $0.50
  Hint: Increase llm.max_cost_per_spec in your config, or use a cheaper model.
```

**Solution:** The analysis exceeded the configured budget. Options:

1. **Increase the limit:**
   ```yaml
   llm:
     max_cost_per_spec: 1.00
   ```

2. **Use a cheaper model:**
   ```bash
   intake init "Feature" -s reqs.md -m gpt-3.5-turbo
   ```

3. **Disable risk assessment** (saves ~30%):
   ```yaml
   spec:
     risk_assessment: false
   ```

4. **Use minimal preset:**
   ```bash
   intake init "Feature" -s reqs.md --preset minimal
   ```

---

### LLM does not return valid JSON

**Error:**
```
LLM error: LLM did not return valid JSON after 3 attempts
  Hint: Try a different model or simplify the prompt.
```

**Solution:** The model could not generate valid JSON after the configured retries. Options:

1. **Try a different model** -- some models are better at generating structured JSON:
   ```bash
   intake init "Feature" -s reqs.md -m claude-sonnet-4
   ```

2. **Increase retries:**
   ```yaml
   llm:
     max_retries: 5
   ```

3. **Reduce the temperature** for more deterministic output:
   ```yaml
   llm:
     temperature: 0.1
   ```

4. **Simplify the sources** -- very long or complex texts can confuse the model.

---

### LLM timeout

**Error:**
```
LLM failed after 3 attempts: Request timed out
  Hint: Check your API key, network connection, and model name.
```

**Solution:**

1. **Verify internet connection**
2. **Increase the timeout:**
   ```yaml
   llm:
     timeout: 300  # 5 minutes
   ```
3. **Verify the model exists** -- incorrect names cause timeout:
   ```yaml
   # Correct
   llm:
     model: claude-sonnet-4

   # Incorrect -- will cause timeout or error
   llm:
     model: claude-sonet-4  # typo
   ```

---

### Encoding error

If a file has non-UTF-8 encoding, intake tries to read it with a fallback to latin-1. If it still fails:

**Solution:**

1. Convert the file to UTF-8:
   ```bash
   iconv -f ISO-8859-1 -t UTF-8 file.txt > file_utf8.txt
   ```

2. Or open it in an editor and save as UTF-8.

---

### PDF without extractable text

**Error:**
```
Failed to parse 'scanned.pdf': PDF contains only scanned images, no extractable text
  Hint: Use an image source instead.
```

**Solution:** The PDF contains scanned images, not digital text. Options:

1. Use external OCR to extract the text first
2. Export the pages as images and use the image parser:
   ```bash
   intake init "Feature" -s page1.png -s page2.png
   ```

---

### Missing package for parser

**Error:**
```
PDF parsing requires pdfplumber.
  Hint: Install it with: pip install pdfplumber
```

**Solution:**

```bash
# Install manually
pip install pdfplumber

# Or use doctor --fix to install everything missing
intake doctor --fix
```

Optional packages per parser:

| Parser | Package | Installation |
|--------|---------|-------------|
| PDF | pdfplumber | `pip install pdfplumber` |
| DOCX | python-docx | `pip install python-docx` |
| Confluence | beautifulsoup4, markdownify | `pip install beautifulsoup4 markdownify` |
| URLs | httpx, beautifulsoup4, markdownify | `pip install httpx beautifulsoup4 markdownify` |

---

### Plugin fails to load

**Visible with:**
```bash
intake plugins list -v   # The "Error" column shows details
intake plugins check     # Reports FAIL with details
```

**Solution:**

1. **External plugin not installed**: verify the package is installed in the same environment:
   ```bash
   pip list | grep my-plugin
   ```

2. **Entry point misconfigured**: verify that `pyproject.toml` has the correct entry_point:
   ```toml
   [project.entry-points."intake.parsers"]
   my-format = "my_plugin.parser:MyParser"
   ```

3. **Import error**: the plugin module fails to import. Verify the plugin's dependencies.

4. **Reinstall**: sometimes entry_points don't update without reinstalling:
   ```bash
   pip install -e .
   ```

---

### MCP server won't start

**Error:**
```
ImportError: MCP server requires the mcp package. Install with: pip install intake-ai-cli[mcp]
```

**Solution:**

```bash
pip install "intake-ai-cli[mcp]"
```

If using SSE transport and `starlette` or `uvicorn` is missing:

```bash
pip install starlette uvicorn
```

**SSE port occupied:**
```
Error: [Errno 98] Address already in use
```

Change the port:

```bash
intake mcp serve --transport sse --port 9090
```

Or in `.intake.yaml`:

```yaml
mcp:
  sse_port: 9090
```

---

### Watch mode won't start

**Error:**
```
ImportError: Watch mode requires the watchfiles package. Install with: pip install intake-ai-cli[watch]
```

**Solution:**

```bash
pip install "intake-ai-cli[watch]"
```

**Spec directory not found:**
```
Watch error: Spec directory not found: specs/my-feature
  Hint: Run 'intake init' first to generate a spec.
```

Verify that the spec directory exists and contains `acceptance.yaml`.

**acceptance.yaml not found:**
```
Watch error: acceptance.yaml not found in specs/my-feature
  Hint: Run 'intake init' to generate acceptance.yaml.
```

Regenerate the spec with `intake init` or verify that the spec was generated in `standard` or `enterprise` mode (the `quick` mode does not generate `acceptance.yaml`).

---

### Invalid acceptance.yaml

**Error:**
```
Verification failed: Invalid YAML in acceptance.yaml: ...
  Hint: Check acceptance.yaml syntax.
```

**Solution:** The `acceptance.yaml` file has YAML syntax errors. Check:

- Correct indentation (use spaces, not tabs)
- Strings with special characters in quotes
- Lists with `-` followed by a space

```yaml
# Correct
checks:
  - id: check-01
    name: "Tests pass"
    type: command
    command: "python -m pytest tests/ -q"

# Incorrect -- missing space after -
checks:
  -id: check-01
```

---

## FAQ

### Do I need internet to use intake?

Only for `intake init` and `intake add` (which require LLM calls). Everything else works offline:

- `intake verify` -- runs checks locally
- `intake export` -- generates files locally
- `intake show` / `intake list` -- reads local files
- `intake diff` -- compares local files
- `intake doctor` -- verifies the local environment
- `intake mcp serve` -- runs the MCP server locally
- `intake watch` -- monitors files and re-verifies locally

### Can I use local models?

Yes. intake uses LiteLLM, which supports local models via Ollama, vLLM, and others:

```yaml
llm:
  model: ollama/llama3
  api_key_env: DUMMY_KEY  # Ollama does not need a key
```

```bash
export DUMMY_KEY=not-needed
intake init "Feature" -s reqs.md
```

### What language is the spec generated in?

English by default (`en`). It is configured with `--lang` or `project.language`:

```bash
intake init "Feature" -s reqs.md --lang es
```

```yaml
project:
  language: es
```

The language affects the content generated by the LLM, not the file structure.

### How much does it cost to generate a spec?

It depends on the model, the amount of text, and the enabled options:

| Scenario | Approximate cost |
|----------|-----------------|
| Small source, minimal preset, Claude Sonnet | ~$0.02-0.05 |
| Medium source, standard preset, Claude Sonnet | ~$0.05-0.15 |
| Multiple sources, enterprise preset, Claude Sonnet | ~$0.15-0.50 |
| GPT-3.5 instead of Claude | ~50-70% less |

Use `intake show` to see the actual cost after generating.

### Can I edit the generated specs?

Yes. Specs are normal Markdown and YAML files. You can edit them manually after generating. However, if you use `intake add --regenerate`, your manual edits will be overwritten.

### How do I update a spec with new requirements?

```bash
# Add a new source
intake add specs/my-feature/ -s new-reqs.md

# Or regenerate everything with the new source
intake add specs/my-feature/ -s new-reqs.md --regenerate
```

### Can I use intake in CI/CD?

Yes. See the [CI/CD integration](../verification/#ci-cd-integration) section in the verification guide.

### Should spec files be committed to git?

Yes, it is recommended. Specs are text files that benefit from versioning. See [Spec versioning](../best-practices/#spec-versioning).

### What is quick / standard / enterprise mode?

intake auto-detects the complexity of your sources and selects a generation mode:

- **quick** (<500 words, 1 simple source): only generates `context.md` + `tasks.md`
- **standard** (default): generates all 6 complete spec files
- **enterprise** (4+ sources or >5000 words): all files + detailed risks

You can force a mode with `--mode`:

```bash
intake init "Quick fix" -s bug.txt --mode quick
```

### How do I install external plugins?

Plugins are automatically discovered when installing packages that register entry_points in the `intake.parsers`, `intake.exporters`, or `intake.connectors` groups:

```bash
pip install my-intake-plugin
intake plugins list   # the new plugin should appear
```

See [Plugins](../plugins/) for more details.

### How do I view task progress?

```bash
intake task list specs/my-feature/
intake task update specs/my-feature/ 1 done --note "Completed"
```
