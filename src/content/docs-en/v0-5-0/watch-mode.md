---
title: "Watch Mode"
description: "Watch mode: continuous file monitoring and automatic re-verification."
order: 17
icon: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8zm11 3a3 3 0 100-6 3 3 0 000 6z"
---
# Watch Mode

Watch mode monitors project files and automatically re-runs verification checks when changes are detected. It uses `watchfiles` (Rust-based, efficient) for file observation with configurable debounce.

```
[File change] --> [Ignored filtering] --> [Re-verification] --> [Result in terminal]
                          ^                                           |
                          |___________________________________________|
```

---

## Installation

Watch mode requires the optional `watchfiles` dependency:

```bash
pip install intake-ai-cli[watch]
```

If you try to run `intake watch` without having `watchfiles` installed, you will get an error message with the installation instruction.

---

## CLI command

```bash
intake watch <SPEC_DIR> [OPTIONS]
```

### Argument

| Argument | Description |
|----------|-------------|
| `SPEC_DIR` | Path to the spec directory (must exist). Contains `acceptance.yaml`. |

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--project-dir` / `-p` | `.` | Project directory to monitor. |
| `--tags` / `-t` | (none) | Filter checks by tags. Repeatable for multiple tags. |
| `--debounce` | `2.0` | Seconds to wait after the last change before re-verifying. |
| `--verbose` / `-v` | `false` | Detailed output (enables debug logging). |

### Basic examples

```bash
# Basic watch
intake watch specs/auth-system/ -p .

# With tag filtering
intake watch specs/api/ -p . -t tests -t security

# With custom debounce (5 seconds)
intake watch specs/api/ -p . --debounce 5.0

# With verbose output
intake watch specs/mi-feature/ -p ./my-project -v
```

---

## How it works

1. **Initial validation:** verifies that `SPEC_DIR` exists and contains `acceptance.yaml`. If not, throws a `WatchError` with a suggestion.
2. **Initial verification:** runs all checks (or those filtered by tags) immediately on startup.
3. **Recursive monitoring:** watches the project directory recursively using `watchfiles`.
4. **Debounce:** waits the configured interval after the last change before acting (default: 2 seconds). Prevents unnecessary re-executions during rapid edits.
5. **Ignored filtering:** discards changes in files matching ignore patterns (`.git`, `__pycache__`, etc.).
6. **Selective re-verification:** runs the relevant checks against the updated project.
7. **Result display:** shows a pass/fail summary with Rich formatting in the terminal.
8. **Continues watching** until the user presses `Ctrl+C`.

### Detected changes flow

When changes are detected:

- Up to 5 modified files are shown in the terminal
- If there are more than 5, it indicates how many additional files changed ("+N more")
- Checks are executed and the result is displayed

```
Changed: src/routes.py, src/models.py, tests/test_routes.py

ALL PASSED (5/5 checks)
```

Or in case of failures:

```
Changed: src/routes.py

FAILURES DETECTED (3/5 checks)
  FAIL check-03: Endpoints have authentication
     Pattern 'auth_required' not found in src/routes.py
  FAIL check-04: Unit tests pass
     2 failed, 3 passed in 1.5s
```

---

## Ignore patterns

By default, the following patterns are ignored (do not trigger re-verification):

| Pattern | Description |
|---------|-------------|
| `*.pyc` | Python compiled files |
| `__pycache__` | Python cache directories |
| `.git` | Git directory (and subdirectories) |
| `node_modules` | Node.js dependencies |
| `.intake` | intake internal directory |

The filtering is exhaustive: the full path, the file name, and **each component** of the path are compared against each pattern. This means the `.git` pattern also ignores `.git/objects/abc`, `.git/refs/heads/main`, etc.

Patterns use `fnmatch` (glob-style matching), supporting `*`, `?`, `[seq]`, and `[!seq]`.

---

## Configuration (.intake.yaml)

```yaml
watch:
  debounce_seconds: 2.0     # Seconds to wait after the last change
  ignore_patterns:           # Glob patterns to ignore
    - "*.pyc"
    - "__pycache__"
    - ".git"
    - "node_modules"
    - ".intake"
    - "*.log"                # Example: ignore log files
    - ".venv"                # Example: ignore virtualenvs
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `debounce_seconds` | float | `2.0` | Debounce milliseconds converted internally (`debounce_seconds * 1000`). |
| `ignore_patterns` | list[string] | see above | Glob patterns to ignore changes. |

**Note:** the `--debounce` CLI flag overrides the `debounce_seconds` value in the configuration.

---

## Architecture

### Modules

| File | Purpose |
|------|---------|
| `watch/__init__.py` | Exports `WatchError` (module exception). |
| `watch/watcher.py` | `SpecWatcher` class -- main observation and re-verification logic. |

### Dependencies

```
cli.py
  ↓
watch/watcher.py  →  verify/engine.py (VerificationEngine, VerificationReport)
  ↓
config/schema.py (WatchConfig)
```

The `watch/` module **does not** import from `llm/` or `analyze/`. This ensures that watch mode works completely offline -- it only needs the already-generated spec files.

### SpecWatcher class

```python
class SpecWatcher:
    def __init__(self, spec_dir, project_dir, config, tags=None): ...

    # Properties
    last_report -> VerificationReport | None   # Last verification report

    # Public methods
    run() -> None              # Starts the watch (blocks until Ctrl+C)
    run_once() -> VerificationReport  # Runs verification once

    # Internal methods
    _filter_ignored(files, patterns) -> list[str]
    _matches_any(filepath, patterns) -> bool  # staticmethod
    _display_changes(console, relevant) -> None
    _extract_changed_files(changes) -> list[str]
    _run_and_display(console) -> None
```

---

## Programmatic usage

```python
from intake.watch.watcher import SpecWatcher
from intake.config.schema import WatchConfig

config = WatchConfig(
    debounce_seconds=3.0,
    ignore_patterns=["*.pyc", "__pycache__", ".git"],
)

watcher = SpecWatcher(
    spec_dir="specs/mi-feature/",
    project_dir=".",
    config=config,
    tags=["tests", "security"],
)

# Run once (without continuous watch)
report = watcher.run_once()
print(f"Passed: {report.passed}/{report.total_checks}")
print(f"All required passed: {report.all_required_passed}")

# Or start continuous watch (blocks)
watcher.run()
```

The `run_once()` method is useful for testing and for integrations where only a one-time verification is needed without the observation loop.

---

## CI/CD integration

Watch mode is designed for **local development**, not for CI/CD. In a CI pipeline, the recommended approach is to use `intake verify` directly:

```bash
# In CI: one-time verification
intake verify specs/mi-feature/ -p . -f junit > test-results.xml

# In local development: continuous watch
intake watch specs/mi-feature/ -p .
```

However, it can be combined with pre-commit scripts or development hooks:

```bash
# In a development script
intake watch specs/mi-feature/ -p . --tags ci --debounce 3.0 &
WATCH_PID=$!

# ... development work ...

# When finished
kill $WATCH_PID
```

---

## Troubleshooting

### watchfiles is not installed

```
Error: Watch mode requires the watchfiles package.
Install with: pip install intake-ai-cli[watch]
```

**Solution:** install the optional dependency:

```bash
pip install intake-ai-cli[watch]
```

### Spec directory not found

```
Watch error: Spec directory not found: specs/mi-feature/
  Hint: Run 'intake init' first to generate a spec.
```

**Solution:** verify that the path to the spec is correct, or generate the spec first with `intake init`.

### acceptance.yaml not found

```
Watch error: acceptance.yaml not found in specs/mi-feature/
  Hint: Run 'intake init' to generate acceptance.yaml.
```

**Solution:** the spec needs an `acceptance.yaml` file with defined checks. Regenerate the spec with `intake init` or create the file manually (see [Verification](../verification/)).

### Changes do not trigger re-verification

Possible causes:

1. **The file is in an ignore pattern.** Check `watch.ignore_patterns` in `.intake.yaml`.
2. **The debounce is too high.** Reduce with `--debounce 1.0`.
3. **The file is outside the project directory.** Only the directory specified with `--project-dir` is observed.

### High CPU usage

If the project directory is very large (monorepo, many dependencies):

1. Add additional ignore patterns in `.intake.yaml`:
   ```yaml
   watch:
     ignore_patterns:
       - "*.pyc"
       - "__pycache__"
       - ".git"
       - "node_modules"
       - ".intake"
       - ".venv"
       - "dist"
       - "build"
       - "*.egg-info"
   ```
2. Increase the debounce to reduce re-verification frequency.
3. Use `--tags` to run only a subset of checks.

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Watch terminated normally (Ctrl+C). |
| `2` | Execution error (spec not found, invalid config, watchfiles not installed). |
