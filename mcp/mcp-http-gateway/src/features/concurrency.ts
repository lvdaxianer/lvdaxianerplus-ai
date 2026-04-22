/**
 * 并发控制模块
 *
 * 实现并发请求限制策略，防止资源耗尽。
 *
 * 功能：
 * - 最大并发数限制：控制同时执行的请求数
 * - 等待队列：超出限制的请求进入队列等待
 * - 队列超时：等待超时的请求返回错误
 * - 状态监控：当前并发数、队列长度、等待时间
 *
 * 设计原则：
 * - 使用信号量模式控制并发
 * - 队列使用 FIFO 顺序处理
 * - 支持请求优先级（可选扩展）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { ConcurrencyConfig } from '../config/server-config-types.js';
import { logger } from '../middleware/logger.js';

// ============================================================================
// 队列项定义
// ============================================================================

/**
 * 等待队列项
 *
 * 表示一个等待执行的请求。
 *
 * @param resolve - Promise resolve 函数（并发槽位可用时调用）
 * @param reject - Promise reject 函数（超时或取消时调用）
 * @param toolName - 工具名称（用于日志和监控）
 * @param enqueueTime - 入队时间（用于计算等待时间）
 * @param timeoutId - 超时定时器 ID（用于清理）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
interface QueueItem {
  resolve: () => void;
  reject: (error: Error) => void;
  toolName: string;
  enqueueTime: number;
  timeoutId: NodeJS.Timeout;
}

// ============================================================================
// 并发控制管理器
// ============================================================================

/**
 * 并发控制管理器
 *
 * 管理并发请求限制和等待队列。
 *
 * @param config - 并发控制配置
 * @param activeCount - 当前活跃请求数
 * @param waitQueue - 等待队列（FIFO）
 * @param queueTimeoutCount - 队列超时次数（用于监控）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
class ConcurrencyManager {
  private config: ConcurrencyConfig = { enabled: false };
  private activeCount: number = 0;
  private waitQueue: QueueItem[] = [];
  private queueTimeoutCount: number = 0;

  /**
   * 初始化并发控制管理器
   *
   * @param config - 并发控制配置
   */
  init(config: ConcurrencyConfig): void {
    this.config = config;

    // 条件注释：配置启用时记录日志
    if (config.enabled) {
      const maxConcurrent = config.maxConcurrent ?? 50;
      const queueSize = config.queueSize ?? 100;
      const queueTimeout = config.queueTimeout ?? 30000;

      logger.info('[并发控制] 并发控制已初始化', {
        maxConcurrent,
        queueSize,
        queueTimeout,
      });
    } else {
      logger.info('[并发控制] 并发控制未启用');
    }
  }

  /**
   * 获取并发槽位
   *
   * 请求开始执行时调用，获取并发槽位。
   * - 活跃数 < 最大并发数：立即返回
   * - 队列已满：返回错误
   * - 队列未满：进入队列等待
   *
   * @param toolName - 工具名称
   * @returns Promise，resolve 表示获得槽位，reject 表示超时或队列已满
   *
   * @author lvdaxianerplus
   * @date 2026-04-22
   */
  async acquire(toolName: string): Promise<void> {
    // 条件注释：并发控制未启用时直接返回
    if (!this.config.enabled) {
      return;
    } else {
      const maxConcurrent = this.config.maxConcurrent ?? 50;
      const queueSize = this.config.queueSize ?? 100;
      const queueTimeout = this.config.queueTimeout ?? 30000;

      // 条件注释：当前活跃数小于最大并发数时直接获取槽位
      if (this.activeCount < maxConcurrent) {
        this.activeCount++;
        logger.debug('[并发控制] 获取槽位成功', {
          toolName,
          activeCount: this.activeCount,
          maxConcurrent,
        });
        return;
      } else {
        // 活跃数已达上限，需要进入队列等待
        // 条件注释：队列已满时返回错误
        if (this.waitQueue.length >= queueSize) {
          logger.warn('[并发控制] 队列已满', {
            toolName,
            queueSize,
            queueLength: this.waitQueue.length,
          });

          throw new Error('并发队列已满，请稍后重试');
        } else {
          // 队列未满，进入队列等待
          const enqueueTime = Date.now();

          // 创建 Promise 用于等待槽位
          return new Promise<void>((resolve, reject) => {
            // 设置超时定时器
            const timeoutId = setTimeout(() => {
              // 超时处理：从队列移除并拒绝 Promise
              const index = this.waitQueue.findIndex(item => item.timeoutId === timeoutId);

              // 条件注释：队列中仍存在该项时移除并拒绝
              if (index !== -1) {
                this.waitQueue.splice(index, 1);
                this.queueTimeoutCount++;
                logger.warn('[并发控制] 队列等待超时', {
                  toolName,
                  waitTime: Date.now() - enqueueTime,
                  queueTimeoutCount: this.queueTimeoutCount,
                });
                reject(new Error('并发队列等待超时'));
              } else {
                // 队列中已不存在该项（已被处理），忽略超时
              }
            }, queueTimeout);

            // 将请求加入队列
            this.waitQueue.push({
              resolve,
              reject,
              toolName,
              enqueueTime,
              timeoutId,
            });

            logger.debug('[并发控制] 进入等待队列', {
              toolName,
              queueLength: this.waitQueue.length,
              queueSize,
            });
          });
        }
      }
    }
  }

  /**
   * 释放并发槽位
   *
   * 请求完成时调用，释放并发槽位。
   * 释放后检查队列，唤醒下一个等待的请求。
   *
   * @author lvdaxianerplus
   * @date 2026-04-22
   */
  release(): void {
    // 条件注释：并发控制未启用时直接返回
    if (!this.config.enabled) {
      return;
    } else {
      // 减少活跃数
      this.activeCount--;

      logger.debug('[并发控制] 释放槽位', {
        activeCount: this.activeCount,
        queueLength: this.waitQueue.length,
      });

      // 条件注释：队列中有等待项时唤醒下一个
      if (this.waitQueue.length > 0) {
        // 取出队列首项（FIFO）
        const nextItem = this.waitQueue.shift();

        // 条件注释：队列项存在时处理
        if (nextItem) {
          // 清除超时定时器
          clearTimeout(nextItem.timeoutId);

          // 增加活跃数（新请求获取槽位）
          this.activeCount++;

          // 计算等待时间
          const waitTime = Date.now() - nextItem.enqueueTime;

          logger.debug('[并发控制] 唤醒队列请求', {
            toolName: nextItem.toolName,
            waitTime,
            activeCount: this.activeCount,
          });

          // 唤醒等待的请求
          nextItem.resolve();
        } else {
          // 队列项不存在（不应发生）
        }
      } else {
        // 队列为空，无需唤醒
      }
    }
  }

  /**
   * 获取当前状态
   *
   * @returns 并发控制状态信息
   *
   * @author lvdaxianerplus
   * @date 2026-04-22
   */
  getStatus(): {
    enabled: boolean;
    activeCount: number;
    maxConcurrent: number;
    queueLength: number;
    queueSize: number;
    queueTimeout: number;
    queueTimeoutCount: number;
  } {
    return {
      enabled: this.config.enabled,
      activeCount: this.activeCount,
      maxConcurrent: this.config.maxConcurrent ?? 50,
      queueLength: this.waitQueue.length,
      queueSize: this.config.queueSize ?? 100,
      queueTimeout: this.config.queueTimeout ?? 30000,
      queueTimeoutCount: this.queueTimeoutCount,
    };
  }

  /**
   * 重置超时计数
   *
   * @author lvdaxianerplus
   * @date 2026-04-22
   */
  resetTimeoutCount(): void {
    this.queueTimeoutCount = 0;
  }
}

// ============================================================================
// 单例导出
// ============================================================================

/**
 * 全局并发控制管理器实例
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export const concurrencyManager = new ConcurrencyManager();

// ============================================================================
// 公共接口函数
// ============================================================================

/**
 * 初始化并发控制管理器
 *
 * @param config - 并发控制配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function initConcurrency(config: ConcurrencyConfig): void {
  concurrencyManager.init(config);
}

/**
 * 获取并发槽位
 *
 * @param toolName - 工具名称
 * @returns Promise，成功表示获得槽位，失败表示超时或队列已满
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export async function acquireConcurrency(toolName: string): Promise<void> {
  return concurrencyManager.acquire(toolName);
}

/**
 * 释放并发槽位
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function releaseConcurrency(): void {
  concurrencyManager.release();
}

/**
 * 获取并发控制状态
 *
 * @returns 并发控制状态信息
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getConcurrencyStatus(): ReturnType<ConcurrencyManager['getStatus']> {
  return concurrencyManager.getStatus();
}