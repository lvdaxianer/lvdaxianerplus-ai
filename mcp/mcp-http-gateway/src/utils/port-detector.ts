/**
 * 端口检测工具
 *
 * Features:
 * - 检测端口是否被占用
 * - 自动杀死同类进程（node 进程）
 * - 自动查找下一个可用端口
 *
 * @author lvdaxianerplus
 * @date 2026-04-23
 */

import { execSync } from 'child_process';
import { logger } from '../middleware/logger.js';

/**
 * 检测端口是否被占用
 *
 * @param port - 端口号
 * @returns 占用进程信息，如果未被占用返回 null
 *
 * @author lvdaxianerplus
 * @date 2026-04-23
 */
export function checkPortInUse(port: number): { pid: number; command: string } | null {
  try {
    // 使用 lsof 检测端口占用（macOS/Linux）
    // -i :port 指定端口，-t 只输出 PID
    const result = execSync(`lsof -i :${port} -t`, { encoding: 'utf-8', timeout: 5000 }).trim();
    if (result) {
      // 多个进程可能占用同一端口，取第一个
      const pids = result.split('\n').filter((p) => p.trim());
      if (pids.length > 0) {
        const pid = parseInt(pids[0].trim(), 10);
        // 获取进程命令
        try {
          const command = execSync(`ps -p ${pid} -o command=`, { encoding: 'utf-8', timeout: 5000 }).trim();
          return { pid, command };
        } catch {
          return { pid, command: 'unknown' };
        }
      }
    }
  } catch {
    // lsof 命令失败，端口未被占用
    return null;
  }
  return null;
}

/**
 * 判断是否是同类进程（node 进程）
 *
 * @param command - 进程命令
 * @returns 是否是同类进程
 *
 * @author lvdaxianerplus
 * @date 2026-04-23
 */
export function isSameTypeProcess(command: string): boolean {
  // 条件注释：检测是否是 node 相关进程
  if (command.includes('node') || command.includes('mcp-http-gateway')) {
    return true;
  } else {
    return false;
  }
}

/**
 * 杀死进程
 *
 * @param pid - 进程 PID
 * @returns 是否成功杀死
 *
 * @author lvdaxianerplus
 * @date 2026-04-23
 */
export function killProcess(pid: number): boolean {
  try {
    // 条件注释：使用 SIGTERM 先优雅关闭，失败后使用 SIGKILL 强制杀死
    try {
      process.kill(pid, 'SIGTERM');
      // 等待进程退出（最多等待 2 秒）
      let attempts = 0;
      while (attempts < 20) {
        try {
          process.kill(pid, 0); // 检查进程是否还存在
          attempts++;
          // 使用同步延迟
          execSync('sleep 0.1', { timeout: 200 });
        } catch {
          // 进程已退出
          logger.info('[端口检测] 进程已退出', { pid, signal: 'SIGTERM' });
          return true;
        }
      }
    } catch {
      // SIGTERM 失败，进程可能不存在
    }

    // 条件注释：SIGTERM 失败后使用 SIGKILL 强制杀死
    try {
      process.kill(pid, 'SIGKILL');
      logger.info('[端口检测] 进程已强制杀死', { pid, signal: 'SIGKILL' });
      return true;
    } catch {
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[端口检测] 杀死进程失败', { pid, error: errorMessage });
    return false;
  }
}

/**
 * 查找下一个可用端口
 *
 * @param startPort - 起始端口
 * @param maxAttempts - 最大尝试次数
 * @param maxPort - 最大端口范围
 * @returns 可用端口，如果找不到返回 null
 *
 * @author lvdaxianerplus
 * @date 2026-04-23
 */
export function findAvailablePort(startPort: number, maxAttempts: number = 10, maxPort: number = 65535): number | null {
  // 条件注释：从起始端口开始，逐个检测直到找到可用端口
  for (let port = startPort; port <= Math.min(startPort + maxAttempts - 1, maxPort); port++) {
    const inUse = checkPortInUse(port);
    if (!inUse) {
      if (port !== startPort) {
        logger.info('[端口检测] 找到可用端口', { port, originalPort: startPort });
      }
      return port;
    }
  }
  logger.warn('[端口检测] 未找到可用端口', { startPort, maxAttempts });
  return null;
}

/**
 * 处理端口冲突
 *
 * @param port - 目标端口
 * @param autoKillSameType - 是否自动杀死同类进程
 * @param autoFindNext - 是否自动查找下一个可用端口
 * @returns 处理后的端口，如果无法处理返回 null
 *
 * @author lvdaxianerplus
 * @date 2026-04-23
 */
export function handlePortConflict(
  port: number,
  autoKillSameType: boolean = true,
  autoFindNext: boolean = true
): number | null {
  // 条件注释：检测端口是否被占用
  const inUse = checkPortInUse(port);
  if (!inUse) {
    // 端口未被占用，直接使用
    return port;
  }

  logger.warn('[端口检测] 端口被占用', { port, pid: inUse.pid, command: inUse.command });

  // 条件注释：检查是否是当前进程自己占用端口
  // 如果是当前进程，不应该杀死自己
  if (inUse.pid === process.pid) {
    logger.info('[端口检测] 端口被当前进程占用，直接使用', { port, pid: inUse.pid });
    return port;
  }

  // 条件注释：如果是同类进程且允许自动杀死，则杀死旧进程
  if (autoKillSameType && isSameTypeProcess(inUse.command)) {
    logger.info('[端口检测] 检测到同类进程，尝试杀死旧进程', { pid: inUse.pid });
    if (killProcess(inUse.pid)) {
      // 等待端口释放
      let attempts = 0;
      while (attempts < 10) {
        const stillInUse = checkPortInUse(port);
        if (!stillInUse) {
          logger.info('[端口检测] 端口已释放', { port });
          return port;
        }
        attempts++;
        execSync('sleep 0.1', { timeout: 200 });
      }
    }
  }

  // 条件注释：如果允许自动查找下一个端口，则尝试其他端口
  if (autoFindNext) {
    const availablePort = findAvailablePort(port + 1);
    if (availablePort) {
      logger.info('[端口检测] 使用备用端口', { originalPort: port, newPort: availablePort });
      return availablePort;
    }
  }

  // 无法处理端口冲突
  logger.error('[端口检测] 无法处理端口冲突', { port, inUse });
  return null;
}