---
title: "Workflows"
description: "Workflows for individual developers, teams and enterprises."
order: 12
icon: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"
---
# Workflows

Usage patterns for intake at different team and organization scales, from an individual developer to multi-team enterprises with regulatory requirements.

---

## Individual developer

### Basic flow

```
Requirements --> intake init --> Review spec --> Implement --> intake verify --> Iterate
```

### End-to-end example

```bash
# 1. Gather requirements in a Markdown file
echo "# Auth System
- Users register with email and password
- OAuth2 login with Google and GitHub
- JWT tokens with 1h expiry
- Rate limiting: 100 requests/min per user" > reqs.md

# 2. Generate the spec
intake init "Auth system" -s reqs.md

# 3. Review the generated spec
intake show specs/auth-system/
# -> 4 functional requirements, 6 tasks, 8 acceptance checks

# 4. Export for your preferred agent
intake export specs/auth-system/ -f claude-code -o .

# 5. Implement (manually or with an agent)
# ... coding ...

# 6. Verify compliance
intake verify specs/auth-system/ -p .
# -> PASS: 7/8  FAIL: 1/8

# 7. Analyze the failure
intake feedback specs/auth-system/ -p .
# -> MAJOR: Rate limiting not implemented in middleware
#   Fix: Add rate_limit decorator to src/api/routes.py

# 8. Fix and re-verify
# ... fix rate limiting ...
intake verify specs/auth-system/ -p .
# -> PASS: 8/8

# 9. Mark tasks as completed
intake task update specs/auth-system/ 1 done --note "All checks passing"

# 10. Commit
git add specs/ src/ tests/
git commit -m "feat: implement auth system (spec-verified)"
```

### Quick mode for simple tasks

```bash
# Quick bug fix: only generates context.md + tasks.md
intake init "Fix login timeout" -s bug-report.txt --mode quick
```

---

## Small team (2-5 developers)

### Pattern: shared specs in git

The entire team works with the same versioned specs:

```bash
# Tech lead generates the spec
intake init "Payment gateway" -s jira.json -s confluence.html --preset standard
git add specs/payment-gateway/
git commit -m "spec: add payment gateway requirements"
git push

# Developer clones and works
git pull
intake show specs/payment-gateway/
intake export specs/payment-gateway/ -f cursor -o .
# ... implement ...
intake verify specs/payment-gateway/ -p .
```

### Pattern: spec per feature branch

Each feature has its spec in its own branch:

```bash
# Feature branch
git checkout -b feature/notifications

# Generate spec in the branch
intake init "Notification system" -s reqs.md -s slack-decisions.json
git add specs/notification-system/

# Implement + verify
# ...

# The PR includes spec + implementation
git add src/ tests/ specs/
git commit -m "feat: notification system with spec"
git push origin feature/notifications
# -> PR review includes spec review
```

### Pattern: team roles

| Role | intake responsibility | Main commands |
|------|----------------------|---------------|
| Tech Lead | Create and review specs | `init`, `add`, `diff`, `show` |
| Developer | Implement and verify | `export`, `verify`, `task update` |
| QA | Verify and report | `verify -f junit`, `feedback` |

```bash
# Tech Lead: create spec from multiple sources
intake init "User dashboard" \
  -s jira://DASH-100,DASH-101,DASH-102 \
  -s confluence://ENG/Dashboard-RFC \
  -s meeting-notes.md \
  --preset standard

# Developer: export and work
intake export specs/user-dashboard/ -f claude-code -o .
intake task update specs/user-dashboard/ 1 in_progress

# QA: verify and generate report
intake verify specs/user-dashboard/ -p . -f junit > results.xml
```

---

## Multi-team enterprise

### Spec governance

For large organizations, specs need an approval process:

```
1. Product Owner defines requirements (Jira, Confluence, docs)
         |
2. Tech Lead generates spec (intake init)
         |
3. PR with spec -> Review by architect + stakeholders
         |
4. Spec approved -> Merge to main
         |
5. Team implements using verified spec
         |
6. CI runs intake verify on each PR
         |
7. Release only if all checks pass
```

### Standardization

Share configuration at the organization level:

```yaml
# .intake.yaml at the monorepo root
llm:
  model: claude-sonnet-4
  max_cost_per_spec: 1.00

project:
  language: en
  conventions:
    code_style: "PEP 8"
    testing: "pytest with >80% coverage"
    documentation: "Google-style docstrings"

spec:
  requirements_format: ears
  design_depth: moderate
  task_granularity: medium
  risk_assessment: true
  generate_lock: true

export:
  default_format: claude-code

security:
  redact_patterns:
    - "sk-[a-zA-Z0-9]{20,}"
    - "\\b\\d{4}-\\d{4}-\\d{4}-\\d{4}\\b"
  redact_files:
    - "*.env"
    - "*.pem"
    - "*.key"
    - "credentials.*"
```

**Enforcement:** use `--preset enterprise` for teams with regulatory requirements.

### Multi-spec for large systems

Structure for microservices or systems with multiple components:

```
company/
├── .intake.yaml                    # Shared config
├── specs/
│   ├── platform/
│   │   ├── api-gateway/            # API gateway spec
│   │   ├── auth-service/           # Auth service spec
│   │   └── notification-service/   # Notification service spec
│   ├── frontend/
│   │   ├── web-dashboard/          # Web dashboard spec
│   │   └── mobile-app/             # Mobile app spec
│   └── infrastructure/
│       ├── monitoring/             # Monitoring spec
│       └── ci-pipeline/            # CI pipeline spec
├── services/
│   ├── api-gateway/
│   ├── auth/
│   └── notifications/
└── frontend/
    ├── web/
    └── mobile/
```

---

## Multi-spec monorepo

### Verification per service

Each spec is verified against its corresponding project directory:

```bash
# Verify each service against its spec
intake verify specs/platform/api-gateway/ -p services/api-gateway/
intake verify specs/platform/auth-service/ -p services/auth/
intake verify specs/frontend/web-dashboard/ -p frontend/web/
```

### CI matrix for parallel execution

```yaml
# GitHub Actions
jobs:
  verify:
    strategy:
      matrix:
        include:
          - spec: specs/platform/api-gateway
            project: services/api-gateway
          - spec: specs/platform/auth-service
            project: services/auth
          - spec: specs/frontend/web-dashboard
            project: frontend/web
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - run: pip install intake-ai-cli
      - run: intake verify ${{ matrix.spec }}/ -p ${{ matrix.project }}/ -f junit > results.xml
```

---

## Spec lifecycle

### Create --> Verify --> Update --> Deprecate

```bash
# CREATE: new spec
intake init "Payment v2" -s reqs.md -s jira.json

# VERIFY: on each push/PR
intake verify specs/payment-v2/ -p .

# UPDATE: when requirements change
intake add specs/payment-v2/ -s new-reqs.md --regenerate

# COMPARE: what changed between versions
intake diff specs/payment-v1/ specs/payment-v2/

# DEPRECATE: archive obsolete specs
mkdir -p specs/archived
mv specs/payment-v1/ specs/archived/
git add specs/ && git commit -m "archive: payment v1 (replaced by v2)"
```

### Change management

When requirements change:

```bash
# 1. Regenerate spec with new source
intake add specs/my-feature/ -s updated-reqs.md --regenerate

# 2. Compare with the previous version
intake diff specs/my-feature-backup/ specs/my-feature/
# -> Added: FR-005 (new requirement)
# -> Modified: FR-002 (scope changed)
# -> Removed: FR-003 (no longer needed)

# 3. Review the changes
intake show specs/my-feature/

# 4. Re-verify the implementation
intake verify specs/my-feature/ -p .

# 5. If there are failures, analyze
intake feedback specs/my-feature/ -p .
```

---

## Workflow with AI agents

### Complete cycle

```
intake init --> intake export --> Agent implements --> intake verify --> intake feedback --> Agent fixes --> Repeat
```

```bash
# 1. Generate spec
intake init "Feature X" -s reqs.md

# 2. Export for the agent
intake export specs/feature-x/ -f claude-code -o .

# 3. The agent reads CLAUDE.md + .intake/tasks/ and implements

# 4. Verify
intake verify specs/feature-x/ -p .

# 5. If there are failures, generate feedback
intake feedback specs/feature-x/ -p . --agent-format claude-code
# -> The agent reads the suggestions and fixes

# 6. Re-verify until everything passes
intake verify specs/feature-x/ -p .
# -> PASS: 12/12

# 7. Mark tasks
intake task update specs/feature-x/ 1 done
```

### Export format per agent

| Agent | Format | What the agent reads | Command |
|-------|--------|---------------------|---------|
| Claude Code | `claude-code` | `CLAUDE.md` + `.intake/tasks/TASK-NNN.md` | `intake export -f claude-code -o .` |
| Cursor | `cursor` | `.cursor/rules/intake-spec.mdc` | `intake export -f cursor -o .` |
| Kiro | `kiro` | `requirements.md` + `design.md` + `tasks.md` (native format) | `intake export -f kiro -o .` |
| GitHub Copilot | `copilot` | `.github/copilot-instructions.md` | `intake export -f copilot -o .` |
| Architect | `architect` | `pipeline.yaml` with steps | `intake export -f architect -o output/` |
| Any | `generic` | Consolidated `SPEC.md` + `verify.sh` | `intake export -f generic -o output/` |

### Feedback formatted per agent

```bash
# Suggestions for Claude Code
intake feedback specs/feature-x/ -p . --agent-format claude-code

# Suggestions for Cursor
intake feedback specs/feature-x/ -p . --agent-format cursor

# Generic suggestions (Markdown)
intake feedback specs/feature-x/ -p . --agent-format generic
```

---

## Regulated industries

### Complete audit trail

For industries requiring traceability (finance, healthcare, government):

```yaml
# .intake.yaml — configuration for maximum traceability
spec:
  requirements_format: ears        # Formal format
  include_sources: true            # Requirement-to-source traceability
  generate_lock: true              # Audit artifact
  risk_assessment: true            # Risk assessment
  auto_mode: false                 # Always full mode

export:
  default_format: generic          # Consolidated SPEC.md as formal document
```

```bash
# Generate with enterprise preset
intake init "Regulated Feature" -s reqs.md --preset enterprise

# The result includes:
# - requirements.md    -> formal requirements with IDs
# - sources.md         -> traceability to original sources
# - spec.lock.yaml     -> hashes, timestamps, costs
# - acceptance.yaml    -> verifiable checks
```

### Approval gates

```
Phase 1: Specification
  ├── Product Owner defines requirements
  ├── intake init generates spec
  ├── PR: spec review by architect + compliance
  └── Merge (gate: architect approval)

Phase 2: Implementation
  ├── Developer exports spec for agent
  ├── Implementation
  ├── CI runs intake verify
  └── PR (gate: all checks pass)

Phase 3: Release
  ├── QA runs intake verify -f junit
  ├── JUnit report as evidence
  ├── intake show for metrics
  └── Release (gate: QA + compliance approval)
```

### Bidirectional traceability

intake provides the complete traceability chain:

```
Source (reqs.md, jira.json)
    | recorded in sources.md
Requirement (FR-001 in requirements.md)
    | referenced in design.md
Component (AuthService)
    | assigned in tasks.md
Task (Task 1: Implement AuthService)
    | verified in acceptance.yaml
Check (check-01: Tests pass)
    | evidence in verify report (JUnit XML)
Verifiable result
```

Each link is a versionable, auditable and queryable text file.

See [Security > Audit and traceability](../security/) for more details.
