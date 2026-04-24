/**
 * HTTP server for health check, metrics, and API endpoints
 *
 * Features:
 * - 使用路由策略表替代 if-else 链
 * - Handlers 模块化拆分
 * - EJS 模板渲染 Dashboard
 * - CORS 支持
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

import type { Config } from '../config/types.js';
import { setStartTime } from './health.js';
import { logger } from '../middleware/logger.js';
import type { Server as HttpServer } from 'http';
import { handlePortConflict } from '../utils/port-detector.js';

// 全局保存 HTTP server 实例，用于 graceful shutdown
let httpServer: HttpServer | null = null;

// 全局保存实际使用的端口，用于 Dashboard 显示
let actualHttpPort: number = 11112;

/**
 * 获取 HTTP 服务实际使用的端口
 *
 * @returns HTTP 服务端口
 *
 * @author lvdaxianerplus
 * @date 2026-04-23
 */
export function getHttpPort(): number {
  return actualHttpPort;
}

/**
 * Close HTTP server gracefully
 *
 * @returns Promise that resolves when server is closed
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export function closeHttpServer(): Promise<void> {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close(() => {
        logger.info('[HTTP服务] HTTP server closed');
        httpServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
import { RouterStrategyTable, type RouteHandler } from './router.js';
import { setCorsHeaders, sendNotFoundResponse, sendInternalServerErrorResponse } from './handlers/response.js';
import { getHealthRoutes } from './handlers/health.handler.js';
import { getMetricsRoutes } from './handlers/metrics.handler.js';
import { getCacheRoutes } from './handlers/cache.handler.js';
import { getLogsRoutes } from './handlers/logs.handler.js';
import { getToolsRoutes } from './handlers/tools.handler.js';
import { getMockRoutes } from './handlers/mock.handler.js';
import { getConfigRoutes, setConfigPath } from './handlers/config.handler.js';
import { getAlertsRoutes } from './handlers/alerts.handler.js';
import { getAuditRoutes } from './handlers/audit.handler.js';
import { getDashboardRoutes } from './handlers/dashboard.handler.js';
import { getFallbackConditionsRoutes } from './handlers/fallback-conditions.handler.js';
import { getToolCacheRoutes, loadToolCacheConfigs } from './handlers/tool-cache.handler.js';
import { getRateLimitRoutes } from './handlers/rate-limit.handler.js';
import { getConcurrencyRoutes } from './handlers/concurrency.handler.js';
import { getTimeoutRoutes } from './handlers/timeout.handler.js';
import { getTraceRoutes } from './handlers/trace.handler.js';
import { getAlertRoutes } from './handlers/alert.handler.js';
import { getConfigVersionRoutes } from './handlers/config-version.handler.js';
import { getCanaryRoutes } from './handlers/canary.handler.js';
import { getCircuitBreakerRoutes } from './handlers/circuit-breaker.handler.js';

/**
 * HTTP 服务器配置选项
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface HttpServerOptions {
  config: Config;
  port?: number;
  configPath?: string;
}

/**
 * 创建并注册所有路由策略
 *
 * @param router - 路由策略表
 * @param config - 服务配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function registerAllRoutes(router: RouterStrategyTable, config: Config): void {
  // 注册所有路由（按模块分组）
  router.registerAll(getDashboardRoutes(config));
  router.registerAll(getHealthRoutes(config));
  router.registerAll(getMetricsRoutes());
  router.registerAll(getCacheRoutes());
  router.registerAll(getLogsRoutes());
  router.registerAll(getToolsRoutes(config));
  router.registerAll(getMockRoutes());
  router.registerAll(getConfigRoutes(config));
  router.registerAll(getAlertRoutes(config));
  router.registerAll(getAuditRoutes());
  router.registerAll(getFallbackConditionsRoutes());
  router.registerAll(getToolCacheRoutes());
  router.registerAll(getRateLimitRoutes());
  router.registerAll(getConcurrencyRoutes());
  router.registerAll(getTimeoutRoutes(config));
  router.registerAll(getTraceRoutes());
  router.registerAll(getConfigVersionRoutes(config));
  router.registerAll(getCanaryRoutes(config));
  router.registerAll(getCircuitBreakerRoutes());

  // 加载工具缓存配置
  // 条件注释：传入 config 参数，首次启动时同步配置文件到数据库
  loadToolCacheConfigs(config);

  // 条件注释：不打印详细路由列表，简化启动日志
  logger.debug('[HTTP服务] 已注册路由', { count: router.getRoutes().length });
}

/**
 * 处理 OPTIONS 请求（CORS 预检）
 *
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function handleOptionsRequest(res: import('http').ServerResponse): boolean {
  setCorsHeaders(res);
  res.writeHead(204);
  res.end();
  return true;
}

/**
 * 创建 404 处理器
 *
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function createNotFoundHandler(): RouteHandler {
  return async function notFoundHandler(
    _req: import('http').IncomingMessage,
    res: import('http').ServerResponse
  ): Promise<boolean> {
    sendNotFoundResponse(res);
    return true;
  };
}

/**
 * 创建错误处理中间件
 *
 * @param error - 错误对象
 * @param res - HTTP 响应对象
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function handleServerError(error: Error, res: import('http').ServerResponse): void {
  logger.error('[HTTP服务] 服务器内部错误', { error: error.message });
  sendInternalServerErrorResponse(res, 'Internal server error');
}

/**
 * Start HTTP server for health checks and metrics
 *
 * @param options - Server options
 * @returns HTTP server instance and port
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function startHttpServer(options: HttpServerOptions): Promise<{ server: unknown; port: number }> {
  const { config, port: explicitPort, configPath: cp } = options;
  const requestedPort = explicitPort ?? config.metrics?.port ?? config.healthCheck?.port ?? 11112;

  // 处理端口冲突：自动杀死同类进程或查找下一个可用端口
  const port = handlePortConflict(requestedPort);
  if (port === null) {
    logger.error('[HTTP服务] 无法绑定端口', { port: requestedPort });
    throw new Error(`无法绑定端口 ${requestedPort}，端口被其他进程占用`);
  }

  // 保存实际使用的端口，用于 Dashboard 显示
  actualHttpPort = port;

  // 设置配置路径
  setConfigPath(cp ?? './tools.json');
  setStartTime();

  // 创建路由策略表
  const router = new RouterStrategyTable();
  registerAllRoutes(router, config);

  // 注册 404 处理器（最低优先级）
  router.register({
    name: 'not-found',
    path: /.*/,
    matchType: 'regex',
    handler: createNotFoundHandler(),
    priority: -100,
  });

  // 创建 HTTP 服务器
  const http = await import('http');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    // 设置 CORS 头
    setCorsHeaders(res);

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
      handleOptionsRequest(res);
      return;
    }

    try {
      // 使用路由策略表匹配并处理请求
      const handled = await router.matchAndHandle(
        url.pathname,
        req.method ?? 'GET',
        req,
        res
      );

      // 条件注释：路由处理成功时记录日志，失败时返回 500
      if (handled) {
        logger.debug('[HTTP服务] 请求已处理', { path: url.pathname, method: req.method });
      } else {
        // 路由未匹配，已由 not-found 处理器处理
        logger.warn('[HTTP服务] 未匹配路由', { path: url.pathname });
      }
    } catch (error) {
      // 捕获服务器内部错误
      const err = error instanceof Error ? error : new Error(String(error));
      handleServerError(err, res);
    }
  });

  // 保存 server 实例到全局变量，用于 graceful shutdown
  httpServer = server;

  server.listen(port, () => {
    // HTTP Server 启动完成（不打印日志，最终地址在 cli.ts 统一显示）
  });

  return { server, port };
}

// 导出类型供外部使用
export type { RouteHandler } from './router.js';
export type { RouteStrategy, RouteMatchType } from './router.js';
export { RouterStrategyTable, exactRoute, regexRoute, prefixRoute } from './router.js';