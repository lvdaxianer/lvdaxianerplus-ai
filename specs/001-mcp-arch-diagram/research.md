# Research: MCP Architecture Diagram Generator

**Date:** 2026-04-20

**Feature:** mcp-arch-diagram

---

## Research Tasks & Findings

### R1: D2 vs Mermaid Rendering Engine

**Question:** Which diagram syntax is better for AI-generated code?

**Decision:** D2 as primary, Mermaid as fallback

**Rationale:**
| Aspect | D2 | Mermaid |
|--------|----|---------|
| Syntax complexity | Simple, declarative | More verbose |
| AI token efficiency | ~30% fewer tokens | Higher token cost |
| Architecture focus | Designed for architecture | General-purpose flowcharts |
| Output quality | Professional, clean | Acceptable but less polished |
| Markdown support | Requires renderer | GitHub native |

**Alternatives Considered:**
- Graphviz/DOT: Too verbose, complex syntax
- PlantUML: Java-centric, requires server
- Structurizr: C4-only, limited flexibility

---

### R2: Puppeteer Performance & Optimization

**Question:** Is first render latency (<10s target) achievable?

**Decision:** Yes, with warm-up strategy

**Rationale:**
- Cold Puppeteer start: 2-3 seconds (Chromium launch)
- Warm instance: 100-500ms per render
- Strategy: Launch Chromium once on MCP server start; keep alive for subsequent renders
- Cache: Store rendered images; skip re-render for identical descriptions

**Implementation:**
```typescript
// Warm-up on server start
let browser: Browser | null = null;

async function warmupBrowser(): Promise<void> {
  browser = await puppeteer.launch({ headless: true });
}

// Reuse for renders
async function render(code: string): Promise<Buffer> {
  if (!browser) {
    browser = await puppeteer.launch({ headless: true });
  }
  // render logic...
}
```

---

### R3: Template Structure & Parameterization

**Question:** How to structure templates for easy customization?

**Decision:** YAML-based templates with placeholder syntax

**Rationale:**
- YAML readable by both humans and AI
- Placeholders like `{component1}`, `{component2}` for dynamic names
- Type-specific styling in template file
- Easy to add new templates without code changes

**Template Example (microservice.yaml):**
```yaml
name: microservice
type: deployment
description: 微服务架构模板
structure:
  gateway: {type: gateway, position: top}
  services: [{type: service, placeholder: component}]
  database: {type: database, position: bottom}
connections:
  - gateway → services (all)
  - services → database (all)
```

---

### R4: MCP Transport Protocol

**Question:** stdio vs SSE transport for Claude Code integration?

**Decision:** stdio default, SSE optional

**Rationale:**
- Claude Code standard uses stdio
- stdio simpler, no port management
- SSE useful for debugging (can inspect in browser)
- Both supported by @modelcontextprotocol/sdk

**Implementation:**
```yaml
# config/default.yaml
server:
  transport: stdio
  ssePort: 11114  # only used if transport: sse
```

---

### R5: Natural Language Parsing Strategy

**Question:** Rule-based keyword matching vs AI semantic parsing?

**Decision:** Hybrid approach - rule-based first, simple patterns

**Rationale:**
- Keyword matching handles 80% of cases:
  - "服务" → service component
  - "数据库" → database component
  - "网关" → gateway component
  - "连接"、"调用" → relationship
- Simple regex patterns for structure (A → B → C)
- No external AI API needed (reduce latency/dependency)
- Fallback: return code file if image render fails

**Parsing Logic:**
```typescript
// Keyword mapping
const COMPONENT_KEYWORDS = {
  '服务': 'service',
  '数据库': 'database',
  '网关': 'gateway',
  '缓存': 'cache',
  '模块': 'module'
};

// Relationship keywords
const RELATION_KEYWORDS = {
  '连接': 'network',
  '调用': 'dependency',
  '发送': 'dataflow',
  '异步': 'async'
};
```

---

### R6: Error Handling & Graceful Degradation

**Question:** How to handle render failures?

**Decision:** Return code file as fallback; log error

**Rationale:**
- Image render may fail (browser crash, memory limit)
- Code file (.d2/.mmd) always generated first
- User can render code elsewhere if image fails
- Log error for debugging

**Fallback Chain:**
1. Generate code → Save code file
2. Render image → If success, save PNG
3. If image fails → Return code file path + error message

---

## Summary

| Decision | Choice | Confidence |
|----------|--------|------------|
| Primary engine | D2 | High |
| Image rendering | Puppeteer (warm) | High |
| Template format | YAML + placeholders | High |
| Transport | stdio default | High |
| NLP parsing | Rule-based keywords | Medium |
| Error fallback | Code file | High |

---

*All NEEDS CLARIFICATION items resolved. Proceed to Phase 1 design.*