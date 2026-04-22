/**
 * 请求限流模块
 *
 * 实现请求限流策略，防止后端服务被压垮。
 *
 * 功能：
 * - 令牌桶算法（Token Bucket）：允许突发流量，适合处理请求波动
 * - 滑动窗口算法（Sliding Window）：精确控制速率，适合严格限流场景
 * - 全局限流：所有请求共用一个限流器
 * - 工具级限流：单个工具独立限流（优先级高于全局）
 *
 * 算法对比：
 * | 算法 | 特点 | 适用场景 |
 * |------|------|----------|
 * | 令牌桶 | 允许突发，平滑处理 | 请求波动大、API 容错高 |
 * | 滑动窗口 | 精确限流，无突发 | 严格限流、防止超载 |
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { RateLimitConfig, ToolRateLimitConfig } from '../config/server-config-types.js';
import { logger } from '../middleware/logger.js';

// ============================================================================
// 限流器接口定义
// ============================================================================

/**
 * 限流器接口
 *
 * 定义限流器的统一接口。
 *
 * @param check - 检查是否允许请求（返回 true 表示允许，false 表示拒绝）
 * @param getStatus - 获取当前状态（剩余令牌/可用请求数）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
interface RateLimiter {
  check(): boolean;
  getStatus(): { remaining: number; limit: number; window: number };
}

// ============================================================================
// 令牌桶限流器
// ============================================================================

/**
 * 令牌桶限流器
 *
 * 算法原理：
 * 1. 桶中存放令牌，每个请求消耗一个令牌
 * 2. 令牌以固定速率补充（ refillRate = limit / window）
 * 3. 桶满时令牌不再增加（允许突发流量到桶容量）
 * 4. 桶空时请求被拒绝
 *
 * 特点：
 * - 允许突发流量（桶内令牌可一次性消耗）
 * - 平滑处理请求波动
 * - 适合 API 容错较高的场景
 *
 * @param tokens - 当前令牌数量
 * @param maxTokens - 最大令牌数量（桶容量）
 * @param refillRate - 令牌补充速率（令牌/毫秒）
 * @param lastRefillTime - 上次补充时间
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
class TokenBucketLimiter implements RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefillTime: number;

  /**
   * 构造函数
   *
   * @param limit - 时间窗口内最大请求数
   * @param window - 时间窗口（毫秒）
   */
  constructor(limit: number, window: number) {
    // 初始化桶容量为最大请求数
    this.maxTokens = limit;
    // 初始令牌数为满桶
    this.tokens = limit;
    // 计算补充速率：每毫秒补充的令牌数
    this.refillRate = limit / window;
    // 记录当前时间作为上次补充时间
    this.lastRefillTime = Date.now();
  }

  /**
   * 补充令牌
   *
   * 根据时间差计算并补充令牌，不超过最大容量。
   */
  private refill(): void {
    // 计算时间差（毫秒）
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    // 条件注释：时间差大于 0 时补充令牌
    if (elapsed > 0) {
      // 计算应补充的令牌数 = 时间差 × 补充速率
      const tokensToAdd = elapsed * this.refillRate;

      // 更新令牌数（不超过最大容量）
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);

      // 更新上次补充时间
      this.lastRefillTime = now;
    } else {
      // 时间差为 0，无需补充
    }
  }

  /**
   * 检查是否允许请求
   *
   * @returns true 表示允许请求，false 表示拒绝请求
   */
  check(): boolean {
    // 先补充令牌
    this.refill();

    // 条件注释：有令牌时允许请求并消耗一个令牌
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    } else {
      // 令牌不足，拒绝请求
      return false;
    }
  }

  /**
   * 获取当前状态
   *
   * @returns 剩余令牌数、最大令牌数、时间窗口
   */
  getStatus(): { remaining: number; limit: number; window: number } {
    this.refill();
    return {
      remaining: Math.floor(this.tokens),
      limit: this.maxTokens,
      window: Math.round(this.maxTokens / this.refillRate),
    };
  }
}

// ============================================================================
// 滑动窗口限流器
// ============================================================================

/**
 * 滑动窗口限流器
 *
 * 算法原理：
 * 1. 记录每个请求的时间戳
 * 2. 检查时计算当前窗口内的请求数
 * 3. 请求数超过限制时拒绝
 *
 * 特点：
 * - 精确限流，严格控制请求数
 * - 无突发流量
 * - 适合严格限流场景
 *
 * @param requestTimes - 请求时间戳列表
 * @param limit - 时间窗口内最大请求数
 * @param window - 时间窗口（毫秒）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
class SlidingWindowLimiter implements RateLimiter {
  private requestTimes: number[] = [];
  private limit: number;
  private window: number;

  /**
   * 构造函数
   *
   * @param limit - 时间窗口内最大请求数
   * @param window - 时间窗口（毫秒）
   */
  constructor(limit: number, window: number) {
    this.limit = limit;
    this.window = window;
  }

  /**
   * 清理过期请求记录
   *
   * 移除窗口外的请求时间戳。
   */
  private cleanup(): void {
    // 计算窗口起始时间
    const now = Date.now();
    const windowStart = now - this.window;

    // 移除窗口外的请求时间戳
    this.requestTimes = this.requestTimes.filter(time => time >= windowStart);
  }

  /**
   * 检查是否允许请求
   *
   * @returns true 表示允许请求，false 表示拒绝请求
   */
  check(): boolean {
    // 先清理过期记录
    this.cleanup();

    // 条件注释：当前请求数小于限制时允许请求
    if (this.requestTimes.length < this.limit) {
      // 记录本次请求时间戳
      this.requestTimes.push(Date.now());
      return true;
    } else {
      // 请求数已达限制，拒绝请求
      return false;
    }
  }

  /**
   * 获取当前状态
   *
   * @returns 剩余可用请求数、最大请求数、时间窗口
   */
  getStatus(): { remaining: number; limit: number; window: number } {
    this.cleanup();
    return {
      remaining: this.limit - this.requestTimes.length,
      limit: this.limit,
      window: this.window,
    };
  }
}

// ============================================================================
// 限流管理器
// ============================================================================

/**
 * 限流管理器
 *
 * 管理全局限流器和工具级限流器。
 *
 * 优先级：
 * 1. 工具级限流器（优先级最高）
 * 2. 全局限流器（优先级次高）
 *
 * @param config - 限流配置
 * @param globalLimiter - 全局限流器实例
 * @param toolLimiters - 工具级限流器映射
 * @param rejectionCount - 拒绝请求计数（用于监控）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
class RateLimitManager {
  private config: RateLimitConfig = { enabled: false };
  private globalLimiter: RateLimiter | null = null;
  private toolLimiters: Map<string, RateLimiter> = new Map();
  private rejectionCount: number = 0;

  /**
   * 初始化限流管理器
   *
   * @param config - 限流配置
   */
  init(config: RateLimitConfig): void {
    this.config = config;

    // 条件注释：配置启用时创建限流器
    if (config.enabled) {
      const type = config.type ?? 'tokenBucket';
      const globalLimit = config.globalLimit ?? 100;
      const window = 1000; // 默认 1 秒窗口

      // 创建全局限流器
      this.globalLimiter = this.createLimiter(type, globalLimit, window);

      // 创建工具级限流器
      if (config.toolLimits) {
        for (const [toolName, toolConfig] of Object.entries(config.toolLimits)) {
          const toolLimit = toolConfig.limit;
          const toolWindow = toolConfig.window ?? 1000;
          this.toolLimiters.set(toolName, this.createLimiter(type, toolLimit, toolWindow));
        }
      }

      logger.info('[限流] 限流器已初始化', {
        type,
        globalLimit,
        toolCount: this.toolLimiters.size,
      });
    } else {
      // 配置未启用，不创建限流器
      logger.info('[限流] 限流未启用');
    }
  }

  /**
   * 创建限流器实例
   *
   * @param type - 限流算法类型
   * @param limit - 最大请求数
   * @param window - 时间窗口
   * @returns 限流器实例
   */
  private createLimiter(type: 'tokenBucket' | 'slidingWindow', limit: number, window: number): RateLimiter {
    // 条件注释：根据类型创建对应限流器
    if (type === 'tokenBucket') {
      return new TokenBucketLimiter(limit, window);
    } else {
      return new SlidingWindowLimiter(limit, window);
    }
  }

  /**
   * 检查请求是否允许
   *
   * 优先级：工具级 > 全局
   *
   * @param toolName - 工具名称
   * @returns true 表示允许，false 表示拒绝
   */
  check(toolName: string): boolean {
    // 条件注释：限流未启用时直接允许
    if (!this.config.enabled) {
      return true;
    } else {
      // 优先检查工具级限流器
      const toolLimiter = this.toolLimiters.get(toolName);

      // 条件注释：工具级限流器存在时使用工具级限流
      if (toolLimiter) {
        const allowed = toolLimiter.check();

        // 条件注释：请求被拒绝时记录日志
        if (!allowed) {
          this.rejectionCount++;
          logger.warn('[限流] 工具级限流拒绝', { toolName, rejectionCount: this.rejectionCount });
        }

        return allowed;
      } else {
        // 工具级限流器不存在，使用全局限流器
        if (this.globalLimiter) {
          const allowed = this.globalLimiter.check();

          // 条件注释：请求被拒绝时记录日志
          if (!allowed) {
            this.rejectionCount++;
            logger.warn('[限流] 全局限流拒绝', { toolName, rejectionCount: this.rejectionCount });
          }

          return allowed;
        } else {
          // 全局限流器不存在，允许请求
          return true;
        }
      }
    }
  }

  /**
   * 获取限流状态
   *
   * @param toolName - 工具名称（可选）
   * @returns 限流状态信息
   */
  getStatus(toolName?: string): {
    enabled: boolean;
    type: string;
    global: { remaining: number; limit: number; window: number } | null;
    tool: { remaining: number; limit: number; window: number } | null;
    rejectionCount: number;
  } {
    const result = {
      enabled: this.config.enabled,
      type: this.config.type ?? 'tokenBucket',
      global: this.globalLimiter?.getStatus() ?? null,
      tool: toolName ? this.toolLimiters.get(toolName)?.getStatus() ?? null : null,
      rejectionCount: this.rejectionCount,
    };

    return result;
  }

  /**
   * 获取所有工具级限流状态
   *
   * @returns 工具级限流状态映射
   */
  getAllToolStatus(): Record<string, { remaining: number; limit: number; window: number }> {
    const result: Record<string, { remaining: number; limit: number; window: number }> = {};

    for (const [toolName, limiter] of this.toolLimiters.entries()) {
      result[toolName] = limiter.getStatus();
    }

    return result;
  }

  /**
   * 重置拒绝计数
   */
  resetRejectionCount(): void {
    this.rejectionCount = 0;
  }
}

// ============================================================================
// 单例导出
// ============================================================================

/**
 * 全局限流管理器实例
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export const rateLimitManager = new RateLimitManager();

// ============================================================================
// 公共接口函数
// ============================================================================

/**
 * 初始化限流管理器
 *
 * @param config - 限流配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function initRateLimit(config: RateLimitConfig): void {
  rateLimitManager.init(config);
}

/**
 * 检查请求是否允许
 *
 * @param toolName - 工具名称
 * @returns true 表示允许，false 表示拒绝
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function checkRateLimit(toolName: string): boolean {
  return rateLimitManager.check(toolName);
}

/**
 * 获取限流状态
 *
 * @param toolName - 工具名称（可选）
 * @returns 限流状态信息
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getRateLimitStatus(toolName?: string): ReturnType<RateLimitManager['getStatus']> {
  return rateLimitManager.getStatus(toolName);
}

/**
 * 获取所有工具级限流状态
 *
 * @returns 工具级限流状态映射
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getAllToolRateLimitStatus(): ReturnType<RateLimitManager['getAllToolStatus']> {
  return rateLimitManager.getAllToolStatus();
}