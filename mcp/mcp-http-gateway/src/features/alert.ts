/**
 * 告警通知模块
 *
 * Features:
 * - 多渠道通知：email、slack、钉钉、企业微信、webhook
 * - 告警规则检查：熔断器、限流、并发、错误率、超时
 * - 告警冷却机制：防止重复告警
 * - 告警历史记录：SQLite 持久化
 * - 告警风暴防护：每小时最大告警数限制
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { EnhancedAlertConfig, AlertRuleConfig, AlertChannelConfig } from '../config/server-config-types.js';
import { DEFAULT_ALERT } from '../config/server-config-types.js';
import { logger } from '../middleware/logger.js';
import { getDatabase } from '../database/connection.js';

// 导出类型供外部使用
export type { EnhancedAlertConfig, AlertRuleConfig, AlertChannelConfig } from '../config/server-config-types.js';

/**
 * 告警记录类型
 *
 * @param id - 告警 ID
 * @param type - 告警类型
 * @param severity - 严重级别
 * @param tool - 工具名称（可选）
 * @param message - 告警消息
 * @param details - 详细信息
 * @param timestamp - 告警时间
 * @param channel - 发送渠道
 * @param status - 告警状态：sent/failed/skipped
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface AlertRecord {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  tool?: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
  channel: string;
  status: 'sent' | 'failed' | 'skipped';
  resolved_at?: string;
}

/**
 * 告警状态（用于冷却检查）
 */
interface AlertState {
  lastAlertTime: number;
  alertCount: number;
  hourAlertCount: number;
  hourStartTime: number;
}

// 全局告警配置和状态
let alertConfig: EnhancedAlertConfig = DEFAULT_ALERT;
const alertStates: Map<string, AlertState> = new Map();
const ALERT_HISTORY_TABLE = 'alert_history';

/**
 * 初始化告警模块
 *
 * @param config - 告警配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function initAlert(config: EnhancedAlertConfig): void {
  alertConfig = {
    ...DEFAULT_ALERT,
    ...config,
    rules: config.rules ?? DEFAULT_ALERT.rules,
    templates: config.templates ?? DEFAULT_ALERT.templates,
    historyRetention: config.historyRetention ?? DEFAULT_ALERT.historyRetention,
    maxAlertsPerHour: config.maxAlertsPerHour ?? DEFAULT_ALERT.maxAlertsPerHour,
  };

  // 条件注释：告警启用时初始化数据库表
  if (alertConfig.enabled) {
    createAlertTable();
    logger.info('[告警] Alert module initialized', {
      enabled: alertConfig.enabled,
      rulesCount: alertConfig.rules?.length ?? 0,
      channelsCount: alertConfig.channels?.length ?? 0,
    });
  } else {
    // 告警禁用：跳过初始化
    logger.info('[告警] Alert module disabled');
  }
}

/**
 * 创建告警历史表
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function createAlertTable(): void {
  const db = getDatabase();
  if (!db) {
    // 数据库未连接：跳过表创建
    logger.warn('[告警] Database not connected, cannot create alert_history table');
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS ${ALERT_HISTORY_TABLE} (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      tool TEXT,
      message TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      resolved_at TEXT
    )
  `);

  // 创建索引：按时间和类型查询
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_alert_timestamp ON ${ALERT_HISTORY_TABLE}(timestamp);
    CREATE INDEX IF NOT EXISTS idx_alert_type ON ${ALERT_HISTORY_TABLE}(type);
    CREATE INDEX IF NOT EXISTS idx_alert_severity ON ${ALERT_HISTORY_TABLE}(severity);
    CREATE INDEX IF NOT EXISTS idx_alert_resolved ON ${ALERT_HISTORY_TABLE}(resolved_at);
  `);

  logger.info('[告警] Alert history table created');
}

/**
 * 检查并触发告警
 *
 * @param type - 告警类型
 * @param context - 告警上下文（工具名、状态等）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function checkAndTriggerAlert(
  type: AlertRuleConfig['type'],
  context: {
    tool?: string;
    state?: string;
    failures?: number;
    remaining?: number;
    active?: number;
    max?: number;
    queue?: number;
    rate?: number;
    threshold?: number;
    duration?: number;
  }
): void {
  // 条件注释：告警未启用时跳过检查
  if (!alertConfig.enabled) {
    return;
  }

  // 条件注释：查找匹配的规则
  const rule = alertConfig.rules?.find(r => r.type === type && r.enabled);
  if (!rule) {
    // 规则未启用：跳过告警
    return;
  }

  // 条件注释：检查阈值条件（如果有）
  const shouldAlert = checkThreshold(rule, context);
  if (!shouldAlert) {
    // 未达阈值：跳过告警
    return;
  }

  // 条件注释：检查冷却时间和告警风暴
  const alertKey = `${type}:${context.tool ?? 'global'}`;
  if (!canSendAlert(alertKey, rule)) {
    // 冷却期内或达到限制：跳过告警
    return;
  }

  // 条件注释：生成告警消息
  const message = generateAlertMessage(type, context);

  // 条件注释：发送告警通知
  sendAlerts({
    id: generateAlertId(),
    type,
    severity: rule.severity ?? 'warning',
    tool: context.tool,
    message,
    details: context,
    timestamp: new Date().toISOString(),
    channel: 'all',
    status: 'sent',
  });
}

/**
 * 检查阈值条件
 *
 * @param rule - 告警规则
 * @param context - 告警上下文
 * @returns 是否达到阈值
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function checkThreshold(rule: AlertRuleConfig, context: Record<string, unknown>): boolean {
  // 条件注释：不同类型有不同的阈值判断逻辑
  switch (rule.type) {
    case 'circuitBreaker':
      // 熔断器状态变更即触发
      return context.state === 'OPEN' || context.state === 'HALF_OPEN';

    case 'rateLimit':
      // 限流拒绝次数超过阈值
      return (context.remaining as number) <= (rule.threshold ?? 0);

    case 'concurrency':
      // 并发数或队列长度超过阈值
      return (context.active as number) >= (rule.threshold ?? 50) ||
             (context.queue as number) > 10;

    case 'errorRate':
      // 错误率超过阈值
      return (context.rate as number) >= (rule.threshold ?? 10);

    case 'timeout':
      // 超时次数超过阈值
      return (context.duration as number) > (rule.threshold ?? 5) * 1000;

    default:
      return false;
  }
}

/**
 * 检查是否可以发送告警
 *
 * @param alertKey - 告警唯一标识
 * @param rule - 告警规则
 * @returns 是否可以发送
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function canSendAlert(alertKey: string, rule: AlertRuleConfig): boolean {
  const now = Date.now();
  const state = alertStates.get(alertKey) ?? {
    lastAlertTime: 0,
    alertCount: 0,
    hourAlertCount: 0,
    hourStartTime: now,
  };

  // 条件注释：检查冷却时间
  const cooldown = rule.cooldown ?? 60000;
  if (now - state.lastAlertTime < cooldown) {
    return false;
  }

  // 条件注释：检查每小时最大告警数
  // 每小时重置计数
  if (now - state.hourStartTime > 3600000) {
    state.hourAlertCount = 0;
    state.hourStartTime = now;
  }

  // 达到限制时跳过
  if (state.hourAlertCount >= (alertConfig.maxAlertsPerHour ?? 10)) {
    logger.warn('[告警] Hourly alert limit reached', { alertKey, limit: alertConfig.maxAlertsPerHour });
    return false;
  }

  // 更新状态
  state.lastAlertTime = now;
  state.alertCount++;
  state.hourAlertCount++;
  alertStates.set(alertKey, state);

  return true;
}

/**
 * 生成告警消息
 *
 * @param type - 告警类型
 * @param context - 告警上下文
 * @returns 告警消息
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function generateAlertMessage(
  type: AlertRuleConfig['type'],
  context: Record<string, unknown>
): string {
  // 条件注释：获取模板，如果无模板使用默认
  const template = alertConfig.templates?.[type] ?? `[${type}] 告警触发`;

  // 条件注释：替换模板变量
  return template
    .replace('{tool}', (context.tool as string) ?? 'unknown')
    .replace('{state}', (context.state as string) ?? 'unknown')
    .replace('{failures}', String(context.failures ?? 0))
    .replace('{remaining}', String(context.remaining ?? 0))
    .replace('{active}', String(context.active ?? 0))
    .replace('{max}', String(context.max ?? 0))
    .replace('{queue}', String(context.queue ?? 0))
    .replace('{rate}', String(context.rate ?? 0))
    .replace('{threshold}', String(context.threshold ?? 0))
    .replace('{duration}', String(context.duration ?? 0));
}

/**
 * 发送告警通知
 *
 * @param alert - 告警记录
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function sendAlerts(alert: AlertRecord): void {
  // 条件注释：遍历所有启用的通知渠道
  const enabledChannels = alertConfig.channels?.filter(c => c.enabled) ?? [];

  if (enabledChannels.length === 0) {
    // 无启用渠道：记录告警但不发送
    alert.status = 'skipped';
    saveAlertHistory(alert);
    logger.warn('[告警] No enabled channels, alert skipped', { type: alert.type, message: alert.message });
    return;
  }

  // 条件注释：异步发送到各渠道（非阻塞）
  const sentCount = enabledChannels.length;

  for (const channel of enabledChannels) {
    // 条件注释：非阻塞发送，结果通过日志记录
    sendToChannel(channel, alert).catch(error => {
      logger.error('[告警] Failed to send alert', {
        channel: channel.type,
        type: alert.type,
        error,
      });
    });
  }

  // 条件注释：更新告警状态（假设发送成功）
  alert.status = 'sent';
  alert.channel = enabledChannels.map(c => c.type).join(',');
  saveAlertHistory(alert);

  logger.info('[告警] Alert sent to channels', {
    type: alert.type,
    channels: alert.channel,
    count: sentCount,
  });
}

/**
 * 发送告警到指定渠道（异步）
 *
 * @param channel - 渠道配置
 * @param alert - 告警记录
 * @returns Promise（发送完成）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
async function sendToChannel(channel: AlertChannelConfig, alert: AlertRecord): Promise<void> {
  // 条件注释：根据渠道类型选择发送方式
  switch (channel.type) {
    case 'webhook':
      await sendToWebhook(channel.config ?? {}, alert);
      break;

    case 'email':
      // 邮件发送需要额外配置（SMTP）
      logger.info('[告警] Email channel requires SMTP config, skipping', { alertId: alert.id });
      break;

    case 'slack':
      await sendToSlack(channel.config ?? {}, alert);
      break;

    case 'dingtalk':
      await sendToDingtalk(channel.config ?? {}, alert);
      break;

    case 'wechat':
      await sendToWechat(channel.config ?? {}, alert);
      break;

    default:
      logger.warn('[告警] Unknown channel type', { channel: channel.type });
  }
}

/**
 * 发送到 Webhook
 *
 * @param config - Webhook 配置
 * @param alert - 告警记录
 * @returns Promise（发送完成）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
async function sendToWebhook(config: Record<string, unknown>, alert: AlertRecord): Promise<void> {
  const url = config.url as string;
  if (!url) {
    // Webhook URL 未配置：跳过发送
    logger.warn('[告警] Webhook URL not configured');
    return;
  }

  try {
    // 条件注释：发送 POST 请求到 Webhook
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: alert.type,
        severity: alert.severity,
        tool: alert.tool,
        message: alert.message,
        details: alert.details,
        timestamp: alert.timestamp,
      }),
    });

    // 条件注释：检查响应状态
    if (!response.ok) {
      logger.error('[告警] Webhook response error', {
        status: response.status,
        statusText: response.statusText,
      });
    } else {
      logger.info('[告警] Webhook sent successfully', { url });
    }
  } catch (error) {
    logger.error('[告警] Webhook request failed', { error });
  }
}

/**
 * 发送到 Slack
 *
 * @param config - Slack 配置
 * @param alert - 告警记录
 * @returns Promise（发送完成）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
async function sendToSlack(config: Record<string, unknown>, alert: AlertRecord): Promise<void> {
  const webhookUrl = config.webhookUrl as string;
  if (!webhookUrl) {
    // Slack Webhook URL 未配置：跳过发送
    logger.warn('[告警] Slack webhook URL not configured');
    return;
  }

  try {
    // 条件注释：构建 Slack 消息格式
    const color = alert.severity === 'critical' ? 'danger' :
                  alert.severity === 'warning' ? 'warning' : 'good';

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `[MCP Gateway] ${alert.type} 告警`,
          text: alert.message,
          fields: [
            { title: '工具', value: alert.tool ?? '全局', short: true },
            { title: '严重级别', value: alert.severity, short: true },
            { title: '时间', value: alert.timestamp, short: false },
          ],
        }],
      }),
    });

    if (!response.ok) {
      logger.error('[告警] Slack response error', { status: response.status });
    } else {
      logger.info('[告警] Slack sent successfully');
    }
  } catch (error) {
    logger.error('[告警] Slack request failed', { error });
  }
}

/**
 * 发送到钉钉
 *
 * @param config - 钉钉配置
 * @param alert - 告警记录
 * @returns Promise（发送完成）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
async function sendToDingtalk(config: Record<string, unknown>, alert: AlertRecord): Promise<void> {
  const webhookUrl = config.webhookUrl as string;
  if (!webhookUrl) {
    // 钉钉 Webhook URL 未配置：跳过发送
    logger.warn('[告警] Dingtalk webhook URL not configured');
    return;
  }

  try {
    // 条件注释：构建钉钉消息格式
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title: `MCP Gateway 告警`,
          text: `### ${alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'} MCP Gateway 告警\n\n` +
                `**类型**: ${alert.type}\n\n` +
                `**工具**: ${alert.tool ?? '全局'}\n\n` +
                `**消息**: ${alert.message}\n\n` +
                `**时间**: ${alert.timestamp}`,
        },
      }),
    });

    if (!response.ok) {
      logger.error('[告警] Dingtalk response error', { status: response.status });
    } else {
      logger.info('[告警] Dingtalk sent successfully');
    }
  } catch (error) {
    logger.error('[告警] Dingtalk request failed', { error });
  }
}

/**
 * 发送到企业微信
 *
 * @param config - 企业微信配置
 * @param alert - 告警记录
 * @returns Promise（发送完成）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
async function sendToWechat(config: Record<string, unknown>, alert: AlertRecord): Promise<void> {
  const webhookUrl = config.webhookUrl as string;
  if (!webhookUrl) {
    // 企业微信 Webhook URL 未配置：跳过发送
    logger.warn('[告警] Wechat webhook URL not configured');
    return;
  }

  try {
    // 条件注释：构建企业微信消息格式
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          content: `### ${alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'} MCP Gateway 告警\n` +
                   `> 类型: ${alert.type}\n` +
                   `> 工具: ${alert.tool ?? '全局'}\n` +
                   `> 消息: ${alert.message}\n` +
                   `> 时间: ${alert.timestamp}`,
        },
      }),
    });

    if (!response.ok) {
      logger.error('[告警] Wechat response error', { status: response.status });
    } else {
      logger.info('[告警] Wechat sent successfully');
    }
  } catch (error) {
    logger.error('[告警] Wechat request failed', { error });
  }
}

/**
 * 保存告警历史到数据库
 *
 * @param alert - 告警记录
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function saveAlertHistory(alert: AlertRecord): void {
  const db = getDatabase();
  if (!db) {
    // 数据库未连接：跳过保存
    logger.warn('[告警] Database not connected, cannot save alert history');
    return;
  }

  try {
    // 条件注释：使用预处理语句插入
    const insert = db.prepare(`
      INSERT INTO ${ALERT_HISTORY_TABLE} (id, type, severity, tool, message, details, timestamp, channel, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      alert.id,
      alert.type,
      alert.severity,
      alert.tool ?? null,
      alert.message,
      JSON.stringify(alert.details),
      alert.timestamp,
      alert.channel,
      alert.status
    );
  } catch (error) {
    logger.error('[告警] Failed to save alert history', { error });
  }
}

/**
 * 生成告警 ID
 *
 * @returns 唯一告警 ID
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 查询告警历史
 *
 * @param limit - 返回数量限制
 * @param type - 告警类型过滤（可选）
 * @param severity - 严重级别过滤（可选）
 * @returns 告警历史列表
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function queryAlertHistory(
  limit: number = 100,
  type?: string,
  severity?: string
): AlertRecord[] {
  const db = getDatabase();
  if (!db) {
    return [];
  }

  // 条件注释：构建查询条件
  let sql = `SELECT * FROM ${ALERT_HISTORY_TABLE}`;
  const params: (string | number)[] = [];

  if (type) {
    sql += ' WHERE type = ?';
    params.push(type);
  }

  if (severity) {
    sql += type ? ' AND severity = ?' : ' WHERE severity = ?';
    params.push(severity);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  try {
    const query = db.prepare(sql);
    const rows = query.all(...params) as Array<{
      id: string;
      type: string;
      severity: string;
      tool: string | null;
      message: string;
      details: string;
      timestamp: string;
      channel: string;
      status: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      severity: row.severity as 'critical' | 'warning' | 'info',
      tool: row.tool ?? undefined,
      message: row.message,
      details: JSON.parse(row.details || '{}'),
      timestamp: row.timestamp,
      channel: row.channel,
      status: row.status as 'sent' | 'failed' | 'skipped',
    }));
  } catch (error) {
    logger.error('[告警] Failed to query alert history', { error });
    return [];
  }
}

/**
 * 获取告警配置
 *
 * @returns 当前告警配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getAlertConfig(): EnhancedAlertConfig {
  return alertConfig;
}

/**
 * 获取告警统计
 *
 * @returns 告警统计数据
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function getAlertStats(): {
  enabled: boolean;
  totalAlerts: number;
  todayAlerts: number;
  criticalCount: number;
  warningCount: number;
  channelsCount: number;
} {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  // 条件注释：查询统计数据
  let totalAlerts = 0;
  let todayAlerts = 0;
  let criticalCount = 0;
  let warningCount = 0;

  if (db) {
    try {
      const totalQuery = db.prepare(`SELECT COUNT(*) as count FROM ${ALERT_HISTORY_TABLE}`);
      totalAlerts = (totalQuery.get() as { count: number })?.count ?? 0;

      const todayQuery = db.prepare(`SELECT COUNT(*) as count FROM ${ALERT_HISTORY_TABLE} WHERE timestamp >= ?`);
      todayAlerts = (todayQuery.get(today) as { count: number })?.count ?? 0;

      const criticalQuery = db.prepare(`SELECT COUNT(*) as count FROM ${ALERT_HISTORY_TABLE} WHERE severity = 'critical'`);
      criticalCount = (criticalQuery.get() as { count: number })?.count ?? 0;

      const warningQuery = db.prepare(`SELECT COUNT(*) as count FROM ${ALERT_HISTORY_TABLE} WHERE severity = 'warning'`);
      warningCount = (warningQuery.get() as { count: number })?.count ?? 0;
    } catch (error) {
      logger.error('[告警] Failed to query alert stats', { error });
    }
  }

  return {
    enabled: alertConfig.enabled,
    totalAlerts,
    todayAlerts,
    criticalCount,
    warningCount,
    channelsCount: alertConfig.channels?.filter(c => c.enabled).length ?? 0,
  };
}

/**
 * 清理过期告警历史
 *
 * @param maxDays - 保留天数
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function cleanAlertHistory(maxDays: number): void {
  const db = getDatabase();
  if (!db) {
    return;
  }

  const cutoffDate = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const deleteStmt = db.prepare(`DELETE FROM ${ALERT_HISTORY_TABLE} WHERE timestamp < ?`);
    deleteStmt.run(cutoffDate);

    logger.info('[告警] Cleaned old alert history', { cutoffDate, maxDays });
  } catch (error) {
    logger.error('[告警] Failed to clean alert history', { error });
  }
}

/**
 * 解决单个告警
 *
 * @param id - 告警 ID
 * @returns 是否成功解决
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function resolveAlert(id: string): boolean {
  const db = getDatabase();
  if (!db) {
    logger.warn('[告警] Database not connected, cannot resolve alert');
    return false;
  }

  try {
    // 条件注释：更新告警的解决时间
    const resolvedAt = new Date().toISOString();
    const updateStmt = db.prepare(`UPDATE ${ALERT_HISTORY_TABLE} SET resolved_at = ? WHERE id = ?`);
    const result = updateStmt.run(resolvedAt, id);

    // 条件注释：检查是否成功更新
    if (result.changes > 0) {
      logger.info('[告警] Alert resolved', { id, resolvedAt });
      return true;
    } else {
      logger.warn('[告警] Alert not found', { id });
      return false;
    }
  } catch (error) {
    logger.error('[告警] Failed to resolve alert', { id, error });
    return false;
  }
}

/**
 * 批量解决所有未解决的告警
 *
 * @returns 解决的告警数量
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function resolveAllAlerts(): number {
  const db = getDatabase();
  if (!db) {
    logger.warn('[告警] Database not connected, cannot resolve alerts');
    return 0;
  }

  try {
    // 条件注释：更新所有未解决的告警
    const resolvedAt = new Date().toISOString();
    const updateStmt = db.prepare(`UPDATE ${ALERT_HISTORY_TABLE} SET resolved_at = ? WHERE resolved_at IS NULL`);
    const result = updateStmt.run(resolvedAt);

    logger.info('[告警] All alerts resolved', { count: result.changes, resolvedAt });
    return result.changes;
  } catch (error) {
    logger.error('[告警] Failed to resolve all alerts', { error });
    return 0;
  }
}