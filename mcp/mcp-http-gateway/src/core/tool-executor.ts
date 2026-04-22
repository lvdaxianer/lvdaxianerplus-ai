/**
 * 工具执行模块
 *
 * 调用 executor 执行工具并处理执行结果。
 *
 * 功能：
 * - 调用 executeTool 执行 HTTP 请求
 * - 处理成功/失败结果
 * - 捕获异常并生成错误响应
 * - 支持尝试追踪（记录尝试、返回 metadata）
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */

import type { Config, ToolConfig } from '../config/types.js';
import { executeTool } from './executor.js';
import { logger } from '../middleware/logger.js';
import { recordMetric } from '../middleware/metrics.js';
import { checkRateLimit } from '../features/rate-limit.js';
import {
  recordAttempt,
  clearAttempt,
  getAttemptRecord,
  buildMetadata,
} from './attempt-tracking.js';

/**
 * 尝试追踪配置类型（简化版）
 *
 * 仅包含执行工具调用所需的配置字段。
 *
 * @param enabled - 是否启用尝试追踪
 * @param clearOnSuccess - 成功时是否清除记录
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export interface AttemptConfigForExecution {
  enabled: boolean;
  clearOnSuccess: boolean;
}

/**
 * 尝试追踪元数据类型（简化版）
 *
 * 用于构建带 metadata 的错误响应。
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export interface AttemptMetadata {
  attempt_count: number;
  max_attempts: number;
  remaining_attempts: number;
  previous_errors: string[];
  suggested_action: string;
}

/**
 * 执行工具调用
 *
 * 功能：调用 executor 执行工具，处理执行结果。
 *
 * 处理流程：
 * 1. 记录开始时间（用于计算执行时长）
 * 2. 调用 executeTool 执行 HTTP 请求
 * 3. 计算执行时长
 * 4. 处理成功结果（清除尝试记录、返回数据）
 * 5. 处理失败结果（记录尝试、返回错误）
 * 6. 捕获异常（记录尝试、返回错误）
 *
 * 尝试追踪行为：
 * - 成功时：清除尝试记录（根据 clearOnSuccess 配置）
 * - 失败时：记录尝试次数和错误信息
 * - 异常时：记录尝试次数和异常信息
 *
 * @param name - 工具名称
 * @param tool - 工具配置（包含 method、path、headers 等）
 * @param args - 请求参数（从 call_tool 请求中解析）
 * @param config - 全局配置（包含 baseUrl、tokens 等）
 * @param attemptConfig - 尝试追踪配置
 * @param maxAttempts - 最大尝试次数
 * @returns 工具调用响应（成功或错误）
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export async function executeToolCall(
  name: string,
  tool: ToolConfig,
  args: Record<string, unknown>,
  config: Config,
  attemptConfig: AttemptConfigForExecution,
  maxAttempts: number
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  // ===== 步骤 0：限流检查 =====
  // 条件注释：限流检查失败时直接返回错误，不执行请求
  const rateLimitAllowed = checkRateLimit(name);

  if (!rateLimitAllowed) {
    // ----- 限流拒绝处理 -----
    // 记录限流拒绝日志
    logger.warn('[工具调用] 限流拒绝', { toolName: name });

    // 记录指标（限流拒绝作为错误记录）
    recordMetric(name, 'error');

    // 返回限流拒绝错误响应
    return createErrorResponse('请求被限流拒绝，请稍后重试');
  } else {
    // 限流允许，继续执行
  }

  // ===== 步骤 1：记录开始时间 =====
  const startTime = Date.now();

  try {
    // ===== 步骤 2：执行工具 =====
    // 调用 executor 执行 HTTP 请求
    const result = await executeTool({
      toolName: name,
      tool,
      args,
      config,
    });

    // ===== 步骤 3：计算执行时长 =====
    const duration = Date.now() - startTime;

    // ===== 步骤 4：处理执行结果 =====
    // 条件注释：执行成功时清除尝试记录并返回结果
    if (result.success) {
      // ----- 成功处理 -----
      // 记录成功日志（包含执行时长和缓存状态）
      logger.info('[工具调用] 执行成功', { toolName: name, duration, cached: result.cached });

      // 记录指标（成功状态）
      recordMetric(name, 'success', duration);

      // 条件注释：成功时清除尝试记录（根据 clearOnSuccess 配置）
      // 启用 clearOnSuccess 且尝试追踪启用时清除记录
      if (attemptConfig.enabled && attemptConfig.clearOnSuccess) {
        clearAttempt(name);
      } else {
        // 不清除记录或未启用尝试追踪
      }

      // 返回成功响应（JSON 格式的执行结果数据）
      return {
        content: [{ type: 'text', text: JSON.stringify(result.data) }],
      };
    } else {
      // ----- 失败处理 -----
      // 记录失败日志（包含执行时长和错误信息）
      logger.error('[工具调用] 执行失败', { toolName: name, duration, error: result.error });

      // 记录尝试（用于尝试追踪）
      // 使用默认错误信息（如果 result.error 为空）
      recordAttempt(name, result.error ?? '未知错误');

      // 记录指标（失败状态）
      recordMetric(name, 'error', duration);

      // 条件注释：启用尝试追踪时返回带 metadata 的错误响应
      if (attemptConfig.enabled) {
        // 获取更新后的尝试记录
        const updatedRecord = getAttemptRecord(name);

        // 构建 metadata（包含尝试状态和建议）
        const metadata = buildMetadata(updatedRecord.count, maxAttempts, updatedRecord.errors);

        // 返回带 metadata 的错误响应
        return createErrorResponseWithMetadata(result.error ?? '未知错误', metadata);
      } else {
        // 未启用尝试追踪，返回普通错误响应
        return createErrorResponse(result.error ?? '未知错误');
      }
    }
  } catch (error) {
    // ===== 步骤 5：异常处理 =====
    // 计算执行时长
    const duration = Date.now() - startTime;

    // 提取错误信息（区分 Error 对象和其他类型）
    const message = error instanceof Error ? error.message : '未知错误';

    // 记录异常日志（包含执行时长和异常信息）
    logger.error('[工具调用] 执行异常', { toolName: name, duration, error: message });

    // 记录尝试（用于尝试追踪）
    recordAttempt(name, message);

    // 记录指标（失败状态）
    recordMetric(name, 'error', duration);

    // 条件注释：启用尝试追踪时返回带 metadata 的错误响应
    if (attemptConfig.enabled) {
      // 获取更新后的尝试记录
      const updatedRecord = getAttemptRecord(name);

      // 构建 metadata（包含尝试状态和建议）
      const metadata = buildMetadata(updatedRecord.count, maxAttempts, updatedRecord.errors);

      // 返回带 metadata 的错误响应
      return createErrorResponseWithMetadata(message, metadata);
    } else {
      // 未启用尝试追踪，返回普通错误响应
      return createErrorResponse(message);
    }
  }
}

// ============================================================================
// 响应创建函数
// ============================================================================

/**
 * 创建错误响应
 *
 * 功能：生成标准的错误响应结构。
 *
 * 响应结构：
 * - content: 文本内容数组（包含 JSON 格式的错误对象）
 * - isError: true（标识为错误响应）
 *
 * JSON 内容格式：{ error: string }
 *
 * @param error - 错误信息文本
 * @returns 错误响应结构
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export function createErrorResponse(error: string): { content: Array<{ type: 'text'; text: string }>; isError: boolean } {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error }) }],
    isError: true,
  };
}

/**
 * 创建带元数据的错误响应
 *
 * 功能：生成带尝试追踪元数据的错误响应结构。
 *
 * 响应结构：
 * - content: 文本内容数组（包含 JSON 格式的错误对象 + metadata）
 * - isError: true（标识为错误响应）
 *
 * JSON 内容格式：{ error: string, metadata: AttemptMetadata }
 *
 * metadata 字段说明：
 * - attempt_count: 当前尝试次数（1-based，告知 LLM 已尝试几次）
 * - max_attempts: 最大允许次数（告知 LLM 上限）
 * - remaining_attempts: 剩余次数（告知 LLM 还能尝试几次）
 * - previous_errors: 之前错误列表（帮助 LLM 理解失败原因）
 * - suggested_action: 建议下一步行动（引导 LLM 正确使用工具）
 *
 * 用途：告知 LLM 当前尝试状态，引导正确使用工具。
 * LLM 可根据 metadata 决定继续尝试或向用户确认参数。
 *
 * @param error - 错误信息文本
 * @param metadata - 尝试追踪元数据
 * @returns 带 metadata 的错误响应结构
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export function createErrorResponseWithMetadata(
  error: string,
  metadata: AttemptMetadata
): { content: Array<{ type: 'text'; text: string }>; isError: boolean } {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error, metadata }) }],
    isError: true,
  };
}