/**
 * Tool executor - executes HTTP requests for tool calls
 *
 * Execution flow (service degradation/fallback):
 * 1. Global mock mode check (only for testing)
 * 2. Circuit breaker state check (OPEN triggers fallback)
 * 3. Real service call attempt
 * 4. On failure: fallback chain (Cache → Mock → Error)
 *
 * Key insight: Cache GET data is for quick fallback usage, NOT for query acceleration.
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

import type { ToolConfig, Config, ResultSource, FallbackConfig } from '../config/types.js';
import { buildUrl, separateParams, extractPathParamNames } from './url-builder.js';
import { resolveAuth } from '../features/auth.js';
import { executeWithRetry } from '../features/retry.js';
import { checkCircuitBreaker, recordSuccess, recordFailure } from '../features/circuit-breaker.js';
import { getCachedResponseForFallback, cacheResponse, getCacheTimestamp } from '../features/cache.js';
import { transformRequest, transformResponse } from '../features/transform.js';
import type { HttpClient, HttpResponse } from '../utils/http-client.js';
import { createHttpClient } from '../utils/http-client.js';
import { logger } from '../middleware/logger.js';
import { isMockEnabled, executeMockCall, canUseMockAsFallback, executeMockFallback, getGlobalMockEnabled } from '../features/mock.js';
import {
  alertCircuitBreakerOpen,
  alertCircuitBreakerHalfOpen,
  alertCircuitBreakerClosed,
  alertServiceUnavailable,
  alertHighErrorRate,
} from '../database/alert-logger.js';
import { logAuditEntry } from '../database/audit-logger.js';
import {
  logRequestToSqlite,
  logResponseToSqlite,
  logErrorToSqlite,
  flushBuffers,
} from '../database/sqlite-logger.js';

/**
 * Execution context containing all required information for tool execution
 *
 * @param toolName - Name of the tool to execute
 * @param tool - Tool configuration
 * @param args - Tool arguments
 * @param config - Global configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface ExecuteContext {
  toolName: string;
  tool: ToolConfig;
  args: Record<string, unknown>;
  config: Config;
}

/**
 * Execution result with source tracking for fallback scenarios
 *
 * @param success - Whether execution succeeded
 * @param data - Response data (nullable on error)
 * @param error - Error message (nullable on success)
 * @param source - Data source: 'real' | 'fallback_cache' | 'fallback_mock' | 'error'
 * @param fallbackReason - Reason for fallback (e.g., "service_timeout", "circuit_open")
 * @param fromCache - Whether data came from cache (for logging purposes)
 * @param cached - Legacy field for backward compatibility
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface ExecuteResult {
  success: boolean;
  data?: unknown;
  error?: string;
  source: ResultSource;
  fallbackReason?: string;
  fromCache?: boolean;
  cached?: boolean;
}

/**
 * Execute fallback chain: Cache → Mock → Error
 *
 * This function is called when real service call fails.
 * It attempts to provide fallback data in order:
 * 1. Cache (ignoring TTL expiration)
 * 2. Mock static response
 * 3. Return error if all fallbacks exhausted
 *
 * @param context - Execution context
 * @param reason - Reason for fallback (error message or circuit state)
 * @returns Fallback result with source tracking
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
async function executeFallbackChain(
  context: ExecuteContext,
  reason: string
): Promise<ExecuteResult> {
  const { toolName, tool, args, config } = context;

  // Get fallback configuration (use defaults if not specified)
  const fallbackConfig: FallbackConfig = config.fallback ?? {
    enabled: true,
    useExpiredCache: true,
    useMockAsFallback: true,
  };

  // Condition: fallback mechanism disabled
  if (!fallbackConfig.enabled) {
    logger.warn('[服务回退] 回退机制已禁用', { toolName, reason });
    return {
      success: false,
      error: `服务不可用: ${reason}`,
      source: 'error',
      fallbackReason: reason,
    };
  }

  // Step 1: Try cache fallback (ignoring TTL)
  // Key insight: Cache GET data is for quick fallback usage, NOT for query acceleration
  if (fallbackConfig.useExpiredCache && tool.method === 'GET') {
    const cachedData = getCachedResponseForFallback(toolName, args, config.cache);

    // Condition: cached data available (even if expired)
    if (cachedData !== undefined) {
      const cacheTimestamp = getCacheTimestamp(toolName, args);
      const cacheAge = cacheTimestamp ? Date.now() - cacheTimestamp : 0;

      logger.info('[服务回退] 使用缓存数据作为回退', {
        toolName,
        reason,
        cacheAge,
        cacheExpired: config.cache ? cacheAge > config.cache.ttl : false,
      });

      return {
        success: true,
        data: cachedData,
        source: 'fallback_cache',
        fallbackReason: reason,
        fromCache: true,
        cached: true,
      };
    }
  }

  // Step 2: Try mock fallback (static response only)
  // Fallback mock only uses static response, not dynamic generation
  if (fallbackConfig.useMockAsFallback && canUseMockAsFallback(toolName, tool.mock)) {
    logger.info('[服务回退] 使用 Mock 数据作为回退', { toolName, reason });

    const mockData = executeMockFallback(toolName, args, tool.mock);

    return {
      success: true,
      data: mockData,
      source: 'fallback_mock',
      fallbackReason: reason,
      fromCache: false,
    };
  }

  // Step 3: All fallbacks exhausted, return error
  logger.error('[服务回退] 无可用回退数据', { toolName, reason });

  return {
    success: false,
    error: `服务不可用且无回退数据: ${reason}`,
    source: 'error',
    fallbackReason: reason,
  };
}

/**
 * Execute a tool call with fallback support
 *
 * Execution flow:
 * 1. Global mock mode check (only for testing)
 * 2. Circuit breaker state check (OPEN triggers fallback)
 * 3. Real service call attempt
 * 4. On failure: fallback chain (Cache → Mock → Error)
 *
 * @param context - Execution context
 * @returns Execution result with source tracking
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function executeTool(context: ExecuteContext): Promise<ExecuteResult> {
  const { toolName, tool, args, config } = context;

  // Record start time for duration calculation
  const startTime = Date.now();

  // Step 1: Global mock mode check (only for testing)
  // This is different from tool-level mock for fallback
  // Global mock mode means the entire system is in test mode
  if (getGlobalMockEnabled() && isMockEnabled(toolName, tool.mock)) {
    logger.info(`[${toolName}] 全局 Mock 模式启用，返回 Mock 响应`);
    const mockResult = await executeMockCall(toolName, args, tool.mock);

    // Log audit for mock call
    if (config.audit?.enabled) {
      logAuditEntry(
        undefined,
        undefined,
        toolName,
        'call_tool',
        args,
        mockResult.success ? 'success' : 'failed',
        mockResult.duration,
        undefined
      );
    }

    return {
      success: mockResult.success,
      data: mockResult.data,
      error: mockResult.success ? undefined : `Mock error: ${mockResult.statusCode}`,
      source: 'real',
    };
  }

  // Step 2: Circuit breaker state check
  // OPEN state triggers fallback chain instead of direct error
  if (config.circuitBreaker?.enabled) {
    const circuitState = checkCircuitBreaker(toolName, config.circuitBreaker);

    // Condition: circuit breaker is OPEN, trigger fallback
    if (circuitState === 'OPEN') {
      logger.warn(`[${toolName}] 熔断器处于 OPEN 状态，触发回退链`);
      return executeFallbackChain(context, 'circuit_breaker_open');
    }
  }

  // Step 3: Real service call attempt
  // Extract path and query param names
  const pathParamNames = extractPathParamNames(tool.path);
  const queryParamNames = tool.queryParams ? Object.keys(tool.queryParams) : [];
  const { pathParams, queryParams } = separateParams(args, pathParamNames, queryParamNames);

  // Transform request
  const transformedArgs = tool.requestTransform
    ? transformRequest(args, tool.requestTransform)
    : args;

  // Build URL
  const url = buildUrl(config.baseUrl, tool.path, pathParams, queryParams);

  // Resolve auth
  const headers = resolveAuth(tool, config);

  // Add custom headers with token resolution
  // If header value references a token key in config.tokens, resolve it to actual token value
  if (tool.headers) {
    for (const [key, value] of Object.entries(tool.headers)) {
      // Check if value is a reference to a token key
      if (config.tokens && typeof value === 'string' && config.tokens[value]) {
        headers[key] = config.tokens[value];
      } else {
        headers[key] = value;
      }
    }
  }

  // Determine timeout
  const timeout = tool.timeout ?? config.timeout?.read ?? 30000;

  // Create HTTP client
  const httpClient = createHttpClient({
    timeout,
    proxy: config.proxy,
  });

  // Build request body
  let body: string | undefined;
  let requestBody: unknown;
  if (['POST', 'PUT', 'PATCH'].includes(tool.method) && tool.body) {
    const bodyParams: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(tool.body)) {
      if (transformedArgs[key] !== undefined) {
        bodyParams[key] = transformedArgs[key];
      } else if (def.defaultValue !== undefined) {
        bodyParams[key] = def.defaultValue;
      }
    }
    body = JSON.stringify(bodyParams);
    requestBody = bodyParams;
  }

  // Log request details
  logger.logRequest(
    toolName,
    tool.method,
    url,
    headers,
    requestBody,
    config.logging?.sensitiveHeaders ?? ['authorization', 'x-api-key']
  );

  // Log request to SQLite database
  // 条件：SQLite 日志启用时记录请求到数据库
  if (config.sqlite?.enabled) {
    logger.info('[SQLite] 记录请求到 SQLite', { toolName, sqliteEnabled: config.sqlite.enabled });
    logRequestToSqlite(toolName, tool.method, url, headers, requestBody);
  } else {
    // SQLite 日志禁用：输出警告日志
    logger.warn('[SQLite] SQLite 日志禁用', { sqliteConfig: config.sqlite });
  }

  // Execute with retry
  const retryConfig = tool.retry ?? config.retry;

  let response: HttpResponse;
  try {
    response = await executeWithRetry(
      () =>
        httpClient.request({
          method: tool.method,
          url,
          headers,
          body,
        }),
      retryConfig
    );
  } catch (error) {
    // Calculate duration
    const duration = Date.now() - startTime;

    // Record circuit breaker failure
    if (config.circuitBreaker?.enabled) {
      recordFailure(toolName, config.circuitBreaker);
    }

    // Log error
    logger.logError(toolName, error, duration);

    // Log error to SQLite database
    if (config.sqlite?.enabled) {
      logErrorToSqlite(toolName, error, duration, tool.method, url, headers, requestBody);
      // Flush buffers immediately for data integrity
      flushBuffers();
    }

    // Trigger service unavailable alert
    if (config.alert?.enabled) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alertServiceUnavailable(toolName, errorMessage);
    }

    // Log audit for failed call
    if (config.audit?.enabled) {
      logAuditEntry(
        undefined,
        undefined,
        toolName,
        'call_tool',
        args,
        'failed',
        duration,
        undefined
      );
    }

    // Step 4: Real call failed, trigger fallback chain
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.info(`[${toolName}] 真实调用失败，触发回退链`, { error: errorMessage });
    return executeFallbackChain(context, errorMessage);
  }

  // Calculate duration
  const duration = Date.now() - startTime;

  // Record circuit breaker success
  if (config.circuitBreaker?.enabled) {
    recordSuccess(toolName, config.circuitBreaker);
  }

  // Parse response
  let responseData: unknown;
  try {
    responseData = response.body ? JSON.parse(response.body) : response.body;
  } catch {
    responseData = response.body;
  }

  // Log response details
  logger.logResponse(
    toolName,
    response.status,
    duration,
    responseData,
    {} // Response headers not captured yet
  );

  // Log response to SQLite database
  if (config.sqlite?.enabled) {
    logResponseToSqlite(toolName, response.status, duration, responseData);
    // Flush buffers immediately for data integrity
    flushBuffers();
  }

  // Log audit for successful call
  if (config.audit?.enabled && response.status >= 200 && response.status < 300) {
    logAuditEntry(
      undefined,
      undefined,
      toolName,
      'call_tool',
      args,
      'success',
      duration,
      undefined
    );
  }

  // Transform response
  if (tool.responseTransform) {
    responseData = transformResponse(responseData, tool.responseTransform);
  }

  // Cache response (only for GET and success)
  // Key insight: Cache GET data is for quick fallback usage, NOT for query acceleration
  if (tool.method === 'GET' && config.cache?.enabled && response.status >= 200 && response.status < 300) {
    cacheResponse(toolName, args, responseData, config.cache);
  }

  // Return based on status
  // Condition: success status codes (2xx)
  if (response.status >= 200 && response.status < 300) {
    return {
      success: true,
      data: responseData,
      source: 'real',
    };
  } else {
    // Condition: non-success status codes, trigger fallback
    logger.info(`[${toolName}] 服务返回非成功状态码，触发回退链`, { status: response.status });
    return executeFallbackChain(context, `HTTP ${response.status}`);
  }
}