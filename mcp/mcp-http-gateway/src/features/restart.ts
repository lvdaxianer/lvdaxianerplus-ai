/**
 * Service restart manager
 *
 * Features:
 * - Config change detection
 * - Graceful service restart
 * - Restart notification
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */

import { spawn, ChildProcess } from 'child_process';
import { logger } from '../middleware/logger.js';
import type { Config } from '../config/types.js';
import { closeHttpServer } from '../routes/http-server.js';
import { stopSqliteLogger } from '../database/sqlite-logger.js';
import { closeDatabase } from '../database/connection.js';
import { stopWatchingConfig } from '../config/loader.js';

/**
 * Config comparison result
 */
interface ConfigChangeResult {
  changed: boolean;
  changes: string[];
  requiresRestart: boolean;
}

/**
 * Compare two configs to detect meaningful changes
 *
 * @param oldConfig - Current config
 * @param newConfig - New config from request
 * @returns Change detection result
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function compareConfigs(oldConfig: Config, newConfig: Config): ConfigChangeResult {
  const changes: string[] = [];
  let requiresRestart = false;

  // 条件注释：检查 SQLite 配置变更（数据库路径变更需要重启）
  if (oldConfig.sqlite?.dbPath !== newConfig.sqlite?.dbPath) {
    changes.push(`sqlite.dbPath: ${oldConfig.sqlite?.dbPath ?? './data/logs.db'} → ${newConfig.sqlite?.dbPath ?? './data/logs.db'}`);
    requiresRestart = true;
  }

  // 条件注释：检查 transport 模式变更（需要重启）
  if (oldConfig.transport !== newConfig.transport) {
    changes.push(`transport: ${oldConfig.transport ?? 'stdio'} → ${newConfig.transport ?? 'stdio'}`);
    requiresRestart = true;
  }

  // 条件注释：检查 HTTP 端口变更（需要重启）
  if (oldConfig.httpPort !== newConfig.httpPort) {
    changes.push(`httpPort: ${oldConfig.httpPort ?? 11112} → ${newConfig.httpPort ?? 11112}`);
    requiresRestart = true;
  }

  // 条件注释：检查 SSE 端口变更（需要重启）
  if (oldConfig.ssePort !== newConfig.ssePort) {
    changes.push(`ssePort: ${oldConfig.ssePort ?? 11113} → ${newConfig.ssePort ?? 11113}`);
    requiresRestart = true;
  }

  // 条件注释：检查日志级别变更（热更新即可）
  if (oldConfig.logging?.level !== newConfig.logging?.level) {
    changes.push(`logging.level: ${oldConfig.logging?.level ?? 'info'} → ${newConfig.logging?.level ?? 'info'}`);
    // 热更新，不需要重启
  }

  // 条件注释：检查缓存配置变更（热更新即可）
  if (JSON.stringify(oldConfig.cache) !== JSON.stringify(newConfig.cache)) {
    changes.push('cache configuration changed');
    // 热更新，不需要重启
  }

  // 条件注释：检查 Mock 配置变更（热更新即可）
  if (JSON.stringify(oldConfig.mock) !== JSON.stringify(newConfig.mock)) {
    changes.push('mock configuration changed');
    // 热更新，不需要重启
  }

  // 条件注释：检查工具配置变更（需要重启以重新加载工具）
  const oldToolKeys = Object.keys(oldConfig.tools ?? {});
  const newToolKeys = Object.keys(newConfig.tools ?? {});
  if (oldToolKeys.length !== newToolKeys.length ||
      JSON.stringify(oldConfig.tools) !== JSON.stringify(newConfig.tools)) {
    changes.push('tools configuration changed');
    requiresRestart = true;
  }

  // 条件注释：检查熔断器配置变更（热更新即可）
  if (JSON.stringify(oldConfig.circuitBreaker) !== JSON.stringify(newConfig.circuitBreaker)) {
    changes.push('circuitBreaker configuration changed');
    // 热更新，不需要重启
  }

  // 条件注释：检查限流配置变更（需要重启）
  if (JSON.stringify(oldConfig.rateLimit) !== JSON.stringify(newConfig.rateLimit)) {
    changes.push('rateLimit configuration changed');
    requiresRestart = true;
  }

  // 条件注释：检查并发配置变更（需要重启）
  if (JSON.stringify(oldConfig.concurrency) !== JSON.stringify(newConfig.concurrency)) {
    changes.push('concurrency configuration changed');
    requiresRestart = true;
  }

  return {
    changed: changes.length > 0,
    changes,
    requiresRestart,
  };
}

/**
 * Gracefully restart the service
 *
 * This function:
 * 1. Closes all connections (HTTP, SQLite, etc.)
 * 2. Spawns a new process with the same arguments
 * 3. Exits the current process
 *
 * @param reason - Restart reason for logging
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export async function restartService(reason: string): Promise<void> {
  logger.info('[服务重启] Restarting service...', { reason });

  // 条件注释：先关闭 HTTP 服务，释放端口
  try {
    await closeHttpServer();
    logger.info('[服务重启] HTTP server closed');
  } catch (error) {
    logger.error('[服务重启] Failed to close HTTP server', { error });
  }

  // 条件注释：停止配置监听
  stopWatchingConfig();
  logger.info('[服务重启] Config watcher stopped');

  // 条件注释：停止 SQLite 日志器
  stopSqliteLogger();
  logger.info('[服务重启] SQLite logger stopped');

  // 条件注释：关闭数据库连接
  closeDatabase();
  logger.info('[服务重启] Database closed');

  // 条件注释：获取当前进程启动参数
  const args = process.argv.slice(1);
  const cwd = process.cwd();

  // 条件注释：启动新进程
  const newProcess = spawn(process.execPath, args, {
    cwd,
    stdio: 'inherit',
    detached: false,
  });

  newProcess.on('error', (error) => {
    logger.error('[服务重启] Failed to spawn new process', { error });
    process.exit(1);
  });

  newProcess.on('spawn', () => {
    logger.info('[服务重启] New process spawned successfully');
    // 条件注释：新进程启动后，退出当前进程
    process.exit(0);
  });

  // 条件注释：设置超时保护，如果新进程未启动则强制退出
  setTimeout(() => {
    logger.warn('[服务重启] New process spawn timeout, forcing exit');
    process.exit(0);
  }, 5000);
}

/**
 * Schedule restart after response is sent
 *
 * @param reason - Restart reason
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function scheduleRestart(reason: string): void {
  // 条件注释：延迟 100ms 启动重启，确保响应已发送
  setTimeout(() => {
    restartService(reason).catch((error) => {
      logger.error('[服务重启] Restart failed', { error });
      process.exit(1);
    });
  }, 100);
}