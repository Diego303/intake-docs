---
title: "CI/CD Integration"
description: "GitHub Actions, GitLab CI, Jenkins and Azure DevOps with intake."
order: 13
icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
---

# CI/CD Integration

Complete guide for integrating intake into continuous integration pipelines. Includes examples for GitHub Actions, GitLab CI, Jenkins and Azure DevOps.

---

## General strategy

### What to run in CI

| Action | When | Command |
|--------|------|---------|
| Verify spec | On each PR / push | `intake verify specs/<spec>/ -p . -f junit` |
| Validate spec | On each PR / push | `intake validate specs/<spec>/` |
| Export spec | On merge to main | `intake export specs/<spec>/ -f <format> -o .` |
| Generate CI config | Once / setup | `intake export-ci specs/<spec>/ -p github` or `-p gitlab` |
| Detect drift | Scheduled (weekly) | Compare hashes from `spec.lock.yaml` with sources |
| Doctor check | Scheduled / manual | `intake doctor` |
| Feedback | When verify fails | `intake feedback specs/<spec>/ -p .` |

### Exit codes

| Code | Meaning | CI action |
|------|---------|-----------|
| `0` | All required checks passed | Job passes |
| `1` | At least one required check failed | Job fails |
| `2` | Execution error | Job fails (investigate) |

---

## GitHub Actions

### Official intake action (recommended)

intake includes an **official GitHub Action** (`action/action.yml`) that simplifies integration. The action installs intake, runs verification, generates reports and uploads artifacts automatically.

```yaml
name: Verify Spec
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Verify spec compliance
        uses: Diego303/intake-cli/action@main
        with:
          spec-dir: specs/mi-feature/
```

#### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `spec-dir` | *(required)* | Path to the spec directory |
| `project-dir` | `.` | Project directory to verify against |
| `report-format` | `junit` | Report format: `terminal`, `json`, `junit` |
| `report-output` | `intake-verify-report.xml` | Report file path |
| `tags` | `""` | Tags to filter checks (comma-separated) |
| `fail-fast` | `false` | Stop on first failure |
| `python-version` | `3.12` | Python version |
| `intake-version` | `latest` | intake version (e.g.: `>=0.4.0`) |

#### Outputs

| Output | Description |
|--------|-------------|
| `result` | Result: `pass`, `fail`, or `error` |
| `total-checks` | Total checks executed |
| `passed-checks` | Checks that passed |
| `failed-checks` | Checks that failed |
| `report-path` | Path to the generated report |

#### Advanced example with outputs

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Verify spec compliance
        id: verify
        uses: Diego303/intake-cli/action@main
        with:
          spec-dir: specs/mi-feature/
          tags: "api,security"
          fail-fast: "true"

      - name: Comment on PR
        if: failure()
        run: |
          echo "Spec verification failed: ${{ steps.verify.outputs.failed-checks }} checks failed"
```

### Manual verification in PR

If you prefer to configure the steps manually without the official action:

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

      - name: Cache pip packages
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-intake

      - name: Install intake
        run: pip install intake-ai-cli

      - name: Run acceptance checks
        run: intake verify specs/mi-feature/ -p . -f junit > test-results.xml

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: spec-verification
          path: test-results.xml

      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Spec Compliance
          path: test-results.xml
          reporter: java-junit
```

### Complete workflow: verify + export

```yaml
name: Spec Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install intake-ai-cli
      - run: intake verify specs/mi-feature/ -p . -f junit > test-results.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results.xml

  export:
    needs: verify
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install intake-ai-cli
      - run: intake export specs/mi-feature/ -f claude-code -o .
      - uses: actions/upload-artifact@v4
        with:
          name: exported-spec
          path: |
            CLAUDE.md
            .intake/
```

### Spec drift detection (scheduled)

```yaml
name: Spec Drift Detection
on:
  schedule:
    - cron: "0 9 * * 1"  # Monday at 9am

jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install intake-ai-cli

      - name: Check for stale specs
        id: drift
        run: |
          OUTPUT=$(intake show specs/mi-feature/ 2>&1)
          if echo "$OUTPUT" | grep -qi "stale\|changed"; then
            echo "drift=true" >> $GITHUB_OUTPUT
          else
            echo "drift=false" >> $GITHUB_OUTPUT
          fi

      - name: Create issue if drift detected
        if: steps.drift.outputs.drift == 'true'
        run: |
          gh issue create \
            --title "Spec drift detected: mi-feature" \
            --body "The spec sources have changed. Regenerate with: \`intake add specs/mi-feature/ --regenerate\`" \
            --label "spec-drift"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Multiple specs in parallel

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        spec: [api-auth, api-payments, frontend-dashboard]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install intake-ai-cli
      - run: intake verify specs/${{ matrix.spec }}/ -p . -f junit > results-${{ matrix.spec }}.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results-${{ matrix.spec }}
          path: results-${{ matrix.spec }}.xml
```

---

## GitLab CI

### Basic pipeline

```yaml
# .gitlab-ci.yml
stages:
  - verify

verify-spec:
  stage: verify
  image: python:3.12-slim
  before_script:
    - pip install intake-ai-cli
  script:
    - intake verify specs/mi-feature/ -p . -f junit > test-results.xml
  artifacts:
    when: always
    reports:
      junit: test-results.xml
```

GitLab automatically displays JUnit results in the Merge Request widget.

### Complete pipeline with cache

```yaml
stages:
  - verify
  - export

.intake-base:
  image: python:3.12-slim
  cache:
    key: intake-pip
    paths:
      - .cache/pip
  variables:
    PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"
  before_script:
    - pip install intake-ai-cli

verify-spec:
  extends: .intake-base
  stage: verify
  script:
    - intake verify specs/mi-feature/ -p . -f junit > test-results.xml
  artifacts:
    when: always
    reports:
      junit: test-results.xml

export-spec:
  extends: .intake-base
  stage: export
  only:
    - main
  script:
    - intake export specs/mi-feature/ -f claude-code -o .
  artifacts:
    paths:
      - CLAUDE.md
      - .intake/
```

---

## Jenkins

### Declarative Jenkinsfile

```groovy
pipeline {
    agent {
        docker {
            image 'python:3.12-slim'
        }
    }

    environment {
        ANTHROPIC_API_KEY = credentials('anthropic-api-key')
    }

    stages {
        stage('Install') {
            steps {
                sh 'pip install intake-ai-cli'
            }
        }

        stage('Verify') {
            steps {
                sh 'intake verify specs/mi-feature/ -p . -f junit > test-results.xml'
            }
            post {
                always {
                    junit 'test-results.xml'
                }
            }
        }

        stage('Export') {
            when {
                branch 'main'
            }
            steps {
                sh 'intake export specs/mi-feature/ -f claude-code -o .'
                archiveArtifacts artifacts: 'CLAUDE.md,.intake/**'
            }
        }
    }
}
```

### Jenkinsfile with multiple specs

```groovy
pipeline {
    agent any
    stages {
        stage('Verify All Specs') {
            parallel {
                stage('API Auth') {
                    steps {
                        sh 'intake verify specs/api-auth/ -p . -f junit > results-auth.xml'
                    }
                }
                stage('API Payments') {
                    steps {
                        sh 'intake verify specs/api-payments/ -p . -f junit > results-payments.xml'
                    }
                }
            }
            post {
                always {
                    junit 'results-*.xml'
                }
            }
        }
    }
}
```

---

## Azure DevOps

### azure-pipelines.yml

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.12'

  - script: pip install intake-ai-cli
    displayName: 'Install intake'

  - script: intake verify specs/mi-feature/ -p . -f junit > test-results.xml
    displayName: 'Verify spec compliance'

  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'test-results.xml'
      testRunTitle: 'Spec Compliance'
```

---

## CI report formats

### JUnit XML

The most compatible format with CI. All systems support it:

```bash
intake verify specs/mi-feature/ -p . -f junit > test-results.xml
```

| Platform | How it is consumed |
|----------|-------------------|
| GitHub Actions | `dorny/test-reporter` action or `actions/upload-artifact` |
| GitLab CI | `artifacts.reports.junit` (appears in MR widget) |
| Jenkins | `junit` post step (appears in dashboard) |
| Azure DevOps | `PublishTestResults@2` task |

### JSON

For custom integrations:

```bash
intake verify specs/mi-feature/ -p . -f json > results.json
```

Extract metrics with `jq`:

```bash
# Total checks
jq '.total_checks' results.json

# Only names of failed checks
jq '.results[] | select(.passed == false) | .name' results.json

# Summary: passed/failed
jq '{passed: .passed, failed: .failed, all_ok: .all_required_passed}' results.json
```

---

## Pre-commit hooks

See [Deployment > Pre-commit hooks](../deployment/#pre-commit-hooks) for detailed configuration.

Quick summary:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: intake-verify
        name: Verify spec compliance
        entry: intake verify specs/mi-feature/ -p . --fail-fast -t structure
        language: system
        pass_filenames: false
        files: ^src/
```

---

## Spec drift detection

### What it is

"Spec drift" occurs when requirement sources change but the spec is not regenerated. The `spec.lock.yaml` stores SHA-256 hashes of the original sources, allowing change detection.

### When to check

- **Weekly** (cron job): detect drift from sources that change without regeneration
- **On PR**: if a PR modifies a source listed in `spec.lock.yaml`, alert that the spec may be outdated

### Implementation

The general pattern:

```bash
# 1. intake show detects staleness automatically
intake show specs/mi-feature/

# 2. If sources changed, regenerate
intake add specs/mi-feature/ --regenerate

# 3. Review changes
intake diff specs/mi-feature-old/ specs/mi-feature/
```

See the GitHub Actions and GitLab CI examples above for CI implementations.

---

## Notifications

### Slack (webhook)

```yaml
# GitHub Actions: notify Slack if verify fails
- name: Notify Slack on failure
  if: failure()
  run: |
    curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d '{
        "text": "Spec verification failed for mi-feature",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Spec Verification Failed*\nSpec: `mi-feature`\nBranch: `${{ github.ref_name }}`\nPR: ${{ github.event.pull_request.html_url }}"
            }
          }
        ]
      }'
```

### Microsoft Teams (webhook)

```yaml
- name: Notify Teams on failure
  if: failure()
  run: |
    curl -X POST "${{ secrets.TEAMS_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "Spec Verification Failed",
        "text": "The spec mi-feature did not pass acceptance checks on branch ${{ github.ref_name }}"
      }'
```

---

## Automatic CI config generation

intake can automatically generate CI configuration files for spec verification. This simplifies the initial setup:

```bash
# Generate GitLab CI config
intake export-ci specs/mi-feature/ -p gitlab
# Generates: .gitlab-ci.yml

# Generate GitHub Actions workflow
intake export-ci specs/mi-feature/ -p github
# Generates: .github/workflows/intake-verify.yml

# Generate in custom directory
intake export-ci specs/mi-feature/ -p github -o ci-config/
```

The generated files include intake installation, `intake verify` execution, and JUnit reporting. They can be customized after generation.

**Note:** `export-ci` uses built-in Jinja2 templates (`gitlab_ci.yml.j2`, `github_actions.yml.j2`). If you need to customize them, you can override them with [user templates](../configuration/#seccion-templates).

---

## Tips

### Dependency caching

Caching pip saves ~30 seconds per run:

```yaml
# GitHub Actions
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-intake-${{ hashFiles('**/requirements*.txt') }}

# GitLab CI
cache:
  key: intake-pip
  paths:
    - .cache/pip
```

### verify.sh without installing intake

The `generic` exporter generates a standalone `verify.sh`. In CI where you don't want to install intake:

```bash
# Once: generate verify.sh and commit it
intake export specs/mi-feature/ -f generic -o output/
git add output/verify.sh
git commit -m "Add standalone verify script"

# In CI: run directly (without intake)
chmod +x output/verify.sh
./output/verify.sh .
```

**Tradeoff:** less flexible than `intake verify` (no tags, no JUnit), but zero dependencies.

### Structure-only verification

For quick checks in pre-commit, run only structure checks (no tests):

```bash
intake verify specs/mi-feature/ -p . -t structure --fail-fast
```
