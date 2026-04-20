<!--
## Sync Impact Report

**Version change:** 1.0.0 → 1.1.0 (MINOR - new principles added)

**Modified principles:** None

**Added sections:**
- Principle 6: if-else Control Flow Discipline
- Principle 7: Null Safety & Parameter Limits
- Principle 8: Code Quality Metrics
- Principle 9: Java Thread Pool Standards
- Principle 10: Exception Handling Standards
- Reference to skills/code-review-spec for detailed examples

**Removed sections:** None

**Templates status:**
- ✅ constitution.md updated
- ⚠ plan-template.md pending
- ⚠ spec-template.md pending
- ⚠ tasks-template.md pending
- ⚠ commands/*.md pending

**Follow-up TODOs:**
- Create plan-template.md
- Create spec-template.md
- Create tasks-template.md
- Add command templates
-->

# Project Constitution

> This document defines the foundational principles, governance rules, and architectural constraints for **lvdaxianerplus-ai**. All contributors MUST adhere to these principles during design, implementation, and maintenance. Detailed code examples are provided in [skills/code-review-spec](../skills/code-review-spec/SKILL.md).

---

## Project Identity

- **Project Name:** `lvdaxianerplus-ai`
- **Project Type:** `library` (AI scaffolding commands and skills collection)
- **Primary Language(s):** TypeScript, Markdown
- **Target Audience:** Developers using AI-assisted coding tools (Claude Code, etc.)

---

## Core Principles

### Principle 1: Code Documentation Standards

**Rule:** All code MUST include complete documentation with the following requirements:
- Every method MUST have complete comments (`@param`, `@return`, `@author`, `@date`)
- Every class MUST have Javadoc-style documentation
- All `if-else` branches MUST have condition explanation comments
- Comment ratio MUST be at least **60%** of total lines
- All `@author` annotations MUST use `lvdaxianerplus`

**Rationale:** Comprehensive documentation ensures code maintainability, enables knowledge transfer, and reduces technical debt. The 60% comment ratio threshold guarantees self-documenting code that survives author turnover.

> **Code examples:** See [skills/code-review-spec/references/method-comments.md](../skills/code-review-spec/references/method-comments.md)

---

### Principle 2: Code Complexity Limits

**Rule:** All code MUST adhere to strict complexity constraints:
- Each method MUST NOT exceed **20 lines** — extract complex logic into private methods
- Each class MUST NOT exceed **350 lines** — split large classes by responsibility
- Each file MUST NOT exceed **350 lines**
- Cyclomatic complexity MUST NOT exceed **10** per method
- Each method MUST do exactly ONE thing — refactor if multiple responsibilities

**Rationale:** Small, focused units improve readability, reduce bugs, enable easier testing, and facilitate parallel development. Complexity limits prevent unmaintainable monolithic code structures.

---

### Principle 3: Batch Processing Discipline

**Rule:** Batch operations MUST replace individual iterations:
- MUST use batch APIs (e.g., `saveAll()`, `findAllById()`) instead of `for` loops for individual operations
- MUST NOT call remote services or databases inside `for`, `map`, `forEach`, `filter` loops
- MUST batch query first, then process in memory only
- If batch size exceeds limits, MUST use sliding window batch processing (e.g., 100 items per batch)

**Rationale:** Loop-based individual calls cause O(n) network overhead, connection pool exhaustion, and service cascading failures. Batch processing ensures system stability and performance.

> **Code examples:** See [skills/code-review-spec/references/batch-processing.md](../skills/code-review-spec/references/batch-processing.md)

---

### Principle 4: Logging Standards

**Rule:** All logging MUST follow structured format requirements:
- MUST use business identifiers in format `[业务标识] 消息内容`
- MUST use placeholders (`{}` or `%s`) — NEVER string concatenation
- MUST NOT use direct output (`System.out.println`, `console.log`, `print`)
- MUST NOT log sensitive information (passwords, keys, tokens)
- MUST configure log rotation for file output

**Rationale:** Structured logging with business identifiers enables rapid issue diagnosis, supports log aggregation, and prevents sensitive data leakage in production environments.

> **Code examples:** See [skills/code-review-spec/references/logging.md](../skills/code-review-spec/references/logging.md)

---

### Principle 5: Security by Default

**Rule:** All code MUST enforce security fundamentals:
- MUST NOT hardcode secrets (passwords, API keys, tokens)
- MUST use environment variables or secret managers for credentials
- MUST validate all external input at system boundaries
- MUST use parameterized queries for SQL — NEVER string concatenation
- MUST sanitize/filter user input to prevent XSS attacks

**Rationale:** Security vulnerabilities cause data breaches, compliance failures, and reputation damage. Default-secure coding practices eliminate entire vulnerability classes before they reach production.

---

### Principle 6: if-else Control Flow Discipline

**Rule:** All conditional statements MUST follow strict pairing requirements:
- Every `if` statement MUST have a corresponding `else` branch — NO standalone `if`
- When `if` branch sets a value, `else` MUST set a reasonable alternative (default, fallback, empty, degraded)
- For **4+ branches** with equality comparisons (e.g., `if (type == "A")`), MUST use **Strategy Pattern** instead
- All `switch-case` statements MUST include a `default` branch

**Rationale:** Unpaired `if` statements create undefined states and hidden bugs. Strategy pattern replaces complex branching with extensible polymorphism, following Open-Closed Principle.

> **Code examples:** See [skills/code-review-spec/references/if-else-pairing.md](../skills/code-review-spec/references/if-else-pairing.md) and [strategy-pattern.md](../skills/code-review-spec/references/strategy-pattern.md)

---

### Principle 7: Null Safety & Parameter Limits

**Rule:** All code MUST use explicit null handling and controlled parameter counts:
- MUST NOT return `null` directly — use `Optional`/`T | undefined`/`T | None` for optional values
- MUST handle potential null/undefined at call sites with defaults or explicit checks
- Function parameters MUST follow limits:
  - **1-3 parameters:** Direct passing
  - **4-5 parameters:** Use configuration object/struct
  - **6+ parameters:** MUST refactor — split function or encapsulate parameter class

**Rationale:** Null returns cause NullPointerException/undefined errors at runtime. Parameter limits improve readability and reduce coupling. Configuration objects enable named parameters and future extensibility.

> **Code examples:** See [skills/code-review-spec/references/null-safety.md](../skills/code-review-spec/references/null-safety.md) and [function-parameters.md](../skills/code-review-spec/references/function-parameters.md)

---

### Principle 8: Code Quality Metrics

**Rule:** All code MUST meet measurable quality thresholds:
- **Code duplication:** Same code ≥3 occurrences MUST extract to common method; similar code ≥2 occurrences SHOULD extract
- **Magic numbers:** MUST define as constants/enums with UPPER_SNAKE_CASE naming — NO inline literals
- **Collection capacity:** MUST specify initial capacity when creating collections (avoid repeated expansion)
- **String concatenation:** MUST NOT use `+` in loops — use StringBuilder/join/concat methods
- **equals/hashCode:** MUST override both together when overriding either — maintain contract

**Rationale:** Quantified thresholds enable automated detection and consistent enforcement. Magic numbers obscure intent. Collection expansion causes memory churn. String loops create O(n²) temporary objects.

> **Code examples:** See individual references in [skills/code-review-spec/references/](../skills/code-review-spec/references/)

---

### Principle 9: Java Thread Pool Standards (Java Only)

**Rule:** All Java code MUST use custom thread pools with proper configuration:
- MUST NOT use default `ExecutorService` pools (`Executors.newFixedThreadPool()`) or `@Async` default pool
- MUST define meaningful thread names via `ThreadFactory` (e.g., `user-handler-%d`)
- MUST include business context in log messages for all thread pool operations
- MUST configure proper queue capacity, rejection policy, and exception handlers

**Rationale:** Anonymous thread pools prevent debugging and monitoring. Named threads enable issue tracing. Default pools hide configuration errors until production failures occur.

> **Code examples:** See [skills/code-review-spec/references/thread-pool.md](../skills/code-review-spec/references/thread-pool.md)

---

### Principle 10: Exception Handling Standards

**Rule:** All exception handling MUST follow disciplined patterns:
- MUST catch specific exception types — NEVER `Throwable`/`Exception`/`Error`
- MUST chain original exception when throwing new: `throw new BusinessException("msg", cause)`
- MUST log at minimum when catching — NO silent swallowing
- MUST NOT throw exceptions in `finally` blocks
- Use `RuntimeException` for programmer errors, checked exceptions for external failures

**Rationale:** Broad exception catching hides bugs. Exception chaining preserves debugging context. Silent swallowing corrupts system state. Proper categorization guides handling strategy.

> **Code examples:** See [skills/code-review-spec/references/exception-handling.md](../skills/code-review-spec/references/exception-handling.md)

---

## Governance

### Amendment Procedure

1. Propose amendment via issue or PR with clear rationale
2. Require approval from **2 core contributors** or majority vote
3. Update constitution with version bump according to semantic versioning
4. Propagate changes to dependent templates and documentation

### Versioning Policy

- **MAJOR:** Backward incompatible principle removals or redefinitions (e.g., removing a principle, changing from MUST to SHOULD)
- **MINOR:** New principle added or materially expanded guidance (e.g., adding Principle 11, expanding rules)
- **PATCH:** Clarifications, wording fixes, non-semantic refinements (e.g., typo correction, example updates)

### Compliance Review

- All PRs MUST be checked against constitution principles
- Violations MUST be flagged in review and resolved before merge
- Architecture decisions MUST reference relevant principle sections
- Code review reports MUST use the standardized checklist format from [skills/code-review-spec](../skills/code-review-spec/SKILL.md)

---

## Metadata

- **Constitution Version:** `1.1.0`
- **Ratification Date:** `2026-04-20`
- **Last Amended Date:** `2026-04-20`
- **Amendment History:** 
  - v1.0.0: Initial creation
  - v1.1.0: Added Principles 6-10, integrated code-review-spec references

---

## Template References

- **Plan Template:** `.specify/templates/plan-template.md` (pending)
- **Spec Template:** `.specify/templates/spec-template.md` (pending)
- **Tasks Template:** `.specify/templates/tasks-template.md` (pending)
- **Commands:** `.specify/templates/commands/*.md` (pending)

---

*This constitution is binding. Violations require explicit justification and approval process.*