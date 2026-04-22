/**
 * Timeout 监控路由处理器
 *
 * Features:
 * - GET /api/timeout - 获取超时配置信息
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import type { Config } from '../../config/types.js';
import {
  sendJsonResponse,
} from './response.js';

/**
 * 超时配置处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param _params - 路由参数
 * @param config - 服务配置
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function timeoutConfigHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _params?: Record<string, string>,
  config?: Config
): Promise<boolean> {
  // 条件注释：配置不存在时返回错误
  if (!config) {
    sendJsonResponse(res, 200, {
      global: {
        connect: 5000,
        read: 30000,
        write: 30000,
      },
      message: 'Config not available, showing defaults',
    });
    return true;
  } else {
    // 提取全局超时配置
    const globalTimeout = {
      connect: config.timeout?.connect ?? 5000,
      read: config.timeout?.read ?? 30000,
      write: config.timeout?.write ?? 30000,
    };

    // 提取工具级超时配置
    const toolTimeouts: Record<string, number> = {};
    for (const [toolName, tool] of Object.entries(config.tools)) {
      if (tool.timeout) {
        toolTimeouts[toolName] = tool.timeout;
      }
    }

    sendJsonResponse(res, 200, {
      global: globalTimeout,
      toolTimeouts,
      toolCount: Object.keys(toolTimeouts).length,
    });

    return true;
  }
}

/**
 * 创建 Timeout 路由处理器工厂函数
 *
 * @returns Timeout 路由策略配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getTimeoutRoutes(config: Config): Array<{
  name: string;
  path: string | RegExp;
  matchType: 'exact' | 'regex';
  methods?: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'timeout-config',
      path: '/api/timeout',
      matchType: 'exact',
      methods: ['GET'],
      handler: (req, res, params) => timeoutConfigHandler(req, res, params, config),
      priority: 94,
    },
  ];
}