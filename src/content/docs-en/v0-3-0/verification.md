---
title: "Verification"
description: "Acceptance checks engine, reporters and CI/CD."
order: 8
icon: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"
---

# Verification

The verification engine runs acceptance checks defined in `acceptance.yaml` against the project directory. It answers the question: "does the implementation comply with the spec?"

---

## Command

```bash
intake verify <SPEC_DIR> -p <PROJECT_DIR> [options]
```

```bash
# Verify with terminal report
intake verify specs/user-api/ -p .

# Only checks with tag "api"
intake verify specs/user-api/ -p . -t api -t security

# JUnit format for CI
intake verify specs/user-api/ -p . -f junit > test-results.xml

# Stop at the first failure
intake verify specs/user-api/ -p . --fail-fast
```

---

## acceptance.yaml structure

```yaml
checks:
  - id: check-01
    name: "Unit tests pass"
    type: command
    command: "python -m pytest tests/ -q"
    required: true
    tags: [tests, ci]

  - id: check-02
    name: "Routes file exists"
    type: files_exist
    paths:
      - src/routes.py
      - src/models.py
    required: true
    tags: [structure]

  - id: check-03
    name: "Endpoints have authentication"
    type: pattern_present
    glob: "src/**/*.py"
    patterns:
      - "auth_required|@login_required|verify_token"
    required: true
    tags: [security]

  - id: check-04
    name: "No hardcoded passwords"
    type: pattern_absent
    glob: "src/**/*.py"
    patterns:
      - "password\\s*=\\s*['\"]\\w+"
    required: true
    tags: [security]
```

---

## The 4 check types

### command

Runs a shell command and verifies that the exit code is 0.

```yaml
- id: check-tests
  name: "Tests pass"
  type: command
  command: "python -m pytest tests/ -q"
  required: true
```

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Shell command to execute |

The command runs in the project directory (`--project-dir`). Stdout and stderr are captured (truncated to 1000 and 500 characters respectively).

**Timeout:** configurable via `verification.timeout_per_check` (default: 120 seconds).

### files_exist

Verifies that all listed files exist.

```yaml
- id: check-structure
  name: "Main files exist"
  type: files_exist
  paths:
    - src/main.py
    - src/models.py
    - tests/test_main.py
  required: true
```

| Field | Type | Description |
|-------|------|-------------|
| `paths` | list[string] | Paths relative to the project directory |

Fails if **any** of the paths does not exist.

### pattern_present

Verifies that regex patterns exist in files matching a glob.

```yaml
- id: check-logging
  name: "Modules have logging"
  type: pattern_present
  glob: "src/**/*.py"
  patterns:
    - "import logging|import structlog"
  required: false
  tags: [quality]
```

| Field | Type | Description |
|-------|------|-------------|
| `glob` | string | Glob pattern to find files (e.g.: `src/**/*.py`) |
| `patterns` | list[string] | Regex patterns to search for (case-insensitive) |

Fails if **any** pattern is not found in **any** file matching the glob. In other words, it verifies that ALL patterns are present in ALL files.

### pattern_absent

Verifies that regex patterns do NOT exist in files matching a glob.

```yaml
- id: check-no-secrets
  name: "No hardcoded secrets"
  type: pattern_absent
  glob: "src/**/*.py"
  patterns:
    - "API_KEY\\s*=\\s*['\"]sk-"
    - "password\\s*=\\s*['\"]\\w{8,}"
  required: true
  tags: [security]
```

| Field | Type | Description |
|-------|------|-------------|
| `glob` | string | Glob pattern to find files |
| `patterns` | list[string] | Regex patterns that must NOT exist (case-insensitive) |

Fails if **any** pattern is found in **any** file.

---

## Common fields for each check

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | `"unknown"` | Unique check identifier |
| `name` | string | same as `id` | Descriptive name |
| `type` | string | `"command"` | Check type: `command`, `files_exist`, `pattern_present`, `pattern_absent` |
| `required` | bool | `true` | Whether it is mandatory. Non-required checks can fail without affecting the exit code. |
| `tags` | list[string] | `[]` | Tags for filtering with `--tags` |

---

## Tags and filtering

Checks can have tags to run subsets:

```yaml
checks:
  - id: check-tests
    tags: [tests, ci]
    ...
  - id: check-security
    tags: [security, ci]
    ...
  - id: check-docs
    tags: [docs]
    ...
```

```bash
# Only checks with tag "ci"
intake verify specs/my-spec/ -p . -t ci

# Checks with tag "security" OR "tests"
intake verify specs/my-spec/ -p . -t security -t tests
```

A check runs if it has **at least one** of the specified tags.

---

## Fail-fast

With `--fail-fast`, verification stops at the first **required** check that fails:

```bash
intake verify specs/my-spec/ -p . --fail-fast
```

Checks that were not executed are counted as "skipped" in the report.

---

## Report formats

### Terminal (default)

Rich table with colors:

```
                    Verification Report: my-spec
┏━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━┳━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━┓
┃ ID        ┃ Check             ┃ Status ┃ Required ┃ Time   ┃
┡━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━╇━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━┩
│ check-01  │ Tests pass        │ PASS   │ Yes      │ 1.2s   │
│ check-02  │ Files exist       │ PASS   │ Yes      │ 0.0s   │
│ check-03  │ Auth present      │ FAIL   │ Yes      │ 0.1s   │
└───────────┴───────────────────┴────────┴──────────┴────────┘
  Passed: 2  Failed: 1  Skipped: 0
```

### JSON

```bash
intake verify specs/my-spec/ -p . -f json
```

```json
{
  "spec_name": "my-spec",
  "total_checks": 3,
  "passed": 2,
  "failed": 1,
  "skipped": 0,
  "all_required_passed": false,
  "results": [
    {
      "id": "check-01",
      "name": "Tests pass",
      "passed": true,
      "required": true,
      "output": "3 passed in 1.2s",
      "duration_ms": 1200
    }
  ]
}
```

### JUnit XML

```bash
intake verify specs/my-spec/ -p . -f junit > test-results.xml
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="my-spec" tests="3" failures="1" skipped="0">
    <testcase name="Tests pass" classname="check-01" time="1.200"/>
    <testcase name="Files exist" classname="check-02" time="0.001"/>
    <testcase name="Auth present" classname="check-03" time="0.100">
      <failure message="Pattern 'auth_required' not found in src/routes.py"/>
    </testcase>
  </testsuite>
</testsuites>
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Verify Spec Compliance
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install intake
        run: pip install intake-ai-cli

      - name: Run acceptance checks
        run: intake verify specs/my-feature/ -p . -f junit > test-results.xml

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results.xml
```

### verify.sh script (via generic export)

If you use the `generic` exporter, a standalone `verify.sh` is generated that does not require intake to be installed:

```bash
# Export
intake export specs/my-feature/ -f generic -o output/

# Run directly
./output/verify.sh /path/to/project
```

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All **required** checks passed (optional checks may have failed) |
| `1` | At least one **required** check failed |
| `2` | Execution error (spec not found, invalid YAML, etc.) |
