# Quickstart: MCP Architecture Diagram Generator

**Service:** mcp-arch-diagram

**Version:** 1.0.0

---

## Installation

### npm Installation

```bash
npm install mcp-arch-diagram
```

### Claude Code Configuration

Add to your Claude Code MCP configuration (`~/.claude/mcp.json` or project `.mcp.json`):

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

### Alternative: Direct Path

```json
{
  "mcpServers": {
    "arch-diagram": {
      "command": "node",
      "args": ["/path/to/mcp-arch-diagram/dist/index.js"]
    }
  }
}
```

---

## Basic Usage

### 1. Generate Diagram from Description

**User Prompt:**
```
生成一个部署架构图，包含：网关、订单服务、用户服务、MySQL数据库
```

**Claude Response:**
```
我已生成架构图：
- 图片：./diagrams/arch-001.png
- 代码：./diagrams/arch-001.d2

[架构图预览]
```

### 2. Generate from Template

**User Prompt:**
```
使用微服务模板生成架构图，组件：gateway, order-service, payment-service, redis
```

**Claude Response:**
```
基于微服务模板生成成功：
- 图片：./diagrams/arch-002.png
```

### 3. List Available Templates

**User Prompt:**
```
查看可用的架构图模板
```

**Claude Response:**
```
可用模板：
1. microservice - 微服务架构模板
2. three-tier - 三层架构模板
3. c4-model - C4 模型模板
4. ecommerce - 电商业务架构模板
```

### 4. Retrieve Previous Diagram

**User Prompt:**
```
获取我之前生成的架构图 arch-001
```

**Claude Response:**
```
架构图 arch-001：
- 类型：deployment
- 创建时间：2026-04-20 10:30
[显示图片]
```

---

## Configuration

### Default Configuration (config/default.yaml)

```yaml
server:
  transport: stdio
  ssePort: 11114

output:
  dir: ./diagrams
  imageFormat: png
  defaultEngine: d2

metadata:
  file: ./diagrams/metadata.json
  maxRecords: 100

logging:
  level: info
  file: ./logs/mcp-arch-diagram.log
```

### Custom Configuration

Create `mcp-arch-diagram.yaml` in your project root:

```yaml
output:
  dir: ./docs/architecture  # Custom output directory
  imageFormat: svg          # Use SVG for scalability
  defaultEngine: mermaid    # Use Mermaid for GitHub compatibility
```

---

## Output Structure

Generated files are saved to configured directory:

```
./diagrams/
├── arch-001.png      # PNG image
├── arch-001.d2       # D2 source code
├── arch-002.png
├── arch-002.d2
└── metadata.json     # Generation history
```

---

## Supported Diagram Types

| Type | Description | Best For |
|------|-------------|----------|
| **deployment** | Servers, databases, network topology | Infrastructure docs, DevOps |
| **business** | Business modules, organization structure | Business analysis, stakeholder docs |
| **function** | System layers, module dependencies | Developer docs, architecture reviews |

---

## Supported Component Keywords

Natural language parsing recognizes these keywords:

| Keyword (中文) | Component Type |
|---------------|----------------|
| 服务、微服务 | service |
| 数据库、DB | database |
| 网关、Gateway | gateway |
| 缓存、Redis | cache |
| 模块 | module |
| 云、AWS、云服务 | cloud |
| 用户、客户端 | client |
| 消息队列、MQ | queue |

| Relationship Keyword | Connection Type |
|---------------------|-----------------|
| 连接、调用 | dependency |
| 发送、传输 | dataflow |
| 网络 | network |
| 异步 | async |

---

## Examples

### Example 1: Microservice Architecture

**Input:**
```
生成部署架构图：网关连接订单服务和用户服务，订单服务和用户服务都连接MySQL数据库和Redis缓存
```

**Generated D2 Code:**
```d2
direction: right

Gateway -> OrderService: 路由
Gateway -> UserService: 路由
OrderService -> MySQL: 存储
UserService -> MySQL: 存储
OrderService -> Redis: 缓存
UserService -> Redis: 缓存
```

### Example 2: Three-Tier Architecture

**Input:**
```
使用三层架构模板，Web层、应用层、数据库层
```

**Generated Structure:**
- Top: Web层
- Middle: 应用层
- Bottom: 数据库层
- Connections: Web → App → Database

---

## Troubleshooting

### Issue: Diagram Not Generated

**Cause:** Description too vague or missing

**Solution:** Provide specific components and relationships

```
❌ "画一个架构图"
✅ "画一个部署架构图，包含：网关、服务A、服务B、数据库"
```

### Issue: Image Render Failed

**Cause:** Puppeteer memory limit or timeout

**Solution:** Tool returns code file (.d2/.mmd) as fallback; you can render manually:
```bash
d2 arch-001.d2 arch-001.png
```

### Issue: Template Not Found

**Cause:** Invalid template name

**Solution:** Use `list_templates` to see available templates

---

## Next Steps

- Configure output directory for your project
- Explore available templates with `list_templates`
- Try generating your first architecture diagram
- Review generated D2/Mermaid code for customization

---

*Quickstart complete. Ready for implementation.*