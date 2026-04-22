/**
 * 服务器配置类型定义
 *
 * 定义 MCP HTTP Gateway 的服务器配置，包括：
 * - 代理配置
 * - 超时配置
 * - 日志配置
 * - 指标配置
 * - 健康检查配置
 * - 热更新配置
 * - 备份配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */

/**
 * 代理配置
 *
 * 定义 HTTP 请求代理设置。
 *
 * @param url - 代理 URL
 * @param auth - 代理认证（用户名/密码）
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface ProxyConfig {
  url: string;
  auth?: {
    username: string;
    password: string;
  };
}

/**
 * 超时配置
 *
 * 定义 HTTP 请求各阶段的超时时间。
 *
 * @param connect - 连接超时（毫秒）
 * @param read - 读取超时（毫秒）
 * @param write - 写入超时（毫秒）
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface TimeoutConfig {
  connect: number;
  read: number;
  write: number;
}

/**
 * 熔断器配置
 *
 * 定义服务熔断策略，防止级联故障。
 *
 * @param enabled - 是否启用熔断器
 * @param failureThreshold - 触发熔断的失败次数
 * @param successThreshold - 关闭熔断的成功次数
 * @param halfOpenTime - 半开状态持续时间（毫秒）
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  halfOpenTime: number;
}

/**
 * 日志配置
 *
 * 定义日志记录策略。
 *
 * @param level - 日志级别：debug/info/warn/error
 * @param logRequest - 是否记录请求
 * @param logResponse - 是否记录响应
 * @param logHeaders - 是否记录请求头
 * @param sensitiveHeaders - 需要脱敏的请求头列表
 * @param file - 文件日志配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  logRequest: boolean;
  logResponse: boolean;
  logHeaders: boolean;
  sensitiveHeaders: string[];
  file?: FileLoggingConfig;
}

/**
 * 文件日志配置
 *
 * 定义日志文件输出策略。
 *
 * @param enabled - 是否启用文件日志
 * @param dir - 日志文件目录（默认 ./logs）
 * @param maxSize - 单文件最大大小（MB，默认 300）
 * @param rotateByMonth - 是否按月轮转（默认 true）
 * @param logRequestBody - 是否记录请求体
 * @param logResponseBody - 是否记录响应体
 * @param logRequestHeaders - 是否记录请求头
 * @param logResponseHeaders - 是否记录响应头
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface FileLoggingConfig {
  enabled: boolean;
  dir?: string;
  maxSize?: number;
  rotateByMonth?: boolean;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  logRequestHeaders?: boolean;
  logResponseHeaders?: boolean;
}

/**
 * 指标配置
 *
 * 定义指标监控服务配置。
 *
 * @param enabled - 是否启用指标监控
 * @param port - 指标服务端口
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface MetricsConfig {
  enabled: boolean;
  port: number;
}

/**
 * 健康检查配置
 *
 * 定义健康检查服务配置。
 *
 * @param enabled - 是否启用健康检查
 * @param port - 健康检查服务端口
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface HealthCheckConfig {
  enabled: boolean;
  port: number;
}

/**
 * 服务器配置
 *
 * 定义 MCP Server 传输层配置。
 *
 * @param transport - 传输模式：stdio/sse
 * @param ssePort - SSE 服务端口
 * @param httpPort - HTTP 服务端口（用于指标/健康检查）
 * @param ssl - SSL 配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface ServerConfig {
  transport: string;
  ssePort: number;
  httpPort: number;
  ssl?: {
    enabled: boolean;
    cert: string;
    key: string;
  };
}

/**
 * 全局认证配置
 *
 * 定义默认认证策略。
 *
 * @param type - 认证类型：bearer/basic/apiKey
 * @param default - 默认 Token 引用键
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface AuthConfig {
  type: 'bearer' | 'basic' | 'apiKey';
  default?: string;
}

/**
 * SQLite 日志配置
 *
 * 定义 SQLite 数据库日志记录策略。
 *
 * @param enabled - 是否启用 SQLite 日志
 * @param dbPath - 数据库文件路径（默认 ./data/logs.db）
 * @param maxDays - 日志保留天数（默认 30）
 * @param batchSize - 批量写入大小（默认 100）
 * @param syncInterval - 统计同步间隔（毫秒，默认 60000）
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface SQLiteLoggingConfig {
  enabled: boolean;
  dbPath?: string;
  maxDays?: number;
  batchSize?: number;
  syncInterval?: number;
}

/**
 * 响应压缩配置
 *
 * 定义 HTTP 响应压缩策略。
 *
 * @param enabled - 是否启用压缩
 * @param threshold - 压缩阈值（字节，默认 1024）
 * @param level - 压缩级别 1-9（默认 6）
 * @param mimeTypes - 需压缩的 MIME 类型列表
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface CompressionConfig {
  enabled: boolean;
  threshold?: number;
  level?: number;
  mimeTypes?: string[];
}

/**
 * 配置热更新配置
 *
 * 定义配置文件热更新策略。
 *
 * @param enabled - 是否启用热更新（默认 true）
 * @param watchFile - 是否监听文件变化（默认 true）
 * @param debounceMs - 变化检测延迟（毫秒，默认 1000）
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface HotReloadConfig {
  enabled: boolean;
  watchFile?: boolean;
  debounceMs?: number;
}

/**
 * 备份配置
 *
 * 定义配置文件备份策略。
 *
 * @param enabled - 是否启用备份（默认 true）
 * @param dir - 备份目录（默认 ./backups）
 * @param maxVersions - 最大版本数（默认 10）
 * @param schedule - 定时备份 Cron 表达式（默认每小时）
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface BackupConfig {
  enabled: boolean;
  dir?: string;
  maxVersions?: number;
  schedule?: string;
}

/**
 * 告警配置
 *
 * 定义错误告警策略。
 *
 * @param enabled - 是否启用告警日志
 * @param logDir - 告警日志目录（默认 ./logs）
 * @param errorRateThreshold - 错误率阈值百分比（默认 10）
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface AlertConfig {
  enabled: boolean;
  logDir?: string;
  errorRateThreshold?: number;
}

/**
 * 审计配置
 *
 * 定义审计日志策略。
 *
 * @param enabled - 是否启用审计日志
 * @param maskSensitiveFields - 是否脱敏敏感字段（默认 true）
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface AuditConfig {
  enabled: boolean;
  maskSensitiveFields?: boolean;
}

/**
 * 工具级限流配置
 *
 * 定义单个工具的限流策略。
 *
 * @param limit - 时间窗口内最大请求数
 * @param window - 时间窗口（毫秒，默认 1000）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface ToolRateLimitConfig {
  limit: number;
  window?: number;
}

/**
 * 全局限流配置
 *
 * 定义请求限流策略，防止后端服务被压垮。
 *
 * 限流算法：
 * - tokenBucket: 令牌桶算法，允许突发流量
 * - slidingWindow: 滑动窗口算法，精确控制速率
 *
 * @param enabled - 是否启用限流（默认 false）
 * @param type - 限流算法类型：tokenBucket/slidingWindow（默认 tokenBucket）
 * @param globalLimit - 全局每秒最大请求数（默认 100）
 * @param toolLimits - 工具级限流配置映射（优先级高于全局配置）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface RateLimitConfig {
  enabled: boolean;
  type?: 'tokenBucket' | 'slidingWindow';
  globalLimit?: number;
  toolLimits?: Record<string, ToolRateLimitConfig>;
}

/**
 * 并发控制配置
 *
 * 定义并发请求限制策略，防止资源耗尽。
 *
 * @param enabled - 是否启用并发控制（默认 false）
 * @param maxConcurrent - 最大并发请求数（默认 50）
 * @param queueSize - 等待队列大小（默认 100）
 * @param queueTimeout - 队列等待超时（毫秒，默认 30000）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface ConcurrencyConfig {
  enabled: boolean;
  maxConcurrent?: number;
  queueSize?: number;
  queueTimeout?: number;
}

/**
 * 链路追踪配置
 *
 * 定义请求追踪策略，用于分布式追踪和日志关联。
 *
 * @param enabled - 是否启用链路追踪（默认 true）
 * @param headerName - Trace ID HTTP 头名称（默认 X-Trace-ID）
 * @param generateShort - 是否生成短 ID（默认 false，使用完整 UUID）
 * @param includeInResponse - 是否在响应头中返回 Trace ID（默认 true）
 * @param propagateToBackend - 是否向后端传递 Trace ID（默认 true）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface TraceConfig {
  enabled: boolean;
  headerName?: string;
  generateShort?: boolean;
  includeInResponse?: boolean;
  propagateToBackend?: boolean;
}