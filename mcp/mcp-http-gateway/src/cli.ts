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
import {
  loadCircuitBreakerConfigFromDb,
  initCircuitBreakerConfigToDb,
  updateCircuitBreakerConfig,
  getCircuitBreakerConfig
} from './features/circuit-breaker.js';
import { DEFAULT_CIRCUIT_BREAKER } from './config/types.js';
import { setLogLevel, initFileLogging } from './middleware/logger.js';
import { logger } from './middleware/logger.js';
import { initDatabase, closeDatabase, cleanOldRecords, getDefaultDbPath } from './database/connection.js';
import { initSqliteLogger, stopSqliteLogger } from './database/sqlite-logger.js';
import { initAlertLogger } from './database/alert-logger.js';
import { initMockHandler } from './features/mock.js';
import { scheduleRestart } from './features/restart.js';
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

/**
 * 获取参数值
 *
 * 支持两种格式：
 * 1. --key=value（等号格式）
 * 2. --key value（空格格式）
 *
 * @param args - 命令行参数数组
 * @param key - 参数名称（不含 --）
 * @returns 参数值，如果不存在返回 undefined
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
function getArgValue(args: string[], key: string): string | undefined {
  // 条件注释：先检查等号格式 --key=value
  const eqArg = args.find((a) => a.startsWith(`--${key}=`));
  if (eqArg) {
    return eqArg.split('=')[1];
  }

  // 条件注释：检查空格格式 --key value
  const keyIndex = args.indexOf(`--${key}`);
  if (keyIndex !== -1 && keyIndex + 1 < args.length) {
    const nextArg = args[keyIndex + 1];
    // 条件注释：下一个参数不能是另一个选项（以 -- 开头）
    if (!nextArg.startsWith('--')) {
      return nextArg;
    }
  }

  return undefined;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  // 条件注释：配置文件路径优先级：--config 参数 > 位置参数 > 默认值
  const configFromArg = getArgValue(args, 'config');
  const configFromPosition = args.find((a) => !a.startsWith('--'));
  const configPath = configFromArg ?? configFromPosition ?? './tools.json';

  return {
    configPath,
    httpEnabled: args.includes('--http'),
    transport: getArgValue(args, 'transport') ?? 'stdio',
    ssePort: parseInt(getArgValue(args, 'sse-port') ?? '11113', 10),
    httpPort: parseInt(getArgValue(args, 'http-port') ?? '11112', 10),
    sqliteEnabled: args.includes('--sqlite'),
    sqlitePath: getArgValue(args, 'sqlite-path') ?? null,
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
  if (config.cache) {
    initCache(config.cache);
  }

  // Set log level
  setLogLevel(config.logging?.level ?? 'info');

  // Initialize file logging
  if (config.logging?.file?.enabled) {
    initFileLogging(config.logging.file);
  }

  // Initialize SQLite database (必须在熔断器之前，因为熔断器需要数据库表)
  const sqliteDisabledInConfig = config.sqlite?.enabled === false;
  const shouldEnableSqlite = cliArgs.sqliteEnabled || cliArgs.sqlitePath || !sqliteDisabledInConfig;

  if (shouldEnableSqlite) {
    const sqliteConfig = {
      enabled: true,
      dbPath: cliArgs.sqlitePath ?? config.sqlite?.dbPath ?? getDefaultDbPath(),
      maxDays: config.sqlite?.maxDays ?? 30,
    };

    initDatabase(sqliteConfig);
    initSqliteLogger(sqliteConfig);
    initAlertLogger({ logDir: config.alert?.logDir ?? './logs' });
    cleanOldRecords(sqliteConfig.maxDays);
    loadToolCacheConfigs(config);
  }

  // Initialize circuit breaker (必须在数据库之后，因为需要读取/写入数据库表)
  // 条件注释：熔断器配置优先级：数据库配置 > 配置文件配置 > DEFAULT_CIRCUIT_BREAKER
  const configFromFile = config.circuitBreaker ?? DEFAULT_CIRCUIT_BREAKER;
  initCircuitBreakerConfigToDb(configFromFile);
  loadCircuitBreakerConfigFromDb();

  // Initialize Mock handler
  if (config.mock) {
    initMockHandler(config.mock);
  }

  // Initialize Rate Limit
  initRateLimit({ ...DEFAULT_RATE_LIMIT, ...config.rateLimit });

  // Initialize Concurrency
  initConcurrency({ ...DEFAULT_CONCURRENCY, ...config.concurrency });

  // Initialize Trace
  initTrace({ ...DEFAULT_TRACE, ...config.trace });

  // Initialize Alert
  initAlert(config.alert ?? { enabled: false });

  // Initialize Config Version
  initConfigVersion({ enabled: true });

  // Initialize Canary Release
  initCanary({ enabled: true });

  // Start HTTP server for health checks and dashboard (默认启用)
  // 条件：HTTP 服务默认启用，除非配置文件明确禁用 metrics 和 healthCheck
  const metricsDisabled = config.metrics?.enabled === false;
  const healthCheckDisabled = config.healthCheck?.enabled === false;
  const shouldStartHttpServer = cliArgs.httpEnabled || (!(metricsDisabled || healthCheckDisabled));

  // 条件注释：记录 HTTP 服务状态（不打印具体 URL，最后统一打印）
  let actualHttpPort = cliArgs.httpPort;

  // 条件注释：STDIO 模式下在 cli.ts 中启动 HTTP Server
  if (shouldStartHttpServer && cliArgs.transport === 'stdio') {
    const httpResult = await startHttpServer({ config, port: cliArgs.httpPort, configPath: cliArgs.configPath });
    actualHttpPort = httpResult.port;
  }

  // Start config hot reload if enabled
  if (config.hotReload?.enabled) {
    watchConfig(cliArgs.configPath, () => {
      scheduleRestart('Configuration file changed externally');
    }, config.hotReload);
  }

  // Setup graceful shutdown
  setupGracefulShutdown();

  // Start MCP Server based on transport mode
  if (cliArgs.transport === 'dual') {
    // DUAL 模式：同时启动 SSE 和 STDIO
    try {
      await startSseServer(config, cliArgs.ssePort, cliArgs.httpPort);
      await startStdioServer(config);
    } catch (error) {
      logger.error('[启动] Failed to start dual mode servers', { error });
      process.exit(1);
    }
  } else if (cliArgs.transport === 'sse') {
    // SSE 模式：持久运行
    try {
      const sseResult = await startSseServer(config, cliArgs.ssePort, cliArgs.httpPort);
      // 条件注释：获取实际使用的端口（可能因冲突调整）
      actualHttpPort = sseResult.httpPort;
    } catch (error) {
      logger.error('[启动] Failed to start SSE server', { error });
      process.exit(1);
    }
  } else {
    // STDIO 模式
    try {
      await startStdioServer(config);
    } catch (error) {
      logger.error('[启动] Failed to start STDIO server', { error });
      process.exit(1);
    }
  }

  // 条件注释：启动完成，打印最终访问地址（用户关心的核心信息）
  logger.info('========================================');
  logger.info('MCP HTTP Gateway 已启动');
  logger.info('========================================');
  logger.info(`SSE 连接:     http://localhost:${cliArgs.ssePort}/sse`);
  logger.info(`Dashboard:    http://localhost:${actualHttpPort}/dashboard`);
  logger.info(`Health:       http://localhost:${actualHttpPort}/health`);
  logger.info(`API:          http://localhost:${actualHttpPort}/api`);
  logger.info('========================================');
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
