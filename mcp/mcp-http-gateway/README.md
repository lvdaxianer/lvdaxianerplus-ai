# MCP HTTP Gateway

[中文文档](README_CN.md)

A HTTP gateway service based on MCP protocol that forwards LLM tool call requests to HTTP REST interfaces.

---

## Features Overview

| Category | Capability | Description |
|----------|------------|-------------|
| **Request Forwarding** | HTTP REST Forwarding | Forward MCP tool calls to backend HTTP API, support GET/POST/PUT/DELETE |
| **Request Forwarding** | Enhanced Template Transform | Variable replacement, nested access, expression calculation, default values |
| **Request Forwarding** | Trace ID | Unique Trace ID, log correlation, response header, backend propagation |
| **Resilience** | Circuit Breaker | Prevent cascading failures, CLOSED/OPEN/HALF_OPEN state flow |
| **Resilience** | Fallback Strategy | Cache fallback + Mock fallback, ensure user gets response |
| **Resilience** | Attempt Tracking | Limit attempts for optional parameter tools, save tokens |
| **Traffic Control** | Rate Limit | Token bucket/sliding window algorithms, protect backend |
| **Traffic Control** | Tool-level Rate Limit | Independent rate limit per tool, higher priority than global |
| **Traffic Control** | Concurrency Control | Max concurrent limit + waiting queue, prevent resource exhaustion |
| **Traffic Control** | Queue Timeout | Auto return error on timeout, avoid infinite wait |
| **Traffic Control** | Timeout Abort | AbortController force interrupt, prevent request hanging |
| **Traffic Control** | Tool-level Timeout | Per-tool timeout config, higher priority than global |
| **Cache** | LRU Cache | Cache GET request responses, support TTL and tool-level config |
| **Cache** | TTL=0 Never Expire | For fallback scenarios, cache data persists forever |
| **Mock Mode** | Global Mock | Global switch, all requests return Mock data |
| **Mock Mode** | Tool-level Mock | Per-tool Mock config, support static/dynamic/AI generation |
| **Logging** | SQLite Logging | Complete request/response/error logs |
| **Logging** | Dashboard Panel | Real-time monitoring, log query, config management |
| **Logging** | Trace Logs | Trace logs, query by ID/tool |
| **Config Management** | Tool-level Config Persistence | Cache/Mock configs persisted to SQLite |
| **Config Management** | Config Priority | CLI > SQLite > Config File > Defaults |
| **Transport Mode** | STDIO Mode | Claude Code auto-manages process |
| **Transport Mode** | SSE Mode | Persistent connection, avoid port conflicts (Recommended) |

---

## Dashboard Preview

![Dashboard](docs/dashboard.png)

The Dashboard provides real-time monitoring with:
- **Statistics**: Total requests, success rate, error count, average latency
- **Circuit Breaker Status**: Visual table showing CLOSED/OPEN/HALF_OPEN states
- **Cache Status**: Cached entries count and max capacity
- **Recent Requests**: Latest 10 requests with status, method, URL, response time

### How to View Dashboard

**Default URL**: `http://localhost:11112/dashboard`

**Important**: If port `11112` is already in use, the service will automatically:
1. Kill old node processes occupying the port (same-type process cleanup)
2. Or find the next available port (e.g., `11113`, `11114`)

**Check actual port**:
- **Console log**: Look for `[启动] Dashboard available {"url":"http://localhost:XXXX/dashboard"}`
- **Dashboard badge**: Green badge at page top shows `端口: XXXXX`
- **Health check**: `http://localhost:XXXX/health` returns server info

**Port adjustment example**:
```
[WARN] [端口检测] 端口被占用 {"port":11112,"pid":xxx}
[INFO] [端口检测] 使用备用端口 {"originalPort":11112,"newPort":11113}
[INFO] [启动] Dashboard available {"url":"http://localhost:11113/dashboard"}
```

---

## MCP Configuration

### Option 1: SSE Mode (Recommended, Persistent Connection)

**Advantages**: One startup, shared across multiple sessions, avoid port conflicts.

#### Local Project Config

Create `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "http-gateway": {
      "type": "sse",
      "url": "http://localhost:11113/sse",
      "description": "HTTP API Gateway"
    }
  }
}
```

Start service:

```bash
cd mcp/mcp-http-gateway
node dist/cli.cjs --transport=sse --sse-port=11113 test.tools.filtered.json
```

#### npx Config

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

Start command:

```bash
npx -y @lvdaxianer/mcp-http-gateway --transport=sse --sse-port=11113 --config /path/to/tools.json
```

### Option 2: STDIO Mode (New Process per Session)

**Advantages**: No manual startup, Claude Code auto-manages.

#### Local Project Config

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

#### npx Config

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

## Core Capabilities

### 1. HTTP Request Forwarding

Forward MCP tool calls to backend HTTP REST API with full HTTP methods support.

**Supported Methods**: GET, POST, PUT, DELETE, PATCH

**Path Template**: Support `{param}` dynamic path parameters

```json
{
  "getUser": {
    "method": "GET",
    "path": "/user/{userId}",
    "queryParams": {
      "userId": { "description": "User ID", "type": "string", "required": true }
    }
  }
}
```

**Header Management**: Support custom headers and Token authentication

```json
{
  "tokens": {
    "default": "your-api-token",
    "admin": "admin-api-token"
  }
}
```

---

### 2. Circuit Breaker

Prevent cascading failures, protect backend service stability.

```json
{
  "circuitBreaker": {
    "enabled": true,
    "failureThreshold": 5,    // Trigger after 5 consecutive failures
    "successThreshold": 2,    // Recover after 2 consecutive successes
    "halfOpenTime": 30000     // Try recovery after 30s
  }
}
```

**State Flow**:
- `CLOSED` → Normal state, requests forwarded normally
- `OPEN` → Circuit breaker state, reject all requests, trigger fallback
- `HALF_OPEN` → Half-open state, allow limited requests to probe recovery

---

### 3. Fallback Strategy

**Trigger Scenarios**:
- Backend service unavailable (timeout, connection failure)
- Circuit breaker in OPEN state
- HTTP status code ≥ 500

**Fallback Chain**:

```
Request Failed → Cache Fallback (ignore TTL) → Mock Fallback → Return Error
```

**Config Example**:

```json
{
  "fallback": {
    "enabled": true,
    "useExpiredCache": true,  // Use expired cache as fallback
    "useMockAsFallback": true // Use Mock data as fallback
  }
}
```

**Fallback Priority**:
1. Prefer cache data (even if expired)
2. Use Mock data if cache doesn't exist
3. Return error info if Mock doesn't exist

---

### 4. Cache Mechanism

Cache GET request responses for fallback backup (not for query acceleration).

```json
{
  "cache": {
    "enabled": true,
    "ttl": 60000,     // Cache TTL 60 seconds
    "maxSize": 1000   // Max cache entries
  }
}
```

**Special Config**: `ttl=0` means never expire, suitable for fallback scenarios.

**Tool-level Cache Config** (higher priority than global):

```json
{
  "tools": {
    "getUser": {
      "cache": {
        "enabled": true,
        "ttl": 0,        // 0 means never expire (for fallback)
        "maxSize": 1000
      }
    }
  }
}
```

---

### 5. Mock Mode (Test Simulation)

Support global Mock and tool-level Mock for testing and fallback.

```json
{
  "mock": {
    "enabled": true,   // Global Mock switch
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

**Mock Types**:
- **Static Response**: Return preset data directly
- **Dynamic Template**: Support `{param}`, `{timestamp}`, `{uuid}` variables
- **AI Generated**: Generate mock data via `aiHint` semantic hints

---

### 6. SQLite Logging

Complete logging of MCP tool call requests and responses.

```json
{
  "sqlite": {
    "enabled": true,
    "dbPath": "/absolute/path/to/logs.db",
    "maxDays": 30
  }
}
```

**Log Content**:
- **Request Logs**: Tool name, HTTP method, URL, headers, body
- **Response Logs**: HTTP status code, body, duration
- **Error Logs**: Error type, stack trace

---

### 7. Dashboard Monitoring Panel

Real-time monitoring of MCP tool call status.

**Access URL**: `http://localhost:11112/dashboard`

**Features**:
- Tool call statistics (success/failure rate, Top tools)
- Request log query (pagination, filter by date/tool)
- Cache status view (entries, TTL)
- Mock config management
- Hot config update (no restart needed)

---

### 8. Tool-level Config Persistence

Tool-level cache and Mock configs persisted to SQLite with priority mechanism:

| Scenario | Behavior |
|----------|----------|
| **First Startup** (no DB config) | Sync config file to SQLite |
| **Later Startup** (has DB config) | Use SQLite config, **ignore config file** |

**First Startup Log**:
```
[Tool Cache] Database empty, syncing from config file
```

**Later Startup Log**:
```
[Tool Cache] Using database configs, ignoring config file
```

---

### 9. Attempt Tracking

Limit LLM attempts for optional parameter tools, save tokens.

```json
{
  "maxAttempts": 3,
  "attemptTracking": {
    "enabled": true,
    "showMetadata": true
  }
}
```

**Enhanced Response**: Return `metadata` field on failure:
```json
{
  "error": "Service unavailable",
  "metadata": {
    "attempt_count": 2,
    "max_attempts": 3,
    "remaining_attempts": 1,
    "suggested_action": "1 attempt left, suggest using default param domainId=1"
  }
}
```

---

### 10. Rate Limit

Protect backend from being overwhelmed by massive MCP requests.

**Config Example**:

```json
{
  "rateLimit": {
    "enabled": true,
    "type": "tokenBucket",        // or "slidingWindow"
    "globalLimit": 100,            // Global max requests per second
    "toolLimits": {
      "getUser": { "limit": 10, "window": 1000 },  // Tool-level rate limit
      "createOrder": { "limit": 5, "window": 1000 }
    }
  }
}
```

**Algorithm Comparison**:

| Algorithm | Feature | Use Case |
|-----------|---------|----------|
| **Token Bucket** | Allow burst traffic, smooth handling | High request variance, tolerant API |
| **Sliding Window** | Precise rate limit, no burst | Strict rate limit, prevent overload |

**Dashboard API**:

| Endpoint | Description |
|----------|-------------|
| `/api/rate-limit` | Rate limit global status (remaining tokens, reject count) |
| `/api/rate-limit/tools` | All tool-level rate limit status |
| `/api/rate-limit/tools/:name` | Single tool rate limit status |

---

### 11. Concurrency Control

Prevent resource exhaustion by controlling concurrent request count.

**Config Example**:

```json
{
  "concurrency": {
    "enabled": true,
    "maxConcurrent": 50,    // Max concurrent requests
    "queueSize": 100,       // Waiting queue size
    "queueTimeout": 30000   // Queue wait timeout (ms)
  }
}
```

**Workflow**:

```
Request arrives → Active < Max? → Execute immediately
           ↓ No
         Queue full? → Return error
           ↓ No
         Enter queue wait → Timeout? → Return timeout error
           ↓ No
         Slot released → Wake up and execute
```

**Dashboard API**:

| Endpoint | Description |
|----------|-------------|
| `/api/concurrency` | Concurrency status (active count, queue length, timeout count) |

---

## CLI Parameters

| Parameter | Description |
|-----------|-------------|
| `--config <path>` | Config file path (default: ./tools.json) |
| `--transport <mode>` | Transport mode: stdio / sse (default: stdio) |
| `--sse-port <port>` | SSE port (default: 11113) |
| `--http-port <port>` | HTTP/Dashboard port (default: 11112) |
| `--sqlite` | Enable SQLite logging |
| `--sqlite-path <path>` | SQLite database path |

> 📖 **Full Parameter Reference**: See [CONFIG.md](CONFIG.md) for detailed parameter descriptions, types, optional/required, and defaults.

---

## Minimal Config Example

```json
{
  "baseUrl": "https://api.example.com",
  "tokens": {
    "default": "your-api-token"
  },
  "tools": {
    "getUser": {
      "description": "Get user info by ID",
      "method": "GET",
      "path": "/user/{userId}",
      "queryParams": {
        "userId": {
          "description": "User ID",
          "type": "string",
          "required": true
        }
      }
    }
  }
}
```

---

## API Endpoints

### Log Query API

| Endpoint | Description |
|----------|-------------|
| `/api/logs/paginated` | Paginated request log query |
| `/api/errors` | Query error logs |
| `/api/trend` | Call trend (7 days) |
| `/api/top-tools` | Top tools statistics |

### Cache Management API

| Endpoint | Description |
|----------|-------------|
| `/api/cache` | Cache status |
| `/api/cache/entries` | Cache entry details |
| `/api/cache/tools` | Tool-level cache config list |

### Mock Management API

| Endpoint | Description |
|----------|-------------|
| `/api/mock` | Global Mock switch |
| `/api/tools` | Tool list (with Mock status) |
| `/api/tools/:name/mock` | Tool-level Mock config |

### Rate Limit Management API

| Endpoint | Description |
|----------|-------------|
| `/api/rate-limit` | Rate limit global status |
| `/api/rate-limit/tools` | All tool-level rate limit status |
| `/api/rate-limit/tools/:name` | Single tool rate limit status |

### Concurrency Control API

| Endpoint | Description |
|----------|-------------|
| `/api/concurrency` | Concurrency status (active count, queue length) |

### Health Check API

| Endpoint | Description |
|----------|-------------|
| `/health` | Service health status (7 components) |
| `/health/detail` | Detailed component status (more metrics) |
| `/health/ready` | Ready status (K8s Ready Probe) |
| `/health/live` | Live status (K8s Live Probe) |
| `/health/startup` | Startup status (K8s Startup Probe) |

### Alert Management API

| Endpoint | Description |
|----------|-------------|
| `/api/alert` | Alert config and statistics |
| `/api/alert/history` | Alert history list (pagination, type filter) |
| `/api/alert/config` | Alert config management |
| `/api/alert/rules` | Alert rules list |
| `/api/alert/channels` | Alert channels list |
| `/api/alert/cleanup` | Cleanup expired alert history |

### Config Version Control API

| Endpoint | Description |
|----------|-------------|
| `/api/config-version` | Version control statistics |
| `/api/config-version/list` | Version list |
| `/api/config-version/:version` | Get specific version config |
| `/api/config-version/compare` | Compare version differences |
| `/api/config-version/rollback` | Rollback config to specific version |
| `/api/config-version/export` | Export config version |

### Canary Release API

| Endpoint | Description |
|----------|-------------|
| `/api/canary` | Canary release statistics |
| `/api/canary/list` | Canary release list |
| `/api/canary/:id` | Get specific canary release details |
| `/api/canary/create` | Create canary release |
| `/api/canary/pause` | Pause canary release |
| `/api/canary/resume` | Resume canary release |
| `/api/canary/complete` | Complete canary release |
| `/api/canary/rollback` | Rollback canary release |
| `/api/canary/metrics` | Get canary metrics |

---

## Troubleshooting

### Issue: MCP Connection Failed (Connection closed)

**STDIO Mode Common Causes**:
1. Port conflict (new process per session)
2. Config path error
3. Entry file error

**Solution**: Use **SSE Mode** (Recommended), one startup, shared across sessions.

### Issue: SSE Connection Failed (500 Error)

**Check Steps**:
```bash
# Verify service started
curl http://localhost:11112/health

# Verify SSE endpoint accessible
curl http://localhost:11113/sse
```

### Issue: Port Occupied

```bash
# Kill occupied process
lsof -ti:11112 | xargs kill -9
lsof -ti:11113 | xargs kill -9

# Or modify port
node dist/cli.cjs --transport=sse --sse-port=11120 --http-port=11121 --config tools.json
```

---

## Changelog

> See [CHANGELOG.md](CHANGELOG.md) for full version history.

### v1.0.0 (2026-04-23) - Initial Release

🎉 This is the first stable release with complete MCP HTTP Gateway features.

**Version Strategy**: Even versions are stable releases, odd versions are rapid iteration releases.

---

## License

MIT