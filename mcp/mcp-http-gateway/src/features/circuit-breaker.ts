/**
 * Circuit breaker implementation
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */

import type { CircuitBreakerConfig } from '../config/types.js';
import { DEFAULT_CIRCUIT_BREAKER } from '../config/types.js';
import { logger } from '../middleware/logger.js';
import { getDatabase } from '../database/connection.js';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

/**
 * Circuit breaker states per tool
 */
const circuitBreakers: Map<string, CircuitBreakerState> = new Map();

/**
 * Current circuit breaker configuration (can be updated dynamically)
 * 条件注释：使用 DEFAULT_CIRCUIT_BREAKER 作为默认值，确保一致性
 */
let currentConfig: CircuitBreakerConfig = { ...DEFAULT_CIRCUIT_BREAKER };

/**
 * Get current circuit breaker configuration
 *
 * @returns Current circuit breaker configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function getCircuitBreakerConfig(): CircuitBreakerConfig {
  return { ...currentConfig };
}

/**
 * Load circuit breaker config from database
 *
 * 功能：从数据库加载熔断器配置
 * 优先级：数据库配置 > 配置文件 > 默认值
 *
 * @returns 是否从数据库成功加载配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function loadCircuitBreakerConfigFromDb(): boolean {
  const db = getDatabase();
  if (!db) {
    logger.info('[熔断器] 数据库未初始化，使用默认配置');
    return false;
  }

  try {
    const row = db.prepare(`
      SELECT enabled, failure_threshold, success_threshold, half_open_time
      FROM circuit_breaker_config
      WHERE id = 1
    `).get() as {
      enabled: number;
      failure_threshold: number;
      success_threshold: number;
      half_open_time: number;
    } | undefined;

    if (row) {
      currentConfig = {
        enabled: row.enabled === 1,
        failureThreshold: row.failure_threshold,
        successThreshold: row.success_threshold,
        halfOpenTime: row.half_open_time,
      };
      logger.info('[熔断器] 从数据库加载配置', { config: currentConfig });
      return true;
    } else {
      logger.info('[熔断器] 数据库中无配置，使用默认值');
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[熔断器] 从数据库加载配置失败', { error: errorMessage });
    return false;
  }
}

/**
 * Save circuit breaker config to database
 *
 * 功能：将熔断器配置保存到数据库
 *
 * @param config - 熔断器配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function saveCircuitBreakerConfigToDb(config: CircuitBreakerConfig): void {
  const db = getDatabase();
  if (!db) {
    logger.warn('[熔断器] 数据库未初始化，无法保存配置');
    return;
  }

  try {
    db.prepare(`
      UPDATE circuit_breaker_config
      SET enabled = ?, failure_threshold = ?, success_threshold = ?, half_open_time = ?, updated_at = datetime('now')
      WHERE id = 1
    `).run(
      config.enabled ? 1 : 0,
      config.failureThreshold,
      config.successThreshold,
      config.halfOpenTime
    );

    logger.info('[熔断器] 配置已保存到数据库', { config });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[熔断器] 保存配置到数据库失败', { error: errorMessage });
  }
}

/**
 * Initialize circuit breaker config from config file (if database is empty or has default values)
 *
 * 功能：初始化熔断器配置到数据库
 * 条件：数据库中无配置或配置为默认值时，将配置文件中的值保存到数据库
 *
 * @param configFromFile - 配置文件中的熔断器配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function initCircuitBreakerConfigToDb(configFromFile: CircuitBreakerConfig): void {
  const db = getDatabase();
  if (!db) {
    logger.warn('[熔断器] 数据库未初始化，无法保存配置');
    return;
  }

  try {
    // 条件注释：检查数据库中是否已有配置
    const row = db.prepare(`
      SELECT enabled, failure_threshold, success_threshold, half_open_time
      FROM circuit_breaker_config
      WHERE id = 1
    `).get() as {
      enabled: number;
      failure_threshold: number;
      success_threshold: number;
      half_open_time: number;
    } | undefined;

    if (!row) {
      // 条件注释：数据库中无配置，将配置文件中的值保存到数据库
      saveCircuitBreakerConfigToDb(configFromFile);
      logger.info('[熔断器] 配置文件值已初始化到数据库', { config: configFromFile });
      return;
    }

    // 条件注释：检查数据库配置是否是默认值（enabled=0, failure_threshold=5）
    // 如果配置文件中的 enabled=true，应该覆盖数据库的默认值
    const isDefaultConfig = row.enabled === 0 && row.failure_threshold === 5 && row.success_threshold === 2 && row.half_open_time === 30000;
    const configFileEnabled = configFromFile.enabled;

    if (isDefaultConfig && configFileEnabled) {
      // 条件注释：数据库是默认值且配置文件启用了熔断器，用配置文件覆盖
      saveCircuitBreakerConfigToDb(configFromFile);
      updateCircuitBreakerConfig(configFromFile);
      logger.info('[熔断器] 配置文件值已覆盖数据库默认值', { config: configFromFile });
    } else {
      logger.info('[熔断器] 数据库中已有自定义配置，跳过初始化', { dbConfig: row });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[熔断器] 初始化配置到数据库失败', { error: errorMessage });
  }
}

/**
 * Update circuit breaker configuration and reset all states
 *
 * @param config - New circuit breaker configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function updateCircuitBreakerConfig(config: CircuitBreakerConfig): void {
  // 条件注释：更新配置后重置所有熔断器状态，重新计算
  currentConfig = { ...config };
  // 重置所有工具的熔断器状态
  circuitBreakers.clear();
  logger.info('[熔断器] 配置已更新，所有状态已重置', { config });
}

/**
 * Get or create circuit breaker state for a tool
 *
 * @param toolName - Tool name
 * @returns Circuit breaker state
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
function getCircuitBreakerState(toolName: string): CircuitBreakerState {
  let state = circuitBreakers.get(toolName);

  if (!state) {
    state = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };
    circuitBreakers.set(toolName, state);
  }

  return state;
}

/**
 * Reset circuit breaker state for a specific tool
 *
 * @param toolName - Tool name (optional, if not provided reset all)
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function resetCircuitBreakerState(toolName?: string): void {
  // 条件注释：重置单个工具或所有工具的熔断器状态
  if (toolName) {
    circuitBreakers.delete(toolName);
    logger.info('[熔断器] 工具状态已重置', { toolName });
  } else {
    circuitBreakers.clear();
    logger.info('[熔断器] 所有工具状态已重置');
  }
}

/**
 * Check if circuit breaker allows request
 *
 * @param toolName - Tool name
 * @returns Circuit state: OPEN means blocked, CLOSED/HALF_OPEN means allowed
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function checkCircuitBreaker(toolName: string): CircuitState {
  // 条件注释：熔断器未启用时始终返回 CLOSED
  if (!currentConfig.enabled) {
    return 'CLOSED';
  }

  const state = getCircuitBreakerState(toolName);

  // 条件注释：OPEN 状态下检查是否应过渡到 HALF_OPEN
  if (state.state === 'OPEN') {
    if (Date.now() >= state.nextAttemptTime) {
      state.state = 'HALF_OPEN';
      state.successes = 0;
      logger.info('[熔断器] 状态变更: OPEN → HALF_OPEN', { toolName });
    }
  }

  return state.state;
}

/**
 * Record a successful request
 *
 * @param toolName - Tool name
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function recordSuccess(toolName: string): void {
  // 条件注释：熔断器未启用时跳过记录
  if (!currentConfig.enabled) return;

  const state = getCircuitBreakerState(toolName);

  // 条件注释：HALF_OPEN 状态下成功次数达到阈值时恢复为 CLOSED
  if (state.state === 'HALF_OPEN') {
    state.successes++;
    if (state.successes >= currentConfig.successThreshold) {
      state.state = 'CLOSED';
      state.failures = 0;
      state.successes = 0;
      logger.info('[熔断器] 状态变更: HALF_OPEN → CLOSED', { toolName, successes: currentConfig.successThreshold });
    }
  } else if (state.state === 'CLOSED') {
    // 条件注释：CLOSED 状态下成功时重置失败计数
    state.failures = 0;
  }
}

/**
 * Record a failed request
 *
 * @param toolName - Tool name
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function recordFailure(toolName: string): void {
  // 条件注释：熔断器未启用时跳过记录
  if (!currentConfig.enabled) return;

  const state = getCircuitBreakerState(toolName);
  state.lastFailureTime = Date.now();
  state.failures++;

  // 条件注释：HALF_OPEN 状态下失败时立即回到 OPEN
  if (state.state === 'HALF_OPEN') {
    state.state = 'OPEN';
    state.nextAttemptTime = Date.now() + currentConfig.halfOpenTime;
    logger.warn('[熔断器] 状态变更: HALF_OPEN → OPEN', { toolName, halfOpenTime: currentConfig.halfOpenTime });
  } else if (state.state === 'CLOSED') {
    // 条件注释：CLOSED 状态下失败次数达到阈值时触发熔断
    if (state.failures >= currentConfig.failureThreshold) {
      state.state = 'OPEN';
      state.nextAttemptTime = Date.now() + currentConfig.halfOpenTime;
      logger.warn('[熔断器] 状态变更: CLOSED → OPEN', { toolName, failures: state.failures, threshold: currentConfig.failureThreshold });
    }
  }
}

/**
 * Get circuit breaker status for all tools
 *
 * @param toolNames - List of tool names
 * @returns Status information
 */
export function getCircuitBreakerStatus(toolNames?: string[]): Record<string, {
  state: CircuitState;
  failures: number;
  successes: number;
}> {
  const status: Record<string, { state: CircuitState; failures: number; successes: number }> = {};

  // 条件注释：如果没有传入 toolNames，返回所有已记录熔断状态的工具
  if (!toolNames) {
    // 条件注释：遍历 circuitBreakers Map，返回所有有记录的工具状态
    for (const [name, state] of circuitBreakers.entries()) {
      status[name] = {
        state: state.state,
        failures: state.failures,
        successes: state.successes,
      };
    }
    return status;
  }

  // 条件注释：如果传入 toolNames，返回指定工具的状态（包含无记录的工具，默认 CLOSED）
  for (const name of toolNames) {
    const state = circuitBreakers.get(name);
    if (state) {
      status[name] = {
        state: state.state,
        failures: state.failures,
        successes: state.successes,
      };
    } else {
      // 条件注释：无熔断记录的工具，默认 CLOSED 状态
      status[name] = {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
      };
    }
  }

  // 条件注释：同时包含有熔断记录但不在 toolNames 中的工具（避免遗漏）
  for (const [name, state] of circuitBreakers.entries()) {
    if (!status[name]) {
      status[name] = {
        state: state.state,
        failures: state.failures,
        successes: state.successes,
      };
    }
  }

  return status;
}
