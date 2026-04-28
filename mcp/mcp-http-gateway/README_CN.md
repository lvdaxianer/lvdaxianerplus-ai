# MCP HTTP Gateway

[English](README.md)

一个基于 MCP 协议的 HTTP 网关服务，将 LLM 工具调用请求转发到 HTTP REST 接口。

---

## Dual 模式（双传输模式）

Dual 模式同时启动 STDIO 和 SSE 两种传输模式，让不同客户端可以同时连接：
- **Claude Code** 通过 STDIO 连接
- **VSCode / 其他工具** 通过 SSE 连接

### 启动命令

```bash
node dist/cli.cjs --transport=dual --sse-port=11114 --http-port=11115 --config=./tools.json
```

### 端口分配

| 模式 | SSE 端口 | Dashboard 端口 | 说明 |
|------|----------|---------------|------|
| **dual** | `--sse-port` (默认 11114) | `--http-port` (默认 11115) | SSE + STDIO 同时运行 |
| **sse** | `--sse-port` (默认 11114) | SSE 端口 - 1 | 仅 SSE 模式 |
| **stdio** | 无 | `--http-port` (默认 11112) | 仅 STDIO 模式 |

### MCP 配置（Dual 模式）

```json
{
  "mcpServers": {
    "http-gateway": {
      "type": "sse",
      "url": "http://localhost:11114/sse",
      "description": "HTTP API 网关（双模式）"
    }
  }
}
```

### 启动后访问地址

```
========================================
MCP HTTP Gateway 已启动
========================================
SSE 连接:     http://localhost:11114/sse
Dashboard:    http://localhost:11115/dashboard
Health:       http://localhost:11115/health
========================================
```

---

## 全局安全使用

### 配置优先级机制

配置优先级确保安全的配置管理：

```
CLI 参数 > SQLite 数据库 > 配置文件 > 默认值
```

**优先级说明**：

| 来源 | 说明 | 安全性 |
|------|------|--------|
| **CLI 参数** | 命令行传入，最高优先级 | ✅ 最安全，不受配置文件影响 |
| **SQLite 数据库** | 运行时持久化配置 | ✅ 安全，可审计变更历史 |
| **配置文件** | `tools.json` 文件 | ⚠️ 需要文件权限控制 |
| **默认值** | 代码内置默认配置 | ⚠️ 仅作为兜底 |

### 熔断器保护

防止故障扩散，保护后端服务稳定性：

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

### 降级策略

请求失败时的安全兜底链路：

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

### 安全规范

1. **不硬编码密钥**：使用 `tokens` 配置或环境变量
2. **日志脱敏**：敏感信息不记录到日志
3. **参数化查询**：防止 SQL 注入
4. **请求验证**：所有外部输入必须验证

---

## 配置参数详解

📖 **完整配置参数**：参见 [CONFIG.md](CONFIG.md) 了解所有参数的类型、是否可选及默认值。

---

## Claude Code 使用

Claude Code 可以通过 npx 自动安装并使用。

### 1. 项目级配置（推荐）

在项目根目录创建 `.mcp.json` 文件：

**方式一：STDIO 模式（Claude Code 默认，自动管理进程）**

Claude Code 会自动启动进程，**无需手动启动服务**。

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

**方式二：SSE 模式（持久连接，需手动启动）**

需要先手动启动服务，Claude Code 通过 SSE 连接。

```json
{
  "mcpServers": {
    "http-gateway": {
      "type": "sse",
      "url": "http://localhost:11114/sse",
      "description": "HTTP API 网关"
    }
  }
}
```

启动服务：
```bash
npx -y @lvdaxianer/mcp-http-gateway --transport=sse --config=./tools.json
```

**方式三：Dual 模式（同时支持 Claude Code + VSCode，需手动启动）**

需要先手动启动服务，同时支持 STDIO 和 SSE 连接。

```json
{
  "mcpServers": {
    "http-gateway": {
      "type": "sse",
      "url": "http://localhost:11114/sse"
    }
  }
}
```

启动服务：
```bash
npx -y @lvdaxianer/mcp-http-gateway --transport=dual --config=./tools.json
```

### 2. 全局安装（备选）

```bash
npm install -g @lvdaxianer/mcp-http-gateway
```

---

## 快速开始

```bash
# 安装
npm install @lvdaxianer/mcp-http-gateway

# Dual 模式启动
npx @lvdaxianer/mcp-http-gateway --transport=dual --config=./tools.json
```

---

## 许可证

MIT