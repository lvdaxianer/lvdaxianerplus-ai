# Project Constitution Template

> This document defines the foundational principles, governance rules, and architectural constraints for [PROJECT_NAME]. All contributors MUST adhere to these principles during design, implementation, and maintenance.

---

## Project Identity

- **Project Name:** `[PROJECT_NAME]`
- **Project Type:** `[PROJECT_TYPE]` (e.g., library, service, application, tool)
- **Primary Language(s):** `[PRIMARY_LANGUAGES]`
- **Target Audience:** `[TARGET_AUDIENCE]`

---

## Core Principles

### Principle 1: `[PRINCIPLE_1_NAME]`

**Rule:** `[PRINCIPLE_1_RULE]`

**Rationale:** `[PRINCIPLE_1_RATIONALE]`

---

### Principle 2: `[PRINCIPLE_2_NAME]`

**Rule:** `[PRINCIPLE_2_RULE]`

**Rationale:** `[PRINCIPLE_2_RATIONALE]`

---

### Principle 3: `[PRINCIPLE_3_NAME]`

**Rule:** `[PRINCIPLE_3_RULE]`

**Rationale:** `[PRINCIPLE_3_RATIONALE]`

---

### Principle 4: `[PRINCIPLE_4_NAME]` (Optional)

**Rule:** `[PRINCIPLE_4_RULE]`

**Rationale:** `[PRINCIPLE_4_RATIONALE]`

---

### Principle 5: `[PRINCIPLE_5_NAME]` (Optional)

**Rule:** `[PRINCIPLE_5_RULE]`

**Rationale:** `[PRINCIPLE_5_RATIONALE]`

---

## Governance

### Amendment Procedure

1. Propose amendment via issue or PR with clear rationale
2. Require approval from `[APPROVAL_THRESHOLD]` (e.g., 2 core contributors, majority vote)
3. Update constitution with version bump
4. Propagate changes to dependent templates and docs

### Versioning Policy

- **MAJOR:** Backward incompatible principle removals or redefinitions
- **MINOR:** New principle added or materially expanded guidance
- **PATCH:** Clarifications, wording fixes, non-semantic refinements

### Compliance Review

- All PRs MUST be checked against constitution principles
- Violations MUST be flagged in review and resolved before merge
- Architecture decisions MUST reference relevant principle sections

---

## Metadata

- **Constitution Version:** `[CONSTITUTION_VERSION]`
- **Ratification Date:** `[RATIFICATION_DATE]`
- **Last Amended Date:** `[LAST_AMENDED_DATE]`
- **Amendment History:** See commit history for detailed changes

---

## Template References

- **Plan Template:** `.specify/templates/plan-template.md`
- **Spec Template:** `.specify/templates/spec-template.md`
- **Tasks Template:** `.specify/templates/tasks-template.md`
- **Commands:** `.specify/templates/commands/*.md`

---

*This constitution is binding. Violations require explicit justification and approval process.*