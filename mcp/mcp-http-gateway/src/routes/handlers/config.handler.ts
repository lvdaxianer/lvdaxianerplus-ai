/**
 * Config 路由处理器
 *
 * Features:
 * - GET /api/config - 获取配置（脱敏）
 * - PUT /api/config - 更新配置
 * - POST /api/config/validate - 验证配置
 * - GET /api/config/backups - 获取备份列表
 * - POST /api/config/restore/:version - 回滚配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import type { Config } from '../../config/types.js';
import {
  listBackupVersions,
  saveConfig,
  maskSensitiveConfig,
  validateConfigFormat,
  getCurrentConfig,
} from '../../config/loader.js';
import {
  sendJsonResponse,
  sendBadRequestResponse,
  parseJsonBody,
} from './response.js';
import { getDatabase } from '../../database/connection.js';
import { getAllMockData } from '../../features/mock.js';
import { compareConfigs, scheduleRestart } from '../../features/restart.js';
import { initCache } from '../../features/cache.js';
import { initMockHandler } from '../../features/mock.js';
import { setLogLevel } from '../../middleware/logger.js';
import { logger } from '../../middleware/logger.js';

/**
 * 过滤掉 SQLite 持久化配置，只保留文件配置
 *
 * SQLite 持久化配置包括：
 * - 工具级 mock 配置（应保存到 mock_configs 表）
 * - 工具级 cache 配置（应保存到 tool_cache_configs 表）
 * - fallbackConditions 数组（应保存到 fallback_conditions 表）
 *
 * @param config - 合并后的配置（来自 API GET）
 * @returns 仅包含文件配置的配置对象
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
function stripSQLiteConfigs(config: Config): Config {
  // 条件注释：创建配置副本，移除 SQLite 特有字段
  const fileConfig: Record<string, unknown> = { ...config };

  // 条件注释：移除 fallbackConditions（仅 SQLite 存储）
  delete fileConfig.fallbackConditions;

  // 条件注释：遍历工具配置，移除工具级 mock 和 cache
  if (fileConfig.tools && typeof fileConfig.tools === 'object') {
    const cleanTools: Record<string, unknown> = {};
    for (const [toolName, toolConfig] of Object.entries(fileConfig.tools as Record<string, unknown>)) {
      if (toolConfig && typeof toolConfig === 'object') {
        const cleanTool: Record<string, unknown> = { ...toolConfig };
        // 条件注释：移除工具级 mock 配置（应通过 SQLite mock_configs 管理）
        delete cleanTool.mock;
        // 条件注释：移除工具级 cache 配置（应通过 SQLite tool_cache_configs 管理）
        delete cleanTool.cache;
        cleanTools[toolName] = cleanTool;
      } else {
        cleanTools[toolName] = toolConfig;
      }
    }
    fileConfig.tools = cleanTools;
  }

  return fileConfig as Config;
}

/**
 * 配置路径（外部注入）
 */
let configPath: string = './tools.json';

/**
 * 设置配置路径
 *
 * @param path - 配置文件路径
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function setConfigPath(path: string): void {
  configPath = path;
}

/**
 * 从 SQLite 加载所有工具的持久化配置并合并到基础配置中
 *
 * SQLite 持久化配置包括：
 * - mock_configs: Mock 配置
 * - tool_cache_configs: 工具缓存配置
 * - fallback_conditions: 降级条件模板
 *
 * @param baseConfig - 基础配置（来自配置文件）
 * @returns 合并后的配置（包含 SQLite 持久化数据）
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
function mergeSQLiteConfigs(baseConfig: Config): Record<string, unknown> {
  // 条件注释：创建合并后的配置副本
  const mergedConfig: Record<string, unknown> = { ...baseConfig };
  const mergedTools: Record<string, unknown> = {};

  // 获取数据库实例
  const db = getDatabase();

  // 条件注释：数据库不可用时仅使用基础配置，可用时加载持久化配置
  if (!db) {
    logger.warn('[配置合并] 数据库不可用，仅返回基础配置');
    return maskSensitiveConfig(baseConfig);
  }

  // 从 SQLite 加载 Mock 配置
  const mockConfigs = getAllMockData();

  // 从 SQLite 加载工具缓存配置
  let toolCacheConfigs: Record<string, { enabled: boolean; ttl?: number }> = {};
  try {
    const cacheRows = db.prepare(`
      SELECT tool_name, enabled, ttl
      FROM tool_cache_configs
    `).all() as Array<{ tool_name: string; enabled: number; ttl: number }>;

    for (const row of cacheRows) {
      toolCacheConfigs[row.tool_name] = {
        enabled: row.enabled === 1,
        ttl: row.ttl,
      };
    }
  } catch (error) {
    logger.warn('[配置合并] 加载工具缓存配置失败', { error });
  }

  // 从 SQLite 加载降级条件模板
  let fallbackConditions: Array<{ name: string; enabled: boolean; conditions: unknown; description?: string }> = [];
  try {
    const fallbackRows = db.prepare(`
      SELECT name, enabled, conditions_json, description
      FROM fallback_conditions
      WHERE enabled = 1
    `).all() as Array<{ name: string; enabled: number; conditions_json: string; description: string | null }>;

    for (const row of fallbackRows) {
      try {
        fallbackConditions.push({
          name: row.name,
          enabled: row.enabled === 1,
          conditions: JSON.parse(row.conditions_json),
          description: row.description,
        });
      } catch {
        // 解析失败时跳过该条件
      }
    }
  } catch (error) {
    logger.warn('[配置合并] 加载降级条件模板失败', { error });
  }

  // 条件注释：遍历所有工具，合并 SQLite 持久化配置
  if (baseConfig.tools) {
    for (const [toolName, toolConfig] of Object.entries(baseConfig.tools)) {
      const mergedTool: Record<string, unknown> = { ...toolConfig };

      // 合并 Mock 配置
      if (mockConfigs[toolName]) {
        mergedTool.mock = mockConfigs[toolName];
      }

      // 合并缓存配置
      if (toolCacheConfigs[toolName]) {
        mergedTool.cache = toolCacheConfigs[toolName];
      }

      mergedTools[toolName] = mergedTool;
    }
  }

  // 更新合并后的工具配置
  mergedConfig.tools = mergedTools;

  // 条件注释：添加降级条件模板到配置中（新增字段）
  if (fallbackConditions.length > 0) {
    mergedConfig.fallbackConditions = fallbackConditions;
  }

  // 脱敏处理
  return maskSensitiveConfig(mergedConfig as Config);
}

/**
 * Config 获取处理器
 *
 * 返回合并后的配置（配置文件 + SQLite 持久化配置）
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param config - 服务配置
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export async function configGetHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _params?: Record<string, string>,
  config?: Config
): Promise<boolean> {
  // 条件注释：配置不存在时返回错误
  if (!config) {
    sendBadRequestResponse(res, 'Config not available');
    return true;
  } else {
    // 条件注释：合并 SQLite 持久化配置后返回
    const mergedConfig = mergeSQLiteConfigs(config);
    sendJsonResponse(res, 200, mergedConfig);
    return true;
  }
}

/**
 * Config 更新处理器
 *
 * 检测配置变更：
 * - 如果变更需要重启（如数据库路径、端口、工具配置等），提醒用户服务会重启
 * - 如果变更可热更新（如缓存、Mock、日志级别等），直接生效
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export async function configPutHandler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  try {
    const body = await parseJsonBody(req);
    // 条件注释：请求体不存在时返回错误
    if (!body) {
      sendBadRequestResponse(res, 'Request body required');
      return true;
    } else {
      const mergedConfig = body as Config;
      const oldConfig = getCurrentConfig();

      // 条件注释：过滤掉 SQLite 持久化配置，只保存文件配置
      // 这样可以防止 SQLite 持久化数据被写入配置文件
      const fileConfig = stripSQLiteConfigs(mergedConfig);

      // 条件注释：比较新旧配置，检测变更（使用文件配置进行比较）
      const changeResult = compareConfigs(oldConfig, fileConfig);

      // 条件注释：保存文件配置（不含 SQLite 持久化数据）
      const savedPath = saveConfig(fileConfig);

      // 条件注释：根据变更类型返回不同的响应
      if (changeResult.requiresRestart) {
        // 变更需要重启服务
        logger.warn('[配置更新] Configuration changed, service restart required', {
          changes: changeResult.changes,
        });

        sendJsonResponse(res, 200, {
          success: true,
          path: savedPath,
          message: '配置已保存，服务即将重启',
          warning: '⚠️ 服务将在约 5 秒后重启，期间服务会短暂中断',
          changes: changeResult.changes,
          restartScheduled: true,
        });

        // 条件注释：发送响应后调度重启
        scheduleRestart(`Configuration changed: ${changeResult.changes.join(', ')}`);
        return true;
      } else {
        // 变更可热更新
        // 条件注释：立即应用热更新配置（使用文件配置）
        if (fileConfig.cache) {
          initCache(fileConfig.cache);
        }
        if (fileConfig.mock) {
          initMockHandler(fileConfig.mock);
        }
        if (fileConfig.logging?.level) {
          setLogLevel(fileConfig.logging.level);
        }

        logger.info('[配置更新] Configuration saved and hot reload applied', {
          changes: changeResult.changes,
        });

        sendJsonResponse(res, 200, {
          success: true,
          path: savedPath,
          message: '配置已保存并热更新生效',
          changes: changeResult.changes,
          restartScheduled: false,
        });
        return true;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendBadRequestResponse(res, errorMessage);
    return true;
  }
}

/**
 * Config 验证处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function configValidateHandler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  try {
    const body = await parseJsonBody(req);
    // 条件注释：请求体不存在时返回错误
    if (!body) {
      sendBadRequestResponse(res, 'Request body required');
      return true;
    } else {
      const result = validateConfigFormat(body);
      sendJsonResponse(res, 200, result);
      return true;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendJsonResponse(res, 200, { valid: false, error: errorMessage });
    return true;
  }
}

/**
 * Config 备份列表处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param config - 服务配置
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function configBackupsHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _params?: Record<string, string>,
  config?: Config
): Promise<boolean> {
  // 条件注释：配置不存在时返回错误
  if (!config) {
    sendBadRequestResponse(res, 'Config not available');
    return true;
  } else {
    const backups = listBackupVersions(configPath, config.backup);
    sendJsonResponse(res, 200, backups);
    return true;
  }
}

/**
 * Config 回滚处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param params - 路由参数（包含 version）
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function configRestoreHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>
): Promise<boolean> {
  const version = params?.['1'] ?? '';
  // 条件注释：版本不存在时返回错误
  if (!version) {
    sendBadRequestResponse(res, 'Version required');
    return true;
  } else {
    // Placeholder - actual restore logic requires reading backup path from request body
    sendJsonResponse(res, 200, {
      success: true,
      message: `Restore ${version} - check backups list for path`,
    });
    return true;
  }
}

/**
 * 创建 Config 路由处理器工厂函数
 *
 * @param config - 服务配置
 * @returns Config 路由策略配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getConfigRoutes(config: Config): Array<{
  name: string;
  path: string | RegExp;
  matchType: 'exact' | 'regex';
  methods: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'config-get',
      path: '/api/config',
      matchType: 'exact',
      methods: ['GET'],
      handler: (req, res, params) => configGetHandler(req, res, params, config),
      priority: 40,
    },
    {
      name: 'config-put',
      path: '/api/config',
      matchType: 'exact',
      methods: ['PUT'],
      handler: configPutHandler,
      priority: 40,
    },
    {
      name: 'config-validate',
      path: '/api/config/validate',
      matchType: 'exact',
      methods: ['POST'],
      handler: configValidateHandler,
      priority: 41,
    },
    {
      name: 'config-backups',
      path: '/api/config/backups',
      matchType: 'exact',
      methods: ['GET'],
      handler: (req, res, params) => configBackupsHandler(req, res, params, config),
      priority: 40,
    },
    {
      name: 'config-restore',
      path: /^\/api\/config\/restore\/([^/]+)$/,
      matchType: 'regex',
      methods: ['POST'],
      handler: configRestoreHandler,
      priority: 39,
    },
  ];
}