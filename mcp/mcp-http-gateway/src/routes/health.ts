/**
 * Health check routes
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */

import type { Config } from '../config/types.js';
import { getCacheStats } from '../features/cache.js';
import { getCircuitBreakerStatus } from '../features/circuit-breaker.js';
import { getAggregatedMetrics, getAllMetrics } from '../middleware/metrics.js';
import { logger } from '../middleware/logger.js';
import { getTodayStats, getRecentLogs } from '../database/sqlite-logger.js';

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    config: { status: string; detail: string };
    circuitBreakers: { status: string; detail: string };
    cache: { status: string; detail: string };
  };
}

export interface MetricsResponse {
  aggregated: {
    totalRequests: number;
    totalSuccesses: number;
    totalErrors: number;
    avgDuration: number;
    successRate: string;
  };
  tools: Record<string, {
    requests: number;
    successes: number;
    errors: number;
    avgDuration: number;
    lastRequest: number;
  }>;
}

export interface DashboardData {
  metrics: MetricsResponse;
  circuitBreakers: Record<string, { state: string; failures: number; successes: number }>;
  toolDescriptions: Record<string, string>;
  cache: { size: number; maxSize: number; ttl: number };
  logs: Array<{
    timestamp: string;
    tool_name: string;
    level: string;
    message: string;
    response_status?: number;
    duration?: number;
    type: 'request' | 'error';
  }>;
}

let startTime = Date.now();

/**
 * Set start time for uptime calculation
 */
export function setStartTime(): void {
  startTime = Date.now();
}

/**
 * Handle health check
 *
 * @param config - Configuration
 * @returns Health check response
 */
export function handleHealthCheck(config: Config): HealthCheckResponse {
  const toolNames = Object.keys(config.tools);
  const circuitBreakerStatus = getCircuitBreakerStatus(toolNames);

  // Check circuit breakers
  const cbStates = Object.values(circuitBreakerStatus).map((s) => s.state);
  const allClosed = cbStates.every((s) => s === 'CLOSED');

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    checks: {
      config: { status: 'ok', detail: `${toolNames.length} tools loaded` },
      circuitBreakers: {
        status: allClosed ? 'ok' : 'degraded',
        detail: `${cbStates.filter((s) => s === 'CLOSED').length}/${cbStates.length} closed`,
      },
      cache: {
        status: 'ok',
        detail: `${getCacheStats().size} entries`,
      },
    },
  };
}

/**
 * Handle metrics endpoint
 *
 * @returns Metrics response
 */
export function handleMetrics(): MetricsResponse {
  const aggregated = getAggregatedMetrics();
  const allMetrics = getAllMetrics();

  const tools: MetricsResponse['tools'] = {};

  for (const [name, data] of Object.entries(allMetrics)) {
    tools[name] = {
      requests: data.requests,
      successes: data.successes,
      errors: data.errors,
      avgDuration: data.requests > 0 ? data.totalDuration / data.requests : 0,
      lastRequest: data.lastRequest,
    };
  }

  return {
    aggregated: {
      ...aggregated,
      successRate: aggregated.totalRequests > 0
        ? `${((aggregated.totalSuccesses / aggregated.totalRequests) * 100).toFixed(1)}%`
        : '0%',
    },
    tools,
  };
}

/**
 * Handle dashboard endpoint
 *
 * @param config - Configuration
 * @returns Dashboard data
 */
export function handleDashboard(config: Config): DashboardData {
  const toolNames = Object.keys(config.tools);

  // 条件：优先从 SQLite 数据库获取今日统计数据（更准确，持久化）
  const todayStats = getTodayStats();

  // 计算成功率
  const successRate = todayStats.total_requests > 0
    ? ((todayStats.total_successes / todayStats.total_requests) * 100).toFixed(1) + '%'
    : '0%';

  // 构建 metrics 数据
  const metricsData: MetricsResponse = {
    aggregated: {
      totalRequests: todayStats.total_requests,
      totalSuccesses: todayStats.total_successes,
      totalErrors: todayStats.total_errors,
      avgDuration: Math.round(todayStats.avg_duration),
      successRate,
    },
    tools: {},
  };

  // 条件：从 tool_stats 提取各工具统计
  if (todayStats.tool_stats) {
    for (const [name, stats] of Object.entries(todayStats.tool_stats)) {
      metricsData.tools[name] = {
        requests: stats.requests,
        successes: stats.successes,
        errors: stats.errors,
        avgDuration: Math.round(stats.avgDuration),
        lastRequest: Date.now(),
      };
    }
  }

  // 补充内存中的熔断器统计数据（实时数据）
  const memoryMetrics = getAllMetrics();
  for (const [name, data] of Object.entries(memoryMetrics)) {
    // 条件：如果工具不在 tool_stats 中，添加内存数据
    if (!metricsData.tools[name]) {
      metricsData.tools[name] = {
        requests: data.requests,
        successes: data.successes,
        errors: data.errors,
        avgDuration: data.requests > 0 ? Math.round(data.totalDuration / data.requests) : 0,
        lastRequest: data.lastRequest,
      };
    }
  }

  return {
    metrics: metricsData,
    circuitBreakers: getCircuitBreakerStatus(toolNames),
    toolDescriptions: Object.fromEntries(
      toolNames.map(name => [name, config.tools[name]?.description ?? ''])
    ),
    cache: getCacheStats(),
    // 条件：从 SQLite 获取最近的请求记录（而非系统日志）
    logs: getRecentLogs(20),
  };
}
