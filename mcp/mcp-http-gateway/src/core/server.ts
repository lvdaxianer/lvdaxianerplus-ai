/**
 * MCP Server 核心实现
 *
 * 功能：
 * - 创建 MCP Server 实例
 * - 注册请求处理器（从 server-handlers 导入）
 * - 启动 STDIO 传输
 *
 * 模块拆分：
 * - server-handlers.ts: 处理器实现（list_tools、call_tool）
 * - attempt-tracking.ts: 尝试追踪（记录、清除、反馈）
 * - call-hint.ts: 调用提示生成（参数类型判断、模板填充）
 *
 * 传输方式：
 * - STDIO: 标准输入输出（用于 Claude Code 等客户端）
 * - SSE: Server-Sent Events（可选）
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Config } from '../config/types.js';
import { logger } from '../middleware/logger.js';
import { registerListToolsHandler, registerCallToolHandler } from './server-handlers.js';
import { startHttpServer, closeHttpServer } from '../routes/http-server.js';
import { setCorsHeaders } from '../routes/handlers/response.js';
import http from 'http';

// 导入 Server 类型用于 SSE 连接存储
type McpServer = Server;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * MCP Server 配置选项
 *
 * @param config - 工具配置（包含 baseUrl、tools 等）
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface McpServerOptions {
  config: Config;
}

// ============================================================================
// Server 创建函数
// ============================================================================

/**
 * 创建 MCP Server 实例
 *
 * 功能：初始化 Server 并注册请求处理器。
 *
 * Server 配置：
 * - name: 'mcp-http-gateway'
 * - version: '1.0.0'
 * - capabilities: { tools: {} }
 *
 * 处理器：
 * - list_tools: 返回工具列表（含调用提示）
 * - call_tool: 执行工具调用（含尝试追踪）
 *
 * @param options - Server 配置选项
 * @returns MCP Server 实例
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export function createMcpServer(options: McpServerOptions): Server {
  // 解析配置选项
  const { config } = options;

  // 创建 Server 实例
  // 定义名称和版本（用于客户端识别）
  const server = new Server(
    {
      name: 'mcp-http-gateway',
      version: '1.0.0',
    },
    {
      capabilities: {
        // 声明支持 tools 能力
        tools: {},
      },
    }
  );

  // ===== 注册请求处理器 =====

  // 注册工具列表处理器
  // 功能：响应 list_tools 请求，返回所有工具定义
  registerListToolsHandler(server, config);

  // 注册工具调用处理器
  // 功能：响应 call_tool 请求，执行工具并返回结果
  registerCallToolHandler(server, config);

  // 返回 Server 实例
  return server;
}

// ============================================================================
// Server 启动函数
// ============================================================================

/**
 * 启动 MCP Server（STDIO 传输）
 *
 * 功能：创建 Server 并连接 STDIO 传输层。
 *
 * STDIO 传输说明：
 * - 通过标准输入输出与客户端通信
 * - 用于 Claude Code 等命令行客户端
 * - 无需网络端口，安全性高
 *
 * @param config - 工具配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export async function startStdioServer(config: Config): Promise<void> {
  // 创建 Server 实例
  const server = createMcpServer({ config });

  // 创建 STDIO 传输层
  // 通过 stdin/stdout 进行通信
  const transport = new StdioServerTransport();

  // 记录启动日志
  logger.info('[服务器] 启动 MCP Server（STDIO 传输）');

  // 连接传输层
  // 阻塞直到连接成功
  await server.connect(transport);

  // 记录启动成功日志
  logger.info('[服务器] MCP Server 已启动');
}

// ============================================================================
// SSE Server 启动函数（使用 SSEServerTransport）
// ============================================================================

/**
 * 启动 MCP Server（SSE 传输）
 *
 * 功能：创建 HTTP 服务处理 SSE 连接。
 *
 * SSE 传输说明：
 * - 通过 HTTP SSE 与客户端通信
 * - VSCode 使用 GET 建立 SSE 流，POST 发送消息
 * - 每个连接创建新的 Server 和 Transport
 *
 * SSEServerTransport 流程：
 * - GET /sse：创建 transport，建立 SSE 流，返回 endpoint URL（含 sessionId）
 * - POST /message?sessionId=xxx：接收客户端消息
 *
 * HTTP Server：
 * - SSE 端口（ssePort）：处理 /sse 和 /message（MCP 协议）
 * - Dashboard 端口（httpPort）：处理 Dashboard、Health、Metrics 等
 *
 * @param config - 工具配置
 * @param ssePort - SSE 服务端口（默认 11114）
 * @param httpPort - Dashboard HTTP 端口（可选，默认 ssePort - 1）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function startSseServer(config: Config, ssePort: number = 11114, httpPort?: number): Promise<{ ssePort: number; httpPort: number }> {
  // ===== 启动 Dashboard HTTP Server（独立端口）=====
  const dashboardPort = httpPort ?? ssePort - 1;

  // 条件注释：调用 startHttpServer 启动 Dashboard HTTP Server
  const httpResult = await startHttpServer({ config, port: dashboardPort });
  const actualHttpPort = httpResult.port;

  // ===== 启动 SSE Server（MCP 协议）=====
  const activeConnections: Map<string, { server: Server; transport: SSEServerTransport }> = new Map();

  // 创建 HTTP 服务处理 SSE 连接和消息
  const httpServer = http.createServer(async (req, res) => {
    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    // 条件注释：设置 CORS 头（MCP Inspector Proxy 需要 CORS 支持）
    setCorsHeaders(res);

    // 条件注释：处理 OPTIONS 预检请求
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 条件注释：GET /sse 建立 SSE 流（每个连接创建新的 Server）
    if (method === 'GET' && url === '/sse') {
      logger.info('[SSE] 收到 SSE 连接请求（GET）');

      // 创建新的 Server 实例（每个 SSE 连接独立）
      const mcpServer = createMcpServer({ config });

      // 创建 SSE 传输层（endpoint 为 /message）
      // 条件注释：SSEServerTransport 构造函数需要 endpoint 和 ServerResponse
      const transport = new SSEServerTransport('/message', res);
      const sessionId = transport.sessionId;

      // 存储连接
      activeConnections.set(sessionId, { server: mcpServer, transport });

      // 设置关闭回调
      transport.onclose = () => {
        activeConnections.delete(sessionId);
        logger.info('[SSE] SSE 连接已关闭', { sessionId });
      };

      // 连接 Server 和 Transport（会自动调用 transport.start()）
      // 条件注释：Server.connect() 内部会调用 transport.start()
      await mcpServer.connect(transport);

      logger.info('[SSE] SSE 流已建立', { sessionId });
    }
    // 条件注释：POST /message 接收客户端消息
    else if (method === 'POST' && url.startsWith('/message')) {
      logger.info('[SSE] 收到消息请求（POST）', { url });

      // 从 URL query 提取 sessionId
      const match = url.match(/sessionId=([a-f0-9-]+)/);
      const sessionId = match?.[1];

      if (!sessionId) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing sessionId in URL');
        return;
      }

      const connection = activeConnections.get(sessionId);
      if (!connection) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Session not found');
        return;
      }

      // 处理消息（transport.handlePostMessage 会自动处理）
      await connection.transport.handlePostMessage(req, res);
    }
    // 条件注释：其他请求返回 404
    else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });

  // 监听端口（监听所有接口，允许外部连接）
  httpServer.listen(ssePort, '0.0.0.0', () => {
    logger.info('[SSE] SSE Server 已启动', { port: ssePort });
  });

  // 条件注释：返回实际端口信息
  return { ssePort, httpPort: actualHttpPort };
}