# MCP HTTP Gateway

[中文文档](README_CN.md)

A HTTP gateway service based on MCP protocol that forwards LLM tool call requests to HTTP REST interfaces.

---

## Dual Mode (Dual Transport Mode)

Dual mode starts both STDIO and SSE transport modes simultaneously, allowing different clients to connect at the same time:
- **Claude Code** connects via STDIO
- **VSCode / Other tools** connect via SSE

### Start Command

```bash
node dist/cli.cjs --transport=dual --sse-port=11114 --http-port=11115 --config=./tools.json
```

### Port Allocation

| Mode | SSE Port | Dashboard Port | Description |
|------|----------|---------------|-------------|
| **dual** | `--sse-port` (default 11114) | `--http-port` (default 11115) | SSE + STDIO running together |
| **sse** | `--sse-port` (default 11114) | SSE port - 1 | SSE mode only |
| **stdio** | None | `--http-port` (default 11112) | STDIO mode only |

### MCP Configuration (Dual Mode)

```json
{
  "mcpServers": {
    "http-gateway": {
      "type": "sse",
      "url": "http://localhost:11114/sse",
      "description": "HTTP API Gateway (Dual Mode)"
    }
  }
}
```

### Access URLs After Startup

```
========================================
MCP HTTP Gateway Started
========================================
SSE Connection:     http://localhost:11114/sse
Dashboard:          http://localhost:11115/dashboard
Health:             http://localhost:11115/health
========================================
```

---

## Global Safety Usage

### Configuration Priority Mechanism

Configuration priority ensures safe configuration management:

```
CLI Parameters > SQLite Database > Config File > Default Values
```

**Priority Explanation**:

| Source | Description | Safety |
|--------|-------------|--------|
| **CLI Parameters** | Passed via command line, highest priority | ✅ Most secure, unaffected by config files |
| **SQLite Database** | Runtime persisted configuration | ✅ Secure, audit trail available |
| **Config File** | `tools.json` file | ⚠️ Requires file permission control |
| **Default Values** | Built-in default configuration | ⚠️ Only as fallback |

### Circuit Breaker Protection

Prevent cascading failures, protect backend service stability:

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

### Fallback Strategy

Safe fallback chain when request fails:

```
Request Failed → Cache Fallback (ignore TTL) → Mock Fallback → Return Error
```

**Configuration Example**:

```json
{
  "fallback": {
    "enabled": true,
    "useExpiredCache": true,  // Use expired cache as fallback
    "useMockAsFallback": true // Use Mock data as fallback
  }
}
```

### Security Best Practices

1. **No Hardcoded Secrets**: Use `tokens` config or environment variables
2. **Log Sanitization**: Sensitive info not logged
3. **Parameterized Queries**: Prevent SQL injection
4. **Input Validation**: All external inputs must be validated

---

## Configuration Reference

📖 **Full configuration parameters**: See [CONFIG_EN.md](CONFIG_EN.md) for detailed parameter descriptions, types, required/optional, and defaults.

---

## Using with Claude Code

Claude Code can automatically install and use via npx.

### 1. Project-level Configuration (Recommended)

Create a `.mcp.json` file in your project root:

**Option 1: STDIO Mode (Claude Code Default, Auto-managed Process)**

Claude Code automatically manages the process, **no manual startup needed**.

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

**Option 2: SSE Mode (Persistent Connection, Manual Startup Required)**

Start the service manually first, then Claude Code connects via SSE.

```json
{
  "mcpServers": {
    "http-gateway": {
      "type": "sse",
      "url": "http://localhost:11114/sse",
      "description": "HTTP API Gateway"
    }
  }
}
```

Start the service:
```bash
npx -y @lvdaxianer/mcp-http-gateway --transport=sse --config=./tools.json
```

**Option 3: Dual Mode (Claude Code + VSCode Together, Manual Startup Required)**

Start the service manually, supports both STDIO and SSE connections.

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

Start the service:
```bash
npx -y @lvdaxianer/mcp-http-gateway --transport=dual --config=./tools.json
```

### 2. Global Install (Alternative)

```bash
npm install -g @lvdaxianer/mcp-http-gateway
```

---

## Quick Start

```bash
# Install
npm install @lvdaxianer/mcp-http-gateway

# Start in Dual Mode
npx @lvdaxianer/mcp-http-gateway --transport=dual --config=./tools.json
```

---

## License

MIT