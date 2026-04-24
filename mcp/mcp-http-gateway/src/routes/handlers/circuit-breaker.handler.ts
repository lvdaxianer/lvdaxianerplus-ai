/**
 * Circuit breaker configuration handler
 *
 * Features:
 * - GET /api/circuit-breaker - 获取熔断器配置
 * - PUT /api/circuit-breaker - 更新熔断器配置
 * - POST /api/circuit-breaker/reset - 重置熔断器状态
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import { sendJsonResponse, parseJsonBody } from './response.js';
import {
  getCircuitBreakerConfig,
  updateCircuitBreakerConfig,
  getCircuitBreakerStatus,
  resetCircuitBreakerState,
  recordFailure,
  recordSuccess,
  checkCircuitBreaker,
  saveCircuitBreakerConfigToDb,
} from '../../features/circuit-breaker.js';
import { getCurrentConfig } from '../../config/loader.js';
import { logger } from '../../middleware/logger.js';

/**
 * Get tool names from current config
 *
 * @returns Array of tool names
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
function getToolNames(): string[] {
  // 条件注释：获取当前配置中的所有工具名称
  const config = getCurrentConfig();
  if (!config || !config.tools) {
    return [];
  }
  return Object.keys(config.tools);
}

/**
 * GET /api/circuit-breaker - 获取熔断器配置和状态
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export async function circuitBreakerGetHandler(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  // 条件注释：获取当前熔断器配置和所有工具的状态
  // 条件注释：不传 toolNames，让 getCircuitBreakerStatus 返回所有有熔断记录的工具
  const config = getCircuitBreakerConfig();
  const status = getCircuitBreakerStatus();

  sendJsonResponse(res, 200, {
    config,
    status,
    description: {
      enabled: '是否启用熔断器',
      failureThreshold: '连续失败次数阈值，达到此数值触发熔断（OPEN）',
      successThreshold: '半开状态下连续成功次数阈值，达到此数值恢复（CLOSED）',
      halfOpenTime: '熔断后等待时间（毫秒），超过此时间进入半开状态（HALF_OPEN）',
    },
  });
  return true;
}

/**
 * PUT /api/circuit-breaker - 更新熔断器配置
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export async function circuitBreakerPutHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  try {
    // 条件注释：读取请求体中的新配置（parseJsonBody 直接返回解析后的对象）
    const newConfig = await parseJsonBody(req) as {
      enabled: boolean;
      failureThreshold: number;
      successThreshold: number;
      halfOpenTime: number;
    };

    // 条件注释：验证请求体是否存在
    if (!newConfig) {
      sendJsonResponse(res, 400, { error: '请求体不能为空' });
      return true;
    }

    // 条件注释：验证配置参数
    if (typeof newConfig.enabled !== 'boolean') {
      sendJsonResponse(res, 400, { error: 'enabled 必须是 boolean 类型' });
      return true;
    }

    if (typeof newConfig.failureThreshold !== 'number' || newConfig.failureThreshold < 1) {
      sendJsonResponse(res, 400, { error: 'failureThreshold 必须是 >= 1 的数字' });
      return true;
    }

    if (typeof newConfig.successThreshold !== 'number' || newConfig.successThreshold < 1) {
      sendJsonResponse(res, 400, { error: 'successThreshold 必须是 >= 1 的数字' });
      return true;
    }

    if (typeof newConfig.halfOpenTime !== 'number' || newConfig.halfOpenTime < 1000) {
      sendJsonResponse(res, 400, { error: 'halfOpenTime 必须是 >= 1000 的数字（毫秒）' });
      return true;
    }

    // 条件注释：更新配置并重置所有状态
    updateCircuitBreakerConfig(newConfig);

    // 条件注释：保存配置到数据库（持久化）
    saveCircuitBreakerConfigToDb(newConfig);

    // 条件注释：返回更新后的配置和状态
    const config = getCircuitBreakerConfig();
    const status = getCircuitBreakerStatus();

    logger.info('[API] 熔断器配置已更新', { config });

    sendJsonResponse(res, 200, {
      success: true,
      message: '熔断器配置已更新，所有状态已重置',
      config,
      status,
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[API] 熔断器配置更新失败', { error: errorMessage });
    sendJsonResponse(res, 500, { error: errorMessage });
    return true;
  }
}

/**
 * POST /api/circuit-breaker/reset - 重置熔断器状态
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export async function circuitBreakerResetHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  try {
    // 条件注释：读取请求体中的工具名称（可选）
    const data = await parseJsonBody(req) as { toolName?: string } | null;
    const toolName = data?.toolName;

    // 条件注释：重置指定工具或所有工具的状态
    resetCircuitBreakerState(toolName);

    // 条件注释：返回更新后的状态
    const toolNames = getToolNames();
    const status = getCircuitBreakerStatus(toolNames);

    sendJsonResponse(res, 200, {
      success: true,
      message: toolName ? `工具 ${toolName} 的熔断器状态已重置` : '所有工具的熔断器状态已重置',
      status,
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[API] 熔断器状态重置失败', { error: errorMessage });
    sendJsonResponse(res, 500, { error: errorMessage });
    return true;
  }
}

/**
 * POST /api/circuit-breaker/test/failure - 测试失败记录
 *
 * 用于测试熔断器状态流转，手动触发失败记录
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export async function circuitBreakerTestFailureHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  try {
    // 条件注释：读取请求体中的工具名称和次数
    const data = await parseJsonBody(req) as { toolName: string; count?: number } | null;

    // 条件注释：验证工具名称是否提供
    if (!data?.toolName) {
      sendJsonResponse(res, 400, { error: 'toolName 必须提供' });
      return true;
    }

    const toolName = data.toolName;
    const count = data.count ?? 1;

    // 条件注释：先调用checkCircuitBreaker触发状态检查（OPEN→HALF_OPEN转换）
    checkCircuitBreaker(toolName);

    // 条件注释：记录指定次数的失败
    for (let i = 0; i < count; i++) {
      recordFailure(toolName);
    }

    // 条件注释：返回更新后的状态
    const toolNames = getToolNames();
    const status = getCircuitBreakerStatus(toolNames);

    logger.info('[API] 测试失败记录', { toolName, count });

    sendJsonResponse(res, 200, {
      success: true,
      message: `已为工具 ${toolName} 记录 ${count} 次失败`,
      status,
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[API] 测试失败记录失败', { error: errorMessage });
    sendJsonResponse(res, 500, { error: errorMessage });
    return true;
  }
}

/**
 * POST /api/circuit-breaker/test/success - 测试成功记录
 *
 * 用于测试熔断器状态流转，手动触发成功记录
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export async function circuitBreakerTestSuccessHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  try {
    // 条件注释：读取请求体中的工具名称和次数
    const data = await parseJsonBody(req) as { toolName: string; count?: number } | null;

    // 条件注释：验证工具名称是否提供
    if (!data?.toolName) {
      sendJsonResponse(res, 400, { error: 'toolName 必须提供' });
      return true;
    }

    const toolName = data.toolName;
    const count = data.count ?? 1;

    // 条件注释：先调用checkCircuitBreaker触发状态检查（OPEN→HALF_OPEN转换）
    checkCircuitBreaker(toolName);

    // 条件注释：记录指定次数的成功
    for (let i = 0; i < count; i++) {
      recordSuccess(toolName);
    }

    // 条件注释：返回更新后的状态
    const toolNames = getToolNames();
    const status = getCircuitBreakerStatus(toolNames);

    logger.info('[API] 测试成功记录', { toolName, count });

    sendJsonResponse(res, 200, {
      success: true,
      message: `已为工具 ${toolName} 记录 ${count} 次成功`,
      status,
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[API] 测试成功记录失败', { error: errorMessage });
    sendJsonResponse(res, 500, { error: errorMessage });
    return true;
  }
}

/**
 * 创建熔断器配置路由处理器工厂函数
 *
 * @returns 熔断器配置路由策略配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function getCircuitBreakerRoutes(): Array<{
  name: string;
  path: string;
  matchType: 'exact';
  methods: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'circuit-breaker-get',
      path: '/api/circuit-breaker',
      matchType: 'exact',
      methods: ['GET'],
      handler: circuitBreakerGetHandler,
      priority: 200,
    },
    {
      name: 'circuit-breaker-put',
      path: '/api/circuit-breaker',
      matchType: 'exact',
      methods: ['PUT'],
      handler: circuitBreakerPutHandler,
      priority: 200,
    },
    {
      name: 'circuit-breaker-reset',
      path: '/api/circuit-breaker/reset',
      matchType: 'exact',
      methods: ['POST'],
      handler: circuitBreakerResetHandler,
      priority: 200,
    },
    // 测试API端点
    {
      name: 'circuit-breaker-test-failure',
      path: '/api/circuit-breaker/test/failure',
      matchType: 'exact',
      methods: ['POST'],
      handler: circuitBreakerTestFailureHandler,
      priority: 201,
    },
    {
      name: 'circuit-breaker-test-success',
      path: '/api/circuit-breaker/test/success',
      matchType: 'exact',
      methods: ['POST'],
      handler: circuitBreakerTestSuccessHandler,
      priority: 201,
    },
  ];
}