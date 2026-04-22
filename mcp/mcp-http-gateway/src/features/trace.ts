/**
 * 链路追踪模块
 *
 * 功能：
 * - 生成唯一 Trace ID（UUID 或短 ID）
 * - 追踪 ID 在请求生命周期中传递
 * - 日志中包含 Trace ID
 * - HTTP 响应头返回 Trace ID（X-Trace-ID）
 * - Dashboard API 查询 Trace ID
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../middleware/logger.js';
import { getDatabase } from '../database/connection.js';

/**
 * Trace ID 配置
 *
 * @param enabled - 是否启用链路追踪
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

/**
 * 默认 Trace 配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export const DEFAULT_TRACE_CONFIG: TraceConfig = {
  enabled: true,
  headerName: 'X-Trace-ID',
  generateShort: false,
  includeInResponse: true,
  propagateToBackend: true,
};

/**
 * Trace 上下文
 *
 * 包含单个请求的追踪信息。
 *
 * @param traceId - Trace ID（唯一标识符）
 * @param startTime - 请求开始时间（毫秒）
 * @param toolName - 工具名称
 * @param method - HTTP 方法
 * @param url - 请求 URL
 * @param parentTraceId - 父 Trace ID（可选，用于分布式追踪）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface TraceContext {
  traceId: string;
  startTime: number;
  toolName: string;
  method: string;
  url: string;
  parentTraceId?: string;
}

/**
 * 全局 Trace 配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
let traceConfig: TraceConfig = DEFAULT_TRACE_CONFIG;

/**
 * 当前活跃的 Trace 上下文存储
 *
 * 使用 Map 存储，key 为 traceId。
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
const activeTraces: Map<string, TraceContext> = new Map();

/**
 * 初始化链路追踪
 *
 * @param config - Trace 配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function initTrace(config: TraceConfig | undefined): void {
  // 条件注释：无配置时使用默认配置，有配置时合并
  if (!config) {
    traceConfig = DEFAULT_TRACE_CONFIG;
  } else {
    traceConfig = { ...DEFAULT_TRACE_CONFIG, ...config };
  }

  logger.info('[链路追踪] 初始化完成', {
    enabled: traceConfig.enabled,
    headerName: traceConfig.headerName,
    generateShort: traceConfig.generateShort,
  });
}

/**
 * 生成 Trace ID
 *
 * 支持两种格式：
 * - 完整 UUID（默认）：550e8400-e29b-41d4-a716-446655440000
 * - 短 ID（可选）：550e8400（UUID 前 8 位）
 *
 * @returns Trace ID 字符串
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function generateTraceId(): string {
  const uuid = uuidv4();

  // 条件注释：生成短 ID（前 8 位）
  if (traceConfig.generateShort) {
    return uuid.substring(0, 8);
  } else {
    return uuid;
  }
}

/**
 * 开始追踪
 *
 * 创建新的 Trace 上下文，记录请求开始。
 *
 * @param toolName - 工具名称
 * @param method - HTTP 方法
 * @param url - 请求 URL
 * @param parentTraceId - 父 Trace ID（可选）
 * @returns Trace ID
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function startTrace(
  toolName: string,
  method: string,
  url: string,
  parentTraceId?: string
): string {
  // 条件注释：追踪未启用时返回空字符串
  if (!traceConfig.enabled) {
    return '';
  }

  // 条件注释：生成 Trace ID
  const traceId = generateTraceId();
  const startTime = Date.now();

  // 条件注释：创建 Trace 上下文
  const context: TraceContext = {
    traceId,
    startTime,
    toolName,
    method,
    url,
    parentTraceId,
  };

  // 条件注释：存储到活跃追踪 Map
  activeTraces.set(traceId, context);

  // 条件注释：记录开始日志
  logger.info('[链路追踪] 开始追踪', {
    traceId,
    toolName,
    method,
    url,
    parentTraceId,
  });

  return traceId;
}

/**
 * 结束追踪
 *
 * 记录请求结束，计算耗时，保存到数据库。
 *
 * @param traceId - Trace ID
 * @param statusCode - HTTP 状态码
 * @param success - 是否成功
 * @param errorMessage - 错误信息（可选）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function endTrace(
  traceId: string,
  statusCode: number,
  success: boolean,
  errorMessage?: string
): void {
  // 条件注释：追踪未启用或 Trace ID 为空时跳过
  if (!traceConfig.enabled || !traceId) {
    return;
  }

  // 条件注释：获取 Trace 上下文
  const context = activeTraces.get(traceId);

  if (!context) {
    logger.warn('[链路追踪] 未找到 Trace 上下文', { traceId });
    return;
  }

  // 条件注释：计算耗时
  const duration = Date.now() - context.startTime;

  // 条件注释：记录结束日志
  logger.info('[链路追踪] 结束追踪', {
    traceId,
    toolName: context.toolName,
    duration,
    statusCode,
    success,
    errorMessage,
  });

  // 条件注释：保存到数据库
  saveTraceToDatabase(context, statusCode, success, errorMessage, duration);

  // 条件注释：从活跃追踪 Map 中移除
  activeTraces.delete(traceId);
}

/**
 * 获取 Trace 上下文
 *
 * @param traceId - Trace ID
 * @returns Trace 上下文（可能为 undefined）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getTraceContext(traceId: string): TraceContext | undefined {
  return activeTraces.get(traceId);
}

/**
 * 获取 Trace ID HTTP 头名称
 *
 * @returns HTTP 头名称
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getTraceHeaderName(): string {
  return traceConfig.headerName ?? 'X-Trace-ID';
}

/**
 * 是否在响应头中返回 Trace ID
 *
 * @returns 是否返回
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function shouldIncludeTraceInResponse(): boolean {
  return traceConfig.includeInResponse ?? true;
}

/**
 * 是否向后端传递 Trace ID
 *
 * @returns 是否传递
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function shouldPropagateTraceToBackend(): boolean {
  return traceConfig.propagateToBackend ?? true;
}

/**
 * 保存 Trace 到数据库
 *
 * @param context - Trace 上下文
 * @param statusCode - HTTP 状态码
 * @param success - 是否成功
 * @param errorMessage - 错误信息
 * @param duration - 耗时
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function saveTraceToDatabase(
  context: TraceContext,
  statusCode: number,
  success: boolean,
  errorMessage: string | undefined,
  duration: number
): void {
  const db = getDatabase();

  // 条件注释：数据库不可用时跳过保存
  if (!db) {
    logger.warn('[链路追踪] 数据库不可用，跳过保存');
    return;
  }

  // 条件注释：保存到 trace_logs 表
  try {
    db.prepare(`
      INSERT INTO trace_logs (
        trace_id,
        tool_name,
        method,
        url,
        start_time,
        duration,
        status_code,
        success,
        error_message,
        parent_trace_id,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      context.traceId,
      context.toolName,
      context.method,
      context.url,
      context.startTime,
      duration,
      statusCode,
      success ? 1 : 0,
      errorMessage ?? null,
      context.parentTraceId ?? null
    );

    logger.debug('[链路追踪] Trace 已保存到数据库', { traceId: context.traceId });
  } catch (error) {
    logger.error('[链路追踪] 保存 Trace 失败', { error, traceId: context.traceId });
  }
}

/**
 * 从数据库查询 Trace
 *
 * @param traceId - Trace ID
 * @returns Trace 记录（可能为 undefined）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function queryTraceById(traceId: string): TraceRecord | undefined {
  const db = getDatabase();

  // 条件注释：数据库不可用时返回 undefined
  if (!db) {
    logger.warn('[链路追踪] 数据库不可用');
    return undefined;
  }

  // 条件注释：查询 Trace 记录
  try {
    const row = db.prepare(`
      SELECT
        trace_id,
        tool_name,
        method,
        url,
        start_time,
        duration,
        status_code,
        success,
        error_message,
        parent_trace_id,
        created_at
      FROM trace_logs
      WHERE trace_id = ?
    `).get(traceId) as TraceRecord | undefined;

    return row;
  } catch (error) {
    logger.error('[链路追踪] 查询 Trace 失败', { error, traceId });
    return undefined;
  }
}

/**
 * 查询最近的 Trace 记录
 *
 * @param limit - 返回条数限制（默认 100）
 * @returns Trace 记录列表
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function queryRecentTraces(limit: number = 100): TraceRecord[] {
  const db = getDatabase();

  // 条件注释：数据库不可用时返回空列表
  if (!db) {
    logger.warn('[链路追踪] 数据库不可用');
    return [];
  }

  // 条件注释：查询最近的 Trace 记录
  try {
    const rows = db.prepare(`
      SELECT
        trace_id,
        tool_name,
        method,
        url,
        start_time,
        duration,
        status_code,
        success,
        error_message,
        parent_trace_id,
        created_at
      FROM trace_logs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as TraceRecord[];

    return rows;
  } catch (error) {
    logger.error('[链路追踪] 查询最近 Trace 失败', { error });
    return [];
  }
}

/**
 * 查询指定工具的 Trace 记录
 *
 * @param toolName - 工具名称
 * @param limit - 返回条数限制（默认 100）
 * @returns Trace 记录列表
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function queryTracesByTool(toolName: string, limit: number = 100): TraceRecord[] {
  const db = getDatabase();

  // 条件注释：数据库不可用时返回空列表
  if (!db) {
    logger.warn('[链路追踪] 数据库不可用');
    return [];
  }

  // 条件注释：查询指定工具的 Trace 记录
  try {
    const rows = db.prepare(`
      SELECT
        trace_id,
        tool_name,
        method,
        url,
        start_time,
        duration,
        status_code,
        success,
        error_message,
        parent_trace_id,
        created_at
      FROM trace_logs
      WHERE tool_name = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(toolName, limit) as TraceRecord[];

    return rows;
  } catch (error) {
    logger.error('[链路追踪] 查询工具 Trace 失败', { error, toolName });
    return [];
  }
}

/**
 * Trace 记录类型
 *
 * @param trace_id - Trace ID
 * @param tool_name - 工具名称
 * @param method - HTTP 方法
 * @param url - 请求 URL
 * @param start_time - 开始时间
 * @param duration - 耗时（毫秒）
 * @param status_code - HTTP 状态码
 * @param success - 是否成功（0 或 1）
 * @param error_message - 错误信息
 * @param parent_trace_id - 父 Trace ID
 * @param created_at - 创建时间
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface TraceRecord {
  trace_id: string;
  tool_name: string;
  method: string;
  url: string;
  start_time: number;
  duration: number;
  status_code: number;
  success: number;
  error_message: string | null;
  parent_trace_id: string | null;
  created_at: string;
}

/**
 * 获取追踪配置
 *
 * @returns 当前追踪配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getTraceConfig(): TraceConfig {
  return traceConfig;
}

/**
 * 获取活跃追踪数量
 *
 * @returns 活跃追踪数量
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getActiveTracesCount(): number {
  return activeTraces.size;
}