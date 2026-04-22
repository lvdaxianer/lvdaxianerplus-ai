/**
 * MCP Server 处理器模块
 *
 * 定义工具列表和工具调用的请求处理器。
 *
 * 功能：
 * - 注册 list_tools 处理器（返回工具定义）
 * - 注册 call_tool 处理器（执行工具调用）
 * - 协调尝试追踪和参数验证
 *
 * 模块依赖：
 * - schema-builder.ts: 构建 JSON Schema 输入定义
 * - param-validator.ts: 验证必填参数
 * - tool-executor.ts: 执行工具并处理结果
 * - attempt-tracking.ts: 记录和追踪尝试
 * - call-hint.ts: 生成调用提示
 *
 * 处理器说明：
 * - list_tools: 返回所有工具定义（包含调用提示）
 *   - 响应 MCP 客户端查询工具列表的请求
 *   - 为每个工具生成调用提示（根据参数类型）
 *   - 构建输入 Schema（供 LLM 理解参数结构）
 *
 * - call_tool: 执行工具并返回结果
 *   - 响应 MCP 客户端调用工具的请求
 *   - 检查工具是否存在
 *   - 验证尝试追踪状态
 *   - 验证必填参数
 *   - 执行 HTTP 请求
 *   - 处理成功/失败结果
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Config, ToolConfig } from '../config/types.js';
import { logger } from '../middleware/logger.js';
import { recordMetric } from '../middleware/metrics.js';
import {
  recordAttempt,
  getAttemptRecord,
  generateExceededFeedback,
  buildMetadata,
  getAttemptConfig,
} from './attempt-tracking.js';
import {
  generateCallHint,
  addCallHintToDescription,
  getHintConfig,
} from './call-hint.js';
import { buildInputSchema } from './schema-builder.js';
import { validateRequiredParams } from './param-validator.js';
import {
  executeToolCall,
  createErrorResponse,
  createErrorResponseWithMetadata,
} from './tool-executor.js';

// ============================================================================
// 请求处理器注册函数
// ============================================================================

/**
 * 注册工具列表处理器
 *
 * 功能：响应 list_tools 请求，返回所有工具定义。
 *
 * MCP 协议说明：
 * - list_tools 是 MCP 客户端查询可用工具的请求
 * - 返回的 tools 数组包含每个工具的名称、描述和输入 Schema
 * - 输入 Schema 使用 JSON Schema 格式，供 LLM 理解参数结构
 *
 * 处理流程：
 * 1. 获取尝试追踪配置和调用提示配置
 * 2. 遍历所有工具，生成调用提示
 * 3. 构建输入 Schema（JSON Schema 格式）
 * 4. 返回工具列表
 *
 * 调用提示生成：
 * - 根据工具参数类型（有必填/全可选/无参数）
 * - 使用模板填充步骤描述
 * - 已有提示时跳过添加
 *
 * 输入 Schema 结构：
 * - type: 'object'
 * - properties: 参数定义映射
 * - required: 必填参数列表
 *
 * @param server - MCP Server 实例
 * @param config - 工具配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export function registerListToolsHandler(server: Server, config: Config): void {
  // 注册 list_tools 请求处理器
  // 使用 ListToolsRequestSchema 作为请求类型标识
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // ===== 步骤 1：获取配置 =====
    // 记录调试日志（追踪请求处理开始）
    logger.debug('[工具列表] list_tools 请求');

    // 获取尝试追踪配置
    // 用于生成调用提示中的 maxAttempts 占位符值
    const attemptConfig = getAttemptConfig(config);

    // 获取调用提示模板配置
    // 包含模板字符串和各参数类型的步骤描述
    const hintConfig = getHintConfig(config);

    // 提取最大尝试次数
    // 用于填充模板中的 {maxAttempts} 占位符
    const maxAttempts = attemptConfig.maxAttempts;

    // ===== 步骤 2：构建工具列表 =====
    // 遍历所有工具配置，生成 MCP 工具定义
    const tools = Object.entries(config.tools).map(([name, tool]) => {
      // 拼接完整描述：beforeDescription + description + afterDescription
      // beforeDescription 和 afterDescription 是可选字段，用于向 LLM 提供额外上下文
      // Dashboard 不显示这两个字段，仅用于 MCP 工具返回
      const fullDescription = [
        tool.beforeDescription || '',
        tool.description,
        tool.afterDescription || ''
      ].filter(Boolean).join('\n');

      // 生成调用提示
      // 根据工具参数类型选择对应的步骤描述
      const hint = generateCallHint(tool, hintConfig, maxAttempts);

      // 添加提示到描述
      // 如果描述已包含【调用提示】标记则跳过添加
      const enhancedDescription = addCallHintToDescription(fullDescription, hint);

      // 构建输入 Schema
      // 提取路径参数、查询参数、Body 参数生成 JSON Schema
      const inputSchema = buildInputSchema(tool);

      // 返回 MCP 工具定义结构
      // name: 工具名称（唯一标识）
      // description: 工具描述（供 LLM 理解用途，已拼接 before/after）
      // inputSchema: 输入定义（供 LLM 理解参数）
      return {
        name,
        description: enhancedDescription,
        inputSchema,
      };
    });

    // ===== 步骤 3：记录日志并返回 =====
    // 记录返回的工具数量（用于追踪和监控）
    logger.info('[工具列表] 返回工具数量', { count: tools.length });

    // 返回工具列表响应
    // MCP 协议要求返回 { tools: [...] } 格式
    return { tools };
  });
}

/**
 * 注册工具调用处理器
 *
 * 功能：响应 call_tool 请求，执行工具并返回结果。
 *
 * MCP 协议说明：
 * - call_tool 是 MCP 客户端调用具体工具的请求
 * - 请求包含工具名称和参数对象
 * - 返回执行结果或错误信息
 *
 * 处理流程：
 * 1. 解析请求参数（工具名称、参数对象）
 * 2. 检查工具是否存在（工具未配置时返回错误）
 * 3. 检查是否超过最大尝试次数（超过时返回反馈）
 * 4. 验证必填参数（缺失时记录尝试并返回错误）
 * 5. 执行工具调用（调用 executor）
 *
 * 尝试追踪行为：
 * - 工具不存在：直接返回错误（不记录尝试）
 * - 超过最大次数：返回反馈（不执行工具）
 * - 参数缺失：记录尝试并返回错误（带 metadata）
 * - 执行失败：记录尝试并返回错误（带 metadata）
 * - 执行成功：清除尝试记录（根据 clearOnSuccess 配置）
 *
 * 错误响应类型：
 * - 普通错误：{ error: string }
 * - 带 metadata 错误：{ error: string, metadata: {...} }
 * - 尝试次数超限反馈：结构化反馈文本
 *
 * @param server - MCP Server 实例
 * @param config - 工具配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-21
 */
export function registerCallToolHandler(server: Server, config: Config): void {
  // 注册 call_tool 请求处理器
  // 使用 CallToolRequestSchema 作为请求类型标识
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // ===== 步骤 1：解析请求参数 =====
    // 从 request.params 中提取工具名称和参数
    const { name, arguments: args } = request.params;

    // 记录请求日志（包含工具名称和参数）
    logger.info('[工具调用] 收到请求', { toolName: name, arguments: args });

    // ===== 步骤 2：检查工具是否存在 =====
    // 从配置中获取工具定义
    const tool = config.tools[name];

    // 条件注释：工具不存在时返回错误响应
    // 工具未在 config.tools 中配置时视为不存在
    if (!tool) {
      // 构建错误信息
      const error = `工具不存在: ${name}`;

      // 记录错误日志
      logger.error('[工具调用] 工具不存在', { toolName: name });

      // 记录指标（失败状态）
      recordMetric(name, 'error');

      // 返回错误响应
      return createErrorResponse(error);
    } else {
      // 工具存在，继续后续处理
    }

    // ===== 步骤 3：检查尝试追踪状态 =====
    // 获取尝试追踪配置
    const attemptConfig = getAttemptConfig(config);

    // 提取最大尝试次数
    const maxAttempts = attemptConfig.maxAttempts;

    // 获取当前工具的尝试记录
    // 包含已尝试次数和错误历史
    const currentRecord = getAttemptRecord(name);

    // 计算当前尝试次数（上次次数 + 1）
    const attemptCount = currentRecord.count + 1;

    // 条件注释：超过最大尝试次数时返回反馈
    // 不执行工具调用，直接返回结构化反馈
    // 反馈包含工具信息、尝试次数、错误历史和建议
    if (attemptConfig.enabled && attemptCount > maxAttempts) {
      // 记录警告日志
      logger.warn('[尝试追踪] 超过最大尝试次数', { toolName: name, attemptCount, maxAttempts });

      // 记录指标（失败状态）
      recordMetric(name, 'error');

      // 生成结构化反馈文本
      const feedback = generateExceededFeedback(name, tool, currentRecord, maxAttempts);

      // 返回反馈响应
      return createErrorResponse(feedback);
    } else {
      // 未超过最大尝试次数，继续处理
    }

    // ===== 步骤 4：验证必填参数 =====
    // 检查路径参数和 Body 参数是否完整
    const missingParams = validateRequiredParams(tool, args);

    // 条件注释：有缺失参数时记录尝试并返回错误
    if (missingParams.length > 0) {
      // 构建错误信息（列出缺失参数）
      const error = `缺少必填参数: ${missingParams.join(', ')}`;

      // 记录错误日志（包含缺失参数列表）
      logger.error('[工具调用] 参数缺失', { toolName: name, missingParams });

      // 记录尝试（用于尝试追踪）
      recordAttempt(name, error);

      // 记录指标（失败状态）
      recordMetric(name, 'error');

      // 条件注释：启用尝试追踪时返回带 metadata 的错误响应
      // metadata 告知 LLM 当前尝试状态和建议行动
      if (attemptConfig.enabled) {
        // 获取更新后的尝试记录
        const updatedRecord = getAttemptRecord(name);

        // 构建 metadata（包含尝试次数、剩余次数、错误历史、建议）
        const metadata = buildMetadata(updatedRecord.count, maxAttempts, updatedRecord.errors);

        // 返回带 metadata 的错误响应
        return createErrorResponseWithMetadata(error, metadata);
      } else {
        // 未启用尝试追踪，返回普通错误响应
        return createErrorResponse(error);
      }
    } else {
      // 参数完整，继续执行工具调用
    }

    // ===== 步骤 5：执行工具调用 =====
    // 调用 executor 执行 HTTP 请求并处理结果
    // 参数说明：
    // - name: 工具名称
    // - tool: 工具配置（method、path、headers 等）
    // - args: 请求参数（已验证完整）
    // - config: 全局配置（baseUrl、tokens 等）
    // - attemptConfig: 尝试追踪配置
    // - maxAttempts: 最大尝试次数
    return executeToolCall(name, tool, args ?? {}, config, attemptConfig, maxAttempts);
  });
}