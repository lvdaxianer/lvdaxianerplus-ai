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
import { startStdioServer, startSseServer } from './core/server.js';
import { startHttpServer, closeHttpServer } from './routes/http-server.js';
import { initCache } from './features/cache.js';
import { initRateLimit } from './features/rate-limit.js';
import { initConcurrency } from './features/concurrency.js';
import { initTrace } from './features/trace.js';
import { initAlert } from './features/alert.js';
import { initConfigVersion } from './features/config-version.js';
import { initCanary } from './features/canary.js';
import { setLogLevel, initFileLogging } from './middleware/logger.js';
import { logger } from './middleware/logger.js';
import { initDatabase, closeDatabase, cleanOldRecords, getDefaultDbPath } from './database/connection.js';
import { initSqliteLogger, stopSqliteLogger } from './database/sqlite-logger.js';
import { initAlertLogger } from './database/alert-logger.js';
import { initMockHandler } from './features/mock.js';
import { loadToolCacheConfigs } from './routes/handlers/tool-cache.handler.js';
import { DEFAULT_RATE_LIMIT, DEFAULT_CONCURRENCY, DEFAULT_TRACE } from './config/types.js';

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
  // 条件：配置中指定了日志级别时设置，否则使用默认级别 info
  setLogLevel(config.logging?.level ?? 'info');

  // Initialize file logging if enabled
  // 条件：文件日志启用时初始化文件日志模块
  if (config.logging?.file?.enabled) {
    initFileLogging(config.logging.file);
    logger.info('[启动] File logging enabled', { logFile: logger.getLogFile() });
  } else {
    // 文件日志禁用：跳过初始化
    logger.info('[启动] File logging disabled, skipping initialization');
  }

  // Initialize SQLite database (默认启用)
  // 条件：SQLite 日志默认启用，除非配置文件明确禁用
  // 优先级：CLI 参数 > 配置文件 enabled: false > 默认启用
  const sqliteDisabledInConfig = config.sqlite?.enabled === false;
  const shouldEnableSqlite = cliArgs.sqliteEnabled || cliArgs.sqlitePath || !sqliteDisabledInConfig;

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

    // 加载工具级缓存配置
    // 条件注释：传入 config 参数，首次启动时同步配置文件到数据库
    loadToolCacheConfigs(config);
  } else {
    // SQLite 日志禁用：跳过初始化
    logger.info('[启动] SQLite logging disabled by config');
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

  // Initialize Rate Limit handler
  // 条件：限流配置存在时初始化限流管理器
  // 使用默认配置合并用户配置
  const rateLimitConfig = {
    ...DEFAULT_RATE_LIMIT,
    ...config.rateLimit,
  };
  initRateLimit(rateLimitConfig);
  logger.info('[启动] Rate limit initialized', {
    enabled: rateLimitConfig.enabled,
    type: rateLimitConfig.type,
    globalLimit: rateLimitConfig.globalLimit,
  });

  // Initialize Concurrency handler
  // 条件：并发控制配置存在时初始化并发管理器
  // 使用默认配置合并用户配置
  const concurrencyConfig = {
    ...DEFAULT_CONCURRENCY,
    ...config.concurrency,
  };
  initConcurrency(concurrencyConfig);
  logger.info('[启动] Concurrency initialized', {
    enabled: concurrencyConfig.enabled,
    maxConcurrent: concurrencyConfig.maxConcurrent,
    queueSize: concurrencyConfig.queueSize,
  });

  // Initialize Trace handler
  // 条件：链路追踪配置存在时初始化追踪管理器
  // 使用默认配置合并用户配置
  const traceConfig = {
    ...DEFAULT_TRACE,
    ...config.trace,
  };
  initTrace(traceConfig);
  logger.info('[启动] Trace initialized', {
    enabled: traceConfig.enabled,
    headerName: traceConfig.headerName,
  });

  // Initialize Alert handler
  // 条件：告警配置存在时初始化告警管理器
  // 使用默认配置合并用户配置
  const alertConfig = config.alert ?? { enabled: false };
  initAlert(alertConfig);
  logger.info('[启动] Alert initialized', {
    enabled: alertConfig.enabled,
  });

  // Initialize Config Version handler
  // 条件：配置版本控制默认启用
  initConfigVersion({ enabled: true });
  logger.info('[启动] Config version control initialized');

  // Initialize Canary Release handler
  // 条件：灰度发布默认启用
  initCanary({ enabled: true });
  logger.info('[启动] Canary release initialized');

  logger.info('[启动] MCP HTTP Gateway starting...');
  logger.info('[启动] Loaded tools', { count: Object.keys(config.tools).length });

  // Start HTTP server for health checks and dashboard (默认启用)
  // 条件：HTTP 服务默认启用，除非配置文件明确禁用 metrics 和 healthCheck
  // 优先级：--http 参数 > 配置文件禁用 > 默认启用
  const metricsDisabled = config.metrics?.enabled === false;
  const healthCheckDisabled = config.healthCheck?.enabled === false;
  // 使用括号明确优先级：--http 参数或（配置未禁用）就启用
  const shouldStartHttpServer = cliArgs.httpEnabled || (!(metricsDisabled || healthCheckDisabled));

  if (shouldStartHttpServer) {
    await startHttpServer({ config, port: cliArgs.httpPort, configPath: cliArgs.configPath });
    logger.info('[启动] Dashboard available', { url: `http://localhost:${cliArgs.httpPort}/dashboard` });
    logger.info('[启动] Health check available', { url: `http://localhost:${cliArgs.httpPort}/health` });
  } else {
    // HTTP 服务禁用：跳过启动
    logger.info('[启动] HTTP server disabled by config');
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

  // Start MCP Server based on transport mode
  // 条件注释：根据 transport 参数选择 STDIO 或 SSE 模式
  if (cliArgs.transport === 'sse') {
    // SSE 模式：持久运行，支持多会话连接
    try {
      await startSseServer(config, cliArgs.ssePort);
      logger.info('[启动] SSE Server started', { ssePort: cliArgs.ssePort });
    } catch (error) {
      logger.error('[启动] Failed to start SSE server', { error });
      process.exit(1);
    }
  } else {
    // STDIO 模式：每次会话启动新进程
    try {
      await startStdioServer(config);
    } catch (error) {
      logger.error('[启动] Failed to start STDIO server', { error });
      process.exit(1);
    }
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
