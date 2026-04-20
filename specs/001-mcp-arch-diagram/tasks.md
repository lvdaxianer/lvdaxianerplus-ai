# Implementation Tasks: MCP Architecture Diagram Generator

> **Feature:** mcp-arch-diagram
> **Generated:** 2026-04-20
> **Total Tasks:** 45

---

## Task Checklist Format

All tasks follow: `- [ ] [TaskID] [P?] [Story?] Description with file path`

---

## Phase 1: Setup (Project Initialization)

**Goal:** Create project structure, install dependencies, configure build

**Independent Test Criteria:** 
- Project can be built with `npm run build`
- TypeScript compiles without errors
- MCP server can start with `node dist/index.js`

### Tasks

- [ ] T001 Create project directory structure at mcp/mcp-arch-diagram/
- [ ] T002 Initialize package.json with dependencies: @modelcontextprotocol/sdk, puppeteer, mermaid, yaml, uuid
- [ ] T003 Initialize tsconfig.json with TypeScript 5.x configuration
- [ ] T004 [P] Create src/config/types.ts with all type definitions from data-model.md
- [ ] T005 [P] Create src/config/defaults.ts with default configuration constants
- [ ] T006 Create config/default.yaml with server, output, metadata, logging sections
- [ ] T007 Create vitest.config.ts for unit testing setup
- [ ] T008 Add npm scripts: build, test, dev in package.json
- [ ] T009 Create README.md with installation and usage documentation
- [ ] T010 Create CHANGELOG.md for version history tracking
- [ ] T011 Create .gitignore for node_modules, dist, diagrams, logs
- [ ] T012 Run npm install to fetch all dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal:** Core infrastructure that all user stories depend on

**Independent Test Criteria:**
- MCP server responds to tool list request
- Logging writes to file with correct format
- Configuration loads from YAML

### Tasks

- [ ] T013 Create src/core/server.ts implementing McpServer class with stdio transport
- [ ] T014 Create src/core/protocol.ts implementing MCP request/response handling
- [ ] T015 Create src/core/tools.ts implementing tool registration router
- [ ] T016 [P] Create src/storage/file-store.ts implementing file save operations
- [ ] T017 [P] Create src/storage/metadata.ts implementing JSON metadata management
- [ ] T018 Create src/utils/logger.ts implementing structured logging with business identifiers
- [ ] T019 Create src/utils/config-loader.ts implementing YAML config parsing
- [ ] T020 Create src/index.ts as main entry point connecting all modules
- [ ] T021 Verify MCP server starts and logs startup message

---

## Phase 3: User Story 1 - Generate Diagram from Description

**Story:** US1 - Generate architecture diagram from natural language description

**Priority:** P1 (Highest)

**Requirements:** FR-001, FR-002, FR-003, FR-005

**Independent Test Criteria:**
- "web server → app server → database" produces correct diagram
- PNG and .d2 files both created in output directory
- Diagram metadata saved to metadata.json

### Tasks

#### Parser Layer

- [ ] T022 [US1] Create src/parser/nlp-parser.ts implementing keyword extraction for components
- [ ] T023 [US1] Create src/parser/validator.ts implementing diagram structure validation
- [ ] T024 [US1] Create src/parser/diagram-builder.ts constructing Diagram from parsed input

#### Renderer Layer

- [ ] T025 [P] [US1] Create src/renderer/d2-code-gen.ts generating D2 syntax from Diagram
- [ ] T026 [P] [US1] Create src/renderer/mermaid-code-gen.ts generating Mermaid syntax from Diagram
- [ ] T027 [US1] Create src/renderer/d2-engine.ts implementing D2 render strategy
- [ ] T028 [US1] Create src/renderer/mermaid-engine.ts implementing Mermaid render strategy
- [ ] T029 [US1] Create src/renderer/engine-strategy.ts implementing Strategy Pattern for engine selection
- [ ] T030 [US1] Create src/renderer/puppeteer-export.ts implementing PNG/SVG image export
- [ ] T031 [US1] Create src/renderer/exporter.ts coordinating code generation and image export

#### MCP Tool Integration

- [ ] T032 [US1] Implement generate_diagram tool handler in src/core/tools.ts
- [ ] T033 [US1] Add generate_diagram tool registration in src/core/server.ts

#### Tests (TDD)

- [ ] T034 [US1] Create tests/parser/nlp-parser.test.ts for keyword extraction tests
- [ ] T035 [US1] Create tests/renderer/d2-code-gen.test.ts for D2 generation tests
- [ ] T036 [US1] Create integration tests/tools/generate-diagram.test.ts for end-to-end test

---

## Phase 4: User Story 2 - Use Templates

**Story:** US2 - Generate diagram from predefined templates

**Priority:** P2

**Requirements:** FR-004

**Independent Test Criteria:**
- list_templates returns 5+ template entries
- Template "microservice" produces correct component layout
- User can fill template placeholders with custom names

### Tasks

#### Template Infrastructure

- [ ] T037 [US2] Create src/templates/index.ts implementing template loader
- [ ] T038 [US2] Create src/parser/template-matcher.ts implementing template selection logic

#### Template Files

- [ ] T039 [P] [US2] Create src/templates/deployment/microservice.yaml template file
- [ ] T040 [P] [US2] Create src/templates/deployment/three-tier.yaml template file
- [ ] T041 [P] [US2] Create src/templates/function/c4-model.yaml template file
- [ ] T042 [P] [US2] Create src/templates/business/ecommerce.yaml template file
- [ ] T043 [P] [US2] Create src/templates/deployment/kubernetes.yaml template file

#### MCP Tool Integration

- [ ] T044 [US2] Implement list_templates tool handler in src/core/tools.ts
- [ ] T045 [US2] Add template parameter handling in generate_diagram tool

#### Tests

- [ ] T046 [US2] Create tests/templates/template-loader.test.ts for template parsing tests
- [ ] T047 [US2] Create integration tests/tools/list-templates.test.ts for API test

---

## Phase 5: User Story 3 - Retrieve Diagrams

**Story:** US3 - Retrieve previously generated diagrams

**Priority:** P3

**Requirements:** FR-006

**Independent Test Criteria:**
- get_diagram returns stored image and code for valid ID
- Invalid ID returns error message without crash
- Metadata includes correct creation timestamp

### Tasks

#### Storage Enhancement

- [ ] T048 [US3] Enhance src/storage/metadata.ts with diagram lookup by ID
- [ ] T049 [US3] Enhance src/storage/file-store.ts with file retrieval operations

#### MCP Tool Integration

- [ ] T050 [US3] Implement get_diagram tool handler in src/core/tools.ts
- [ ] T051 [US3] Add get_diagram tool registration in src/core/server.ts

#### Tests

- [ ] T052 [US3] Create tests/storage/metadata.test.ts for retrieval tests
- [ ] T053 [US3] Create integration tests/tools/get-diagram.test.ts for API test

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal:** Documentation, error handling, performance optimization

### Tasks

- [ ] T054 Add comprehensive Javadoc comments to all methods (target: 60% comment ratio)
- [ ] T055 Verify all if-else branches have comments and else statements
- [ ] T056 Add input validation for user descriptions in src/parser/nlp-parser.ts
- [ ] T057 Verify no hardcoded secrets or paths in source code
- [ ] T058 Add Puppeteer warm-up on server start in src/renderer/puppeteer-export.ts
- [ ] T059 Add graceful error fallback (return code file if image render fails)
- [ ] T060 Run full test suite and verify 80%+ coverage
- [ ] T061 Run TypeScript lint check: methods ≤20 lines, files ≤350 lines
- [ ] T062 grep for console.log (should be 0), replace with logger calls
- [ ] T063 grep for catch(Exception/Error) (should be 0), use specific error types
- [ ] T064 Update README.md with complete usage examples
- [ ] T065 Add performance benchmark test (<10s for 10-component diagram)

---

## Dependencies

### User Story Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (US1: Generate Diagram) ← MVP Scope
    ↓
Phase 4 (US2: Templates) ← depends on US1 rendering
    ↓
Phase 5 (US3: Retrieve) ← depends on US1 storage
    ↓
Phase 6 (Polish)
```

### Critical Path

**MVP Scope:** Phase 1 + Phase 2 + Phase 3 (US1)
- This delivers the core value: generate diagrams from descriptions
- Templates and retrieval are enhancements

---

## Parallel Execution

### Phase 1 Parallel Opportunities

Tasks T004, T005 can run in parallel (different files, no dependencies)

### Phase 2 Parallel Opportunities

Tasks T016, T017 can run in parallel (different storage modules)

### Phase 3 (US1) Parallel Opportunities

Tasks T025, T026 can run in parallel (different renderers)
Tasks T039-T043 can run in parallel (different template files)

### Phase 4 (US2) Parallel Opportunities

All template YAML files (T039-T043) can run in parallel

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1 + Phase 2 + Phase 3 (US1)
2. Deploy and validate core functionality
3. Then add US2 (Templates) and US3 (Retrieve)

### Incremental Delivery

Each user story phase produces independently testable increment:
- **US1 Complete:** Users can generate diagrams from descriptions
- **US2 Complete:** Users can use templates for speed
- **US3 Complete:** Users can retrieve previous diagrams

---

## Verification Checklist

### Per-Story Verification

| Story | Test Command | Pass Criteria |
|-------|--------------|----------------|
| US1 | `npm test tests/integration/tools/generate-diagram.test.ts` | PNG + D2 files created |
| US2 | `npm test tests/integration/tools/list-templates.test.ts` | 5+ templates returned |
| US3 | `npm test tests/integration/tools/get-diagram.test.ts` | Stored diagram retrieved |

### Final Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| Coverage | `npm test -- --coverage` | ≥80% |
| Complexity | `eslint --max-lines 350` | No violations |
| Documentation | Manual review | 60%+ comment lines |
| Security | `grep -r "password\|secret\|token" src/` | No hardcoded secrets |

---

## Task Summary

| Phase | Task Count | Parallelizable |
|-------|------------|----------------|
| Phase 1: Setup | 12 | 2 |
| Phase 2: Foundational | 9 | 2 |
| Phase 3: US1 | 15 | 2 |
| Phase 4: US2 | 11 | 5 |
| Phase 5: US3 | 6 | 0 |
| Phase 6: Polish | 12 | 0 |
| **Total** | **65** | **11** |

---

*Tasks ready for implementation. Execute with subagent-driven development.*