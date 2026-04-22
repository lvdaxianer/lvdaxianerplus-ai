/**
 * 工具配置类型定义
 *
 * 定义 MCP 工具的配置结构，包括：
 * - 参数定义（必填/可选、类型、描述）
 * - 工具配置（HTTP 方法、路径、认证、超时等）
 * - Mock 配置（测试模拟响应）
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */

/**
 * 参数定义
 *
 * 用于描述工具的输入参数，供 LLM 理解参数用途。
 *
 * @param description - 参数描述（供 LLM 理解）
 * @param type - 参数类型：string/number/boolean/object/array
 * @param required - 是否必填
 * @param defaultValue - 默认值（可选）
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface ParameterDef {
  description: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
}

/**
 * 响应转换配置
 *
 * 用于对工具返回结果进行字段筛选和重命名。
 *
 * @param pick - 包含的字段列表（可选）
 * @param rename - 字段重命名映射（可选）
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface ResponseTransformConfig {
  pick?: string[];
  rename?: Record<string, string>;
}

/**
 * 工具配置
 *
 * 定义单个 MCP 工具的完整配置。
 * 包括 HTTP 请求参数、认证、超时、Mock 等。
 *
 * @param beforeDescription - 工具描述前缀（可选，返回给 LLM 时拼接到 description 之前，Dashboard 不显示）
 * @param description - 工具描述（供 LLM 理解用途）
 * @param afterDescription - 工具描述后缀（可选，返回给 LLM 时拼接到 description 之后，Dashboard 不显示）
 * @param method - HTTP 方法：GET/POST/PUT/DELETE/PATCH
 * @param path - API 路径（支持 {param} 路径参数，或完整 URL）
 * @param token - Token 引用键（引用 tokens 配置中的 key）
 * @param authType - 认证类型：bearer/basic/apiKey
 * @param headers - 自定义 HTTP 请求头
 * @param timeout - 超时时间覆盖（毫秒）
 * @param retry - 重试配置覆盖
 * @param cache - 缓存配置覆盖
 * @param requestTransform - 请求参数名称映射
 * @param responseTransform - 响应转换配置
 * @param idempotencyKey - 幂等性键请求头名称
 * @param body - POST/PUT 请求体参数定义
 * @param queryParams - URL 查询参数定义
 * @param mock - Mock 配置（用于测试）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface ToolConfig {
  beforeDescription?: string;
  description: string;
  afterDescription?: string;
  method: string;
  path: string;
  token?: string;
  authType?: 'bearer' | 'basic' | 'apiKey';
  headers?: Record<string, string>;
  timeout?: number;
  retry?: RetryConfig;
  cache?: CacheConfig;
  requestTransform?: Record<string, string>;
  responseTransform?: ResponseTransformConfig;
  idempotencyKey?: string;
  body?: Record<string, ParameterDef>;
  queryParams?: Record<string, ParameterDef>;
  mock?: MockToolConfig;
}

/**
 * 重试配置
 *
 * 定义 HTTP 请求失败时的重试策略。
 *
 * @param enabled - 是否启用重试
 * @param maxAttempts - 最大重试次数
 * @param delay - 初始重试延迟（毫秒）
 * @param backoff - 退避倍数（每次重试延迟乘以此值）
 * @param retryOn - 触发重试的 HTTP 状态码列表
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  delay: number;
  backoff: number;
  retryOn: number[];
}

/**
 * 缓存配置
 *
 * 定义 HTTP GET 请求的缓存策略。
 * 注意：缓存用于降级备用，非查询加速。
 *
 * @param enabled - 是否启用缓存
 * @param ttl - 缓存有效期（毫秒）
 * @param maxSize - 最大缓存条目数
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

/**
 * 动态数据字段约束
 *
 * 定义 Mock 动态生成数据时的字段约束规则。
 *
 * @param minLength - 最小字符串长度
 * @param maxLength - 最大字符串长度
 * @param fixedLength - 固定字符串长度
 * @param pattern - 正则表达式模式
 * @param enum - 枚举值列表（随机选择一个）
 * @param min - 最小数值
 * @param max - 最大数值
 * @param integer - 是否必须为整数
 * @param precision - 小数精度位数
 * @param minDate - 最小日期（ISO 格式）
 * @param maxDate - 最大日期（ISO 格式）
 * @param format - 日期输出格式（如 YYYY-MM-DD）
 * @param minItems - 数组最小元素数
 * @param maxItems - 数组最大元素数
 * @param fixedItems - 数组固定元素数
 * @param itemType - 数组元素类型配置
 * @param fields - 对象嵌套字段定义
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface DynamicFieldConstraints {
  // 字符串约束
  minLength?: number;
  maxLength?: number;
  fixedLength?: number;
  pattern?: string;
  enum?: string[];

  // 数值约束
  min?: number;
  max?: number;
  integer?: boolean;
  precision?: number;

  // 日期约束
  minDate?: string;
  maxDate?: string;
  format?: string;

  // 数组约束
  minItems?: number;
  maxItems?: number;
  fixedItems?: number;
  itemType?: DynamicFieldConfig;

  // 对象约束
  fields?: DynamicFieldConfig[];
}

/**
 * 动态数据字段配置
 *
 * 定义 Mock 动态生成数据的单个字段。
 *
 * @param name - 字段名称
 * @param type - 字段类型：string/number/boolean/date/array/object
 * @param description - 字段描述
 * @param aiHint - AI 语义提示（如"用户名"→生成中文姓名）
 * @param required - 是否必填
 * @param constraints - 字段约束规则
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface DynamicFieldConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description?: string;
  aiHint?: string;
  required?: boolean;
  constraints?: DynamicFieldConstraints;
}

/**
 * Mock 动态数据配置
 *
 * 定义 Mock 动态生成数据的整体配置。
 *
 * @param enabled - 是否启用动态数据生成
 * @param fields - 字段配置列表
 * @param seed - 随机种子（用于生成可复现数据）
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface MockDynamicConfig {
  enabled: boolean;
  fields: DynamicFieldConfig[];
  seed?: number;
}

/**
 * Mock 工具配置
 *
 * 定义单个工具的 Mock 配置，用于测试或降级。
 *
 * @param enabled - 是否启用 Mock
 * @param response - 静态响应数据
 * @param responseTemplate - 动态响应模板（支持 {param}、{timestamp}、{uuid}）
 * @param dynamicConfig - 动态数据生成配置
 * @param delay - 模拟延迟（毫秒）
 * @param statusCode - 模拟 HTTP 状态码
 * @param headers - 模拟响应头
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface MockToolConfig {
  enabled: boolean;
  response?: unknown;
  responseTemplate?: string;
  dynamicConfig?: MockDynamicConfig;
  delay?: number;
  statusCode?: number;
  headers?: Record<string, string>;
}

/**
 * Mock 全局配置
 *
 * 定义全局 Mock 开关和各工具的 Mock 数据。
 *
 * @param enabled - 是否启用全局 Mock
 * @param mockData - 各工具的 Mock 配置映射
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export interface MockConfig {
  enabled: boolean;
  mockData?: Record<string, MockToolConfig>;
}