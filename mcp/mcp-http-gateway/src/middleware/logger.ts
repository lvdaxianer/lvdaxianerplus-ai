/**
 * Logger middleware with file logging support
 *
 * Supports:
 * - Console output
 * - File logging with rotation
 * - Detailed request/response logging
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */

import type { FileLoggingConfig } from '../config/types.js';
import {
  initFileLogger,
  logRequestToFile,
  logResponseToFile,
  logErrorToFile,
  closeFileLogger,
  getCurrentLogFile,
} from './file-logger.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';
const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

/**
 * Set log level
 *
 * @param level - Log level
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Initialize file logging
 *
 * @param config - File logging configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export function initFileLogging(config: FileLoggingConfig): void {
  initFileLogger(config);
}

/**
 * Mask sensitive headers in logs
 *
 * @param headers - Headers object
 * @param sensitiveHeaders - List of sensitive header names
 * @returns Masked headers
 */
function maskSensitiveHeaders(
  headers: Record<string, string>,
  sensitiveHeaders: string[]
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      result[key] = '***';
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Format log entry
 *
 * @param entry - Log entry
 * @returns Formatted string
 */
function formatLog(entry: LogEntry): string {
  const parts = [
    entry.timestamp,
    `[${entry.level.toUpperCase()}]`,
    entry.message,
  ];

  if (entry.meta) {
    parts.push(JSON.stringify(entry.meta));
  }

  return parts.join(' ');
}

/**
 * Write log
 *
 * @param level - Log level
 * @param message - Log message
 * @param meta - Additional metadata
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  // 条件：日志级别低于当前配置级别时跳过
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta,
  };

  // 存储到内存日志数组
  logs.push(entry);

  // Keep only last MAX_LOGS
  // 条件：日志超过最大数量时移除最早的
  if (logs.length > MAX_LOGS) {
    logs.shift();
  } else {
    // 日志未超限：无需移除
  }

  // MCP STDIO 模式：所有日志必须输出到 stderr，stdout 只用于 JSON-RPC 消息
  // 条件：所有级别都使用 stderr 输出
  process.stderr.write(formatLog(entry) + '\n');
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    writeLog('debug', message, meta);
  },

  info(message: string, meta?: Record<string, unknown>): void {
    writeLog('info', message, meta);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    writeLog('warn', message, meta);
  },

  error(message: string, meta?: Record<string, unknown>): void {
    writeLog('error', message, meta);
  },

  /**
   * Log HTTP request details
   *
   * @param toolName - Tool name
   * @param method - HTTP method
   * @param url - Request URL
   * @param headers - Request headers
   * @param body - Request body (optional)
   * @param sensitiveHeaders - Headers to mask
   *
   * @author lvdaxianerplus
   * @date 2026-04-18
   */
  logRequest(
    toolName: string,
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: unknown,
    sensitiveHeaders: string[] = ['authorization', 'x-api-key']
  ): void {
    // Console output (masked headers)
    const masked = maskSensitiveHeaders(headers, sensitiveHeaders);
    writeLog('info', `[${toolName}] Request: ${method} ${url}`, { headers: masked, body });

    // File output (with full details)
    logRequestToFile(toolName, method, url, headers, body);
  },

  /**
   * Log HTTP response details
   *
   * @param toolName - Tool name
   * @param status - HTTP status code
   * @param duration - Request duration in ms
   * @param body - Response body
   * @param headers - Response headers (optional)
   *
   * @author lvdaxianerplus
   * @date 2026-04-18
   */
  logResponse(
    toolName: string,
    status: number,
    duration: number,
    body?: unknown,
    headers?: Record<string, string>
  ): void {
    // Console output
    writeLog('info', `[${toolName}] Response: ${status}`, { duration, body });

    // File output (with full details)
    if (body) {
      logResponseToFile(toolName, status, headers ?? {}, body, duration);
    }
  },

  /**
   * Log error details
   *
   * @param toolName - Tool name
   * @param error - Error object or message
   * @param duration - Request duration in ms
   *
   * @author lvdaxianerplus
   * @date 2026-04-18
   */
  logError(
    toolName: string,
    error: unknown,
    duration: number
  ): void {
    // Console output
    const errorMessage = error instanceof Error ? error.message : String(error);
    writeLog('error', `[${toolName}] Error: ${errorMessage}`, { duration });

    // File output
    logErrorToFile(toolName, error, duration);
  },

  /**
   * Get recent logs for dashboard
   *
   * @param count - Number of logs to return
   * @returns Log entries
   *
   * @author lvdaxianerplus
   * @date 2026-04-18
   */
  getLogs(count = 100): LogEntry[] {
    return logs.slice(-count);
  },

  /**
   * Close file logger
   *
   * @author lvdaxianerplus
   * @date 2026-04-18
   */
  close(): void {
    closeFileLogger();
  },

  /**
   * Get current log file path
   *
   * @returns Log file path or null
   *
   * @author lvdaxianerplus
   * @date 2026-04-18
   */
  getLogFile(): string | null {
    return getCurrentLogFile();
  },
};
