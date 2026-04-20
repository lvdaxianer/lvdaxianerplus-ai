# MCP Tool Contracts

**Date:** 2026-04-20

**Service:** mcp-arch-diagram

---

## Tool: generate_diagram

**Purpose:** Generate architecture diagram from natural language description or template

### Input Schema

```json
{
  "name": "generate_diagram",
  "description": "根据描述生成架构图，支持自然语言描述或模板选择",
  "inputSchema": {
    "type": "object",
    "properties": {
      "description": {
        "type": "string",
        "description": "自然语言描述架构组件和关系，例如：画一个微服务架构，包含网关、订单服务、用户服务..."
      },
      "type": {
        "type": "string",
        "enum": ["deployment", "business", "function"],
        "description": "架构图类型（可选）"
      },
      "template": {
        "type": "string",
        "description": "使用预定义模板名称，例如：microservice, three-tier, c4-model"
      },
      "engine": {
        "type": "string",
        "enum": ["d2", "mermaid"],
        "default": "d2",
        "description": "渲染引擎（可选，默认 d2）"
      },
      "outputDir": {
        "type": "string",
        "default": "./diagrams",
        "description": "输出目录（可选，默认 ./diagrams）"
      },
      "imageFormat": {
        "type": "string",
        "enum": ["png", "svg"],
        "default": "png",
        "description": "图片格式（可选，默认 png）"
      }
    },
    "required": []
  }
}
```

**Parameter Rules:**
- If `template` provided: `description` used for component names only
- If no `template`: `description` required for full architecture description
- If neither provided: Tool returns error requesting clarification

### Output Schema

```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "生成是否成功"
    },
    "files": {
      "type": "object",
      "properties": {
        "image": {
          "type": "string",
          "description": "图片文件路径"
        },
        "code": {
          "type": "string",
          "description": "代码文件路径（.d2 或 .mmd）"
        }
      }
    },
    "preview": {
      "type": "string",
      "description": "图片预览（base64编码，可选）"
    },
    "message": {
      "type": "string",
      "description": "提示信息"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string" },
        "engine": { "type": "string" },
        "created": { "type": "string" }
      }
    }
  }
}
```

### Example Calls

**Call 1: Natural Language Description**
```json
{
  "description": "画一个微服务架构，包含网关、订单服务、用户服务、MySQL数据库和Redis缓存",
  "type": "deployment",
  "engine": "d2"
}
```

**Response:**
```json
{
  "success": true,
  "files": {
    "image": "./diagrams/arch-001.png",
    "code": "./diagrams/arch-001.d2"
  },
  "preview": "base64...",
  "message": "架构图生成成功",
  "metadata": {
    "id": "arch-001",
    "type": "deployment",
    "engine": "d2",
    "created": "2026-04-20T10:30:00Z"
  }
}
```

**Call 2: Template Selection**
```json
{
  "template": "microservice",
  "description": "gateway, order-service, payment-service, mysql"
}
```

**Response:**
```json
{
  "success": true,
  "files": {
    "image": "./diagrams/arch-002.png",
    "code": "./diagrams/arch-002.d2"
  },
  "message": "基于微服务模板生成成功"
}
```

---

## Tool: list_templates

**Purpose:** List available architecture diagram templates

### Input Schema

```json
{
  "name": "list_templates",
  "description": "获取可用的架构图模板列表",
  "inputSchema": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": ["deployment", "business", "function"],
        "description": "筛选特定类型的模板（可选）"
      }
    }
  }
}
```

### Output Schema

```json
{
  "type": "object",
  "properties": {
    "templates": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "type": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    }
  }
}
```

### Example Response

```json
{
  "templates": [
    {
      "name": "microservice",
      "type": "deployment",
      "description": "微服务架构模板：网关 + 多服务 + 数据库"
    },
    {
      "name": "three-tier",
      "type": "deployment",
      "description": "三层架构模板：Web层 + 应用层 + 数据层"
    },
    {
      "name": "c4-model",
      "type": "function",
      "description": "C4 模型模板：Context → Container → Component"
    },
    {
      "name": "ecommerce",
      "type": "business",
      "description": "电商业务架构：用户中心 + 商品中心 + 订单中心"
    }
  ]
}
```

---

## Tool: get_diagram

**Purpose:** Retrieve previously generated diagram

### Input Schema

```json
{
  "name": "get_diagram",
  "description": "获取已保存的架构图",
  "inputSchema": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "description": "架构图 ID（必填）"
      },
      "format": {
        "type": "string",
        "enum": ["image", "code", "both"],
        "default": "both",
        "description": "返回格式（可选，默认 both）"
      }
    },
    "required": ["id"]
  }
}
```

### Output Schema

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "image": {
      "type": "string",
      "description": "图片内容（base64 或文件路径）"
    },
    "code": {
      "type": "string",
      "description": "代码内容"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "type": { "type": "string" },
        "engine": { "type": "string" },
        "created": { "type": "string" }
      }
    },
    "error": {
      "type": "string",
      "description": "如果找不到，返回错误信息"
    }
  }
}
```

### Example Call

```json
{
  "id": "arch-001",
  "format": "both"
}
```

**Response (Success):**
```json
{
  "id": "arch-001",
  "image": "base64...",
  "code": "direction: right\n用户 -> 网关...",
  "metadata": {
    "type": "deployment",
    "engine": "d2",
    "created": "2026-04-20T10:30:00Z"
  }
}
```

**Response (Not Found):**
```json
{
  "id": "arch-999",
  "error": "找不到架构图 arch-999"
}
```

---

## Error Handling

| Error Code | Message | Cause |
|------------|---------|-------|
| INVALID_INPUT | "缺少描述或模板参数" | Neither description nor template provided |
| PARSE_FAILED | "无法解析描述内容" | Natural language parsing failed |
| RENDER_FAILED | "图片渲染失败，已返回代码文件" | Puppeteer render error |
| NOT_FOUND | "找不到架构图 {id}" | Invalid diagram ID |

---

*MCP tool contracts complete. Proceed to implementation.*