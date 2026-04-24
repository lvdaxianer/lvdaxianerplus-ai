/**
 * 告警管理路由处理器
 *
 * Dashboard API:
 * - /api/alert - 告警配置和统计
 * - /api/alert/history - 告警历史列表
 * - /api/alert/history/:id - 单个告警详情
 * - /api/alert/rules - 告警规则管理
 * - /api/alert/channels - 告警渠道管理
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import type { Config } from '../../config/types.js';
import type { AlertRecord } from '../../features/alert.js';
import type { EnhancedAlertConfig } from '../../config/server-config-types.js';
import {
  getAlertConfig,
  getAlertStats,
  queryAlertHistory,
  initAlert,
  cleanAlertHistory,
  resolveAlert,
  resolveAllAlerts,
} from '../../features/alert.js';
import { sendJsonResponse } from './response.js';

/**
 * 创建告警统计处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createAlertStatsHandler(config: Config): RouteHandler {
  return async function alertStatsHandler(
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const stats = getAlertStats();
    const alertConfig = getAlertConfig();

    // 条件注释：返回统计数据和配置概览
    sendJsonResponse(res, 200, {
      stats,
      config: {
        enabled: alertConfig.enabled,
        channelsCount: alertConfig.channels?.length ?? 0,
        rulesCount: alertConfig.rules?.length ?? 0,
        maxAlertsPerHour: alertConfig.maxAlertsPerHour,
        historyRetention: alertConfig.historyRetention,
      },
    });
    return true;
  };
}

/**
 * 创建告警历史列表处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createAlertHistoryHandler(config: Config): RouteHandler {
  return async function alertHistoryHandler(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    // 条件注释：解析查询参数
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
    const type = url.searchParams.get('type') ?? undefined;
    const severity = url.searchParams.get('severity') ?? undefined;

    // 条件注释：查询告警历史
    const history = queryAlertHistory(limit, type, severity);

    sendJsonResponse(res, 200, {
      total: history.length,
      limit,
      filters: { type, severity },
      alerts: history,
    });
    return true;
  };
}

/**
 * 创建告警配置处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createAlertConfigHandler(config: Config): RouteHandler {
  return async function alertConfigHandler(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    // 条件注释：GET 返回配置，POST 更新配置
    if (req.method === 'GET') {
      const alertConfig = getAlertConfig();
      sendJsonResponse(res, 200, alertConfig);
      return true;
    }

    if (req.method === 'POST') {
      // 条件注释：解析请求体并更新配置
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const newConfig = JSON.parse(body) as Partial<EnhancedAlertConfig>;
          const currentConfig = getAlertConfig();

          // 条件注释：合并配置（不覆盖整个对象，只更新指定字段）
          const mergedConfig: EnhancedAlertConfig = {
            ...currentConfig,
            ...newConfig,
          };

          initAlert(mergedConfig);

          sendJsonResponse(res, 200, {
            success: true,
            message: 'Alert config updated',
            config: mergedConfig,
          });
        } catch (error) {
          sendJsonResponse(res, 400, {
            success: false,
            error: 'Invalid JSON body',
          });
        }
      });

      return true;
    }

    // 条件注释：不支持的请求方法
    sendJsonResponse(res, 405, { error: 'Method not allowed' });
    return true;
  };
}

/**
 * 创建告警规则列表处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createAlertRulesHandler(config: Config): RouteHandler {
  return async function alertRulesHandler(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const alertConfig = getAlertConfig();

    // 条件注释：GET 返回规则列表
    if (req.method === 'GET') {
      sendJsonResponse(res, 200, {
        total: alertConfig.rules?.length ?? 0,
        rules: alertConfig.rules ?? [],
      });
      return true;
    }

    // 条件注释：POST 添加新规则（暂不支持，返回 501）
    if (req.method === 'POST') {
      sendJsonResponse(res, 501, {
        error: 'Not implemented: Adding rules via API is not supported',
      });
      return true;
    }

    sendJsonResponse(res, 405, { error: 'Method not allowed' });
    return true;
  };
}

/**
 * 创建告警渠道列表处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createAlertChannelsHandler(config: Config): RouteHandler {
  return async function alertChannelsHandler(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const alertConfig = getAlertConfig();

    // 条件注释：GET 返回渠道列表
    if (req.method === 'GET') {
      sendJsonResponse(res, 200, {
        total: alertConfig.channels?.length ?? 0,
        channels: alertConfig.channels ?? [],
      });
      return true;
    }

    // 条件注释：POST 添加新渠道（暂不支持，返回 501）
    if (req.method === 'POST') {
      sendJsonResponse(res, 501, {
        error: 'Not implemented: Adding channels via API is not supported',
      });
      return true;
    }

    sendJsonResponse(res, 405, { error: 'Method not allowed' });
    return true;
  };
}

/**
 * 创建清理告警历史处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function createAlertCleanupHandler(config: Config): RouteHandler {
  return async function alertCleanupHandler(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    // 条件注释：只支持 POST 方法
    if (req.method !== 'POST') {
      sendJsonResponse(res, 405, { error: 'Method not allowed' });
      return true;
    }

    // 条件注释：解析请求体获取清理天数
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { maxDays } = JSON.parse(body) as { maxDays?: number };
        const retention = maxDays ?? getAlertConfig().historyRetention ?? 30;

        cleanAlertHistory(retention);

        sendJsonResponse(res, 200, {
          success: true,
          message: 'Alert history cleaned',
          maxDays: retention,
        });
      } catch (error) {
        sendJsonResponse(res, 400, {
          success: false,
          error: 'Invalid JSON body',
        });
      }
    });

    return true;
  };
}

/**
 * 创建解决单个告警处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function createAlertResolveHandler(config: Config): RouteHandler {
  return async function alertResolveHandler(
    req: IncomingMessage,
    res: ServerResponse,
    params?: Record<string, string>
  ): Promise<boolean> {
    // 条件注释：只支持 POST 方法
    if (req.method !== 'POST') {
      sendJsonResponse(res, 405, { error: 'Method not allowed' });
      return true;
    }

    // 条件注释：从 params.remaining 解析告警 ID
    // remaining 格式: 'alert-id/resolve'
    const remaining = params?.remaining;
    if (!remaining) {
      sendJsonResponse(res, 400, { error: 'Alert ID required' });
      return true;
    }

    // 条件注释：解析 remaining 路径，提取 ID
    // 格式: 'alert-xxx/resolve' 或 'alert-xxx'
    const parts = remaining.split('/');
    const id = parts[0];
    const action = parts[1];

    // 条件注释：只有 /resolve 结尾的路径才处理
    if (action !== 'resolve') {
      sendJsonResponse(res, 400, { error: 'Invalid action', remaining });
      return true;
    }

    // 条件注释：解决告警
    const success = resolveAlert(id);
    if (success) {
      sendJsonResponse(res, 200, {
        success: true,
        message: 'Alert resolved',
        id,
      });
    } else {
      sendJsonResponse(res, 404, {
        success: false,
        error: 'Alert not found',
        id,
      });
    }

    return true;
  };
}

/**
 * 创建批量解决告警处理器
 *
 * @param config - 服务配置
 * @returns RouteHandler
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function createAlertResolveAllHandler(config: Config): RouteHandler {
  return async function alertResolveAllHandler(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    // 条件注释：只支持 POST 方法
    if (req.method !== 'POST') {
      sendJsonResponse(res, 405, { error: 'Method not allowed' });
      return true;
    }

    // 条件注释：批量解决所有未解决的告警
    const count = resolveAllAlerts();
    sendJsonResponse(res, 200, {
      success: true,
      message: 'All alerts resolved',
      count,
    });

    return true;
  };
}

/**
 * 告警管理路由策略配置
 *
 * @param config - 服务配置
 * @returns 路由策略数组
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getAlertRoutes(config: Config): Array<{
  name: string;
  path: string;
  matchType: 'exact' | 'prefix';
  methods: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'alert-stats',
      path: '/api/alert',
      matchType: 'exact',
      methods: ['GET'],
      handler: createAlertStatsHandler(config),
      priority: 100,
    },
    {
      name: 'alert-history',
      path: '/api/alert/history',
      matchType: 'exact',
      methods: ['GET'],
      handler: createAlertHistoryHandler(config),
      priority: 100,
    },
    {
      name: 'alert-resolve',
      path: '/api/alert/history/',
      matchType: 'prefix',
      methods: ['POST'],
      handler: createAlertResolveHandler(config),
      priority: 90,
    },
    {
      name: 'alert-resolve-all',
      path: '/api/alert/history/resolve-all',
      matchType: 'exact',
      methods: ['POST'],
      handler: createAlertResolveAllHandler(config),
      priority: 101,
    },
    {
      name: 'alert-config',
      path: '/api/alert/config',
      matchType: 'exact',
      methods: ['GET', 'POST'],
      handler: createAlertConfigHandler(config),
      priority: 100,
    },
    {
      name: 'alert-rules',
      path: '/api/alert/rules',
      matchType: 'exact',
      methods: ['GET'],
      handler: createAlertRulesHandler(config),
      priority: 100,
    },
    {
      name: 'alert-channels',
      path: '/api/alert/channels',
      matchType: 'exact',
      methods: ['GET'],
      handler: createAlertChannelsHandler(config),
      priority: 100,
    },
    {
      name: 'alert-cleanup',
      path: '/api/alert/cleanup',
      matchType: 'exact',
      methods: ['POST'],
      handler: createAlertCleanupHandler(config),
      priority: 100,
    },
  ];
}