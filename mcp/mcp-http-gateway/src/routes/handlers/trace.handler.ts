/**
 * Trace 链路追踪路由处理器
 *
 * Features:
 * - GET /api/trace/:id - 查询指定 Trace ID 的记录
 * - GET /api/trace/recent - 查询最近的 Trace 记录
 * - GET /api/trace/tool/:name - 查询指定工具的 Trace 记录
 * - GET /api/trace/stats - 获取 Trace 统计信息
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import {
  sendJsonResponse,
} from './response.js';
import {
  queryTraceById,
  queryRecentTraces,
  queryTracesByTool,
  getActiveTracesCount,
  getTraceConfig,
} from '../../features/trace.js';
import { getDatabase } from '../../database/connection.js';

/**
 * 查询指定 Trace ID 处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param params - 路由参数
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function traceByIdHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>
): Promise<boolean> {
  // 条件注释：参数不存在时返回错误
  if (!params || !params.id) {
    sendJsonResponse(res, 400, { error: 'Missing trace_id parameter' });
    return true;
  }

  const traceId = params.id;
  const trace = queryTraceById(traceId);

  // 条件注释：未找到 Trace 时返回 404
  if (!trace) {
    sendJsonResponse(res, 404, { error: `Trace ${traceId} not found` });
    return true;
  }

  // 条件注释：找到 Trace 时返回详情
  sendJsonResponse(res, 200, {
    traceId: trace.trace_id,
    toolName: trace.tool_name,
    method: trace.method,
    url: trace.url,
    startTime: trace.start_time,
    duration: trace.duration,
    statusCode: trace.status_code,
    success: trace.success === 1,
    errorMessage: trace.error_message,
    parentTraceId: trace.parent_trace_id,
    createdAt: trace.created_at,
  });

  return true;
}

/**
 * 查询最近 Trace 记录处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function recentTracesHandler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  // 条件注释：解析 URL 参数获取 limit
  const url = new URL(req.url ?? '/', 'http://localhost');
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  // 条件注释：limit 必须在合理范围内
  const validLimit = Math.max(1, Math.min(limit, 1000));

  const traces = queryRecentTraces(validLimit);

  // 条件注释：返回 Trace 列表
  sendJsonResponse(res, 200, {
    count: traces.length,
    limit: validLimit,
    traces: traces.map(t => ({
      traceId: t.trace_id,
      toolName: t.tool_name,
      method: t.method,
      url: t.url,
      startTime: t.start_time,
      duration: t.duration,
      statusCode: t.status_code,
      success: t.success === 1,
      errorMessage: t.error_message,
      parentTraceId: t.parent_trace_id,
      createdAt: t.created_at,
    })),
  });

  return true;
}

/**
 * 查询指定工具 Trace 记录处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param params - 路由参数
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function tracesByToolHandler(
  req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>
): Promise<boolean> {
  // 条件注释：参数不存在时返回错误
  if (!params || !params.name) {
    sendJsonResponse(res, 400, { error: 'Missing tool_name parameter' });
    return true;
  }

  const toolName = params.name;

  // 条件注释：解析 URL 参数获取 limit
  const url = new URL(req.url ?? '/', 'http://localhost');
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  // 条件注释：limit 必须在合理范围内
  const validLimit = Math.max(1, Math.min(limit, 1000));

  const traces = queryTracesByTool(toolName, validLimit);

  // 条件注释：返回 Trace 列表
  sendJsonResponse(res, 200, {
    toolName,
    count: traces.length,
    limit: validLimit,
    traces: traces.map(t => ({
      traceId: t.trace_id,
      method: t.method,
      url: t.url,
      startTime: t.start_time,
      duration: t.duration,
      statusCode: t.status_code,
      success: t.success === 1,
      errorMessage: t.error_message,
      createdAt: t.created_at,
    })),
  });

  return true;
}

/**
 * Trace 统计信息处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function traceStatsHandler(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const db = getDatabase();
  const config = getTraceConfig();
  const activeCount = getActiveTracesCount();

  // 条件注释：数据库不可用时返回基本信息
  if (!db) {
    sendJsonResponse(res, 200, {
      enabled: config.enabled,
      activeTraces: activeCount,
      totalTraces: 0,
      databaseAvailable: false,
    });
    return true;
  }

  // 条件注释：获取 Trace 总数
  const totalTraces = db.prepare('SELECT COUNT(*) as count FROM trace_logs').get() as { count: number };

  // 条件注释：获取成功/失败统计
  const successStats = db.prepare(`
    SELECT
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures
    FROM trace_logs
  `).get() as { successes: number; failures: number };

  // 条件注释：获取平均耗时
  const avgDuration = db.prepare('SELECT AVG(duration) as avg FROM trace_logs').get() as { avg: number | null };

  sendJsonResponse(res, 200, {
    enabled: config.enabled,
    headerName: config.headerName ?? 'X-Trace-ID',
    generateShort: config.generateShort ?? false,
    activeTraces: activeCount,
    totalTraces: totalTraces.count,
    successes: successStats.successes ?? 0,
    failures: successStats.failures ?? 0,
    avgDuration: avgDuration.avg ?? 0,
    databaseAvailable: true,
  });

  return true;
}

/**
 * 创建 Trace 路由处理器工厂函数
 *
 * @returns Trace 路由策略配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getTraceRoutes(): Array<{
  name: string;
  path: string | RegExp;
  matchType: 'exact' | 'regex';
  methods?: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'trace-by-id',
      path: '/api/trace/:id',
      matchType: 'exact',
      methods: ['GET'],
      handler: traceByIdHandler,
      priority: 95,
    },
    {
      name: 'trace-recent',
      path: '/api/trace/recent',
      matchType: 'exact',
      methods: ['GET'],
      handler: recentTracesHandler,
      priority: 96,
    },
    {
      name: 'trace-by-tool',
      path: '/api/trace/tool/:name',
      matchType: 'exact',
      methods: ['GET'],
      handler: tracesByToolHandler,
      priority: 97,
    },
    {
      name: 'trace-stats',
      path: '/api/trace/stats',
      matchType: 'exact',
      methods: ['GET'],
      handler: traceStatsHandler,
      priority: 98,
    },
  ];
}