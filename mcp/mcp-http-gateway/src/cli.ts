/**
 * CLI entry point
 *
 * Features:
 * - SQLite initialization
 * - Mock initialization
 * - Config hot reload
 * - Graceful shutdown
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

import { loadConfig, watchConfig, stopWatchingConfig } from './config/loader.js';
import { startStdioServer } from './core/server.js';
import { startHttpServer, closeHttpServer } from './routes/http-server.js';
import { initCache } from './features/cache.js';
import { setLogLevel, initFileLogging } from './middleware/logger.js';
import { logger } from './middleware/logger.js';
import { initDatabase, closeDatabase, cleanOldRecords, getDefaultDbPath } from './database/connection.js';
import { initSqliteLogger, stopSqliteLogger } from './database/sqlite-logger.js';
import { initAlertLogger } from './database/alert-logger.js';
import { initMockHandler } from './features/mock.js';

interface CliArgs {
  configPath: string;
  httpEnabled: boolean;
  transport: string;
  ssePort: number;
  httpPort: number;
  sqliteEnabled: boolean;
  sqlitePath: string | null;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  const configPath = args.find((a) => !a.startsWith('--')) ?? './tools.json';

  return {
    configPath,
    httpEnabled: args.includes('--http'),
    transport: args.find((a) => a.startsWith('--transport='))?.split('=')[1] ?? 'stdio',
    ssePort: parseInt(args.find((a) => a.startsWith('--sse-port='))?.split('=')[1] ?? '11113', 10),
    httpPort: parseInt(args.find((a) => a.startsWith('--http-port='))?.split('=')[1] ?? '11112', 10),
    sqliteEnabled: args.includes('--sqlite'),
    sqlitePath: args.find((a) => a.startsWith('--sqlite-path='))?.split('=')[1] ?? null,
  };
}

async function main(): Promise<void> {
  const cliArgs = parseArgs();

  // Load and validate configuration
  let config;
  try {
    config = loadConfig(cliArgs.configPath);
  } catch (error) {
    // Configuration load failed - log and exit
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[启动] MCP server failed to start due to configuration errors', { error: errorMessage });
    process.exit(1);
  }

  // Initialize cache
  // 条件：配置中存在缓存配置时初始化缓存模块
  if (config.cache) {
    initCache(config.cache);
  } else {
    // 无缓存配置：跳过初始化
    logger.info('[启动] Cache not configured, skipping initialization');
  }

  // Set log level
  // 条件：配置中指定了日志级别时设置
  if (config.logging?.level) {
    setLogLevel(config.logging.level);
  } else {
    // 使用默认日志级别 info
    logger.info('[启动] Using default log level: info');
  }

  // Initialize file logging if enabled
  // 条件：文件日志启用时初始化文件日志模块
  if (config.logging?.file?.enabled) {
    initFileLogging(config.logging.file);
    logger.info('[启动] File logging enabled', { logFile: logger.getLogFile() });
  } else {
    // 文件日志禁用：跳过初始化
    logger.info('[启动] File logging disabled, skipping initialization');
  }

  // Initialize SQLite database if enabled
  // 条件：SQLite 日志启用时初始化数据库和告警模块
  // 优先级：CLI 参数 > 配置文件 > 默认禁用
  const shouldEnableSqlite = cliArgs.sqliteEnabled || cliArgs.sqlitePath || config.sqlite?.enabled;

  if (shouldEnableSqlite) {
    // 确定 SQLite 配置：CLI 参数优先，其次配置文件，最后默认
    const sqliteConfig = {
      enabled: true,
      dbPath: cliArgs.sqlitePath ?? config.sqlite?.dbPath ?? getDefaultDbPath(),
      maxDays: config.sqlite?.maxDays ?? 30,
    };

    initDatabase(sqliteConfig);
    initSqliteLogger(sqliteConfig);
    initAlertLogger({ logDir: config.alert?.logDir ?? './logs' });

    // Clean old records on startup
    const maxDays = sqliteConfig.maxDays;
    cleanOldRecords(maxDays);
    logger.info('[启动] SQLite logging enabled', { dbPath: sqliteConfig.dbPath, source: cliArgs.sqlitePath ? 'CLI' : config.sqlite?.dbPath ? 'config' : 'default' });
  } else {
    // SQLite 日志禁用：跳过初始化
    logger.info('[启动] SQLite logging disabled, skipping initialization');
  }

  // Initialize Mock handler
  // 条件：配置了 Mock 时初始化 Mock 处理器
  if (config.mock) {
    initMockHandler(config.mock);
    logger.info('[启动] Mock handler initialized', { enabled: config.mock.enabled });
  } else {
    // 无 Mock 配置：跳过初始化
    logger.info('[启动] Mock not configured, skipping initialization');
  }

  logger.info('[启动] MCP HTTP Gateway starting...');
  logger.info('[启动] Loaded tools', { count: Object.keys(config.tools).length });

  // Start HTTP server for health checks and dashboard
  // 条件：指标监控、健康检查或 HTTP 参数启用时启动 HTTP 服务器
  if (config.metrics?.enabled || config.healthCheck?.enabled || cliArgs.httpEnabled) {
    await startHttpServer({ config, port: cliArgs.httpPort, configPath: cliArgs.configPath });
    logger.info('[启动] Dashboard available', { url: `http://localhost:${cliArgs.httpPort}/dashboard` });
    logger.info('[启动] Health check available', { url: `http://localhost:${cliArgs.httpPort}/health` });
  } else {
    // HTTP 服务禁用：跳过启动
    logger.info('[启动] HTTP server disabled, skipping initialization');
  }

  // Start config hot reload if enabled
  // 条件：配置热更新启用时启动文件监听
  if (config.hotReload?.enabled) {
    watchConfig(cliArgs.configPath, (newConfig) => {
      logger.info('[配置热更新] Configuration reloaded');
      // Re-initialize components with new config
      // 条件：新配置包含缓存配置时重新初始化
      if (newConfig.cache) {
        initCache(newConfig.cache);
      }
      // 条件：新配置包含 Mock 配置时重新初始化
      if (newConfig.mock) {
        initMockHandler(newConfig.mock);
      }
    }, config.hotReload);
    logger.info('[启动] Config hot reload enabled');
  } else {
    // 配置热更新禁用：跳过启动
    logger.info('[启动] Config hot reload disabled, skipping initialization');
  }

  // Setup graceful shutdown
  setupGracefulShutdown();

  // Start STDIO server for MCP protocol
  try {
    await startStdioServer(config);
  } catch (error) {
    logger.error('Failed to start STDIO server', { error });
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function setupGracefulShutdown(): void {
  // 保持进程活跃，防止信号立即终止
  process.stdin.resume();

  const shutdown = async () => {
    logger.info('[关闭] MCP HTTP Gateway shutting down...');

    try {
      // Stop config watcher
      stopWatchingConfig();

      // Close HTTP server first (释放端口)
      await closeHttpServer();

      // Stop SQLite logger and flush buffers
      stopSqliteLogger();

      // Close database
      closeDatabase();

      // Close file logger
      logger.close();

      logger.info('[关闭] Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('[关闭] Shutdown error', { error });
      process.exit(1);
    }
  };

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    shutdown();
  });

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    shutdown();
  });
}

main().catch((error) => {
  // Catch unhandled errors during startup
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('[启动] Unexpected error during startup', { error: errorMessage });
  process.exit(1);
});
