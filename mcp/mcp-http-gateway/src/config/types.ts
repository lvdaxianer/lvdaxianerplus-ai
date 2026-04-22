/**
 * 配置类型聚合导出
 *
 * 本文件聚合导出所有配置类型，并定义：
 * - 主配置结构（Config）
 * - 各类默认值常量
 *
 * 类型拆分：
 * - tool-types.ts: 工具配置类型
 * - server-config-types.ts: 服务器配置类型
 * - tracking-types.ts: 尝试追踪类型
 * - fallback-types.ts: 降级配置类型
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */

// 从子模块导出类型
export {
  // 工具配置类型
  ParameterDef,
  ResponseTransformConfig,
  RequestTransformConfig,
  ToolConfig,
  RetryConfig,
  CacheConfig,
  DynamicFieldConstraints,
  DynamicFieldConfig,
  MockDynamicConfig,
  MockToolConfig,
  MockConfig,
} from './tool-types.js';

export {
  // 服务器配置类型
  ProxyConfig,
  TimeoutConfig,
  CircuitBreakerConfig,
  LoggingConfig,
  FileLoggingConfig,
  MetricsConfig,
  HealthCheckConfig,
  ServerConfig,
  AuthConfig,
  SQLiteLoggingConfig,
  CompressionConfig,
  HotReloadConfig,
  BackupConfig,
  AlertConfig,
  AuditConfig,
  RateLimitConfig,
  ToolRateLimitConfig,
  ConcurrencyConfig,
  TraceConfig,
} from './server-config-types.js';

export {
  // 尝试追踪类型
  CallHintTemplateConfig,
  AttemptTrackingConfig,
  AttemptRecord,
  ToolCallMetadata,
  DEFAULT_CALL_HINT_TEMPLATE,
  DEFAULT_ATTEMPT_TRACKING,
} from './tracking-types.js';

export {
  // 降级配置类型
  FallbackConfig,
  FallbackConditionConfig,
  FallbackCondition,
  ResultSource,
  DEFAULT_FALLBACK,
} from './fallback-types.js';

// 导入需要的类型用于 Config 定义
import { ToolConfig, RetryConfig, CacheConfig, MockConfig } from './tool-types.js';
import {
  ProxyConfig,
  TimeoutConfig,
  CircuitBreakerConfig,
  LoggingConfig,
  FileLoggingConfig,
  MetricsConfig,
  HealthCheckConfig,
  ServerConfig,
  AuthConfig,
  SQLiteLoggingConfig,
  CompressionConfig,
  HotReloadConfig,
  BackupConfig,
  AlertConfig,
  AuditConfig,
  RateLimitConfig,
  ConcurrencyConfig,
  TraceConfig,
} from './server-config-types.js';
import { AttemptTrackingConfig, CallHintTemplateConfig } from './tracking-types.js';
import { FallbackConfig } from './fallback-types.js';

/**
 * 主配置结构
 *
 * 定义 MCP HTTP Gateway 的完整配置。
 *
 * @param baseUrl - API 基础 URL
 * @param auth - 全局认证配置
 * @param proxy - 代理配置
 * @param timeout - 全局超时配置
 * @param retry - 全局重试配置
 * @param circuitBreaker - 熔断器配置
 * @param cache - 全局缓存配置
 * @param rateLimit - 限流配置
 * @param concurrency - 并发控制配置
 * @param trace - 链路追踪配置
 * @param logging - 日志配置
 * @param metrics - 指标配置
 * @param healthCheck - 健康检查配置
 * @param server - 服务器配置
 * @param tokens - Token 键值对映射
 * @param tools - 工具定义映射
 * @param sqlite - SQLite 日志配置
 * @param compression - 响应压缩配置
 * @param hotReload - 配置热更新配置
 * @param backup - 备份配置
 * @param alert - 告警配置
 * @param audit - 审计配置
 * @param mock - Mock 配置
 * @param fallback - 降级配置
 * @param attemptTracking - 尝试追踪配置
 * @param callHintTemplate - 调用提示模板配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface Config {
  baseUrl: string;
  auth?: AuthConfig;
  proxy?: ProxyConfig;
  timeout?: TimeoutConfig;
  retry?: RetryConfig;
  circuitBreaker?: CircuitBreakerConfig;
  cache?: CacheConfig;
  rateLimit?: RateLimitConfig;
  concurrency?: ConcurrencyConfig;
  trace?: TraceConfig;
  logging?: LoggingConfig;
  metrics?: MetricsConfig;
  healthCheck?: HealthCheckConfig;
  server?: ServerConfig;
  tokens?: Record<string, string>;
  tools: Record<string, ToolConfig>;
  sqlite?: SQLiteLoggingConfig;
  compression?: CompressionConfig;
  hotReload?: HotReloadConfig;
  backup?: BackupConfig;
  alert?: AlertConfig;
  audit?: AuditConfig;
  mock?: MockConfig;
  fallback?: FallbackConfig;
  attemptTracking?: AttemptTrackingConfig;
  callHintTemplate?: CallHintTemplateConfig;
}

/**
 * 默认超时配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export const DEFAULT_TIMEOUT: TimeoutConfig = {
  connect: 5000,
  read: 30000,
  write: 30000,
};

/**
 * 默认重试配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export const DEFAULT_RETRY: RetryConfig = {
  enabled: false,
  maxAttempts: 3,
  delay: 1000,
  backoff: 2.0,
  retryOn: [429, 500, 502, 503, 504],
};

/**
 * 默认熔断器配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  enabled: false,
  failureThreshold: 5,
  successThreshold: 2,
  halfOpenTime: 30000,
};

/**
 * 默认缓存配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export const DEFAULT_CACHE: CacheConfig = {
  enabled: false,
  ttl: 60000,
  maxSize: 1000,
};

/**
 * 默认日志配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export const DEFAULT_LOGGING: LoggingConfig = {
  level: 'info',
  logRequest: true,
  logResponse: true,
  logHeaders: false,
  sensitiveHeaders: ['authorization', 'x-api-key'],
  file: {
    enabled: false,
    dir: './logs',
    maxSize: 300,
    rotateByMonth: true,
    logRequestBody: true,
    logResponseBody: true,
    logRequestHeaders: true,
    logResponseHeaders: true,
  },
};

/**
 * 默认文件日志配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export const DEFAULT_FILE_LOGGING: FileLoggingConfig = {
  enabled: false,
  dir: './logs',
  maxSize: 300,
  rotateByMonth: true,
  logRequestBody: true,
  logResponseBody: true,
  logRequestHeaders: true,
  logResponseHeaders: true,
};

/**
 * 默认指标配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export const DEFAULT_METRICS: MetricsConfig = {
  enabled: true,
  port: 11112,
};

/**
 * 默认健康检查配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export const DEFAULT_HEALTH_CHECK: HealthCheckConfig = {
  enabled: true,
  port: 11112,
};

/**
 * 默认服务器配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export const DEFAULT_SERVER: ServerConfig = {
  transport: 'stdio',
  ssePort: 11113,
  httpPort: 11112,
};

/**
 * 默认 SQLite 日志配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export const DEFAULT_SQLITE_LOGGING: SQLiteLoggingConfig = {
  enabled: true,
  dbPath: './data/logs.db',
  maxDays: 30,
  batchSize: 100,
  syncInterval: 60000,
};

/**
 * 默认压缩配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export const DEFAULT_COMPRESSION: CompressionConfig = {
  enabled: false,
  threshold: 1024,
  level: 6,
  mimeTypes: ['application/json', 'text/plain', 'text/html'],
};

/**
 * 默认热更新配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export const DEFAULT_HOT_RELOAD: HotReloadConfig = {
  enabled: true,
  watchFile: true,
  debounceMs: 1000,
};

/**
 * 默认备份配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export const DEFAULT_BACKUP: BackupConfig = {
  enabled: true,
  dir: './backups',
  maxVersions: 10,
  schedule: '0 * * * *', // 每小时
};

/**
 * 默认告警配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export const DEFAULT_ALERT: AlertConfig = {
  enabled: true,
  logDir: './logs',
  errorRateThreshold: 10,
};

/**
 * 默认审计配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export const DEFAULT_AUDIT: AuditConfig = {
  enabled: true,
  maskSensitiveFields: true,
};

/**
 * 默认限流配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  enabled: false,
  type: 'tokenBucket',
  globalLimit: 100,
};

/**
 * 默认并发控制配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export const DEFAULT_CONCURRENCY: ConcurrencyConfig = {
  enabled: false,
  maxConcurrent: 50,
  queueSize: 100,
  queueTimeout: 30000,
};

/**
 * 默认链路追踪配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export const DEFAULT_TRACE: TraceConfig = {
  enabled: true,
  headerName: 'X-Trace-ID',
  generateShort: false,
  includeInResponse: true,
  propagateToBackend: true,
};