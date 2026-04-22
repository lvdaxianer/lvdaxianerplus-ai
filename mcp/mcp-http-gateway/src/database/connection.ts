/**
 * SQLite database connection manager
 *
 * Features:
 * - WAL mode for concurrent read/write
 * - Automatic table creation
 * - Connection pooling support
 * - Graceful shutdown
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

import Database from 'better-sqlite3';
import type { SQLiteLoggingConfig, BackupConfig } from '../config/types.js';
import { logger } from '../middleware/logger.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

let db: Database.Database | null = null;
let dbPath: string = './data/logs.db';

/**
 * Get default database path based on current working directory
 * - 优先查找 ./data/logs.db，如果目录不存在则自动创建
 *
 * @returns Default database file path
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export function getDefaultDbPath(): string {
  // 默认在当前工作目录下的 data 子目录
  return join(process.cwd(), 'data', 'logs.db');
}

/**
 * Initialize SQLite database connection
 *
 * @param config - SQLite logging configuration
 * @returns Database instance
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function initDatabase(config: SQLiteLoggingConfig): Database.Database {
  // Set database path from config or use default
  dbPath = config.dbPath ?? './data/logs.db';

  // Ensure data directory exists (同步创建)
  const dataDir = dbPath.split('/').slice(0, -1).join('/');
  // 条件注释：数据目录路径存在且不存在时创建，存在时跳过
  if (dataDir && !existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    logger.info('[SQLite] Created data directory', { path: dataDir });
  } else {
    // 数据目录已存在或路径为空，无需创建
  }

  // Create or open database
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');

  // Create tables if not exist
  createTables(db);

  logger.info('[SQLite] Database initialized', { path: dbPath, mode: 'WAL' });

  return db;
}

/**
 * Create all required tables
 *
 * @param db - Database instance
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function createTables(db: Database.Database): void {
  // Request logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      date_key TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',
      tool_name TEXT NOT NULL,
      message TEXT NOT NULL,
      method TEXT,
      url TEXT,
      request_headers TEXT,
      request_body TEXT,
      response_status INTEGER,
      response_headers TEXT,
      response_body TEXT,
      duration INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_request_logs_date ON request_logs(date_key);
    CREATE INDEX IF NOT EXISTS idx_request_logs_tool ON request_logs(tool_name);
    CREATE INDEX IF NOT EXISTS idx_request_logs_level ON request_logs(level);
  `);

  // Error logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      date_key TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'error',
      tool_name TEXT NOT NULL,
      message TEXT NOT NULL,
      error_type TEXT,
      error_stack TEXT,
      request_method TEXT,
      request_url TEXT,
      request_headers TEXT,
      request_body TEXT,
      duration INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_error_logs_date ON error_logs(date_key);
    CREATE INDEX IF NOT EXISTS idx_error_logs_tool ON error_logs(tool_name);
  `);

  // Daily stats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      date_key TEXT PRIMARY KEY,
      total_requests INTEGER DEFAULT 0,
      total_successes INTEGER DEFAULT 0,
      total_errors INTEGER DEFAULT 0,
      avg_duration REAL DEFAULT 0,
      tool_stats TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      date_key TEXT NOT NULL,
      session_id TEXT,
      client_info TEXT,
      tool_name TEXT NOT NULL,
      action TEXT NOT NULL,
      arguments TEXT,
      result_status TEXT,
      duration INTEGER,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(date_key);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tool ON audit_logs(tool_name);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id);
  `);

  // Alert logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      date_key TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      tool_name TEXT,
      message TEXT NOT NULL,
      details TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_alert_logs_date ON alert_logs(date_key);
    CREATE INDEX IF NOT EXISTS idx_alert_logs_type ON alert_logs(alert_type);
    CREATE INDEX IF NOT EXISTS idx_alert_logs_severity ON alert_logs(severity);
  `);

  // Mock configs table - 持久化 Mock 配置
  db.exec(`
    CREATE TABLE IF NOT EXISTS mock_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 0,
      config_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mock_configs_tool ON mock_configs(tool_name);
    CREATE INDEX IF NOT EXISTS idx_mock_configs_enabled ON mock_configs(enabled);
  `);

  // Fallback conditions table - 持久化降级条件模板
  db.exec(`
    CREATE TABLE IF NOT EXISTS fallback_conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      conditions_json TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_fallback_conditions_name ON fallback_conditions(name);
    CREATE INDEX IF NOT EXISTS idx_fallback_conditions_enabled ON fallback_conditions(enabled);
  `);

  // Tool cache configs table - 持久化工具缓存配置
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_cache_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 0,
      ttl INTEGER DEFAULT 60000,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tool_cache_configs_tool ON tool_cache_configs(tool_name);
    CREATE INDEX IF NOT EXISTS idx_tool_cache_configs_enabled ON tool_cache_configs(enabled);
  `);

  // Trace logs table - 链路追踪日志
  db.exec(`
    CREATE TABLE IF NOT EXISTS trace_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL UNIQUE,
      tool_name TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      status_code INTEGER NOT NULL,
      success INTEGER NOT NULL,
      error_message TEXT,
      parent_trace_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_trace_logs_id ON trace_logs(trace_id);
    CREATE INDEX IF NOT EXISTS idx_trace_logs_tool ON trace_logs(tool_name);
    CREATE INDEX IF NOT EXISTS idx_trace_logs_time ON trace_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_trace_logs_parent ON trace_logs(parent_trace_id);
  `);

  logger.info('[SQLite] Tables created successfully');
}

/**
 * Get database instance
 *
 * @returns Database instance or null if not initialized
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getDatabase(): Database.Database | null {
  return db;
}

/**
 * Get current database path
 *
 * @returns Database file path
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getDatabasePath(): string {
  return dbPath;
}

/**
 * Close database connection gracefully
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function closeDatabase(): void {
  // 条件注释：数据库连接存在时关闭，不存在时跳过
  if (db) {
    db.close();
    db = null;
    logger.info('[SQLite] Database connection closed');
  } else {
    // 数据库连接不存在，无需关闭
    logger.debug('[SQLite] Database connection already closed or not initialized');
  }
}

/**
 * Clean old records based on retention policy
 *
 * @param maxDays - Maximum days to keep records
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function cleanOldRecords(maxDays: number): void {
  // 条件注释：数据库未初始化时直接返回，已初始化时执行清理
  if (!db) {
    logger.warn('[SQLite] Database not initialized, skip cleaning');
    return;
  } else {
    // 数据库已初始化，执行清理逻辑
    performCleanOperations(db, maxDays);
  }
}

/**
 * 执行数据库清理操作（内部辅助方法）
 *
 * @param db - Database instance
 * @param maxDays - Maximum days to keep records
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function performCleanOperations(db: Database.Database, maxDays: number): void {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxDays);
  const cutoffDateKey = cutoffDate.toISOString().split('T')[0];

  // Delete old request logs
  const deletedRequestLogs = db.prepare(
    'DELETE FROM request_logs WHERE date_key < ?'
  ).run(cutoffDateKey);

  // Delete old error logs
  const deletedErrorLogs = db.prepare(
    'DELETE FROM error_logs WHERE date_key < ?'
  ).run(cutoffDateKey);

  // Delete old audit logs
  const deletedAuditLogs = db.prepare(
    'DELETE FROM audit_logs WHERE date_key < ?'
  ).run(cutoffDateKey);

  // Delete old alert logs (keep resolved alerts longer)
  const deletedAlertLogs = db.prepare(
    'DELETE FROM alert_logs WHERE date_key < ? AND resolved_at IS NOT NULL'
  ).run(cutoffDateKey);

  // Delete old daily stats
  const deletedStats = db.prepare(
    'DELETE FROM daily_stats WHERE date_key < ?'
  ).run(cutoffDateKey);

  // Execute VACUUM to reclaim space
  db.exec('VACUUM');

  logger.info('[SQLite] Cleaned old records', {
    maxDays,
    cutoffDate: cutoffDateKey,
    requestLogs: deletedRequestLogs.changes,
    errorLogs: deletedErrorLogs.changes,
    auditLogs: deletedAuditLogs.changes,
    alertLogs: deletedAlertLogs.changes,
    stats: deletedStats.changes,
  });
}

/**
 * Backup database file
 *
 * @param backupPath - Backup file path
 * @returns Backup success status
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function backupDatabase(backupPath: string): boolean {
  // 条件注释：数据库未初始化时返回失败，已初始化时执行备份
  if (!db) {
    logger.warn('[SQLite] Database not initialized, backup failed');
    return false;
  } else {
    // 数据库已初始化，执行备份
    try {
      db.backup(backupPath);
      logger.info('[SQLite] Database backed up', { backupPath });
      return true;
    } catch (error) {
      logger.error('[SQLite] Backup failed', { error, backupPath });
      return false;
    }
  }
}

/**
 * Get database statistics
 *
 * @returns Database size and record counts
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getDatabaseStats(): {
  path: string;
  requestLogs: number;
  errorLogs: number;
  auditLogs: number;
  alertLogs: number;
  dailyStats: number;
} {
  if (!db) {
    return {
      path: dbPath,
      requestLogs: 0,
      errorLogs: 0,
      auditLogs: 0,
      alertLogs: 0,
      dailyStats: 0,
    };
  }

  const requestLogs = db.prepare('SELECT COUNT(*) as count FROM request_logs').get() as { count: number };
  const errorLogs = db.prepare('SELECT COUNT(*) as count FROM error_logs').get() as { count: number };
  const auditLogs = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };
  const alertLogs = db.prepare('SELECT COUNT(*) as count FROM alert_logs').get() as { count: number };
  const dailyStats = db.prepare('SELECT COUNT(*) as count FROM daily_stats').get() as { count: number };

  return {
    path: dbPath,
    requestLogs: requestLogs.count,
    errorLogs: errorLogs.count,
    auditLogs: auditLogs.count,
    alertLogs: alertLogs.count,
    dailyStats: dailyStats.count,
  };
}