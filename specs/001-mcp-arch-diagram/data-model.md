# Data Model: MCP Architecture Diagram Generator

**Date:** 2026-04-20

---

## Core Entities

### Diagram

**Description:** A generated architecture visualization with all metadata

**Attributes:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Unique identifier |
| type | DiagramType | Yes | deployment \| business \| function |
| engine | Engine | Yes | d2 \| mermaid |
| components | Component[] | Yes | List of architecture nodes |
| relationships | Relationship[] | Yes | List of connections |
| description | string | No | Original user description |
| createdAt | Date | Yes | Generation timestamp |
| outputDir | string | Yes | Where files were saved |

**Validation Rules:**
- id must be valid UUID format
- type must be one of three enum values
- components.length must be ≥ 1
- relationships must reference existing component IDs

---

### Component

**Description:** A node in the architecture (service, database, module, etc.)

**Attributes:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique within diagram |
| name | string | Yes | Display label |
| type | ComponentType | Yes | See ComponentType enum |
| position | Position | No | Optional layout override |

**ComponentType Enum:**

| Value | Icon | Use Case |
|-------|------|----------|
| service | 📦 | Microservice, backend service |
| database | 🗄️ | MySQL, PostgreSQL, MongoDB |
| gateway | 🔀 | API Gateway, Load Balancer |
| cache | ⚡ | Redis, Memcached |
| module | 📁 | Business module, feature unit |
| cloud | ☁️ | AWS, GCP, Azure resource |
| client | 👤 | User, browser, mobile app |
| queue | 📨 | Kafka, RabbitMQ |

---

### Relationship

**Description:** A connection between two components

**Attributes:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sourceId | string | Yes | Reference to source Component.id |
| targetId | string | Yes | Reference to target Component.id |
| type | RelationType | Yes | See RelationType enum |
| label | string | No | Connection description (e.g., "HTTP", "TCP") |

**RelationType Enum:**

| Value | Arrow Style | Meaning |
|-------|-------------|---------|
| dataflow | → | Data flows from source to target |
| dependency | --→ | Source depends on target |
| network | ⟶ | Network connection |
| async | ⟶⟶ | Asynchronous communication |
| bidirectional | ↔ | Two-way communication |

**Validation:**
- sourceId and targetId must exist in components array
- Self-connections (sourceId === targetId) not allowed

---

### Template

**Description:** Predefined architecture pattern for quick generation

**Attributes:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Template identifier (e.g., "microservice") |
| type | DiagramType | Yes | deployment \| business \| function |
| description | string | Yes | Human-readable description |
| structure | TemplateStructure | Yes | Component layout definition |
| placeholders | string[] | Yes | Dynamic field names |

**TemplateStructure:**

```typescript
interface TemplateStructure {
  components: TemplateComponent[];
  connections: TemplateConnection[];
  styling?: TemplateStyling;
}

interface TemplateComponent {
  type: ComponentType;
  placeholder?: string;  // e.g., "component1"
  position?: Position;
  required: boolean;
}

interface TemplateConnection {
  from: string;  // component id or placeholder
  to: string;
  relationType: RelationType;
}
```

---

### Output

**Description:** Generated diagram artifact files

**Attributes:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| diagramId | string | Yes | Reference to Diagram.id |
| imagePath | string | Yes | PNG/SVG file path |
| codePath | string | Yes | D2/MMD file path |
| format | ImageFormat | Yes | png \| svg |
| size | number | No | File size in bytes |

---

### Position (Optional)

**Description:** Layout override for manual positioning

**Attributes:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| x | number | Yes | Horizontal position (0-1000) |
| y | number | Yes | Vertical position (0-1000) |

---

## Entity Relationships

```
Diagram
  └── components: Component[]
  └── relationships: Relationship[]
  └── outputs: Output[]

Template
  └── structure.components: TemplateComponent[]
  └── structure.connections: TemplateConnection[]

Relationship
  └── sourceId → Component.id
  └── targetId → Component.id

Output
  └── diagramId → Diagram.id
```

---

## State Transitions

### Diagram Generation Flow

```
UserDescription
    │
    ▼
Parsing (→ {components, relationships})
    │
    ▼
CodeGeneration (→ D2/Mermaid code)
    │
    ▼
ImageRender (→ PNG/SVG)
    │
    ▼
Storage (→ Diagram + Output)
```

### Template Instantiation

```
TemplateSelection
    │
    ▼
ParameterFill (→ concrete components)
    │
    ▼
CodeGeneration (→ diagram code)
    │
    ▼
[Same as above]
```

---

## TypeScript Interface Definitions

```typescript
// Enums
type DiagramType = 'deployment' | 'business' | 'function';
type Engine = 'd2' | 'mermaid';
type ComponentType = 'service' | 'database' | 'gateway' | 'cache' | 'module' | 'cloud' | 'client' | 'queue';
type RelationType = 'dataflow' | 'dependency' | 'network' | 'async' | 'bidirectional';
type ImageFormat = 'png' | 'svg';

// Core Entities
interface Diagram {
  id: string;
  type: DiagramType;
  engine: Engine;
  components: Component[];
  relationships: Relationship[];
  description?: string;
  createdAt: Date;
  outputDir: string;
}

interface Component {
  id: string;
  name: string;
  type: ComponentType;
  position?: Position;
}

interface Relationship {
  sourceId: string;
  targetId: string;
  type: RelationType;
  label?: string;
}

interface Position {
  x: number;
  y: number;
}

// Template
interface Template {
  name: string;
  type: DiagramType;
  description: string;
  structure: TemplateStructure;
  placeholders: string[];
}

// Output
interface Output {
  diagramId: string;
  imagePath: string;
  codePath: string;
  format: ImageFormat;
  size?: number;
}
```

---

*Data model complete. Proceed to contracts definition.*