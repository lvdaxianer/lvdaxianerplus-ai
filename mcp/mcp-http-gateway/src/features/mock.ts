/**
 * Mock tool handler for testing and development
 *
 * Features:
 * - Static mock responses
 * - Dynamic template responses (uses template-engine)
 * - Dynamic field-based data generation
 * - Simulated delay
 * - Mock data management
 * - SQLite persistence
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { MockToolConfig, MockConfig } from '../config/types.js';
import { logger } from '../middleware/logger.js';
import { generateDynamicResponse } from './mock-generator.js';
import { getDatabase } from '../database/connection.js';
import { processTemplate, processObjectTemplate, type TemplateContext } from './template-engine.js';

// Global mock enabled flag
let globalMockEnabled = false;

// Mock data store (内存缓存 + SQLite 持久化)
let mockDataStore: Record<string, MockToolConfig> = {};

// 持久化是否启用
let persistenceEnabled = false;

/**
 * Initialize mock handler
 *
 * @param config - Mock configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function initMockHandler(config: MockConfig | undefined): void {
  // 条件注释：无配置时不初始化，有配置时执行初始化
  if (!config) {
    logger.info('[Mock Handler] No config provided, skip initialization');
    return;
  } else {
    // 有配置，执行初始化流程
    globalMockEnabled = config.enabled;
    persistenceEnabled = true;

    // Load persisted mock configs from SQLite
    loadMockConfigsFromDatabase();

    // Merge with config-provided mock data (config takes priority)
    // 条件注释：配置中有 mockData 时合并并持久化，无 mockData 时跳过
    if (config.mockData) {
      for (const [toolName, mockConfig] of Object.entries(config.mockData)) {
        mockDataStore[toolName] = mockConfig;
        // Persist to database
        saveMockConfigToDatabase(toolName, mockConfig);
      }
    } else {
      // 配置中无 mockData，仅使用持久化数据
    }

    logger.info('[Mock Handler] Initialized', {
      globalMockEnabled,
      toolCount: Object.keys(mockDataStore).length,
      persistenceEnabled
    });
  }
}

/**
 * Load mock configs from SQLite database
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function loadMockConfigsFromDatabase(): void {
  const db = getDatabase();
  // 条件注释：数据库不可用时仅使用内存存储，可用时加载持久化配置
  if (!db) {
    logger.warn('[Mock Handler] Database not available, using memory only');
    return;
  } else {
    // 数据库可用，加载持久化配置
    try {
      const rows = db.prepare(`
        SELECT tool_name, enabled, config_json
        FROM mock_configs
      `).all() as Array<{
        tool_name: string;
        enabled: number;
        config_json: string;
      }>;

      for (const row of rows) {
        try {
          const config = JSON.parse(row.config_json) as MockToolConfig;
          mockDataStore[row.tool_name] = config;
        } catch {
          logger.warn('[Mock Handler] Failed to parse mock config', { toolName: row.tool_name });
        }
      }

      logger.info('[Mock Handler] Loaded mock configs from database', { count: rows.length });
    } catch (error) {
      logger.error('[Mock Handler] Failed to load mock configs', { error });
    }
  }
}

/**
 * Save mock config to SQLite database
 *
 * @param toolName - Tool name
 * @param config - Mock configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function saveMockConfigToDatabase(toolName: string, config: MockToolConfig): void {
  const db = getDatabase();
  // 条件注释：数据库不可用时跳过持久化，可用时保存到数据库
  if (!db) {
    logger.warn('[Mock Handler] Database not available, skipping persistence');
    return;
  } else {
    // 数据库可用，保存配置
    try {
      const configJson = JSON.stringify(config);
      const enabled = config.enabled ? 1 : 0;

      db.prepare(`
        INSERT OR REPLACE INTO mock_configs (tool_name, enabled, config_json, updated_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(toolName, enabled, configJson);

      logger.info('[Mock Handler] Saved mock config to database', { toolName });
    } catch (error) {
      logger.error('[Mock Handler] Failed to save mock config', { error, toolName });
    }
  }
}

/**
 * Check if mock is enabled for a tool
 *
 * 工具级 Mock 独立控制：
 * - 工具 Mock ON → Mock 生效，不受全局开关影响
 * - 工具 Mock OFF → 不生效，走真实 API
 * - 工具未单独配置时 → 使用全局 Mock 设置
 *
 * @param toolName - Tool name
 * @param toolMockConfig - Tool-specific mock config
 * @returns Whether mock is enabled
 *
 * @author lvdaxianerplus
 * @date 2026-04-23
 */
export function isMockEnabled(toolName: string, toolMockConfig?: MockToolConfig): boolean {
  // Step 1: 热加载：从数据库重新加载 Mock 配置（最高优先级，支持热更新）
  reloadMockConfigFromDatabase(toolName);

  // Step 2: 检查数据库中的 Mock 配置
  // 条件注释：数据库中存在 Mock 配置时，使用该配置（支持热更新）
  const dbConfig = mockDataStore[toolName];
  if (dbConfig !== undefined && 'enabled' in dbConfig) {
    const result = dbConfig.enabled;
    logger.info('[Mock Handler] Mock check result from database', {
      toolName,
      dbEnabled: result,
      globalMock: globalMockEnabled
    });
    return result;
  }

  // Step 3: 检查配置文件中的工具级 Mock 配置（次优先级）
  // 条件注释：配置文件中明确配置了 enabled 字段时，使用该配置
  if (toolMockConfig !== undefined && 'enabled' in toolMockConfig) {
    logger.info('[Mock Handler] Mock check result from config file', {
      toolName,
      configEnabled: toolMockConfig.enabled,
      globalMock: globalMockEnabled
    });
    return toolMockConfig.enabled;
  }

  // Step 4: 工具未单独配置时，使用全局 Mock 设置（最低优先级）
  logger.info('[Mock Handler] Mock check result from global', {
    toolName,
    globalMock: globalMockEnabled
  });
  return globalMockEnabled;
}

/**
 * Generate mock response
 *
 * @param toolName - Tool name
 * @param args - Request arguments
 * @param toolMockConfig - Tool-specific mock config
 * @returns Mock response data
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function generateMockResponse(
  toolName: string,
  args: Record<string, unknown>,
  toolMockConfig?: MockToolConfig
): {
  data: unknown;
  statusCode: number;
  headers: Record<string, string>;
  delay: number;
} {
  // Get mock config (database/memory has higher priority for hot reload)
  // 条件注释：优先使用数据库/内存中的配置（支持热更新），其次使用配置文件中的配置
  const mockConfig = mockDataStore[toolName] ?? toolMockConfig;

  // Condition: no mock config available
  if (!mockConfig) {
    logger.warn('[Mock Handler] No mock config for tool', { toolName });
    return {
      data: { error: 'No mock configuration' },
      statusCode: 500,
      headers: {},
      delay: 0,
    };
  }

  // Get response data - priority: dynamicConfig > responseTemplate > response
  let response: unknown;
  const context: TemplateContext = { args };

  // Condition: dynamicConfig enabled - generate dynamic data
  if (mockConfig.dynamicConfig?.enabled) {
    response = generateDynamicResponse(mockConfig.dynamicConfig, args);
    logger.info('[Mock Handler] Generated dynamic response', { toolName });
  } else if (mockConfig.responseTemplate) {
    // Condition: responseTemplate provided - use template engine
    const processedTemplate = processTemplate(mockConfig.responseTemplate, context);
    try {
      response = JSON.parse(processedTemplate);
    } catch {
      // If not valid JSON, return as string
      response = processedTemplate;
    }
  } else if (mockConfig.response) {
    // Condition: static response provided - use template engine for object
    response = processObjectTemplate(mockConfig.response, context);
  } else {
    // Default: empty response
    response = { success: true, mocked: true };
  }

  const statusCode = mockConfig.statusCode ?? 200;
  const headers = mockConfig.headers ?? { 'Content-Type': 'application/json' };
  const delay = mockConfig.delay ?? 0;

  logger.info('[Mock Handler] Generated mock response', {
    toolName,
    statusCode,
    delay,
    responseType: typeof response,
  });

  return {
    data: response,
    statusCode,
    headers,
    delay,
  };
}

/**
 * Simulate delay
 *
 * @param delayMs - Delay in milliseconds
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function simulateDelay(delayMs: number): Promise<void> {
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

/**
 * Update mock data for a tool
 *
 * @param toolName - Tool name
 * @param mockConfig - Mock configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function updateMockData(toolName: string, mockConfig: MockToolConfig): void {
  mockDataStore[toolName] = mockConfig;

  // Persist to SQLite
  if (persistenceEnabled) {
    saveMockConfigToDatabase(toolName, mockConfig);
  }

  logger.info('[Mock Handler] Updated mock data', { toolName });
}

/**
 * Delete mock data for a tool
 *
 * @param toolName - Tool name
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function deleteMockData(toolName: string): void {
  if (mockDataStore[toolName]) {
    delete mockDataStore[toolName];

    // Delete from SQLite
    const db = getDatabase();
    if (db && persistenceEnabled) {
      db.prepare('DELETE FROM mock_configs WHERE tool_name = ?').run(toolName);
    }

    logger.info('[Mock Handler] Deleted mock data', { toolName });
  }
}

/**
 * Get all mock data
 *
 * @returns Mock data store
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getAllMockData(): Record<string, MockToolConfig> {
  return { ...mockDataStore };
}

/**
 * Set global mock enabled
 *
 * @param enabled - Whether global mock is enabled
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function setGlobalMockEnabled(enabled: boolean): void {
  globalMockEnabled = enabled;
  logger.info('[Mock Handler] Global mock enabled changed', { globalMockEnabled });
}

/**
 * Get global mock enabled status
 *
 * @returns Global mock enabled
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getGlobalMockEnabled(): boolean {
  return globalMockEnabled;
}

/**
 * Execute mock tool call
 *
 * @param toolName - Tool name
 * @param args - Request arguments
 * @param toolMockConfig - Tool-specific mock config
 * @returns Mock execution result
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function executeMockCall(
  toolName: string,
  args: Record<string, unknown>,
  toolMockConfig?: MockToolConfig
): Promise<{
  success: boolean;
  data: unknown;
  statusCode: number;
  duration: number;
}> {
  const startTime = Date.now();

  // Generate mock response
  const mockResponse = generateMockResponse(toolName, args, toolMockConfig);

  // Simulate delay
  await simulateDelay(mockResponse.delay);

  const duration = Date.now() - startTime;

  // Determine success based on status code
  const success = mockResponse.statusCode >= 200 && mockResponse.statusCode < 300;

  return {
    success,
    data: mockResponse.data,
    statusCode: mockResponse.statusCode,
    duration,
  };
}

/**
 * Check if mock can be used as fallback for a tool
 *
 * Fallback mock does not require global mock to be enabled.
 * It checks if the tool has a static mock configuration available.
 *
 * 热加载：每次检查时从数据库重新加载配置，确保配置更新后立即生效。
 *
 * @param toolName - Tool name
 * @param toolMockConfig - Tool-specific mock config
 * @returns Whether mock can be used as fallback
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export function canUseMockAsFallback(toolName: string, toolMockConfig?: MockToolConfig): boolean {
  // Fallback mock uses static response only, independent of Mock mode
  // 条件注释：Fallback 使用 Mock 的条件是存在 response 字段，不需要 enabled=true
  // Mock 模式控制是否跳过 HTTP，Fallback Mock 控制是否用 Mock 作为降级数据

  // Check tool-specific mock config from config file
  // 条件注释：配置文件有 response 字段即可作为 fallback
  if (toolMockConfig?.response) {
    return true;
  }

  // 热加载：从数据库重新加载 Mock 配置
  reloadMockConfigFromDatabase(toolName);

  // Check mock data store for static mock config
  // 条件注释：数据库中有 response 字段即可作为 fallback（不需要 enabled=true）
  const storeConfig = mockDataStore[toolName];
  if (storeConfig?.response) {
    return true;
  }

  return false;
}

/**
 * 从数据库重新加载指定工具的 Mock 配置（热加载）
 *
 * 同步数据库中的 enabled 字段到配置，确保禁用生效。
 *
 * @param toolName - Tool name
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function reloadMockConfigFromDatabase(toolName: string): void {
  const db = getDatabase();

  // 条件注释：数据库可用时从数据库加载最新配置
  if (db) {
    try {
      const row = db.prepare(`
        SELECT tool_name, enabled, config_json
        FROM mock_configs
        WHERE tool_name = ?
      `).get(toolName) as {
        tool_name: string;
        enabled: number;
        config_json: string;
      } | undefined;

      // 条件注释：找到配置时更新内存缓存，同步 enabled 字段
      if (row) {
        const config = JSON.parse(row.config_json) as MockToolConfig;
        // 同步数据库中的 enabled 字段（关键：数据库 enabled=0 时禁用 Mock）
        config.enabled = row.enabled === 1;
        mockDataStore[row.tool_name] = config;
        logger.info('[Mock Handler] Reloaded mock config from database', {
          toolName,
          dbEnabled: row.enabled,
          configEnabled: config.enabled,
          hasResponse: !!config.response
        });
      } else {
        // 未找到配置，保持现有状态
        logger.info('[Mock Handler] No mock config in database for tool', { toolName });
      }
    } catch (error) {
      logger.warn('[Mock Handler] Failed to reload mock config', { toolName, error });
    }
  } else {
    // 数据库不可用，使用内存缓存
    logger.warn('[Mock Handler] Database not available for hot reload', { toolName });
  }
}

/**
 * Execute mock as fallback (uses static response only)
 *
 * This function is specifically for fallback scenarios.
 * It only uses static mock response, not dynamic generation.
 * The goal is to provide stable fallback data, not dynamic test data.
 *
 * @param toolName - Tool name
 * @param args - Request arguments
 * @param toolMockConfig - Tool-specific mock config
 * @returns Mock fallback data
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function executeMockFallback(
  toolName: string,
  args: Record<string, unknown>,
  toolMockConfig?: MockToolConfig
): unknown {
  // Get mock config (tool-specific or from store)
  const mockConfig = toolMockConfig ?? mockDataStore[toolName];

  // Condition: no mock config available
  if (!mockConfig) {
    logger.warn('[Mock Fallback] No mock config for tool', { toolName });
    return { error: 'No mock fallback configuration', fallback: true };
  }

  // Condition: use static response only (fallback needs stable data)
  if (mockConfig.response) {
    // Use template engine for object processing
    const context: TemplateContext = { args };
    const processedResponse = processObjectTemplate(mockConfig.response, context);
    logger.info('[Mock Fallback] Using static mock fallback', { toolName });
    return processedResponse;
  }

  // Condition: no static response available
  logger.warn('[Mock Fallback] No static response in mock config', { toolName });
  return { error: 'No static mock response available', fallback: true };
}