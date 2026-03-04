---
title: "Best Practices"
description: "Tips, recommended patterns and how to get the most out of intake."
order: 10
icon: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
---

# Best Practices

Tips for getting the most out of intake.

---

## Writing Good Requirement Sources

### Be Specific

The LLM extracts requirements better when sources are clear and specific.

**Good:**
```
The system must allow registration with email and password.
The password must have a minimum of 8 characters, one uppercase letter and one number.
The system must send a confirmation email within 30 seconds.
```

**Bad:**
```
We need a good and secure login.
```

### Include Acceptance Criteria

Acceptance criteria translate directly into verifiable checks:

```markdown
## FR-01: User Registration

The system must allow registration with email and password.

### Acceptance Criteria
- Email must be unique in the system
- Password minimum 8 characters
- Confirmation email sent in < 30 seconds
- The endpoint returns 201 on success, 409 if the email already exists
```

### Separate Functional from Non-Functional

intake distinguishes between functional requirements (what the system does) and non-functional requirements (how it does it). Separate them in the sources for better extraction:

```markdown
# Functional Requirements
- The user can register with email
- The user can log in with OAuth2

# Non-Functional Requirements
- Response time < 200ms for all endpoints
- The system must support 1000 concurrent users
- 99.9% availability
```

---

## Multi-source: Combining Formats

One of intake's strengths is combining multiple sources. Each source contributes different information:

```bash
intake init "My feature" \
  -s user-stories.md \          # Business requirements (Markdown)
  -s jira-export.json \         # Technical requirements + current state (Jira)
  -s meeting-notes.txt \        # Informal decisions (plain text)
  -s wireframes.png             # Visual design (image)
```

### What Each Format Contributes

| Format | Best for |
|--------|----------|
| Markdown | Structured requirements, formal specs, design documents |
| Jira JSON | Current project state, priorities, links between issues |
| Plain text | Quick notes, meeting decisions, raw ideas |
| YAML | Already-structured requirements with IDs and priorities |
| Confluence HTML | Existing documentation, RFCs, team decisions |
| PDF | External specs, regulatory documents, contracts |
| DOCX | Word documents from stakeholders |
| Images | Wireframes, mockups, architecture diagrams |
| URLs | Documentation in wikis, online RFCs, reference pages |
| Slack JSON | Team decisions, action items, technical conversations |
| GitHub Issues | Reported bugs, feature requests, backlog status |

### Automatic Deduplication

When combining sources, intake automatically deduplicates similar requirements using Jaccard similarity (threshold 0.75). If two sources say the same thing with slightly different words, only the first occurrence is kept.

### Conflict Detection

intake also detects conflicts between sources. For example, if one document says "use PostgreSQL" and another says "use MongoDB", it is reported as a conflict with a recommendation.

---

## Choosing the Generation Mode

intake can auto-detect the optimal mode based on the complexity of the sources, or you can force it manually:

| Situation | Mode | Why |
|-----------|------|-----|
| Simple bug fix, 1 notes file | `quick` | Only generates context.md + tasks.md, fast and cheap |
| New feature of normal complexity | `standard` | All 6 complete files |
| System with many sources or extensive text | `enterprise` | Maximum detail and risks |
| Not sure | (omit `--mode`) | intake auto-detects |

```bash
# Auto-detection (recommended)
intake init "My feature" -s reqs.md

# Force mode
intake init "Quick fix" -s bug.txt --mode quick
intake init "Critical system" -s reqs.md -s jira.json -s confluence.html --mode enterprise
```

Auto-detection works as follows:

- **quick**: <500 words, 1 source, no structured content (jira, yaml, etc.)
- **enterprise**: 4+ sources OR >5000 words
- **standard**: everything else

Auto-detection can be disabled with `spec.auto_mode: false` in `.intake.yaml`.

---

## Choosing the Right Preset

| Situation | Preset | Why |
|-----------|--------|-----|
| Prototyping an idea | `minimal` | Fast, cheap ($0.10), no extras |
| Normal team project | `standard` | Balance between detail and cost ($0.50) |
| Critical / regulated system | `enterprise` | Maximum detail, traceability, risks ($2.00) |
| First time using intake | `standard` | Shows all capabilities |

```bash
intake init "My feature" -s reqs.md --preset minimal
```

You can also start with `minimal` and switch to `standard` when needed:

```bash
# Quick first attempt
intake init "My feature" -s reqs.md --preset minimal

# Full version
intake init "My feature" -s reqs.md --preset standard
```

---

## Cost Management

### Understanding the Cost

Each `intake init` or `intake add` makes 2-3 LLM calls:

1. **Extraction** -- the most expensive, processes all the source text
2. **Risk assessment** -- optional (disable with `risk_assessment: false`)
3. **Design** -- processes the extracted requirements

### Reducing Costs

| Strategy | How | Savings |
|----------|-----|---------|
| Use `minimal` preset | `--preset minimal` | ~80% (disables risks, lock, sources) |
| Disable risks | `risk_assessment: false` | ~30% (eliminates 1 of 3 LLM calls) |
| Use a cheaper model | `--model gpt-3.5-turbo` | Variable, depends on the model |
| Reduce temperature | `temperature: 0.1` | Does not reduce cost but improves consistency |
| Budget enforcement | `max_cost_per_spec: 0.25` | Protects against surprises |

### Monitoring Costs

```bash
# View the cost of a generated spec
intake show specs/my-feature/
# Shows: Cost: $0.0423
```

The cost is also recorded in `spec.lock.yaml`:

```yaml
total_cost: 0.0423
```

---

## Spec Versioning

### Specs as Code

Generated specs are text files -- ideal for versioning with git:

```bash
# Generate spec
intake init "Auth system" -s reqs.md

# Commit
git add specs/auth-system/
git commit -m "Add auth system spec v1"
```

### Comparing Versions

Use `intake diff` to compare two versions:

```bash
# After regenerating with new sources
intake diff specs/auth-system-v1/ specs/auth-system-v2/
```

Shows requirements, tasks, and checks that were added, removed, and modified.

### Detecting Source Changes

The `spec.lock.yaml` has hashes of the sources. You can check if sources have changed:

```bash
intake show specs/my-feature/
```

---

## Security

### Redacting Sensitive Information

If your sources contain sensitive information, use `security.redact_patterns`:

```yaml
security:
  redact_patterns:
    - "sk-[a-zA-Z0-9]{20,}"       # API keys
    - "\\b\\d{4}-\\d{4}-\\d{4}\\b" # Card numbers
    - "password:\\s*\\S+"            # Passwords in configs
```

### Excluding Sensitive Files

By default, intake never includes these files in the output:

```yaml
security:
  redact_files:
    - "*.env"
    - "*.pem"
    - "*.key"
```

Add more patterns according to your project:

```yaml
security:
  redact_files:
    - "*.env"
    - "*.pem"
    - "*.key"
    - "credentials.*"
    - "secrets.*"
```

---

## Project Organization

### Recommended Structure

```
my-project/
├── .intake.yaml              # intake configuration
├── specs/                    # Generated specs
│   ├── auth-system/          #   Spec 1
│   │   ├── requirements.md
│   │   ├── design.md
│   │   ├── tasks.md
│   │   ├── acceptance.yaml
│   │   ├── context.md
│   │   ├── sources.md
│   │   └── spec.lock.yaml
│   └── payments/             #   Spec 2
│       └── ...
├── docs/                     # Requirement sources
│   ├── requirements.md
│   ├── jira-export.json
│   └── meeting-notes.txt
├── src/                      # Source code
└── tests/                    # Tests
```

### One Spec per Feature

Generate one spec for each independent feature or component:

```bash
intake init "Auth system" -s docs/auth-reqs.md
intake init "Payments" -s docs/payment-stories.md -s docs/jira-payments.json
intake init "Notifications" -s docs/notif-ideas.txt
```

This allows:

- Verifying each feature independently
- Comparing versions of a specific feature
- Assigning features to different teams or agents

---

## Task Tracking

After generating a spec, you can use `intake task` to track implementation progress directly in `tasks.md`:

```bash
# View the status of all tasks
intake task list specs/my-feature/

# Mark a task as in progress
intake task update specs/my-feature/ 1 in_progress

# Mark as completed with a note
intake task update specs/my-feature/ 1 done --note "Tests passing"

# Filter by status
intake task list specs/my-feature/ --status pending --status blocked
```

**Available statuses:** `pending`, `in_progress`, `done`, `blocked`

The status is persisted directly in `tasks.md`, so it is versioned with git along with the rest of the spec.

---

## Using URLs as Sources

You can pass URLs directly as sources without downloading manually:

```bash
# Internal wiki
intake init "API review" -s https://wiki.company.com/rfc/auth

# Public documentation
intake init "Integration" -s https://docs.example.com/api/v2
```

intake downloads the page, converts the HTML to Markdown, and processes it like any other source. It auto-detects whether it is Confluence, Jira, or GitHub content by patterns in the URL.

---

## Recommended Workflow

```
1. Gather requirements (any format, files or URLs)
           |
2. intake init "Feature" -s source1 -s source2
   (optionally: --mode quick|standard|enterprise)
           |
3. Review the generated spec
   - requirements.md: Are the requirements complete?
   - tasks.md: Are the tasks reasonable?
   - acceptance.yaml: Are the checks verifiable?
           |
4. Iterate if necessary
   - intake add specs/feature/ -s new-source.md --regenerate
           |
5. Implement (manually or with an AI agent)
   - intake export specs/feature/ -f architect
   - intake task update specs/feature/ 1 in_progress
           |
6. Track progress
   - intake task list specs/feature/
   - intake task update specs/feature/ 1 done --note "Implemented"
           |
7. Verify
   - intake verify specs/feature/ -p .
           |
8. Iterate until all checks pass
```
