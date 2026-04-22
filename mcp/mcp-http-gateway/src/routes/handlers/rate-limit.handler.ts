/**
 * Rate Limit 路由处理器
 *
 * Features:
 * - GET /api/rate-limit - 获取限流全局状态
 * - GET /api/rate-limit/tools - 获取所有工具级限流状态
 * - GET /api/rate-limit/tools/:toolName - 获取单个工具限流状态
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import {
  sendJsonResponse,
  sendBadRequestResponse,
} from './response.js';
import {
  getRateLimitStatus,
  getAllToolRateLimitStatus,
} from '../../features/rate-limit.js';
import { logger } from '../../middleware/logger.js';

/**
 * 限流全局状态处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function rateLimitStatusHandler(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  // 获取限流全局状态
  const status = getRateLimitStatus();

  sendJsonResponse(res, 200, {
    enabled: status.enabled,
    type: status.type,
    global: status.global,
    rejectionCount: status.rejectionCount,
  });

  return true;
}

/**
 * 所有工具级限流状态处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function rateLimitToolsHandler(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  // 获取所有工具级限流状态
  const toolStatuses = getAllToolRateLimitStatus();

  sendJsonResponse(res, 200, {
    tools: toolStatuses,
    count: Object.keys(toolStatuses).length,
  });

  return true;
}

/**
 * 单个工具限流状态处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param params - 路由参数
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function rateLimitToolHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>
): Promise<boolean> {
  const toolName = params?.['1'] ?? '';

  // 条件注释：工具名不存在时返回错误
  if (!toolName) {
    sendBadRequestResponse(res, 'Tool name required');
    return true;
  } else {
    // 获取单个工具限流状态
    const status = getRateLimitStatus(toolName);

    // 条件注释：工具限流配置不存在时返回提示
    if (!status.tool) {
      sendJsonResponse(res, 200, {
        toolName,
        message: 'No tool-level rate limit configured',
        global: status.global,
      });
      return true;
    } else {
      sendJsonResponse(res, 200, {
        toolName,
        tool: status.tool,
        global: status.global,
      });
      return true;
    }
  }
}

/**
 * 创建 Rate Limit 路由处理器工厂函数
 *
 * @returns Rate Limit 路由策略配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getRateLimitRoutes(): Array<{
  name: string;
  path: string | RegExp;
  matchType: 'exact' | 'regex';
  methods?: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'rate-limit-status',
      path: '/api/rate-limit',
      matchType: 'exact',
      methods: ['GET'],
      handler: rateLimitStatusHandler,
      priority: 90,
    },
    {
      name: 'rate-limit-tools',
      path: '/api/rate-limit/tools',
      matchType: 'exact',
      methods: ['GET'],
      handler: rateLimitToolsHandler,
      priority: 91,
    },
    {
      name: 'rate-limit-tool',
      path: /^\/api\/rate-limit\/tools\/([^/]+)$/,
      matchType: 'regex',
      handler: rateLimitToolHandler,
      priority: 92,
    },
  ];
}