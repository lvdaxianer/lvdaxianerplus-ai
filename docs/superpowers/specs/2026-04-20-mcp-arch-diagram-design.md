# mcp-arch-diagram 设计文档

> 架构图生成 MCP 服务的设计规范

---

## 1. 项目概述

### 1.1 背景

在软件开发过程中，架构图是沟通系统设计的重要工具。当前 Claude Code 缺少直接生成架构图的 MCP 工具，需要手动使用外部工具（如 draw.io、ProcessOn 等）。

### 1.2 目标

开发一个独立的 MCP 服务，支持 Claude 自动生成多种类型的架构图，输出图片和代码描述文件。

### 1.3 使用场景

- Claude Code 调用 MCP 自动生成架构图
- 用户通过 Claude 指定需求，快速获取可视化架构文档

---

## 2. 核心需求

### 2.1 支持的架构图类型

| 类型 | 描述 | 示例场景 |
|------|------|----------|
| **部署架构图** | 服务器、数据库、网络拓扑、云资源 | 微服务部署、K8s 集群拓扑 |
| **业务架构图** | 业务模块、组织结构、业务流程 | 电商业务模块、企业组织架构 |
| **功能架构图** | 系统分层、功能模块、模块依赖 | 三层架构、C4 模型 |

### 2.2 输入方式

| 方式 | 描述 | 示例 |
|------|------|------|
| **自然语言描述** | Claude 解析用户描述，自动提取组件和关系 | "画一个微服务架构，包含网关、订单服务、用户服务..." |
| **模板选择** | 使用预定义模板，填充具体参数 | 选择"微服务模板"，指定服务名称 |

### 2.3 输出格式

| 格式 | 描述 | 用途 |
|------|------|------|
| **PNG/SVG 图片** | 可直接查看和分享 | 文档嵌入、演示汇报 |
| **D2/Mermaid 代码** | 可在其他工具渲染 | GitHub Markdown、文档平台 |

---

## 3. 技术方案

### 3.1 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| **MCP 协议** | TypeScript + @modelcontextprotocol/sdk | 与 Claude Code 集成标准 |
| **渲染引擎** | D2（主） + Mermaid（辅） | D2 语法简洁，专为架构图设计；Mermaid 兼容 Markdown |
| **图片导出** | D2 CLI + Puppeteer | D2 原生支持 PNG/SVG 导出；Mermaid 通过 Puppeteer 渲染 |
| **存储** | 本地文件系统 | 简单可靠，用户可控 |

### 3.2 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code                            │
│                    (调用 MCP 工具)                           │
└─────────────────────────┬───────────────────────────────────┘
                          │ MCP Protocol (stdio/sse)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  mcp-arch-diagram                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │   工具层    │   解析层    │   渲染层    │   存储层    │ │
│  │             │             │             │             │ │
│  │ generate_   │ nlp-parser  │ d2-engine   │ file-store  │ │
│  │ diagram     │             │             │             │ │
│  │             │ template-   │ mermaid-    │ metadata    │ │
│  │ list_       │ matcher     │ engine      │             │ │
│  │ templates   │             │             │             │ │
│  │             │ validator   │ exporter    │             │ │
│  │ get_diagram │             │             │             │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │ 输出
                          ▼
          ┌───────────────┬───────────────┐
          │  PNG/SVG      │   .d2/.mmd    │
          │  图片文件     │   代码文件    │
          └───────────────┴───────────────┘
```

### 3.3 核心模块职责

#### 3.3.1 工具层 (core/)

- **server.ts** — MCP 服务入口，处理 stdio/sse 通信
- **tools.ts** — 工具注册，路由到对应处理函数
- **protocol.ts** — MCP 协议解析和响应构建

#### 3.3.2 解析层

- **nlp-parser.ts** — 自然语言解析，提取架构组件和关系
- **template-matcher.ts** — 模板匹配，识别用户意图
- **validator.ts** — 结构校验，确保解析结果合法

#### 3.3.3 渲染层

- **d2-engine.ts** — D2 代码生成和渲染调用
- **mermaid-engine.ts** — Mermaid 代码生成和渲染调用
- **exporter.ts** — 图片导出，调用 CLI 或 Puppeteer
- **code-gen.ts** — D2/Mermaid 代码生成器

#### 3.3.4 存储层

- **file-store.ts** — 文件存储管理，图片和代码文件保存
- **metadata.ts** — 元数据管理，记录生成历史

#### 3.3.5 模板层

- **templates/deployment/** — 部署架构模板（微服务、三层架构、K8s 等）
- **templates/business/** — 业务架构模板（电商、企业组织等）
- **templates/function/** — 功能架构模板（C4 模型、分层架构等）
- **templates/index.ts** — 模板加载器

---

## 4. MCP 工具定义

### 4.1 generate_diagram

**功能**：根据描述生成架构图

**输入参数**：

```typescript
interface GenerateDiagramParams {
  // 自然语言描述（必填，除非使用模板）
  description?: string;

  // 架构图类型（可选）
  type?: 'deployment' | 'business' | 'function';

  // 使用预定义模板（可选）
  template?: string;

  // 渲染引擎（可选，默认 d2）
  engine?: 'd2' | 'mermaid';

  // 输出目录（可选，默认 ./diagrams）
  outputDir?: string;

  // 图片格式（可选，默认 png）
  imageFormat?: 'png' | 'svg';
}
```

**返回结果**：

```typescript
interface GenerateDiagramResult {
  success: boolean;

  // 生成的文件路径
  files: {
    image: string;   // 图片文件路径
    code: string;    // 代码文件路径
  };

  // 图片预览（可选，base64）
  preview?: string;

  // 提示信息
  message: string;

  // 元数据
  metadata: {
    id: string;
    type: string;
    engine: string;
    created: string;
  };
}
```

### 4.2 list_templates

**功能**：获取可用的架构图模板列表

**输入参数**：

```typescript
interface ListTemplatesParams {
  // 筛选特定类型的模板（可选）
  type?: 'deployment' | 'business' | 'function';
}
```

**返回结果**：

```typescript
interface ListTemplatesResult {
  templates: Array<{
    name: string;
    type: string;
    description: string;
    preview?: string;  // 模板预览图（可选）
  }>;
}
```

### 4.3 get_diagram

**功能**：获取已保存的架构图

**输入参数**：

```typescript
interface GetDiagramParams {
  // 架构图 ID（必填）
  id: string;

  // 返回格式（可选，默认 both）
  format?: 'image' | 'code' | 'both';
}
```

**返回结果**：

```typescript
interface GetDiagramResult {
  id: string;

  // 图片内容（base64 或文件路径）
  image?: string;

  // 代码内容
  code?: string;

  // 元数据
  metadata: {
    type: string;
    engine: string;
    created: string;
  };
}
```

---

## 5. 项目目录结构

```
mcp-arch-diagram/
├── src/
│   ├── core/
│   │   ├── server.ts          // MCP 服务入口
│   │   ├── tools.ts           // 工具注册与处理
│   │   └── protocol.ts        // MCP 协议处理
│   │
│   ├── parser/
│   │   ├── nlp-parser.ts      // 自然语言解析
│   │   ├── template-matcher.ts // 模板匹配
│   │   └── validator.ts       // 结构校验
│   │
│   ├── renderer/
│   │   ├── d2-engine.ts       // D2 渲染引擎
│   │   ├── mermaid-engine.ts  // Mermaid 渲染引擎
│   │   ├── exporter.ts        // 图片导出
│   │   └── code-gen.ts        // D2/Mermaid 代码生成
│   │
│   ├── templates/
│   │   ├── deployment/        // 部署架构模板
│   │   ├── business/          // 业务架构模板
│   │   ├── function/          // 功能架构模板
│   │   └── index.ts           // 模板加载器
│   │
│   ├── storage/
│   │   ├── file-store.ts      // 文件存储管理
│   │   └── metadata.ts        // 元数据管理
│   │
│   ├── config/
│   │   ├── types.ts           // 类型定义
│   │   └── defaults.ts        // 默认配置
│   │
│   └── index.ts               // 主入口
│
├── config/
│   └── default.yaml           // 默认配置文件
│
├── diagrams/                  // 输出目录（默认）
│
├── package.json
├── tsconfig.json
├── README.md
└── CHANGELOG.md
```

---

## 6. 技术依赖

### 6.1 运行时依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| @modelcontextprotocol/sdk | ^1.0.0 | MCP 协议实现 |
| yaml | ^2.3.0 | 配置文件解析 |
| uuid | ^9.0.0 | 生成唯一 ID |

### 6.2 外部工具依赖

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| D2 CLI | D2 渲染 | `brew install d2` 或 `go install` |
| Puppeteer | Mermaid 渲染 | npm 安装，随项目部署 |

### 6.3 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| typescript | ^5.0.0 | 类型检查 |
| vitest | ^1.0.0 | 单元测试 |
| @types/node | ^20.0.0 | Node.js 类型定义 |

---

## 7. 配置设计

### 7.1 配置文件结构 (config/default.yaml)

```yaml
# 服务配置
server:
  transport: stdio  # stdio | sse
  ssePort: 11114

# 输出配置
output:
  dir: ./diagrams
  imageFormat: png  # png | svg
  defaultEngine: d2  # d2 | mermaid

# 元数据存储
metadata:
  file: ./diagrams/metadata.json
  maxRecords: 100

# 日志配置
logging:
  level: info
  file: ./logs/mcp-arch-diagram.log
```

---

## 8. 实现计划

### Phase 1: 基础框架

- 创建项目目录结构
- 实现 MCP 服务入口
- 定义类型和配置

### Phase 2: 渲染引擎

- 实现 D2 代码生成器
- 实现 D2 CLI 调用和图片导出
- 实现 Mermaid 代码生成器（可选）

### Phase 3: 解析与模板

- 实现自然语言解析器
- 实现预定义模板（3-5 个常用模板）
- 实现模板匹配逻辑

### Phase 4: 存储与完善

- 实现文件存储管理
- 实现元数据管理
- 完善错误处理和日志

### Phase 5: 测试与文档

- 单元测试覆盖率 80%+
- 编写 README 和使用示例
- 集成测试

---

## 9. 验收标准

### 9.1 功能验收

- [ ] generate_diagram 可生成三种类型架构图
- [ ] 输出 PNG 图片和 D2/Mermaid 代码文件
- [ ] 支持自然语言描述和模板选择两种输入方式
- [ ] list_templates 返回可用模板列表
- [ ] get_diagram 可获取已保存的架构图

### 9.2 质量验收

- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有方法有完整注释（@param、@return、@author、@date）
- [ ] 注释行数 ≥ 总行数 60%
- [ ] 方法行数 ≤ 20 行
- [ ] 无 console.log，使用日志库

---

## 10. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| D2 CLI 未安装 | 无法渲染图片 | 启动时检查，提示安装；降级返回代码文件 |
| 自然语言解析不准确 | 架构图不符合预期 | 提供模板选择兜底；支持用户修正 |
| 图片导出失败 | 无法生成 PNG | 返回代码文件作为备选；记录错误日志 |

---

## 11. 后续扩展

- 支持更多架构图模板（K8s、云原生等）
- 支持架构图编辑（增量修改）
- 支持云端存储和分享
- 支持更多渲染引擎（Graphviz、PlantUML）

---

@author lvdaxianerplus
@date 2026-04-20