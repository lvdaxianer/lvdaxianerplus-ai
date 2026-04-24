/**
 * Health check routes
 *
 * Features:
 * - /health - 综合健康检查
 * - /health/ready - K8s 就绪探针（检查依赖服务）
 * - /health/live - K8s 存活探针（基本存活检查）
 * - /health/startup - K8s 启动探针（慢启动容器）
 * - /health/detail - 详细组件状态
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { Config } from '../config/types.js';
import { getCacheStats } from '../features/cache.js';
import { getCircuitBreakerStatus } from '../features/circuit-breaker.js';
import { getAggregatedMetrics, getAllMetrics } from '../middleware/metrics.js';
import { logger } from '../middleware/logger.js';
import { getTodayStats, getRecentLogs } from '../database/sqlite-logger.js';
import { getDatabase, getDatabaseStats } from '../database/connection.js';
import { getRateLimitStatus } from '../features/rate-limit.js';
import { getConcurrencyStatus } from '../features/concurrency.js';
import { getActiveTracesCount, getTraceConfig } from '../features/trace.js';
import { getHttpPort } from './http-server.js';

/**
 * 健康检查响应类型
 *
 * @param status - 健康状态：healthy/unhealthy/degraded
 * @param timestamp - 检查时间戳
 * @param uptime - 运行时长（毫秒）
 * @param version - 版本号
 * @param checks - 各组件检查结果
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface HealthChecks {
  config: ComponentStatus;
  database: ComponentStatus;
  circuitBreakers: ComponentStatus;
  cache: ComponentStatus;
  rateLimit: ComponentStatus;
  concurrency: ComponentStatus;
  trace: ComponentStatus;
}

/**
 * 健康检查响应类型
 *
 * @param status - 健康状态：healthy/unhealthy/degraded
 * @param timestamp - 检查时间戳
 * @param uptime - 运行时长（毫秒）
 * @param version - 版本号
 * @param checks - 各组件检查结果
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: HealthChecks;
}

/**
 * 组件状态类型
 *
 * @param status - 状态：ok/degraded/error
 * @param detail - 详细信息
 * @param metrics - 相关指标（可选）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface ComponentStatus {
  status: 'ok' | 'degraded' | 'error';
  detail: string;
  metrics?: Record<string, unknown>;
}

/**
 * 详细健康检查响应类型
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface DetailedHealthResponse extends HealthCheckResponse {
  components: {
    database: {
      connected: boolean;
      path: string;
      requestLogs: number;
      errorLogs: number;
      traceLogs: number;
    };
    cache: {
      size: number;
      maxSize: number;
      ttl: number;
    };
    rateLimit: {
      enabled: boolean;
      type: string;
      globalRemaining: number;
      globalLimit: number;
      rejectionCount: number;
    };
    concurrency: {
      enabled: boolean;
      activeCount: number;
      maxConcurrent: number;
      queueLength: number;
      queueTimeoutCount: number;
    };
    trace: {
      enabled: boolean;
      activeTraces: number;
      headerName: string;
    };
    circuitBreakers: Record<string, {
      state: string;
      failures: number;
      successes: number;
    }>;
  };
  config: {
    baseUrl: string;
    toolCount: number;
    transport: string;
  };
}

/**
 * 就绪检查响应类型（K8s Ready Probe）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface ReadyCheckResponse {
  ready: boolean;
  timestamp: string;
  checks: {
    configLoaded: boolean;
    databaseConnected: boolean;
    toolsRegistered: boolean;
  };
}

/**
 * 存活检查响应类型（K8s Live Probe）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface LiveCheckResponse {
  alive: boolean;
  timestamp: string;
  uptime: number;
}

/**
 * 启动检查响应类型（K8s Startup Probe）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface StartupCheckResponse {
  started: boolean;
  timestamp: string;
  initializationTime: number;
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
  serverPort: number;
}

let startTime = Date.now();

/**
 * Set start time for uptime calculation
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export function setStartTime(): void {
  startTime = Date.now();
}

/**
 * Get start time
 *
 * @returns Start time in milliseconds
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getStartTime(): number {
  return startTime;
}

/**
 * Handle basic health check
 *
 * @param config - Configuration
 * @returns Health check response
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function handleHealthCheck(config: Config): HealthCheckResponse {
  const toolNames = Object.keys(config.tools);
  const checks = performHealthChecks(config, toolNames);

  // 条件注释：所有检查都 ok 时返回 healthy，否则返回 degraded
  const allOk = Object.values(checks).every(c => c.status === 'ok');
  const anyError = Object.values(checks).some(c => c.status === 'error');

  const status: 'healthy' | 'unhealthy' | 'degraded' = anyError ? 'unhealthy' : (allOk ? 'healthy' : 'degraded');

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version: '1.3.0',
    checks,
  };
}

/**
 * 执行各组件健康检查
 *
 * @param config - Configuration
 * @param toolNames - Tool name list
 * @returns Component status map
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function performHealthChecks(config: Config, toolNames: string[]): HealthChecks {
  // ===== 配置检查 =====
  const configStatus: ComponentStatus = {
    status: 'ok',
    detail: `${toolNames.length} tools loaded from ${config.baseUrl}`,
    metrics: { toolCount: toolNames.length },
  };

  // ===== 数据库检查 =====
  const db = getDatabase();
  const dbStatus: ComponentStatus = db
    ? {
        status: 'ok',
        detail: 'Database connected',
        metrics: getDatabaseStats(),
      }
    : {
        status: 'error',
        detail: 'Database not connected',
      };

  // ===== 熔断器检查 =====
  // 条件注释：不传 toolNames，获取所有有熔断记录的工具状态
  const circuitBreakerStatus = getCircuitBreakerStatus();
  const cbStates = Object.values(circuitBreakerStatus).map(s => s.state);
  const allClosed = cbStates.every(s => s === 'CLOSED');
  const openCount = cbStates.filter(s => s === 'OPEN').length;
  const cbStatus: ComponentStatus = {
    status: allClosed ? 'ok' : (openCount > Object.keys(circuitBreakerStatus).length / 2 ? 'error' : 'degraded'),
    detail: `${cbStates.filter(s => s === 'CLOSED').length}/${cbStates.length} closed`,
    metrics: { openCount, halfOpenCount: cbStates.filter(s => s === 'HALF_OPEN').length },
  };

  // ===== 缓存检查 =====
  const cacheStats = getCacheStats();
  const cacheStatus: ComponentStatus = {
    status: 'ok',
    detail: `${cacheStats.size} entries cached`,
    metrics: cacheStats,
  };

  // ===== 限流检查 =====
  const rateLimitGlobal = getRateLimitStatus();
  const rateLimitStatus: ComponentStatus = {
    status: 'ok',
    detail: rateLimitGlobal.enabled
      ? `Rate limit enabled, ${rateLimitGlobal.global?.remaining ?? 0} tokens remaining`
      : 'Rate limit disabled',
    metrics: {
      enabled: rateLimitGlobal.enabled,
      remainingTokens: rateLimitGlobal.global?.remaining ?? 0,
      rejectedCount: rateLimitGlobal.rejectionCount,
    },
  };

  // ===== 并发检查 =====
  const concurrencyStats = getConcurrencyStatus();
  const concurrencyStatus: ComponentStatus = {
    status: concurrencyStats.queueTimeoutCount > 100 ? 'degraded' : 'ok',
    detail: concurrencyStats.enabled
      ? `${concurrencyStats.activeCount}/${concurrencyStats.maxConcurrent} active, queue: ${concurrencyStats.queueLength}`
      : 'Concurrency disabled',
    metrics: concurrencyStats,
  };

  // ===== Trace 检查 =====
  const traceConfig = getTraceConfig();
  const activeTraces = getActiveTracesCount();
  const traceStatus: ComponentStatus = {
    status: 'ok',
    detail: traceConfig.enabled
      ? `Tracing enabled, ${activeTraces} active traces`
      : 'Tracing disabled',
    metrics: { enabled: traceConfig.enabled, activeTraces },
  };

  return {
    config: configStatus,
    database: dbStatus,
    circuitBreakers: cbStatus,
    cache: cacheStatus,
    rateLimit: rateLimitStatus,
    concurrency: concurrencyStatus,
    trace: traceStatus,
  };
}

/**
 * Handle detailed health check
 *
 * @param config - Configuration
 * @returns Detailed health response
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function handleDetailedHealth(config: Config): DetailedHealthResponse {
  const toolNames = Object.keys(config.tools);
  const baseHealth = handleHealthCheck(config);

  // 条件注释：获取详细组件状态
  const db = getDatabase();
  const dbStats = getDatabaseStats();
  const cacheStats = getCacheStats();
  const rateLimitGlobal = getRateLimitStatus();
  const concurrencyStats = getConcurrencyStatus();
  const traceConfig = getTraceConfig();
  const activeTraces = getActiveTracesCount();
  // 条件注释：不传 toolNames，获取所有有熔断记录的工具状态
  const circuitBreakerStatus = getCircuitBreakerStatus();

  return {
    ...baseHealth,
    components: {
      database: {
        connected: db !== null,
        path: dbStats.path,
        requestLogs: dbStats.requestLogs,
        errorLogs: dbStats.errorLogs,
        traceLogs: dbStats.dailyStats, // 使用 dailyStats 作为 traceLogs 计数
      },
      cache: {
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
        ttl: cacheStats.ttl,
      },
      rateLimit: {
        enabled: rateLimitGlobal.enabled,
        type: rateLimitGlobal.type,
        globalRemaining: rateLimitGlobal.global?.remaining ?? 0,
        globalLimit: rateLimitGlobal.global?.limit ?? 0,
        rejectionCount: rateLimitGlobal.rejectionCount,
      },
      concurrency: {
        enabled: concurrencyStats.enabled,
        activeCount: concurrencyStats.activeCount,
        maxConcurrent: concurrencyStats.maxConcurrent,
        queueLength: concurrencyStats.queueLength,
        queueTimeoutCount: concurrencyStats.queueTimeoutCount,
      },
      trace: {
        enabled: traceConfig.enabled,
        activeTraces,
        headerName: traceConfig.headerName ?? 'X-Trace-ID',
      },
      circuitBreakers: circuitBreakerStatus,
    },
    config: {
      baseUrl: config.baseUrl,
      toolCount: toolNames.length,
      transport: config.server?.transport ?? 'stdio',
    },
  };
}

/**
 * Handle readiness check (K8s Ready Probe)
 *
 * @param config - Configuration
 * @returns Ready check response
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function handleReadyCheck(config: Config): ReadyCheckResponse {
  const db = getDatabase();
  const toolNames = Object.keys(config.tools);

  // 条件注释：就绪检查需要确保关键组件可用
  const checks = {
    configLoaded: config.baseUrl !== undefined && toolNames.length > 0,
    databaseConnected: db !== null,
    toolsRegistered: toolNames.length > 0,
  };

  // 条件注释：所有检查通过时才 ready
  const ready = Object.values(checks).every(v => v);

  return {
    ready,
    timestamp: new Date().toISOString(),
    checks,
  };
}

/**
 * Handle liveness check (K8s Live Probe)
 *
 * @returns Live check response
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function handleLiveCheck(): LiveCheckResponse {
  // 条件注释：存活检查仅需确认进程正在运行
  return {
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
  };
}

/**
 * Handle startup check (K8s Startup Probe)
 *
 * @returns Startup check response
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function handleStartupCheck(): StartupCheckResponse {
  // 条件注释：启动检查确认初始化完成
  const initTime = Date.now() - startTime;

  return {
    started: true,
    timestamp: new Date().toISOString(),
    initializationTime: initTime,
  };
}

/**
 * Handle metrics endpoint
 *
 * @returns Metrics response
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
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
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
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
    // 条件注释：不传 toolNames，让 getCircuitBreakerStatus 返回所有有熔断记录的工具状态
    circuitBreakers: getCircuitBreakerStatus(),
    toolDescriptions: Object.fromEntries(
      toolNames.map(name => [name, config.tools[name]?.description ?? ''])
    ),
    cache: getCacheStats(),
    // 条件：从 SQLite 获取最近的请求记录（而非系统日志）
    logs: getRecentLogs(20),
    serverPort: getHttpPort(),
  };
}
