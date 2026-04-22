/**
 * Concurrency 路由处理器
 *
 * Features:
 * - GET /api/concurrency - 获取并发控制全局状态
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import {
  sendJsonResponse,
} from './response.js';
import { getConcurrencyStatus } from '../../features/concurrency.js';

/**
 * 并发控制状态处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function concurrencyStatusHandler(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  // 获取并发控制状态
  const status = getConcurrencyStatus();

  sendJsonResponse(res, 200, {
    enabled: status.enabled,
    activeCount: status.activeCount,
    maxConcurrent: status.maxConcurrent,
    queueLength: status.queueLength,
    queueSize: status.queueSize,
    queueTimeout: status.queueTimeout,
    queueTimeoutCount: status.queueTimeoutCount,
  });

  return true;
}

/**
 * 创建 Concurrency 路由处理器工厂函数
 *
 * @returns Concurrency 路由策略配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getConcurrencyRoutes(): Array<{
  name: string;
  path: string | RegExp;
  matchType: 'exact' | 'regex';
  methods?: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'concurrency-status',
      path: '/api/concurrency',
      matchType: 'exact',
      methods: ['GET'],
      handler: concurrencyStatusHandler,
      priority: 93,
    },
  ];
}