/**
 * Tools 路由处理器
 *
 * Features:
 * - GET /api/tools - 获取工具列表
 * - GET /api/tools/:toolName/mock - 获取工具 Mock 配置
 * - PUT /api/tools/:toolName/mock - 更新工具 Mock 配置
 * - DELETE /api/tools/:toolName/mock - 删除工具 Mock 配置
 * - POST /api/tools/:toolName/mock/generate - 生成 Mock 数据预览
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import type { Config, MockToolConfig } from '../../config/types.js';
import {
  getAllMockData,
  getGlobalMockEnabled,
  updateMockData,
  deleteMockData,
} from '../../features/mock.js';
import { generateDynamicResponse } from '../../features/mock-generator.js';
import {
  sendJsonResponse,
  sendBadRequestResponse,
  sendMethodNotAllowedResponse,
  parseJsonBody,
} from './response.js';

/**
 * Tools 列表处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param config - 服务配置
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function toolsListHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _params?: Record<string, string>,
  config?: Config
): Promise<boolean> {
  // 条件注释：配置不存在时返回错误，存在时返回工具列表
  if (!config) {
    sendBadRequestResponse(res, 'Config not available');
    return true;
  } else {
    const mockDataStore = getAllMockData();
    const tools = Object.entries(config.tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      method: tool.method,
      path: tool.path,
      mockEnabled: tool.mock?.enabled ?? mockDataStore[name]?.enabled ?? false,
      mockConfig: tool.mock ?? mockDataStore[name],
    }));
    sendJsonResponse(res, 200, { tools, globalMockEnabled: getGlobalMockEnabled() });
    return true;
  }
}

/**
 * Tool Mock 配置获取处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param params - 路由参数（包含 toolName）
 * @param config - 服务配置
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function toolMockGetHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>,
  config?: Config
): Promise<boolean> {
  const toolName = params?.['1'] ?? '';
  // 条件注释：配置不存在或工具不存在时返回错误
  if (!config || !toolName) {
    sendBadRequestResponse(res, 'Tool not found');
    return true;
  } else {
    // 条件注释：优先使用数据库/内存缓存中的 Mock 配置（支持热更新）
    // 配置文件中的 Mock 配置仅作为 fallback（首次启动时使用）
    const mockDataStore = getAllMockData();
    const mockConfig = mockDataStore[toolName] ?? config.tools[toolName]?.mock;
    sendJsonResponse(res, 200, { toolName, mockConfig });
    return true;
  }
}

/**
 * Tool Mock 配置更新处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param params - 路由参数（包含 toolName）
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function toolMockPutHandler(
  req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>
): Promise<boolean> {
  const toolName = params?.['1'] ?? '';
  // 条件注释：工具名不存在时返回错误
  if (!toolName) {
    sendBadRequestResponse(res, 'Tool name required');
    return true;
  } else {
    try {
      const body = await parseJsonBody(req);
      // 条件注释：请求体不存在时返回错误
      if (!body) {
        sendBadRequestResponse(res, 'Request body required');
        return true;
      } else {
        const mockConfig = body as MockToolConfig;
        updateMockData(toolName, mockConfig);
        sendJsonResponse(res, 200, { success: true, toolName });
        return true;
      }
    } catch {
      sendBadRequestResponse(res, 'Invalid JSON');
      return true;
    }
  }
}

/**
 * Tool Mock 配置删除处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param params - 路由参数（包含 toolName）
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function toolMockDeleteHandler(
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
    deleteMockData(toolName);
    sendJsonResponse(res, 200, { success: true, toolName });
    return true;
  }
}

/**
 * Tool Mock 路由处理器（根据方法分发）
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param params - 路由参数
 * @param config - 服务配置
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function toolMockHandler(
  req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>,
  config?: Config
): Promise<boolean> {
  const method = req.method ?? 'GET';

  // 条件注释：根据方法分发到不同处理器
  if (method === 'GET') {
    return toolMockGetHandler(req, res, params, config);
  } else if (method === 'PUT') {
    return toolMockPutHandler(req, res, params);
  } else if (method === 'DELETE') {
    return toolMockDeleteHandler(req, res, params);
  } else {
    sendMethodNotAllowedResponse(res);
    return true;
  }
}

/**
 * Tool Mock 生成预览处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param params - 路由参数（包含 toolName）
 * @param config - 服务配置
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function toolMockGenerateHandler(
  req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>,
  config?: Config
): Promise<boolean> {
  const toolName = params?.['1'] ?? '';
  // 条件注释：配置不存在或工具不存在时返回错误
  if (!config || !toolName) {
    sendBadRequestResponse(res, 'Tool not found');
    return true;
  } else {
    try {
      const body = await parseJsonBody(req);
      const mockConfig = config.tools[toolName]?.mock ?? getAllMockData()[toolName];

      // 条件注释：动态配置存在时生成数据，不存在时返回错误
      if (mockConfig?.dynamicConfig?.enabled) {
        const requestData = body as { args?: Record<string, unknown> };
        const generated = generateDynamicResponse(
          mockConfig.dynamicConfig,
          requestData?.args ?? {}
        );
        sendJsonResponse(res, 200, { generated, toolName });
        return true;
      } else {
        sendBadRequestResponse(res, 'No dynamic config for this tool');
        return true;
      }
    } catch {
      sendBadRequestResponse(res, 'Invalid JSON');
      return true;
    }
  }
}

/**
 * 创建 Tools 路由处理器工厂函数
 *
 * @param config - 服务配置
 * @returns Tools 路由策略配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getToolsRoutes(config: Config): Array<{
  name: string;
  path: string | RegExp;
  matchType: 'exact' | 'regex';
  methods?: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'tools-list',
      path: '/api/tools',
      matchType: 'exact',
      methods: ['GET'],
      handler: (req, res, params) => toolsListHandler(req, res, params, config),
      priority: 60,
    },
    {
      name: 'tool-mock',
      path: /^\/api\/tools\/([^/]+)\/mock$/,
      matchType: 'regex',
      handler: (req, res, params) => toolMockHandler(req, res, params, config),
      priority: 61,
    },
    {
      name: 'tool-mock-generate',
      path: /^\/api\/tools\/([^/]+)\/mock\/generate$/,
      matchType: 'regex',
      methods: ['POST'],
      handler: (req, res, params) => toolMockGenerateHandler(req, res, params, config),
      priority: 62,
    },
  ];
}