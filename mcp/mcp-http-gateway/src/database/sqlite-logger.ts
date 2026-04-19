/**
 * SQLite logger for request/error logs
 *
 * Features:
 * - Batch write optimization
 * - Daily statistics aggregation
 * - Query by date/tool
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

import type Database from 'better-sqlite3';
import { getDatabase, getDatabasePath } from './connection.js';
import { logger } from '../middleware/logger.js';

// Batch write buffer
interface RequestLogEntry {
  timestamp: string;
  date_key: string;
  level: string;
  tool_name: string;
  message: string;
  method?: string;
  url?: string;
  request_headers?: string;
  request_body?: string;
  response_status?: number;
  response_headers?: string;
  response_body?: string;
  duration?: number;
}

interface ErrorLogEntry {
  timestamp: string;
  date_key: string;
  level: string;
  tool_name: string;
  message: string;
  error_type?: string;
  error_stack?: string;
  request_method?: string;
  request_url?: string;
  request_headers?: string;
  request_body?: string;
  duration?: number;
}

// Batch buffers
const requestLogBuffer: RequestLogEntry[] = [];
const errorLogBuffer: ErrorLogEntry[] = [];

// Configuration
let batchSize = 100;
let flushTimeout = 5000; // 5 seconds
let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize SQLite logger with batch configuration
 *
 * @param config - SQLite logging config
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function initSqliteLogger(config: {
  batchSize?: number;
  syncInterval?: number;
}): void {
  batchSize = config.batchSize ?? 100;
  flushTimeout = config.syncInterval ?? 5000;

  // Start periodic flush timer
  if (flushTimer) {
    clearInterval(flushTimer);
  }
  flushTimer = setInterval(() => {
    flushBuffers();
  }, flushTimeout);

  logger.info('[SQLite Logger] Initialized', { batchSize, flushTimeout });
}

/**
 * Log request to SQLite (with batch optimization)
 *
 * @param toolName - Tool name
 * @param method - HTTP method
 * @param url - Request URL
 * @param headers - Request headers
 * @param body - Request body
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function logRequestToSqlite(
  toolName: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown
): void {
  const now = new Date();
  const timestamp = now.toISOString();
  const date_key = timestamp.split('T')[0];

  const entry: RequestLogEntry = {
    timestamp,
    date_key,
    level: 'info',
    tool_name: toolName,
    message: `Request: ${method} ${url}`,
    method,
    url,
    request_headers: JSON.stringify(headers),
    request_body: body ? JSON.stringify(body) : undefined,
  };

  requestLogBuffer.push(entry);

  // Flush if buffer is full
  if (requestLogBuffer.length >= batchSize) {
    flushRequestBuffer();
  }
}

/**
 * Log response to SQLite
 *
 * @param toolName - Tool name
 * @param status - HTTP status code
 * @param duration - Request duration in ms
 * @param body - Response body
 * @param headers - Response headers
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function logResponseToSqlite(
  toolName: string,
  status: number,
  duration: number,
  body?: unknown,
  headers?: Record<string, string>
): void {
  const now = new Date();
  const timestamp = now.toISOString();
  const date_key = timestamp.split('T')[0];

  const entry: RequestLogEntry = {
    timestamp,
    date_key,
    level: status >= 200 && status < 300 ? 'info' : 'warn',
    tool_name: toolName,
    message: `Response: ${status}`,
    response_status: status,
    response_headers: headers ? JSON.stringify(headers) : undefined,
    response_body: body ? JSON.stringify(body) : undefined,
    duration,
  };

  requestLogBuffer.push(entry);

  // Update daily stats
  updateDailyStats(date_key, toolName, status, duration);

  // Flush if buffer is full
  if (requestLogBuffer.length >= batchSize) {
    flushRequestBuffer();
  }
}

/**
 * Log error to SQLite
 *
 * @param toolName - Tool name
 * @param error - Error object or message
 * @param duration - Request duration in ms
 * @param method - Request method
 * @param url - Request URL
 * @param headers - Request headers
 * @param body - Request body
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function logErrorToSqlite(
  toolName: string,
  error: unknown,
  duration: number,
  method?: string,
  url?: string,
  headers?: Record<string, string>,
  body?: unknown
): void {
  const now = new Date();
  const timestamp = now.toISOString();
  const date_key = timestamp.split('T')[0];

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const entry: ErrorLogEntry = {
    timestamp,
    date_key,
    level: 'error',
    tool_name: toolName,
    message: `Error: ${errorMessage}`,
    error_type: error instanceof Error ? error.constructor.name : 'Unknown',
    error_stack: errorStack,
    request_method: method,
    request_url: url,
    request_headers: headers ? JSON.stringify(headers) : undefined,
    request_body: body ? JSON.stringify(body) : undefined,
    duration,
  };

  errorLogBuffer.push(entry);

  // Update daily stats (error)
  updateDailyStats(date_key, toolName, 0, duration, true);

  // Flush if buffer is full
  if (errorLogBuffer.length >= batchSize) {
    flushErrorBuffer();
  }
}

/**
 * Flush all buffers immediately
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function flushBuffers(): void {
  flushRequestBuffer();
  flushErrorBuffer();
}

/**
 * Flush request log buffer to database
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function flushRequestBuffer(): void {
  const db = getDatabase();
  // 条件注释：数据库不可用时记录错误并返回，可用时继续处理
  if (!db) {
    logger.error('[SQLite Logger] Database not available for flushing');
    return;
  } else {
    // 数据库可用，检查缓冲区
    // 条件注释：缓冲区为空时跳过，非空时执行刷新
    if (requestLogBuffer.length === 0) {
      logger.debug('[SQLite Logger] Request buffer empty, skip flush');
      return;
    } else {
      // 缓冲区非空，执行刷新操作
      logger.info('[SQLite Logger] Flushing request buffer', { count: requestLogBuffer.length });

      // Use prepared statement with proper binding
      const insert = db.prepare(`
        INSERT INTO request_logs (
          timestamp, date_key, level, tool_name, message,
          method, url, request_headers, request_body,
          response_status, response_headers, response_body, duration
        ) VALUES (
          @timestamp, @date_key, @level, @tool_name, @message,
          @method, @url, @request_headers, @request_body,
          @response_status, @response_headers, @response_body, @duration
        )
      `);

  // 条件：使用事务包装批量插入，避免逐条插入的性能问题
  const insertMany = db.transaction((entries: RequestLogEntry[]) => {
    for (const entry of entries) {
      insert.run(entry);
    }
  });

  try {
    insertMany([...requestLogBuffer]);
    requestLogBuffer.length = 0;
  } catch (error) {
    logger.error('[SQLite Logger] Failed to flush request buffer', { error });
  }
    }
  }
}

/**
 * Flush error log buffer to database
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function flushErrorBuffer(): void {
  const db = getDatabase();
  // 条件注释：数据库不可用或缓冲区为空时跳过，否则执行刷新
  if (!db || errorLogBuffer.length === 0) {
    logger.debug('[SQLite Logger] Skip error buffer flush', { hasDb: !!db, bufferLength: errorLogBuffer.length });
    return;
  } else {
    // 数据库可用且缓冲区非空，执行刷新操作
    logger.info('[SQLite Logger] Flushing error buffer', { count: errorLogBuffer.length });

    const insert = db.prepare(`
      INSERT INTO error_logs (
        timestamp, date_key, level, tool_name, message,
        error_type, error_stack, request_method, request_url,
        request_headers, request_body, duration
      ) VALUES (
        @timestamp, @date_key, @level, @tool_name, @message,
        @error_type, @error_stack, @request_method, @request_url,
        @request_headers, @request_body, @duration
      )
    `);

    const insertMany = db.transaction((entries: ErrorLogEntry[]) => {
      for (const entry of entries) {
        insert.run(entry);
      }
    });

    try {
      insertMany([...errorLogBuffer]);
      errorLogBuffer.length = 0;
    } catch (error) {
      logger.error('[SQLite Logger] Failed to flush error buffer', { error });
    }
  }
}

/**
 * Update daily statistics
 *
 * @param dateKey - Date key (YYYY-MM-DD)
 * @param toolName - Tool name
 * @param status - HTTP status code (0 for error)
 * @param duration - Request duration in ms
 * @param isError - Whether this is an error
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function updateDailyStats(
  dateKey: string,
  toolName: string,
  status: number,
  duration: number,
  isError: boolean = false
): void {
  const db = getDatabase();
  // 条件注释：数据库未初始化时直接返回，已初始化时执行统计更新
  if (!db) {
    return;
  } else {
    // 数据库已初始化，执行统计更新逻辑
    performStatsUpdate(db, dateKey, toolName, status, duration, isError);
  }
}

/**
 * 执行统计更新操作（内部辅助方法）
 *
 * @param db - Database instance
 * @param dateKey - Date key (YYYY-MM-DD format)
 * @param toolName - Tool name
 * @param status - HTTP status code
 * @param duration - Request duration in ms
 * @param isError - Whether this is an error
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function performStatsUpdate(
  db: Database.Database,
  dateKey: string,
  toolName: string,
  status: number,
  duration: number,
  isError: boolean
): void {
  // Get existing stats for the day
  const existing = db.prepare(
    'SELECT * FROM daily_stats WHERE date_key = ?'
  ).get(dateKey) as DailyStatsRecord | undefined;

  // 条件注释：已有统计记录时更新，不存在时创建新记录
  if (existing) {
    updateExistingStats(db, existing, toolName, status, duration, isError);
  } else {
    createNewStatsEntry(db, dateKey, toolName, status, duration, isError);
  }
}

/**
 * 日统计记录类型定义
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
interface DailyStatsRecord {
  date_key: string;
  total_requests: number;
  total_successes: number;
  total_errors: number;
  avg_duration: number;
  tool_stats: string;
}

/**
 * 更新已有的统计记录
 *
 * @param db - Database instance
 * @param existing - Existing daily stats record
 * @param toolName - Tool name
 * @param status - HTTP status code
 * @param duration - Request duration in ms
 * @param isError - Whether this is an error
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function updateExistingStats(
  db: Database.Database,
  existing: DailyStatsRecord,
  toolName: string,
  status: number,
  duration: number,
  isError: boolean
): void {
  const toolStats: Record<string, ToolStats> = existing.tool_stats ? JSON.parse(existing.tool_stats) : {};

  // Update tool stats
  // 条件注释：工具统计不存在时初始化，存在时更新
  if (!toolStats[toolName]) {
    toolStats[toolName] = { requests: 0, successes: 0, errors: 0, avgDuration: 0 };
  } else {
    // 工具统计已存在，继续更新逻辑
  }
  toolStats[toolName].requests++;

  // 条件注释： isError 或 status >= 400 或 status = 0 表示失败请求
  if (isError || status >= 400 || status === 0) {
    toolStats[toolName].errors++;
  } else if (status >= 200 && status < 300) {
    toolStats[toolName].successes++;
  } else {
    // 其他状态码（如 3xx）不计入成功或失败
  }

  // Update rolling average duration
  toolStats[toolName].avgDuration =
    (toolStats[toolName].avgDuration * (toolStats[toolName].requests - 1) + duration) /
    toolStats[toolName].requests;

  // Calculate new totals
  const totalRequests = existing.total_requests + 1;
  const isSuccess = !isError && status >= 200 && status < 300;
  const isFailed = isError || status >= 400 || status === 0;
  const totalSuccesses = isSuccess ? existing.total_successes + 1 : existing.total_successes;
  const totalErrors = isFailed ? existing.total_errors + 1 : existing.total_errors;
  const avgDuration = (existing.avg_duration * existing.total_requests + duration) / totalRequests;

  db.prepare(`
    UPDATE daily_stats SET
      total_requests = ?,
      total_successes = ?,
      total_errors = ?,
      avg_duration = ?,
      tool_stats = ?,
      updated_at = datetime('now')
    WHERE date_key = ?
  `).run(totalRequests, totalSuccesses, totalErrors, avgDuration, JSON.stringify(toolStats), existing.date_key);
}

/**
 * 工具统计类型定义
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
interface ToolStats {
  requests: number;
  successes: number;
  errors: number;
  avgDuration: number;
}

/**
 * 创建新的统计记录
 *
 * @param db - Database instance
 * @param dateKey - Date key (YYYY-MM-DD format)
 * @param toolName - Tool name
 * @param status - HTTP status code
 * @param duration - Request duration in ms
 * @param isError - Whether this is an error
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function createNewStatsEntry(
  db: Database.Database,
  dateKey: string,
  toolName: string,
  status: number,
  duration: number,
  isError: boolean
): void {
  const isSuccess = !isError && status >= 200 && status < 300;
  const isFailed = isError || status >= 400 || status === 0;
  const toolStats: Record<string, ToolStats> = {
    [toolName]: {
      requests: 1,
      successes: isSuccess ? 1 : 0,
      errors: isFailed ? 1 : 0,
      avgDuration: duration,
    },
  };

  db.prepare(`
    INSERT INTO daily_stats (
      date_key, total_requests, total_successes, total_errors, avg_duration, tool_stats
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    dateKey,
    1,
    isSuccess ? 1 : 0,
    isFailed ? 1 : 0,
    duration,
    JSON.stringify(toolStats)
  );
}

/**
 * Query request logs by date
 *
 * @param date - Date key (YYYY-MM-DD)
 * @param limit - Maximum results
 * @returns Request logs
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getRequestLogsByDate(date: string, limit: number = 100): RequestLogEntry[] {
  const db = getDatabase();
  if (!db) {
    return [];
  }

  return db.prepare(`
    SELECT * FROM request_logs
    WHERE date_key = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(date, limit) as RequestLogEntry[];
}

/**
 * Query request logs by tool name
 *
 * @param toolName - Tool name
 * @param limit - Maximum results
 * @returns Request logs
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getRequestLogsByTool(toolName: string, limit: number = 100): RequestLogEntry[] {
  const db = getDatabase();
  if (!db) {
    return [];
  }

  return db.prepare(`
    SELECT * FROM request_logs
    WHERE tool_name = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(toolName, limit) as RequestLogEntry[];
}

/**
 * Query error logs by date
 *
 * @param date - Date key (YYYY-MM-DD)
 * @param limit - Maximum results
 * @returns Error logs
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getErrorLogsByDate(date: string, limit: number = 100): ErrorLogEntry[] {
  const db = getDatabase();
  if (!db) {
    return [];
  }

  return db.prepare(`
    SELECT * FROM error_logs
    WHERE date_key = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(date, limit) as ErrorLogEntry[];
}

/**
 * 获取失败请求日志（response_status >= 400 或 error）
 *
 * @param date - Date key (YYYY-MM-DD)
 * @param limit - Maximum results
 * @returns Failed request logs
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getFailedRequestLogs(
  date: string,
  limit: number = 100
): Array<{
  id: number;
  timestamp: string;
  date_key: string;
  level: string;
  tool_name: string;
  message: string;
  method?: string;
  url?: string;
  request_headers?: string;
  request_body?: string;
  response_status?: number;
  response_headers?: string;
  response_body?: string;
  duration?: number;
}> {
  const db = getDatabase();
  if (!db) {
    return [];
  }

  // 查询 request_logs 表中 response_status >= 400 的记录
  return db.prepare(`
    SELECT * FROM request_logs
    WHERE date_key = ? AND (response_status >= 400 OR response_status = 0 OR level = 'error')
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(date, limit) as Array<{
    id: number;
    timestamp: string;
    date_key: string;
    level: string;
    tool_name: string;
    message: string;
    method?: string;
    url?: string;
    request_headers?: string;
    request_body?: string;
    response_status?: number;
    response_headers?: string;
    response_body?: string;
    duration?: number;
  }>;
}

/**
 * 获取所有错误和失败请求（合并 error_logs 和 request_logs）
 *
 * @param date - Date key (YYYY-MM-DD)
 * @param limit - Maximum results per type
 * @returns Combined error logs
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getAllErrorLogs(
  date: string,
  limit: number = 50
): Array<{
  id: number;
  timestamp: string;
  date_key: string;
  level: string;
  tool_name: string;
  message: string;
  type: 'error' | 'failed_request';
  method?: string;
  url?: string;
  request_method?: string;
  request_url?: string;
  request_headers?: string;
  request_body?: string;
  response_status?: number;
  response_body?: string;
  error_type?: string;
  error_stack?: string;
  duration?: number;
}> {
  const db = getDatabase();
  if (!db) {
    return [];
  }

  // 查询 error_logs 表
  const errorLogs = db.prepare(`
    SELECT id, timestamp, date_key, level, tool_name, message,
           request_method as method, request_url as url,
           request_headers, request_body, duration,
           error_type, error_stack
    FROM error_logs
    WHERE date_key = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(date, limit) as Array<{
    id: number;
    timestamp: string;
    date_key: string;
    level: string;
    tool_name: string;
    message: string;
    method?: string;
    url?: string;
    request_headers?: string;
    request_body?: string;
    duration?: number;
    error_type?: string;
    error_stack?: string;
  }>;

  // 查询 request_logs 表中的失败请求
  const failedRequests = db.prepare(`
    SELECT id, timestamp, date_key, level, tool_name, message,
           method, url, request_headers, request_body,
           response_status, response_body, duration
    FROM request_logs
    WHERE date_key = ? AND (response_status >= 400 OR response_status = 0 OR level = 'error')
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(date, limit) as Array<{
    id: number;
    timestamp: string;
    date_key: string;
    level: string;
    tool_name: string;
    message: string;
    method?: string;
    url?: string;
    request_headers?: string;
    request_body?: string;
    response_status?: number;
    response_body?: string;
    duration?: number;
  }>;

  // 合并并排序
  const combined: Array<{
    id: number;
    timestamp: string;
    date_key: string;
    level: string;
    tool_name: string;
    message: string;
    type: 'error' | 'failed_request';
    method?: string;
    url?: string;
    request_headers?: string;
    request_body?: string;
    response_status?: number;
    response_body?: string;
    error_type?: string;
    error_stack?: string;
    duration?: number;
  }> = [
    ...errorLogs.map(log => ({ ...log, type: 'error' as const })),
    ...failedRequests.map(log => ({ ...log, type: 'failed_request' as const })),
  ];

  // 按时间戳降序排序
  combined.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return combined.slice(0, limit);
}

/**
 * Query daily statistics
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Daily stats
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getDailyStats(
  startDate: string,
  endDate: string
): Array<{
  date_key: string;
  total_requests: number;
  total_successes: number;
  total_errors: number;
  avg_duration: number;
  tool_stats: string;
}> {
  const db = getDatabase();
  if (!db) {
    return [];
  }

  return db.prepare(`
    SELECT * FROM daily_stats
    WHERE date_key BETWEEN ? AND ?
    ORDER BY date_key DESC
  `).all(startDate, endDate) as Array<{
    date_key: string;
    total_requests: number;
    total_successes: number;
    total_errors: number;
    avg_duration: number;
    tool_stats: string;
  }>;
}

/**
 * Get recent logs for dashboard
 *
 * @param count - Number of logs to return
 * @returns Recent logs (both requests and errors)
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getRecentLogs(count: number = 100): Array<{
  id: number;
  timestamp: string;
  date_key: string;
  level: string;
  tool_name: string;
  message: string;
  method?: string;
  url?: string;
  response_status?: number;
  duration?: number;
  type: 'request' | 'error';
}> {
  const db = getDatabase();
  if (!db) {
    return [];
  }

  // Get recent request logs
  const requestLogs = db.prepare(`
    SELECT id, timestamp, date_key, level, tool_name, message,
           method, url, response_status, duration
    FROM request_logs
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(count / 2) as Array<{
    id: number;
    timestamp: string;
    date_key: string;
    level: string;
    tool_name: string;
    message: string;
    method?: string;
    url?: string;
    response_status?: number;
    duration?: number;
  }>;

  // Get recent error logs
  const errorLogs = db.prepare(`
    SELECT id, timestamp, date_key, level, tool_name, message,
           request_method as method, request_url as url, duration
    FROM error_logs
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(count / 2) as Array<{
    id: number;
    timestamp: string;
    date_key: string;
    level: string;
    tool_name: string;
    message: string;
    method?: string;
    url?: string;
    duration?: number;
  }>;

  // Combine and sort by timestamp
  const combined = [
    ...requestLogs.map(log => ({ ...log, type: 'request' as const })),
    ...errorLogs.map(log => ({ ...log, response_status: undefined, type: 'error' as const })),
  ];

  combined.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return combined.slice(0, count);
}

/**
 * Pagination parameters for paginated queries
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface PaginationParams {
  page: number;      // 页码，从 1 开始
  pageSize: number;  // 每页条数，默认 20
}

/**
 * Paginated result wrapper
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Query request logs with pagination
 *
 * @param params - Pagination parameters
 * @param filters - Optional filters (date, tool, level)
 * @returns Paginated request logs
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getRequestLogsPaginated(
  params: PaginationParams,
  filters?: {
    date?: string;
    tool?: string;
    level?: string;
    startDate?: string;
    endDate?: string;
  }
): PaginatedResult<RequestLogEntry & { id: number; type: 'request' }> {
  const db = getDatabase();
  // Condition: database not available
  if (!db) {
    return {
      data: [],
      pagination: { page: params.page, pageSize: params.pageSize, total: 0, totalPages: 0, hasMore: false }
    };
  }

  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, Math.max(1, params.pageSize));
  const offset = (page - 1) * pageSize;

  // Build WHERE clause
  let whereClause = '';
  const whereParams: unknown[] = [];

  // Condition: filter by specific date
  if (filters?.date) {
    whereClause += 'WHERE date_key = ?';
    whereParams.push(filters.date);
  } else if (filters?.startDate && filters?.endDate) {
    // Condition: filter by date range
    whereClause += 'WHERE date_key BETWEEN ? AND ?';
    whereParams.push(filters.startDate, filters.endDate);
  }

  // Condition: filter by tool name
  if (filters?.tool) {
    whereClause += whereClause ? ' AND tool_name = ?' : 'WHERE tool_name = ?';
    whereParams.push(filters.tool);
  }

  // Condition: filter by level
  if (filters?.level) {
    whereClause += whereClause ? ' AND level = ?' : 'WHERE level = ?';
    whereParams.push(filters.level);
  }

  // Get total count
  const countRow = db.prepare(`
    SELECT COUNT(*) as count FROM request_logs ${whereClause}
  `).get(...whereParams) as { count: number };
  const total = countRow.count;

  // Get paginated data
  const data = db.prepare(`
    SELECT * FROM request_logs
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...whereParams, pageSize, offset) as Array<RequestLogEntry & { id: number }>;

  const totalPages = Math.ceil(total / pageSize);
  const hasMore = page < totalPages;

  return {
    data: data.map(item => ({ ...item, type: 'request' as const })),
    pagination: { page, pageSize, total, totalPages, hasMore }
  };
}

/**
 * Calculate percentile from sorted data
 *
 * @param sortedData - Pre-sorted array of numbers
 * @param percentile - Percentile to calculate (e.g., 50, 95, 99)
 * @returns Percentile value
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function calculatePercentile(sortedData: number[], percentile: number): number {
  // Condition: empty data
  if (sortedData.length === 0) return 0;
  // Condition: single data point
  if (sortedData.length === 1) return sortedData[0];

  const index = (percentile / 100) * (sortedData.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  // Condition: exact index match
  if (upper === lower) {
    return sortedData[lower];
  }

  // Linear interpolation
  return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
}

/**
 * Get duration percentiles for a tool or all tools
 *
 * @param toolName - Optional tool name filter
 * @param date - Optional date filter (YYYY-MM-DD)
 * @returns Percentile statistics
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getDurationPercentiles(
  toolName?: string,
  date?: string
): {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  count: number;
} {
  const db = getDatabase();
  // Condition: database not available
  if (!db) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0, count: 0 };
  }

  const dateKey = date ?? new Date().toISOString().split('T')[0];

  // Query durations
  let query = `
    SELECT duration FROM request_logs
    WHERE date_key = ? AND duration IS NOT NULL AND duration > 0
  `;
  const params: unknown[] = [dateKey];

  // Condition: filter by tool name
  if (toolName) {
    query += ' AND tool_name = ?';
    params.push(toolName);
  }

  const rows = db.prepare(query).all(...params) as Array<{ duration: number }>;

  // Condition: no data available
  if (rows.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0, count: 0 };
  }

  // Sort durations for percentile calculation
  const durations = rows.map(r => r.duration).sort((a, b) => a - b);
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

  return {
    p50: calculatePercentile(durations, 50),
    p75: calculatePercentile(durations, 75),
    p90: calculatePercentile(durations, 90),
    p95: calculatePercentile(durations, 95),
    p99: calculatePercentile(durations, 99),
    min: durations[0],
    max: durations[durations.length - 1],
    avg: Math.round(avg),
    count: durations.length
  };
}

/**
 * Get today's statistics summary
 *
 * @returns Today's stats summary
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getTodayStats(): {
  date_key: string;
  total_requests: number;
  total_successes: number;
  total_errors: number;
  avg_duration: number;
  tool_stats: Record<string, { requests: number; successes: number; errors: number; avgDuration: number }>;
} {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  if (!db) {
    return {
      date_key: today,
      total_requests: 0,
      total_successes: 0,
      total_errors: 0,
      avg_duration: 0,
      tool_stats: {},
    };
  }

  const stats = db.prepare(`
    SELECT * FROM daily_stats WHERE date_key = ?
  `).get(today) as {
    date_key: string;
    total_requests: number;
    total_successes: number;
    total_errors: number;
    avg_duration: number;
    tool_stats: string;
  } | undefined;

  if (!stats) {
    return {
      date_key: today,
      total_requests: 0,
      total_successes: 0,
      total_errors: 0,
      avg_duration: 0,
      tool_stats: {},
    };
  }

  return {
    ...stats,
    tool_stats: stats.tool_stats ? JSON.parse(stats.tool_stats) : {},
  };
}

/**
 * Stop flush timer and flush remaining buffers
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function stopSqliteLogger(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushBuffers();
}

/**
 * Trend data point for historical charts
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface TrendDataPoint {
  date: string;
  requests: number;
  successes: number;
  errors: number;
  avgDuration: number;
}

/**
 * Get trend data for the past N days
 *
 * @param days - Number of days to retrieve (default 7)
 * @returns Array of daily trend data
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getTrendData(days: number = 7): TrendDataPoint[] {
  const db = getDatabase();
  // Condition: database not available
  if (!db) {
    return [];
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);

  const startDateKey = startDate.toISOString().split('T')[0];
  const endDateKey = endDate.toISOString().split('T')[0];

  const rows = db.prepare(`
    SELECT date_key, total_requests, total_successes, total_errors, avg_duration
    FROM daily_stats
    WHERE date_key BETWEEN ? AND ?
    ORDER BY date_key ASC
  `).all(startDateKey, endDateKey) as Array<{
    date_key: string;
    total_requests: number;
    total_successes: number;
    total_errors: number;
    avg_duration: number;
  }>;

  return rows.map(row => ({
    date: row.date_key,
    requests: row.total_requests,
    successes: row.total_successes,
    errors: row.total_errors,
    avgDuration: Math.round(row.avg_duration),
  }));
}

/**
 * Top N tool statistics
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface TopNToolStats {
  toolName: string;
  requests: number;
  errors: number;
  avgDuration: number;
  successRate: number;
}

/**
 * Get top N tools by request count (高频工具)
 *
 * @param limit - Number of tools to return (default 10)
 * @param date - Optional date filter
 * @returns Array of top N tools
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getTopNToolsByRequests(limit: number = 10, date?: string): TopNToolStats[] {
  const db = getDatabase();
  // Condition: database not available
  if (!db) {
    return [];
  }

  const dateKey = date ?? new Date().toISOString().split('T')[0];

  const rows = db.prepare(`
    SELECT tool_name, COUNT(*) as requests,
           SUM(CASE WHEN response_status >= 400 OR level = 'error' THEN 1 ELSE 0 END) as errors,
           AVG(duration) as avgDuration
    FROM request_logs
    WHERE date_key = ?
    GROUP BY tool_name
    ORDER BY requests DESC
    LIMIT ?
  `).all(dateKey, limit) as Array<{
    tool_name: string;
    requests: number;
    errors: number;
    avgDuration: number;
  }>;

  return rows.map(row => ({
    toolName: row.tool_name,
    requests: row.requests,
    errors: row.errors,
    avgDuration: Math.round(row.avgDuration ?? 0),
    successRate: Math.round((row.requests - row.errors) / row.requests * 100),
  }));
}

/**
 * Get top N tools by error count (问题工具)
 *
 * @param limit - Number of tools to return (default 10)
 * @param date - Optional date filter
 * @returns Array of top N problematic tools
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getTopNToolsByErrors(limit: number = 10, date?: string): TopNToolStats[] {
  const db = getDatabase();
  // Condition: database not available
  if (!db) {
    return [];
  }

  const dateKey = date ?? new Date().toISOString().split('T')[0];

  const rows = db.prepare(`
    SELECT tool_name, COUNT(*) as requests,
           SUM(CASE WHEN response_status >= 400 OR level = 'error' THEN 1 ELSE 0 END) as errors,
           AVG(duration) as avgDuration
    FROM request_logs
    WHERE date_key = ?
    GROUP BY tool_name
    ORDER BY errors DESC
    LIMIT ?
  `).all(dateKey, limit) as Array<{
    tool_name: string;
    requests: number;
    errors: number;
    avgDuration: number;
  }>;

  return rows.map(row => ({
    toolName: row.tool_name,
    requests: row.requests,
    errors: row.errors,
    avgDuration: Math.round(row.avgDuration ?? 0),
    successRate: Math.round((row.requests - row.errors) / row.requests * 100),
  }));
}

/**
 * Get top N tools by average duration (慢工具)
 *
 * @param limit - Number of tools to return (default 10)
 * @param date - Optional date filter
 * @returns Array of top N slowest tools
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getTopNToolsByDuration(limit: number = 10, date?: string): TopNToolStats[] {
  const db = getDatabase();
  // Condition: database not available
  if (!db) {
    return [];
  }

  const dateKey = date ?? new Date().toISOString().split('T')[0];

  const rows = db.prepare(`
    SELECT tool_name, COUNT(*) as requests,
           SUM(CASE WHEN response_status >= 400 OR level = 'error' THEN 1 ELSE 0 END) as errors,
           AVG(duration) as avgDuration
    FROM request_logs
    WHERE date_key = ? AND duration IS NOT NULL AND duration > 0
    GROUP BY tool_name
    ORDER BY avgDuration DESC
    LIMIT ?
  `).all(dateKey, limit) as Array<{
    tool_name: string;
    requests: number;
    errors: number;
    avgDuration: number;
  }>;

  return rows.map(row => ({
    toolName: row.tool_name,
    requests: row.requests,
    errors: row.errors,
    avgDuration: Math.round(row.avgDuration ?? 0),
    successRate: Math.round((row.requests - row.errors) / row.requests * 100),
  }));
}