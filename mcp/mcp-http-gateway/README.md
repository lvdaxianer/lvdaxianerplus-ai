# MCP HTTP Gateway

一个基于 MCP 协议的 HTTP 网关服务，将 LLM 工具调用请求转发到 HTTP REST 接口。

---

## 核心能力

### 1. 熔断器（Circuit Breaker）

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
- `OPEN` → 熔断状态，拒绝所有请求，直接返回错误
- `HALF_OPEN` → 半开状态，允许少量请求探测恢复

### 2. 降级策略（Fallback）

服务失败时的兜底机制，确保用户获得响应。

```json
{
  "fallback": {
    "enabled": true,
    "useExpiredCache": true,  // 使用过期缓存兜底
    "useMockAsFallback": true // 使用 Mock 数据兜底
  }
}
```

**降级链路**：
```
真实服务 → 失败 → 缓存（忽略 TTL） → 失败 → Mock → 失败 → 错误
```

**适用场景**：
- 后端服务不可用时，返回缓存数据保证可用性
- 缓存也失效时，返回 Mock 数据避免空白响应
- 适合对实时性要求不高、但需要保证响应的场景

### 3. SQLite 日志记录

完整记录 MCP 工具调用的请求和响应详情，支持 Dashboard 可视化查询。

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
- **错误日志**：错误类型、错误堆栈、失败请求详情

**API 查询日志**：

```bash
# 分页查询日志（推荐）
curl "http://localhost:11112/api/logs/paginated?page=1&pageSize=20"

# 按日期查询
curl "http://localhost:11112/api/logs/paginated?date=2026-04-21"

# 按工具名查询
curl "http://localhost:11112/api/logs/paginated?tool=CI_TAG_LIST_QUERY"

# 查询错误日志
curl "http://localhost:11112/api/errors?date=2026-04-21&limit=50"
```

---

## 快速部署

### npx 方式（推荐）

无需安装，直接运行：

```bash
npx -y mcp-http-gateway --config /path/to/tools.json
```

在 Claude Desktop 中配置（`~/.claude/settings.json`）：

```json
{
  "mcpServers": {
    "http-gateway": {
      "command": "npx",
      "args": ["-y", "mcp-http-gateway", "--config", "/absolute/path/to/tools.json"]
    }
  }
}
```

### 本地部署

```bash
# 克隆项目
git clone <repository-url>
cd mcp-http-gateway

# 安装依赖
npm install

# 编译
npm run build

# 运行
node dist/cli.js --config ./tools.json
```

在 Claude Desktop 中配置：

```json
{
  "mcpServers": {
    "http-gateway": {
      "command": "node",
      "args": ["./dist/cli.js", "--config", "./tools.json"],
      "cwd": "/absolute/path/to/mcp-http-gateway"
    }
  }
}
```

### 启用监控面板

添加 `--http` 参数启用 HTTP 服务：

```bash
node dist/cli.js --config ./tools.json --http
```

访问监控面板：`http://localhost:11112/dashboard`

---

## 配置信息查看

### Dashboard 配置编辑页面

访问 `http://localhost:11112/dashboard`，点击「配置编辑」：

![配置编辑页面](docs/config-dashboard.png)

- **左侧**：JSON 配置编辑器（Ace Editor，语法高亮）
- **右侧**：配置属性说明面板，点击展开查看每个属性的含义
- **底部**：配置备份历史，支持一键回滚

### 配置属性说明面板功能

- 查看所有配置模块及其子属性
- 点击展开查看详细说明和默认值
- 类型标签颜色区分：`string`（蓝）、`number`（绿）、`boolean`（橙）、`object`（灰）
- 「展开/折叠全部」按钮批量操作

### API 查询配置

```bash
# 获取当前配置
curl http://localhost:11112/api/config

# 获取配置备份列表
curl http://localhost:11112/api/config/backups

# 回滚到指定备份
curl -X POST http://localhost:11112/api/config/restore/<backup-file>
```

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

## CLI 参数

| 参数 | 说明 |
|------|------|
| `--config <path>` | 配置文件路径（默认：./tools.json） |
| `--http` | 启用 HTTP 监控面板 |
| `--transport <mode>` | 传输模式：stdio / sse / all |
| `--sse-port <port>` | SSE 端口（默认：11113） |
| `--http-port <port>` | HTTP 端口（默认：11112） |
| `--sqlite` | 启用 SQLite 日志，使用默认路径 `./data/logs.db` |
| `--sqlite-path <path>` | 指定 SQLite 数据库路径（自动启用 SQLite） |

### SQLite 配置优先级

1. **CLI 参数 `--sqlite-path`** → 使用指定路径
2. **CLI 参数 `--sqlite`** → 使用默认路径 `./data/logs.db`（当前工作目录）
3. **配置文件 `sqlite.dbPath`** → 使用配置文件路径
4. **未指定** → 禁用 SQLite

### 示例

```bash
# 使用 CLI 参数启用 SQLite（自动在当前目录创建）
mcp-http-gateway --sqlite --config ./tools.json

# 指定自定义 SQLite 路径
mcp-http-gateway --sqlite-path=/var/log/mcp/logs.db --config ./tools.json

# 配置文件方式（推荐）
# 在 tools.json 中添加 sqlite 配置
{
  "sqlite": {
    "enabled": true,
    "dbPath": "/absolute/path/to/logs.db",
    "maxDays": 30
  }
}
```

---

## API 端点列表

### 日志查询 API

| 端点 | 说明 | 参数 |
|------|------|------|
| `/api/logs/paginated` | 分页查询请求日志 | `page`, `pageSize`, `date`, `tool`, `level` |
| `/api/logs` | 查询最近日志 | `limit`, `date`, `tool` |
| `/api/errors` | 查询错误日志 | `date`, `limit` |

### Dashboard 数据 API

| 端点 | 说明 |
|------|------|
| `/dashboard` | Dashboard HTML 页面 |
| `/dashboard/json` | Dashboard 数据（JSON 格式） |

### 健康检查 API

| 端点 | 说明 |
|------|------|
| `/health` | 服务健康状态 |
| `/health/ready` | 就绪状态（K8s Ready 探针） |
| `/health/live` | 存活状态（K8s Live 探针） |

---

## 故障排查

### 问题：Dashboard 显示请求但内容为空

**原因**：SQLite 日志未正确记录。

**检查步骤**：

1. 确认 SQLite 配置已启用：
```bash
# 查看 stderr 输出，应该看到：
# [启动] SQLite logging enabled
```

2. 确认数据库文件存在且有记录：
```bash
sqlite3 /path/to/logs.db "SELECT COUNT(*) FROM request_logs;"
```

3. 如果记录数为 0，检查日志是否有错误：
```bash
# 查找 SQLite 相关错误
grep "SQLite" stderr.log
```

### 问题：端口被占用（EADDRINUSE）

**解决方案**：

```bash
# 杀掉占用端口的进程
lsof -ti:11112 | xargs kill -9
lsof -ti:11113 | xargs kill -9

# 或修改端口
node dist/cli.js --config ./tools.json --http-port 11120
```

### 问题：MCP 连接失败（Connection closed）

**常见原因**：

1. **端口冲突**：检查 11112/11113 端口是否被占用
2. **配置路径错误**：确保 `cwd` 配置正确
3. **入口文件错误**：使用 `cli.js` 而非 `index.js`

**正确配置示例**：

```json
{
  "mcpServers": {
    "http-gateway": {
      "command": "node",
      "args": ["mcp/mcp-http-gateway/dist/cli.js", "--config", "mcp/mcp-http-gateway/tools.json"],
      "cwd": "/absolute/path/to/project/root"
    }
  }
}
```

---

## 更新日志

### v1.1.0 (2026-04-21)

- 🔧 修复 SQLite 日志记录失败问题（named parameter 缺失）
- ✨ 新增 Dashboard 分页日志查询 API
- 📝 完善 README 文档，添加 API 端点说明和故障排查章节

### v1.0.0 (2026-04-19)

- 🎉 初始版本发布
- ✨ 熔断器、降级策略、缓存机制
- ✨ SQLite 日志记录
- ✨ Dashboard 监控面板

---

## 许可证

MIT