# MCP HTTP Gateway

[English](README.md)

一个基于 MCP 协议的 HTTP 网关服务，将 LLM 工具调用请求转发到 HTTP REST 接口。

---

## 功能概览

| 功能类别 | 核心能力 | 说明 |
|----------|----------|------|
| **请求转发** | HTTP REST 转发 | 将 MCP 工具调用转发到后端 HTTP API，支持 GET/POST/PUT/DELETE |
| **请求转发** | 增强模板转换 | 变量替换、嵌套访问、表达式计算、默认值填充 |
| **请求转发** | 链路追踪 ID | 唯一 Trace ID，日志关联，响应头返回，后端传递 |
| **容灾机制** | 熔断器 (Circuit Breaker) | 防止故障扩散，CLOSED/OPEN/HALF_OPEN 状态流转 |
| **容灾机制** | 降级策略 (Fallback) | 缓存兜底 + Mock 兜底，确保用户获得响应 |
| **容灾机制** | 尝试次数限制 | 限制可选参数工具的尝试次数，避免浪费 token |
| **流量控制** | 请求限流 (Rate Limit) | 令牌桶/滑动窗口算法，防止后端被压垮 |
| **流量控制** | 工具级限流 | 单个工具独立限流配置，优先级高于全局 |
| **流量控制** | 并发控制 (Concurrency) | 最大并发数限制 + 等待队列，防止资源耗尽 |
| **流量控制** | 队列超时 | 等待超时自动返回错误，避免无限等待 |
| **流量控制** | 超时强制中断 | AbortController 强制中断，防止请求挂起 |
| **流量控制** | 工具级超时 | 单个工具超时配置，优先级高于全局 |
| **缓存机制** | LRU 缓存 | 缓存 GET 请求响应，支持 TTL 和工具级配置 |
| **缓存机制** | TTL=0 永不过期 | 用于降级场景，缓存数据永久保留 |
| **Mock 模式** | 全局 Mock | 全局开关，所有请求返回 Mock 数据 |
| **Mock 模式** | 工具级 Mock | 单个工具 Mock 配置，支持静态/动态/AI 生成 |
| **日志记录** | SQLite 日志 | 请求、响应、错误日志完整记录 |
| **日志记录** | Dashboard 面板 | 实时监控、日志查询、配置管理 |
| **日志记录** | Trace 日志 | 链路追踪日志，支持按 ID/工具查询 |
| **配置管理** | 工具级配置持久化 | 缓存/Mock 配置持久化到 SQLite |
| **配置管理** | 配置优先级 | CLI > SQLite > 配置文件 > 默认值 |
| **传输模式** | STDIO 模式 | Claude Code 自动管理进程 |
| **传输模式** | SSE 模式 | 持久连接，避免端口冲突（推荐） |

---

## Dashboard 预览

![Dashboard](docs/dashboard.png)

Dashboard 提供实时监控功能：
- **统计指标**：总请求数、成功率、错误数、平均延迟
- **熔断器状态**：可视化表格显示 CLOSED/OPEN/HALF_OPEN 状态
- **缓存状态**：已缓存条目数和最大容量
- **最近请求**：最近 10 条请求，包含状态、方法、URL、响应时间

### 如何查看 Dashboard

**默认地址**：`http://localhost:11112/dashboard`

**重要提示**：如果端口 `11112` 已被占用，服务会自动处理：
1. 杀死占用该端口的老进程（同类 node 进程自动清理）
2. 或尝试下一个可用端口（如 `11113`、`11114`）

**确认实际端口**：
- **控制台日志**：查找 `[启动] Dashboard available {"url":"http://localhost:XXXX/dashboard"}`
- **页面徽章**：Dashboard 页面顶部绿色徽章显示 `端口: XXXXX`
- **健康检查**：访问 `http://localhost:XXXX/health` 查看服务信息

**端口调整示例**：
```
[WARN] [端口检测] 端口被占用 {"port":11112,"pid":xxx}
[INFO] [端口检测] 使用备用端口 {"originalPort":11112,"newPort":11113}
[INFO] [启动] Dashboard available {"url":"http://localhost:11113/dashboard"}
```

---

## MCP 配置方式

### 方式一：SSE 模式（推荐，持久连接）

**优点**：一次启动，多次会话共享，避免端口冲突。

#### 本地项目配置

在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "http-gateway": {
      "type": "sse",
      "url": "http://localhost:11113/sse",
      "description": "HTTP API 网关"
    }
  }
}
```

启动服务：

```bash
cd mcp/mcp-http-gateway
node dist/cli.cjs --transport=sse --sse-port=11113 test.tools.filtered.json
```

#### npx 方式配置

```json
{
  "mcpServers": {
    "http-gateway": {
      "type": "sse",
      "url": "http://localhost:11113/sse"
    }
  }
}
```

启动命令：

```bash
npx -y @lvdaxianer/mcp-http-gateway --transport=sse --sse-port=11113 --config /path/to/tools.json
```

### 方式二：STDIO 模式（每次会话启动新进程）

**优点**：无需手动启动，Claude Code 自动管理。

#### 本地项目配置

```json
{
  "mcpServers": {
    "http-gateway": {
      "command": "node",
      "args": ["mcp/mcp-http-gateway/dist/cli.cjs", "--config", "mcp/mcp-http-gateway/tools.json"],
      "cwd": "/absolute/path/to/project/root"
    }
  }
}
```

#### npx 方式配置

```json
{
  "mcpServers": {
    "http-gateway": {
      "command": "npx",
      "args": ["-y", "@lvdaxianer/mcp-http-gateway", "--config", "/absolute/path/to/tools.json"]
    }
  }
}
```

---

## 核心能力详解

### 1. HTTP 请求转发

将 MCP 工具调用转发到后端 HTTP REST API，支持完整的 HTTP 方法。

**支持方法**：GET、POST、PUT、DELETE、PATCH

**路径模板**：支持 `{param}` 动态路径参数

```json
{
  "getUser": {
    "method": "GET",
    "path": "/user/{userId}",
    "queryParams": {
      "userId": { "description": "用户ID", "type": "string", "required": true }
    }
  }
}
```

**请求头管理**：支持自定义请求头和 Token 认证

```json
{
  "tokens": {
    "default": "your-api-token",
    "admin": "admin-api-token"
  }
}
```

---

### 2. 熔断器（Circuit Breaker）

防止故障扩散，保护后端服务稳定性。

```json
{
  "circuitBreaker": {
    "enabled": true,
    "failureThreshold": 5,    // 连续失败 5 次触发熔断
    "successThreshold": 2,    // 连续成功 2 次恢复
    "halfOpenTime": 30000     // 熔断后 30s 尝试恢复
  }
}
```

**状态流转**：
- `CLOSED` → 正常状态，请求正常转发
- `OPEN` → 熔断状态，拒绝所有请求，触发降级
- `HALF_OPEN` → 半开状态，允许少量请求探测恢复

---

### 3. 降级策略（Fallback）

**触发场景**：
- 后端服务不可用（超时、连接失败）
- 熔断器处于 OPEN 状态
- HTTP 状态码 ≥ 500

**降级链路**：

```
请求失败 → 缓存兜底（忽略 TTL） → Mock 兜底 → 返回错误
```

**配置示例**：

```json
{
  "fallback": {
    "enabled": true,
    "useExpiredCache": true,  // 使用过期缓存兜底
    "useMockAsFallback": true // 使用 Mock 数据兜底
  }
}
```

**降级优先级**：
1. 优先使用缓存数据（即使过期）
2. 缓存不存在时使用 Mock 数据
3. Mock 不存在时返回错误信息

---

### 4. 缓存机制（Cache）

缓存 GET 请求响应，用于降级备用（非查询加速）。

```json
{
  "cache": {
    "enabled": true,
    "ttl": 60000,     // 缓存有效期 60 秒
    "maxSize": 1000   // 最大缓存条目数
  }
}
```

**特殊配置**：`ttl=0` 表示永不过期，适用于降级场景。

**工具级缓存配置**（优先级高于全局配置）：

```json
{
  "tools": {
    "getUser": {
      "cache": {
        "enabled": true,
        "ttl": 0,        // 0 表示永不过期（用于降级场景）
        "maxSize": 1000
      }
    }
  }
}
```

---

### 5. Mock 模式（测试模拟）

支持全局 Mock 和工具级 Mock，用于测试和降级。

```json
{
  "mock": {
    "enabled": true,   // 全局 Mock 开关
    "mockData": {
      "getUser": {
        "enabled": true,
        "statusCode": 200,
        "response": {"id": "123", "name": "Test User"}
      }
    }
  }
}
```

**Mock 类型**：
- **静态响应**：直接返回预设数据
- **动态模板**：支持 `{param}`、`{timestamp}`、`{uuid}` 变量
- **AI 生成**：通过 `aiHint` 语义提示生成模拟数据

---

### 6. SQLite 日志记录

完整记录 MCP 工具调用的请求和响应详情。

```json
{
  "sqlite": {
    "enabled": true,
    "dbPath": "/absolute/path/to/logs.db",
    "maxDays": 30
  }
}
```

**记录内容**：
- **请求日志**：工具名、HTTP 方法、URL、请求头、请求体
- **响应日志**：HTTP 状态码、响应体、耗时
- **错误日志**：错误类型、错误堆栈

---

### 7. Dashboard 监控面板

实时监控 MCP 工具调用状态。

**访问地址**：`http://localhost:11112/dashboard`

**功能**：
- 工具调用统计（成功/失败率、Top 工具）
- 请求日志查询（分页、按日期/工具筛选）
- 缓存状态查看（条目数、TTL）
- Mock 配置管理
- 配置热更新（无需重启）

---

### 8. 工具级配置持久化

工具级缓存、Mock 配置持久化到 SQLite，优先级机制：

| 场景 | 行为 |
|------|------|
| **首次启动**（数据库无配置） | 同步配置文件到 SQLite |
| **后续启动**（数据库有配置） | 使用 SQLite 配置，**忽略配置文件** |

**首次启动日志**：
```
[工具缓存] Database empty, syncing from config file
```

**后续启动日志**：
```
[工具缓存] Using database configs, ignoring config file
```

---

### 9. 尝试次数限制（Attempt Tracking）

限制大模型对可选参数工具的尝试次数，避免浪费 token。

```json
{
  "maxAttempts": 3,
  "attemptTracking": {
    "enabled": true,
    "showMetadata": true
  }
}
```

**返回增强**：失败时返回 `metadata` 字段：
```json
{
  "error": "服务不可用",
  "metadata": {
    "attempt_count": 2,
    "max_attempts": 3,
    "remaining_attempts": 1,
    "suggested_action": "还可尝试 1 次，建议使用默认参数 domainId=1"
  }
}
```

---

### 10. 请求限流（Rate Limit）

防止后端服务被大量 MCP 请求压垮，保护系统稳定性。

**配置示例**：

```json
{
  "rateLimit": {
    "enabled": true,
    "type": "tokenBucket",        // 或 "slidingWindow"
    "globalLimit": 100,            // 全局每秒最大请求数
    "toolLimits": {
      "getUser": { "limit": 10, "window": 1000 },  // 工具级限流
      "createOrder": { "limit": 5, "window": 1000 }
    }
  }
}
```

**算法对比**：

| 算法 | 特点 | 适用场景 |
|------|------|----------|
| **令牌桶** | 允许突发流量，平滑处理 | 请求波动大、API 容错高 |
| **滑动窗口** | 精确限流，无突发 | 严格限流、防止超载 |

**Dashboard API**：

| 端点 | 说明 |
|------|------|
| `/api/rate-limit` | 限流全局状态（剩余令牌、拒绝次数） |
| `/api/rate-limit/tools` | 所有工具级限流状态 |
| `/api/rate-limit/tools/:name` | 单个工具限流状态 |

---

### 11. 并发控制（Concurrency Control）

防止资源耗尽，控制同时执行的请求数量。

**配置示例**：

```json
{
  "concurrency": {
    "enabled": true,
    "maxConcurrent": 50,    // 最大并发请求数
    "queueSize": 100,       // 等待队列大小
    "queueTimeout": 30000   // 队列等待超时（毫秒）
  }
}
```

**工作流程**：

```
请求到达 → 活跃数 < 最大并发？ → 立即执行
           ↓ 否
         队列已满？ → 返回错误
           ↓ 否
         进入队列等待 → 超时？ → 返回超时错误
           ↓ 否
         槽位释放 → 唤醒执行
```

**Dashboard API**：

| 端点 | 说明 |
|------|------|
| `/api/concurrency` | 并发状态（活跃数、队列长度、超时次数） |

---

## CLI 参数

| 参数 | 说明 |
|------|------|
| `--config <path>` | 配置文件路径（默认：./tools.json） |
| `--transport <mode>` | 传输模式：stdio / sse（默认：stdio） |
| `--sse-port <port>` | SSE 端口（默认：11113） |
| `--http-port <port>` | HTTP/Dashboard 端口（默认：11112） |
| `--sqlite` | 启用 SQLite 日志 |
| `--sqlite-path <path>` | 指定 SQLite 数据库路径 |

> 📖 **完整参数说明**：参见 [CONFIG.md](CONFIG.md) 了解所有配置参数的详细说明、类型、是否可选及默认值。

---

## 最小配置示例

```json
{
  "baseUrl": "https://api.example.com",
  "tokens": {
    "default": "your-api-token"
  },
  "tools": {
    "getUser": {
      "description": "根据ID获取用户信息",
      "method": "GET",
      "path": "/user/{userId}",
      "queryParams": {
        "userId": {
          "description": "用户ID",
          "type": "string",
          "required": true
        }
      }
    }
  }
}
```

---

## API 端点列表

### 日志查询 API

| 端点 | 说明 |
|------|------|
| `/api/logs/paginated` | 分页查询请求日志 |
| `/api/errors` | 查询错误日志 |
| `/api/trend` | 调用趋势（7 天） |
| `/api/top-tools` | Top 工具统计 |

### 缓存管理 API

| 端点 | 说明 |
|------|------|
| `/api/cache` | 缓存状态 |
| `/api/cache/entries` | 缓存条目详情 |
| `/api/cache/tools` | 工具级缓存配置列表 |

### Mock 管理 API

| 端点 | 说明 |
|------|------|
| `/api/mock` | 全局 Mock 开关 |
| `/api/tools` | 工具列表（含 Mock 状态） |
| `/api/tools/:name/mock` | 工具级 Mock 配置 |

### 限流管理 API

| 端点 | 说明 |
|------|------|
| `/api/rate-limit` | 限流全局状态 |
| `/api/rate-limit/tools` | 所有工具级限流状态 |
| `/api/rate-limit/tools/:name` | 单个工具限流状态 |

### 并发控制 API

| 端点 | 说明 |
|------|------|
| `/api/concurrency` | 并发控制状态（活跃数、队列长度） |

### 健康检查 API

| 端点 | 说明 |
|------|------|
| `/health` | 服务健康状态（7 个组件） |
| `/health/detail` | 详细组件状态（含更多指标） |
| `/health/ready` | 就绪状态（K8s Ready Probe） |
| `/health/live` | 存活状态（K8s Live Probe） |
| `/health/startup` | 启动状态（K8s Startup Probe） |

### 告警管理 API

| 端点 | 说明 |
|------|------|
| `/api/alert` | 告警配置和统计 |
| `/api/alert/history` | 告警历史列表（支持分页、类型过滤） |
| `/api/alert/config` | 告警配置管理 |
| `/api/alert/rules` | 告警规则列表 |
| `/api/alert/channels` | 告警渠道列表 |
| `/api/alert/cleanup` | 清理过期告警历史 |

### 配置版本控制 API

| 端点 | 说明 |
|------|------|
| `/api/config-version` | 版本控制统计 |
| `/api/config-version/list` | 版本列表 |
| `/api/config-version/:version` | 获取指定版本配置 |
| `/api/config-version/compare` | 比较版本差异 |
| `/api/config-version/rollback` | 回滚配置到指定版本 |
| `/api/config-version/export` | 导出配置版本 |

### 灰度发布 API

| 端点 | 说明 |
|------|------|
| `/api/canary` | 灰度发布统计 |
| `/api/canary/list` | 灰度发布列表 |
| `/api/canary/:id` | 获取指定灰度发布详情 |
| `/api/canary/create` | 创建灰度发布 |
| `/api/canary/pause` | 暂停灰度发布 |
| `/api/canary/resume` | 恢复灰度发布 |
| `/api/canary/complete` | 完成灰度发布 |
| `/api/canary/rollback` | 回滚灰度发布 |
| `/api/canary/metrics` | 获取灰度指标 |

---

## 故障排查

### 问题：MCP 连接失败（Connection closed）

**STDIO 模式常见原因**：
1. 端口冲突（每次会话启动新进程）
2. 配置路径错误
3. 入口文件错误

**解决方案**：使用 **SSE 模式**（推荐），一次启动，多次会话共享。

### 问题：SSE 连接失败（500 错误）

**检查步骤**：
```bash
# 确认服务已启动
curl http://localhost:11112/health

# 确认 SSE 端点可访问
curl http://localhost:11113/sse
```

### 问题：端口被占用

```bash
# 杀掉占用进程
lsof -ti:11112 | xargs kill -9
lsof -ti:11113 | xargs kill -9

# 或修改端口
node dist/cli.cjs --transport=sse --sse-port=11120 --http-port=11121 --config tools.json
```

---

## 更新日志

> 查看 [CHANGELOG.md](CHANGELOG.md) 了解完整版本历史。

### v1.0.0 (2026-04-23) - 首次正式发布

🎉 本版本为首个正式发布的稳定版本，包含完整的 MCP HTTP Gateway 功能集。

**版本策略**：偶数版本为稳定版，奇数版本为快速迭代版。

---

## 许可证

MIT