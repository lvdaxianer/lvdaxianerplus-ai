/**
 * Health 检查路由处理器
 *
 * Features:
 * - /health - 综合健康检查
 * - /health/ready - K8s 就绪探针
 * - /health/live - K8s 存活探针
 * - /health/startup - K8s 启动探针
 * - /health/detail - 详细组件状态
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import type { Config } from '../../config/types.js';
import {
  handleHealthCheck,
  handleDetailedHealth,
  handleReadyCheck,
  handleLiveCheck,
  handleStartupCheck,
} from '../health.js';
import { sendJsonResponse } from './response.js';

/**
 * 创建综合 Health 处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createHealthHandler(config: Config): RouteHandler {
  return async function healthHandler(
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const health = handleHealthCheck(config);
    sendJsonResponse(res, 200, health);
    return true;
  };
}

/**
 * 创建详细 Health 处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createDetailHealthHandler(config: Config): RouteHandler {
  return async function detailHealthHandler(
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const health = handleDetailedHealth(config);
    sendJsonResponse(res, 200, health);
    return true;
  };
}

/**
 * 创建就绪检查处理器（K8s Ready Probe）
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createReadyHandler(config: Config): RouteHandler {
  return async function readyHandler(
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const ready = handleReadyCheck(config);

    // 条件注释：就绪时返回 200，未就绪时返回 503
    const statusCode = ready.ready ? 200 : 503;
    sendJsonResponse(res, statusCode, ready);
    return true;
  };
}

/**
 * 创建存活检查处理器（K8s Live Probe）
 *
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createLiveHandler(): RouteHandler {
  return async function liveHandler(
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const live = handleLiveCheck();
    sendJsonResponse(res, 200, live);
    return true;
  };
}

/**
 * 创建启动检查处理器（K8s Startup Probe）
 *
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createStartupHandler(): RouteHandler {
  return async function startupHandler(
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const startup = handleStartupCheck();

    // 条件注释：启动完成返回 200，未完成返回 503
    const statusCode = startup.started ? 200 : 503;
    sendJsonResponse(res, statusCode, startup);
    return true;
  };
}

/**
 * Health 路由策略配置
 *
 * @param config - 服务配置
 * @returns 路由策略数组
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getHealthRoutes(config: Config): Array<{
  name: string;
  path: string;
  matchType: 'exact';
  methods: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'health',
      path: '/health',
      matchType: 'exact',
      methods: ['GET'],
      handler: createHealthHandler(config),
      priority: 100,
    },
    {
      name: 'health-detail',
      path: '/health/detail',
      matchType: 'exact',
      methods: ['GET'],
      handler: createDetailHealthHandler(config),
      priority: 100,
    },
    {
      name: 'health-ready',
      path: '/health/ready',
      matchType: 'exact',
      methods: ['GET'],
      handler: createReadyHandler(config),
      priority: 100,
    },
    {
      name: 'health-live',
      path: '/health/live',
      matchType: 'exact',
      methods: ['GET'],
      handler: createLiveHandler(),
      priority: 100,
    },
    {
      name: 'health-startup',
      path: '/health/startup',
      matchType: 'exact',
      methods: ['GET'],
      handler: createStartupHandler(),
      priority: 100,
    },
  ];
}