---
title: "Custom Templates"
description: "Customize Jinja2 templates: variables, overrides and examples."
order: 18
icon: "M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM3 9h18M9 21V9"
---

# Custom templates

Guide for customizing the Jinja2 templates that intake uses to generate spec files and exports.

---

## How it works

intake uses 17 Jinja2 templates to generate all its output files. The template system has **two priority levels**:

1. **User templates** (in `.intake/templates/` of the project) — high priority
2. **Built-in templates** (included in the intake package) — fallback

If you place a file with the same name as a built-in template in `.intake/templates/`, your version is automatically used instead of the built-in. This allows you to customize the format of any generated file without modifying intake.

```
my-project/
├── .intake/
│   └── templates/               # Your overrides
│       ├── requirements.md.j2   # Overrides the requirements template
│       └── verify_sh.j2         # Overrides the verify.sh template
└── .intake.yaml
```

---

## Configuration

```yaml
# .intake.yaml
templates:
  user_dir: ".intake/templates"   # User templates directory (default)
  warn_on_override: true          # Log when a built-in template is overridden (default)
```

| Field | Default | Description |
|-------|---------|-------------|
| `user_dir` | `.intake/templates` | Path relative to the project where user templates are searched |
| `warn_on_override` | `true` | Emit `template_override` log when an override is detected |

---

## Available templates

### Spec templates (generation)

Used by `intake init` and `intake add` to generate the 6 spec files:

| Template | Generated file | Description |
|----------|---------------|-------------|
| `requirements.md.j2` | `requirements.md` | Functional and non-functional requirements |
| `design.md.j2` | `design.md` | Technical design: components, files, decisions |
| `tasks.md.j2` | `tasks.md` | Implementation tasks with summary table |
| `acceptance.yaml.j2` | `acceptance.yaml` | Acceptance checks in YAML |
| `context.md.j2` | `context.md` | Project context for AI agents |
| `sources.md.j2` | `sources.md` | Requirement-to-source traceability |

### Export templates

Used by `intake export -f <format>`:

| Template | Exporter | Generated file |
|----------|----------|---------------|
| `claude_md.j2` | claude-code | `## intake Spec` section in `CLAUDE.md` |
| `claude_task.md.j2` | claude-code | Individual `TASK-NNN.md` files |
| `verify_sh.j2` | claude-code, generic | Executable `verify.sh` |
| `cursor_rules.mdc.j2` | cursor | `.cursor/rules/intake-spec.mdc` |
| `kiro_requirements.md.j2` | kiro | `requirements.md` in Kiro format |
| `kiro_design.md.j2` | kiro | `design.md` in Kiro format |
| `kiro_tasks.md.j2` | kiro | `tasks.md` in Kiro format |
| `copilot_instructions.md.j2` | copilot | `.github/copilot-instructions.md` |
| `feedback.md.j2` | feedback | Feedback report |

### CI templates

Used by `intake export-ci`:

| Template | Platform | Generated file |
|----------|----------|---------------|
| `gitlab_ci.yml.j2` | GitLab | `.gitlab-ci.yml` |
| `github_actions.yml.j2` | GitHub | `.github/workflows/intake-verify.yml` |

---

## Available variables per template

### requirements.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `functional_requirements` | `list[dict]` | Functional requirements. Each has: `id`, `title`, `description`, `priority`, `source`, `acceptance_criteria` (list) |
| `non_functional_requirements` | `list[dict]` | Non-functional requirements (same structure) |
| `conflicts` | `list[dict]` | Detected conflicts. Each has: `id`, `description`, `source_a`, `source_b`, `severity`, `recommendation` |
| `open_questions` | `list[dict]` | Open questions. Each has: `id`, `question`, `context`, `source`, `recommendation` |

### design.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `components` | `list[str]` | Architecture component names |
| `files_to_create` | `list[dict]` | Files to create. Each has: `path`, `description` |
| `files_to_modify` | `list[dict]` | Files to modify. Each has: `path`, `description` |
| `tech_decisions` | `list[dict]` | Technical decisions. Each has: `decision`, `justification`, `requirement` |
| `dependencies` | `list[str]` | Project dependencies |

### tasks.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `tasks` | `list[dict]` | Implementation tasks. Each has: `id`, `title`, `description`, `status`, `estimated_minutes`, `dependencies` (list), `files` (list), `checks` (list) |

### acceptance.yaml.j2

| Variable | Type | Description |
|----------|------|-------------|
| `checks` | `list[dict]` | Acceptance checks. Each has: `id`, `name`, `type`, `required`, `tags` (list), `command` (if type=command), `paths` (if type=files_exist), `glob` and `patterns` (if type=pattern_*) |

### context.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `project_name` | `str` | Project name |
| `language` | `str` | Spec language |
| `stack` | `list[str]` | Project tech stack |
| `conventions` | `dict[str, str]` | Project conventions |
| `functional_count` | `int` | Number of functional requirements |
| `non_functional_count` | `int` | Number of non-functional requirements |
| `question_count` | `int` | Open questions |
| `conflict_count` | `int` | Detected conflicts |
| `risk_count` | `int` | Identified risks |
| `risks` | `list[dict]` | Risks. Each has: `id`, `category`, `probability`, `impact`, `description` |
| `component_count` | `int` | Architecture components |
| `files_to_create_count` | `int` | Files to create |
| `files_to_modify_count` | `int` | Files to modify |
| `task_count` | `int` | Total tasks |
| `check_count` | `int` | Total checks |

### sources.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `sources` | `list[dict]` | Sources used. Each has: `source`, `format`, `word_count` |
| `all_requirements` | `list[dict]` | All requirements with `id`, `title`, `source` |
| `conflicts` | `list[dict]` | Conflicts with sources |

### claude_md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `spec_name` | `str` | Spec name |
| `context_summary` | `str` | Project context summary |
| `requirements_count` | `int` | Number of requirements |
| `design_summary` | `str` | Design summary |
| `tasks` | `list[dict]` | Tasks with `id`, `title`, `status` |
| `acceptance_count` | `int` | Number of checks |
| `spec_files` | `list[str]` | Spec file names |

### claude_task.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `task` | `dict` | Individual task with `id`, `title`, `status`, `description`, `checks` (list) |
| `context_summary` | `str` | Context summary |

### verify_sh.j2

| Variable | Type | Description |
|----------|------|-------------|
| `spec_name` | `str` | Spec name |
| `checks` | `list[dict]` | Command-type checks. Each has: `name`, `command` |

### cursor_rules.mdc.j2

| Variable | Type | Description |
|----------|------|-------------|
| `spec_name` | `str` | Spec name |
| `context_summary` | `str` | Context summary |
| `requirements_count` | `int` | Number of requirements |
| `requirements_summary` | `str` | Requirements summary |
| `design_summary` | `str` | Design summary |
| `tasks` | `list[dict]` | Tasks with `id`, `title`, `status`, `description` |
| `acceptance_checks` | `list[dict]` | Checks with `name`, `type`, `command`, `pattern` |

### kiro_requirements.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `spec_name` | `str` | Spec name |
| `requirements` | `list[dict]` | Requirements with `id`, `title`, `description`, `acceptance_criteria` (list) |

### kiro_design.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `spec_name` | `str` | Spec name |
| `design_content` | `str` | Design content |

### kiro_tasks.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `spec_name` | `str` | Spec name |
| `tasks` | `list[dict]` | Tasks with `id`, `title`, `status`, `description`, `checks` (list) |

### copilot_instructions.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `spec_name` | `str` | Spec name |
| `context_summary` | `str` | Context summary |
| `requirements_count` | `int` | Number of requirements |
| `requirements_summary` | `str` | Requirements summary |
| `design_summary` | `str` | Design summary |
| `tasks` | `list[dict]` | Tasks with `id`, `title`, `status`, `description` |
| `acceptance_checks` | `list[dict]` | Checks with `name`, `command`, `pattern` |

### feedback.md.j2

| Variable | Type | Description |
|----------|------|-------------|
| `result` | `dict` | Analysis result. Has: `failures` (list), `estimated_effort`, `summary` |
| `result.failures[].check_name` | `str` | Failed check name |
| `result.failures[].severity` | `str` | Severity |
| `result.failures[].category` | `str` | Category |
| `result.failures[].root_cause` | `str` | Root cause |
| `result.failures[].suggestion` | `str` | Fix suggestion |
| `result.failures[].affected_tasks` | `list[str]` | Affected tasks |
| `result.failures[].spec_amendment` | `dict` | Suggested amendment: `target_file`, `section`, `action`, `content` |
| `agent_format` | `str` | Agent format (`claude-code`, `cursor`, etc.) |

### gitlab_ci.yml.j2 / github_actions.yml.j2

| Variable | Type | Description |
|----------|------|-------------|
| `spec_dir` | `str` | Path to the spec directory |

---

## Jinja2 syntax

Templates use [Jinja2](https://jinja.palletsprojects.com/) with these options enabled:

- **`trim_blocks`**: the first newline after a `{% %}` block is removed
- **`lstrip_blocks`**: whitespace at the beginning of a line before `{% %}` is removed
- **`keep_trailing_newline`**: the final newline of the file is preserved

### Quick reference

```jinja2
{# Comment #}

{# Variable #}
{{ variable }}

{# Loop #}
{% for item in items %}
{{ item.name }}
{% endfor %}

{# Conditional #}
{% if condition %}
content
{% endif %}

{# Filter: default value #}
{{ variable | default("fallback") }}

{# Filter: list join #}
{{ items | join(", ") }}

{# Filter: length #}
{{ items | length }}

{# Filter: lowercase #}
{{ text | lower }}
```

---

## Examples

### Customize the requirements format

To add an "Owner" field to each requirement:

```bash
mkdir -p .intake/templates
```

Create `.intake/templates/requirements.md.j2`:

```jinja2
# Project Requirements

{% for req in functional_requirements %}
## {{ req.id }}: {{ req.title }}

{{ req.description }}

| Field | Value |
|-------|-------|
| Priority | {{ req.priority }} |
| Source | {{ req.source }} |
| Owner | _(to be assigned)_ |

**Acceptance criteria:**
{% for ac in req.acceptance_criteria %}
- [ ] {{ ac }}
{% endfor %}

{% endfor %}
```

### Customize verify.sh for a specific environment

To add environment setup before the checks:

Create `.intake/templates/verify_sh.j2`:

```jinja2
#!/usr/bin/env bash
# Verification script — {{ spec_name }}
set -euo pipefail

PROJECT_DIR="${1:-.}"
PASSED=0
FAILED=0
TOTAL=0

# Environment setup (customized)
source "${PROJECT_DIR}/.env.test" 2>/dev/null || true
export DATABASE_URL="${DATABASE_URL:-sqlite:///test.db}"

check() {
    local name="$1"
    local cmd="$2"
    TOTAL=$((TOTAL + 1))
    echo -n "  [$TOTAL] $name ... "
    if (cd "$PROJECT_DIR" && eval "$cmd") > /dev/null 2>&1; then
        echo "PASS"
        PASSED=$((PASSED + 1))
    else
        echo "FAIL"
        FAILED=$((FAILED + 1))
    fi
}

echo "=== Verification: {{ spec_name }} ==="
echo ""

{% for check in checks %}
check '{{ check.name }}' '{{ check.command }}'
{% endfor %}

echo ""
echo "=== Results: $PASSED passed, $FAILED failed (of $TOTAL) ==="

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
exit 0
```

### Customize the generated CI configuration

To add caching and notifications to GitHub Actions:

Create `.intake/templates/github_actions.yml.j2`:

```jinja2
name: intake-verify

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: {% raw %}${{ runner.os }}{% endraw %}-pip-intake
      - run: pip install intake-ai-cli --quiet
      - run: intake validate {{ spec_dir }} --strict
      - run: intake verify {{ spec_dir }} -p . --format junit -o report.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: intake-report
          path: report.xml
```

### Add corporate branding to specs

To have all specs include a corporate header, override `context.md.j2`:

```jinja2
# Project Context

> Generated by intake for ACME Corp. Confidential.

| Field | Value |
|-------|-------|
| Project | {{ project_name }} |
| Language | {{ language }} |
{% if stack %}
| Stack | {{ stack | join(", ") }} |
{% endif %}
| Classification | Internal Use Only |

{% if conventions %}
## Conventions

{% for key, value in conventions.items() %}
- **{{ key }}:** {{ value }}
{% endfor %}
{% endif %}

## Metrics

| Category | Count |
|----------|-------|
| Functional requirements | {{ functional_count }} |
| Non-functional requirements | {{ non_functional_count }} |
| Open questions | {{ question_count }} |
| Risks | {{ risk_count }} |
| Tasks | {{ task_count }} |
| Checks | {{ check_count }} |

{% if risks %}
## Key Risks

{% for risk in risks %}
- **{{ risk.id }}** [{{ risk.category }}] P={{ risk.probability }} I={{ risk.impact }}: {{ risk.description }}
{% endfor %}
{% endif %}
```

---

## List active templates

The `TemplateLoader` can list all available templates and their origin:

```python
from intake.templates.loader import TemplateLoader

loader = TemplateLoader(project_dir=".")
for name, source in loader.list_templates().items():
    print(f"  {name}: {source}")
```

Possible `source` values:

| Value | Meaning |
|-------|---------|
| `builtin` | Template included in intake |
| `user` | User template (does not override a built-in) |
| `user (override)` | User template that overrides a built-in |

---

## Best practices

1. **Start from the built-in.** Copy the original template from `src/intake/templates/` before modifying it. This way you don't lose variables or structure.

2. **Test your changes.** After creating an override, run `intake init` or `intake export` and review the output.

3. **Version your templates.** Commit `.intake/templates/` to git so the entire team uses the same templates.

4. **Maintain compatibility.** If you update intake, check whether built-in templates changed and update your overrides if necessary.

5. **Use `warn_on_override: true`.** The log notifies you when a built-in template is being overridden, useful for detecting forgotten overrides.

6. **Don't override everything.** Only override the templates you need to change. The rest are automatically loaded from the built-in.
