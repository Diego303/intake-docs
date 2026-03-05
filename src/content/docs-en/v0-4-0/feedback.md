---
title: "Feedback Loop"
description: "Feedback cycle: analyze failures, suggest corrections and improve specs automatically."
order: 11
icon: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
---

# Feedback Loop

The feedback loop closes the cycle between verification and implementation. When verification detects failed checks, the `feedback` module analyzes the causes and suggests corrections.

```
VERIFY (checks fail) --> FEEDBACK (LLM analysis) --> Suggestions + Spec amendments
```

---

## Basic usage

```bash
# Analyze failures and view suggestions
intake feedback specs/my-feature/ -p .

# With an existing verification report
intake feedback specs/my-feature/ --verify-report report.json

# Automatically apply amendments to the spec
intake feedback specs/my-feature/ -p . --apply

# Suggestions formatted for a specific agent
intake feedback specs/my-feature/ -p . --agent-format claude-code
```

### What happens internally

1. If `--verify-report` is not provided, it runs `intake verify` first to generate a JSON report
2. Filters checks with `fail` status
3. Loads the spec (requirements, design, tasks) as context
4. Sends failures + context to the LLM for root cause analysis
5. Generates a `FeedbackResult` with structured suggestions
6. Displays the suggestions in the terminal (or formats them for an agent)
7. If `--apply` or `feedback.auto_amend_spec`, applies the proposed amendments to the spec

---

## Output

The command displays in the terminal:

```
Feedback Analysis
=================

CRITICAL  check-api-tests
  Root cause: API endpoint /users/register not implemented yet
  Fix: Implement POST /users/register in src/api/routes.py
  Affected tasks: Task 2, Task 3
  Amendment: Modify requirements.md section FR-001

MAJOR  check-lint
  Root cause: Missing type hints in new modules
  Fix: Add type annotations to src/api/models.py
  Affected tasks: Task 1

Summary: 2 failures analyzed, 1 critical
Estimated effort: medium
Amendments: 1 proposed (use --apply to apply)
```

---

## Severities

| Severity | Meaning |
|----------|---------|
| `critical` | Blocks core functionality. Must be resolved first. |
| `major` | Affects important functionality. High priority. |
| `minor` | Quality improvement. Can be postponed. |

---

## Spec amendments

When the analysis identifies that the spec needs adjustments, it proposes a `SpecAmendment`:

```python
@dataclass
class SpecAmendment:
    target_file: str    # Spec file (e.g.: "requirements.md")
    section: str        # Section (e.g.: "FR-001")
    action: str         # "add", "modify", "remove"
    content: str        # Proposed content
```

### Preview

Without `--apply`, amendments are shown as proposals:

```
Proposed amendments:
  [1] MODIFY requirements.md > FR-001
      Current: "Users must register with email"
      Proposed: "Users must register with email and password validation"

Use --apply to apply these amendments.
```

### Automatic application

With `--apply` or `feedback.auto_amend_spec: true`:

```
Applied 1 amendment(s), skipped 0
  [OK] Modified requirements.md > FR-001
```

Amendments that cannot be applied (section not found, file does not exist) are skipped with an explanatory message.

---

## Agent formats

The `--agent-format` flag formats the suggestions for a specific agent:

| Format | Description |
|--------|-------------|
| `generic` | Generic Markdown (default) |
| `claude-code` | Format optimized for Claude Code |
| `cursor` | Format optimized for Cursor |

```bash
# Save formatted suggestions
intake feedback specs/my-feature/ -p . --agent-format claude-code > feedback.md
```

---

## Configuration

```yaml
feedback:
  auto_amend_spec: false          # Apply amendments automatically (without --apply)
  max_suggestions: 10             # Maximum suggestions per analysis
  include_code_snippets: true     # Include code snippets in the suggestions
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `auto_amend_spec` | bool | `false` | If `true`, applies amendments without needing `--apply`. |
| `max_suggestions` | int | `10` | Limits the number of LLM suggestions. |
| `include_code_snippets` | bool | `true` | Asks the LLM to include code in the suggestions. |

---

## Data model

### FeedbackResult

```python
@dataclass
class FeedbackResult:
    failures: list[FailureAnalysis]     # Analysis for each failed check
    summary: str                        # General summary
    estimated_effort: str               # "small", "medium", "large"
    total_cost: float                   # LLM analysis cost (USD)

    @property
    def amendment_count(self) -> int: ...   # Proposed amendments

    @property
    def critical_count(self) -> int: ...   # Critical failures
```

### FailureAnalysis

```python
@dataclass
class FailureAnalysis:
    check_name: str                         # Name of the failed check
    root_cause: str                         # Identified root cause
    suggestion: str                         # Correction suggestion
    category: str = "implementation_gap"    # Failure category
    severity: str = "major"                 # critical | major | minor
    affected_tasks: list[str] = []          # Affected tasks
    spec_amendment: SpecAmendment | None = None  # Proposed amendment
```

### SpecUpdater

```python
class SpecUpdater:
    def preview(result: FeedbackResult) -> list[AmendmentPreview]: ...
    def apply(result: FeedbackResult) -> ApplyResult: ...
```

- `preview()` returns previews without modifying files
- `apply()` modifies the spec files and returns counts

---

## Programmatic usage

```python
from intake.feedback import FeedbackAnalyzer, SuggestionFormatter, SpecUpdater
from intake.config.schema import IntakeConfig
from intake.llm.adapter import LLMAdapter

# Analyze
analyzer = FeedbackAnalyzer(config=IntakeConfig(), llm=llm_adapter)
result = await analyzer.analyze(
    verify_report=report_json,
    spec_dir="specs/my-feature/",
)

# Format suggestions
formatter = SuggestionFormatter()
markdown = formatter.format(result, agent_format="claude-code")

# Apply amendments
updater = SpecUpdater(spec_dir="specs/my-feature/")
previews = updater.preview(result)
apply_result = updater.apply(result)
```

---

## Costs

The feedback loop makes one LLM call per analysis. The cost depends on the spec size and the number of failed checks:

| Scenario | Approximate cost |
|----------|-----------------|
| Few failures, small spec | ~$0.01-0.03 |
| Many failures, medium spec | ~$0.03-0.10 |
| Large spec + enterprise | ~$0.10-0.20 |

The cost is reported in `FeedbackResult.total_cost`.
