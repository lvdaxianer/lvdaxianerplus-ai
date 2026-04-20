# Implementation Plan: MCP Architecture Diagram Generator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

---

## Technical Context

**Feature:** MCP Architecture Diagram Generator (mcp-arch-diagram)

**Architecture:** Independent MCP service with layered architecture: Tool Layer (MCP protocol handling) → Parser Layer (natural language + template matching) → Renderer Layer (D2/Mermaid code generation + Puppeteer image export) → Storage Layer (local file + metadata management).

**Tech Stack:** 
- TypeScript 5.x
- @modelcontextprotocol/sdk (MCP protocol)
- Puppeteer 22.x (image rendering)
- Mermaid 10.x (diagram syntax)
- YAML 2.x (configuration)
- Vitest (testing)

**Key Decisions:**
- D2 as primary rendering engine (simpler syntax, AI-friendly), Mermaid as fallback
- Puppeteer内置渲染 (no external CLI dependencies)
- Local file storage with JSON metadata (simple, user-controllable)
- Template-based generation for common patterns (accelerate 80% use cases)

---

## Constitution Check

### Applicable Principles

| Principle | Application |
|-----------|-------------|
| **P1: Code Documentation** | All methods must have @param/@return/@author/@date; 60% comment ratio |
| **P2: Code Complexity** | Methods ≤20 lines; classes ≤350 lines; files ≤350 lines |
| **P3: Batch Processing** | No impact (no database/remote calls in loops) |
| **P4: Logging Standards** | Use `[业务标识] 消息内容` format; placeholders; no console.log |
| **P5: Security** | No secrets hardcoded; validate user input (diagram descriptions) |
| **P6: if-else Control** | All if must have else; Strategy Pattern for diagram type selection |
| **P7: Null Safety** | Use Optional/undefined for missing templates or failed renders |
| **P8: Quality Metrics** | No magic numbers (use constants for timeouts, sizes) |
| **P9: Thread Pool** | Not applicable (TypeScript, not Java) |
| **P10: Exception Handling** | Catch specific errors; chain exceptions; log failures |

### Gates

| Gate | Status | Notes |
|------|--------|-------|
| Documentation threshold | ⚠️ Design | Plan must enforce 60% comments in implementation |
| Complexity limits | ✅ Pass | Module design respects line limits |
| Security validation | ⚠️ Design | Input validation needed for user descriptions |
| Strategy Pattern | ⚠️ Design | Diagram type selection needs Strategy Pattern (3+ types) |

---

## Phase 0: Research

**Goal:** Validate technology choices and resolve design questions

### Research Tasks

| Task | Question | Decision |
|------|----------|----------|
| D2 vs Mermaid rendering | Which is better for AI-generated code? | D2: simpler syntax, fewer tokens, cleaner output |
| Puppeteer performance | First render latency acceptable? | Warm-up Chromium; cache renders; target <10s |
| Template structure | How to parameterize templates? | YAML-based template files with placeholders |
| MCP tool interface | stdio vs sse transport? | stdio default (Claude Code standard); sse optional |
| Natural language parsing | Rule-based vs AI parsing? | Rule-based first (keywords: 服务、数据库、网关); AI fallback for complex cases |

### Output: research.md

See [research.md](./research.md) for detailed findings.

---

## Phase 1: Design

### Data Model

**Core Entities:**

```typescript
// Diagram - generated visualization
interface Diagram {
  id: string;              // UUID
  type: DiagramType;       // deployment | business | function
  engine: Engine;          // d2 | mermaid
  components: Component[];
  relationships: Relationship[];
  createdAt: Date;
}

// Component - node in architecture
interface Component {
  id: string;
  name: string;
  type: ComponentType;     // service | database | module | gateway | cache
  position?: Position;     // optional layout override
}

// Relationship - connection
interface Relationship {
  sourceId: string;
  targetId: string;
  type: RelationType;      // dataflow | dependency | network | async
  label?: string;
}

// Template - predefined pattern
interface Template {
  name: string;
  type: DiagramType;
  structure: TemplateStructure;
  description: string;
}

// Output - generated artifact
interface Output {
  diagramId: string;
  imagePath: string;
  codePath: string;
  format: ImageFormat;     // png | svg
}
```

See [data-model.md](./data-model.md) for full definitions.

### Contracts

**MCP Tool Contracts:**

| Tool | Input | Output |
|------|-------|--------|
| `generate_diagram` | description, type?, template?, engine?, outputDir? | { success, files: {image, code}, preview?, message, metadata } |
| `list_templates` | type? | { templates: [{name, type, description}] } |
| `get_diagram` | id, format? | { id, image?, code?, metadata } |

See [contracts/mcp-tools.md](./contracts/mcp-tools.md) for full specifications.

### Quickstart

**Installation:**
```bash
npm install mcp-arch-diagram
```

**Claude Code Configuration:**
```json
{
  "mcpServers": {
    "arch-diagram": {
      "command": "node",
      "args": ["./node_modules/mcp-arch-diagram/dist/index.js"]
    }
  }
}
```

**Usage Example:**
```
User: Generate a microservice architecture diagram with gateway, order-service, user-service, and mysql
Claude: [calls generate_diagram]
Result: PNG saved to ./diagrams/arch-001.png
```

See [quickstart.md](./quickstart.md) for complete guide.

---

## Phase 2: Implementation Tasks

**See:** [tasks.md](./tasks.md) for detailed task breakdown

### Module Structure

```
mcp-arch-diagram/
├── src/
│   ├── core/           (MCP protocol handling)
│   ├── parser/         (NLP + template matching)
│   ├── renderer/       (D2/Mermaid + Puppeteer)
│   ├── templates/      (YAML template files)
│   ├── storage/        (File + metadata)
│   ├── config/         (Types + defaults)
│   └── index.ts
```

### Implementation Priority

1. **Core Layer** - MCP server, tools registration
2. **Renderer Layer** - D2 code generation, Puppeteer export
3. **Parser Layer** - Template matching, simple NLP
4. **Storage Layer** - File saving, metadata JSON
5. **Templates** - 5 predefined templates

---

## Verification

### Functional Verification

| Requirement | Test |
|-------------|------|
| FR-001: NLP generation | Test: "web server → app server → db" produces correct diagram |
| FR-002: 3 diagram types | Test: deployment/business/function render differently |
| FR-003: Dual output | Test: PNG + .d2 file both created |
| FR-004: Templates | Test: list_templates returns 5+ entries |
| FR-005: Local storage | Test: files saved to configured directory |
| FR-006: Retrieval | Test: get_diagram returns stored artifact |

### Constitution Verification

| Principle | Check |
|-----------|-------|
| P1: Documentation | Verify all methods have comments; count comment lines ≥60% |
| P2: Complexity | Lint check: methods ≤20 lines; files ≤350 lines |
| P4: Logging | grep for console.log (should be 0); check log format |
| P5: Security | Audit: no hardcoded paths/secrets; input validation present |
| P6: Strategy Pattern | Review diagram type selection implementation |
| P10: Exceptions | grep for catch(Exception) (should be 0); verify error chaining |

### Quality Metrics

- Unit test coverage: 80%+ (Vitest)
- Integration test: MCP tool invocation end-to-end
- Performance test: Generation <10s for 10-component diagram

---

## Artifacts Generated

| File | Purpose |
|------|---------|
| [research.md](./research.md) | Technology decisions and rationale |
| [data-model.md](./data-model.md) | Entity definitions and relationships |
| [contracts/mcp-tools.md](./contracts/mcp-tools.md) | MCP tool interface specifications |
| [quickstart.md](./quickstart.md) | User installation and usage guide |
| [tasks.md](./tasks.md) | Detailed implementation task list |

---

*Plan ready for implementation. Execute with `/speckit.tasks` or use subagent-driven development.*