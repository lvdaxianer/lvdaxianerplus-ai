/**
 * 模板引擎 - 动态变量替换和表达式计算
 *
 * 功能：
 * - 变量替换：{param}、{timestamp}、{uuid}、{random}
 * - 嵌套字段访问：{data.user.name}
 * - 表达式计算：{{value + 10}}
 * - 默认值：{value|default}
 * - 条件表达式：{value ?? 'default'}
 * - 数组操作：{items[0].name}
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../middleware/logger.js';

/**
 * 模板上下文
 *
 * 包含所有可用于模板替换的变量和配置。
 *
 * @param args - 请求参数
 * @param timestamp - 时间戳（可选，默认当前时间）
 * @param customVars - 自定义变量（可选）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export interface TemplateContext {
  args: Record<string, unknown>;
  timestamp?: number;
  customVars?: Record<string, unknown>;
}

/**
 * 内置变量名称常量
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
const BUILTIN_VARS = {
  TIMESTAMP: 'timestamp',
  UUID: 'uuid',
  RANDOM: 'random',
  DATE: 'date',
  NOW: 'now',
  YEAR: 'year',
  MONTH: 'month',
  DAY: 'day',
  HOUR: 'hour',
  MINUTE: 'minute',
  SECOND: 'second',
};

/**
 * 处理字符串模板
 *
 * 支持的占位符：
 * - {param}：替换为请求参数值
 * - {data.user.name}：嵌套字段访问
 * - {items[0].name}：数组索引访问
 * - {{value + 10}}：表达式计算
 * - {value|default}：默认值
 * - {value ?? 'default'}：空值合并
 * - {timestamp}：当前时间戳（ISO 格式）
 * - {uuid}：生成 UUID
 * - {random}：随机数（0-9999）
 * - {date}：当前日期（YYYY-MM-DD）
 * - {now}：当前时间戳（毫秒）
 * - {year}/{month}/{day}：日期部分
 *
 * @param template - 模板字符串
 * @param context - 模板上下文
 * @returns 处理后的字符串
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function processTemplate(template: string, context: TemplateContext): string {
  // 条件注释：空模板直接返回
  if (!template) {
    return template;
  }

  let result = template;
  const timestamp = context.timestamp ?? Date.now();
  const dateObj = new Date(timestamp);

  // ===== 步骤 1：替换内置变量 =====
  // 条件注释：按优先级替换内置变量
  result = result.replace(/\{timestamp\}/g, dateObj.toISOString());
  result = result.replace(/\{uuid\}/g, uuidv4());
  result = result.replace(/\{random\}/g, String(Math.floor(Math.random() * 10000)));
  result = result.replace(/\{date\}/g, formatDate(dateObj, 'YYYY-MM-DD'));
  result = result.replace(/\{now\}/g, String(timestamp));
  result = result.replace(/\{year\}/g, String(dateObj.getFullYear()));
  result = result.replace(/\{month\}/g, String(dateObj.getMonth() + 1).padStart(2, '0'));
  result = result.replace(/\{day\}/g, String(dateObj.getDate()).padStart(2, '0'));
  result = result.replace(/\{hour\}/g, String(dateObj.getHours()).padStart(2, '0'));
  result = result.replace(/\{minute\}/g, String(dateObj.getMinutes()).padStart(2, '0'));
  result = result.replace(/\{second\}/g, String(dateObj.getSeconds()).padStart(2, '0'));

  // ===== 步骤 2：替换自定义变量 =====
  // 条件注释：自定义变量优先级高于 args
  if (context.customVars) {
    for (const [key, value] of Object.entries(context.customVars)) {
      result = result.replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g'), String(value));
    }
  }

  // ===== 步骤 3：替换参数变量 =====
  // 支持嵌套访问：{data.user.name}、{items[0].id}
  // 支持默认值：{value|default}、{value ?? 'default'}
  // 支持表达式：{{value + 10}}
  result = replaceParamPlaceholders(result, context.args);

  // ===== 步骤 4：处理表达式 =====
  // 条件注释：{{expression}} 格式的表达式计算
  result = processExpressions(result, context.args);

  return result;
}

/**
 * 替换参数占位符
 *
 * 支持：
 * - {param}：简单参数
 * - {data.user.name}：嵌套字段
 * - {items[0].id}：数组索引
 * - {value|default}：默认值
 * - {value ?? 'default'}：空值合并
 *
 * @param template - 模板字符串
 * @param args - 参数对象
 * @returns 处理后的字符串
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function replaceParamPlaceholders(template: string, args: Record<string, unknown>): string {
  // 条件注释：正则匹配所有 {...} 占位符（排除内置变量）
  const placeholderRegex = /\{([^{}]+)\}/g;

  return template.replace(placeholderRegex, (match, expression) => {
    // 条件注释：跳过内置变量（已在上一步处理）
    if (isBuiltinVar(expression)) {
      return match;
    }

    // 条件注释：解析表达式中的默认值语法
    // {value|default} 或 {value ?? 'default'}
    const parsed = parseDefaultValueExpression(expression);

    // 条件注释：获取参数值（支持嵌套访问）
    const value = getNestedValue(args, parsed.path);

    // 条件注释：值为空时使用默认值
    if (value === undefined || value === null) {
      if (parsed.defaultValue !== undefined) {
        return parsed.defaultValue;
      } else {
        // 无默认值，返回空字符串或保留占位符
        logger.warn('[模板引擎] 未找到参数值且无默认值', { path: parsed.path });
        return '';
      }
    }

    // 条件注释：值存在，转换为字符串
    return String(value);
  });
}

/**
 * 解析默认值表达式
 *
 * 支持两种语法：
 * - {value|default}：管道语法
 * - {value ?? 'default'}：空值合并语法
 *
 * @param expression - 表达式字符串
 * @returns 解析结果（路径 + 默认值）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function parseDefaultValueExpression(expression: string): { path: string; defaultValue?: string } {
  // 条件注释：尝试解析 ?? 语法（空值合并）
  const nullishMatch = expression.match(/^([^?]+)\?\?\s*['"]?([^'"]*)['"]?$/);

  if (nullishMatch) {
    return {
      path: nullishMatch[1].trim(),
      defaultValue: nullishMatch[2],
    };
  }

  // 条件注释：尝试解析 | 语法（管道）
  const pipeMatch = expression.match(/^([^|]+)\|\s*['"]?([^'"]*)['"]?$/);

  if (pipeMatch) {
    return {
      path: pipeMatch[1].trim(),
      defaultValue: pipeMatch[2],
    };
  }

  // 条件注释：无默认值语法，直接返回路径
  return { path: expression.trim() };
}

/**
 * 判断是否为内置变量
 *
 * @param varName - 变量名称
 * @returns 是否为内置变量
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function isBuiltinVar(varName: string): boolean {
  const trimmed = varName.trim();
  return Object.values(BUILTIN_VARS).includes(trimmed);
}

/**
 * 获取嵌套字段值
 *
 * 支持路径：
 * - simple：简单字段
 * - data.user.name：嵌套对象
 * - items[0].id：数组索引
 *
 * @param obj - 对象
 * @param path - 路径字符串
 * @returns 字段值（可能为 undefined）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function getNestedValue(obj: unknown, path: string): unknown {
  // 条件注释：空路径返回对象本身
  if (!path) {
    return obj;
  }

  // 条件注释：非对象直接返回 undefined
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  // 条件注释：解析路径（支持 . 分隔和 [] 数组索引）
  const parts = parsePath(path);
  let current: unknown = obj;

  for (const part of parts) {
    // 条件注释：当前值为 null/undefined 时停止访问
    if (current === null || current === undefined) {
      return undefined;
    }

    // 条件注释：数组索引访问
    if (part.type === 'index') {
      if (Array.isArray(current)) {
        current = current[part.value as number];
      } else {
        // 非数组无法索引访问
        return undefined;
      }
    } else {
      // 条件注释：对象属性访问
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part.value as string];
      } else {
        // 非对象无法属性访问
        return undefined;
      }
    }
  }

  return current;
}

/**
 * 解析路径为访问片段
 *
 * 示例：
 * - data.user.name → ['data', 'user', 'name']
 * - items[0].id → ['items', '[0]', 'id']
 *
 * @param path - 路径字符串
 * @returns 路径片段数组
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function parsePath(path: string): Array<{ type: 'key' | 'index'; value: string | number }> {
  const parts: Array<{ type: 'key' | 'index'; value: string | number }> = [];

  // 条件注释：正则匹配路径片段（属性名或数组索引）
  const regex = /([^.[]+)|\[(\d+)\]/g;
  let match;

  while ((match = regex.exec(path)) !== null) {
    if (match[1]) {
      // 属性名
      parts.push({ type: 'key', value: match[1] });
    } else if (match[2]) {
      // 数组索引
      parts.push({ type: 'index', value: parseInt(match[2], 10) });
    }
  }

  return parts;
}

/**
 * 处理表达式计算
 *
 * 支持：{{value + 10}}、{{value * 2}}、{{value - 5}}、{{value / 2}}
 *
 * @param template - 模板字符串
 * @param args - 参数对象
 * @returns 处理后的字符串
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function processExpressions(template: string, args: Record<string, unknown>): string {
  // 条件注释：正则匹配 {{expression}} 格式
  const expressionRegex = /\{\{([^{}]+)\}\}/g;

  return template.replace(expressionRegex, (match, expression) => {
    // 条件注释：解析并计算表达式
    const result = evaluateExpression(expression.trim(), args);

    // 条件注释：计算失败返回原占位符
    if (result === undefined) {
      logger.warn('[模板引擎] 表达式计算失败', { expression });
      return match;
    }

    return String(result);
  });
}

/**
 * 计算简单表达式
 *
 * 支持：
 * - 四则运算：value + 10、value * 2、value - 5、value / 2
 * - 字符串拼接：value + 'suffix'
 * - 数值比较：value > 10（返回布尔值）
 *
 * @param expression - 表达式字符串
 * @param args - 参数对象
 * @returns 计算结果（可能为 undefined）
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function evaluateExpression(expression: string, args: Record<string, unknown>): unknown {
  // 条件注释：安全模式下仅支持简单运算（禁止函数调用）
  try {
    // 条件注释：提取运算符和操作数
    const operators = ['+', '-', '*', '/', '>', '<', '>=', '<=', '==', '!='];
    let matchedOperator: string | null = null;
    let leftPart: string | null = null;
    let rightPart: string | null = null;

    // 条件注释：按优先级匹配运算符（先匹配两字符运算符）
    for (const op of operators) {
      const parts = expression.split(op);

      if (parts.length === 2) {
        matchedOperator = op;
        leftPart = parts[0].trim();
        rightPart = parts[1].trim();
        break;
      }
    }

    // 条件注释：无运算符时直接返回参数值
    if (!matchedOperator || !leftPart || !rightPart) {
      // 尝试作为参数路径获取值
      return getNestedValue(args, expression);
    }

    // 条件注释：获取左右操作数的值
    const leftValue = parseOperandValue(leftPart, args);
    const rightValue = parseOperandValue(rightPart, args);

    // 条件注释：值不存在时返回 undefined
    if (leftValue === undefined || rightValue === undefined) {
      return undefined;
    }

    // 条件注释：执行运算
    return executeOperation(leftValue, rightValue, matchedOperator);
  } catch (error) {
    logger.warn('[模板引擎] 表达式计算异常', { expression, error: String(error) });
    return undefined;
  }
}

/**
 * 解析操作数的值
 *
 * 支持：
 * - 参数路径：data.user.age
 * - 字符串字面量：'suffix'
 * - 数值字面量：10
 *
 * @param operand - 操作数字符串
 * @param args - 参数对象
 * @returns 操作数的值
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function parseOperandValue(operand: string, args: Record<string, unknown>): unknown {
  // 条件注释：去除引号（字符串字面量）
  const quotedMatch = operand.match(/^['"](.*)['"]$/);

  if (quotedMatch) {
    return quotedMatch[1];
  }

  // 条件注释：数值字面量
  const numValue = parseFloat(operand);

  if (!isNaN(numValue) && operand.match(/^\d+(\.\d+)?$/)) {
    return numValue;
  }

  // 条件注释：参数路径
  return getNestedValue(args, operand);
}

/**
 * 执行运算操作
 *
 * @param left - 左操作数
 * @param right - 右操作数
 * @param operator - 运算符
 * @returns 运算结果
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function executeOperation(left: unknown, right: unknown, operator: string): unknown {
  // 条件注释：数值运算（左右都为数值）
  if (typeof left === 'number' && typeof right === 'number') {
    switch (operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        // 条件注释：除零保护
        if (right === 0) {
          return undefined;
        } else {
          return left / right;
        }
      case '>':
        return left > right;
      case '<':
        return left < right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      default:
        return undefined;
    }
  }

  // 条件注释：字符串拼接（左或右为字符串）
  if (operator === '+' && (typeof left === 'string' || typeof right === 'string')) {
    return String(left) + String(right);
  }

  // 条件注释：不支持的运算组合
  return undefined;
}

/**
 * 格式化日期
 *
 * @param date - Date 对象
 * @param format - 格式字符串（YYYY-MM-DD）
 * @returns 格式化后的日期字符串
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // 条件注释：支持 YYYY-MM-DD 格式
  return format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day);
}

/**
 * 转义正则表达式特殊字符
 *
 * @param str - 字符串
 * @returns 转义后的字符串
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 处理对象模板（递归替换所有字符串值）
 *
 * @param obj - 对象
 * @param context - 模板上下文
 * @returns 处理后的对象
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function processObjectTemplate(obj: unknown, context: TemplateContext): unknown {
  // 条件注释：字符串直接处理模板
  if (typeof obj === 'string') {
    return processTemplate(obj, context);
  }

  // 条件注释：数组递归处理每个元素
  if (Array.isArray(obj)) {
    return obj.map(item => processObjectTemplate(item, context));
  }

  // 条件注释：对象递归处理每个属性值
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // 条件注释：键名也可以包含模板占位符
      const processedKey = processTemplate(key, context);
      result[processedKey] = processObjectTemplate(value, context);
    }

    return result;
  }

  // 条件注释：其他类型直接返回
  return obj;
}

/**
 * 从响应数据中提取指定路径的值
 *
 * 用于响应转换（pick 操作增强）。
 *
 * @param data - 响应数据
 * @param path - 提取路径（支持嵌套和数组）
 * @returns 提取的值
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function extractValue(data: unknown, path: string): unknown {
  return getNestedValue(data, path);
}

/**
 * 从响应数据中提取多个路径的值
 *
 * 用于批量 pick 操作。
 *
 * @param data - 响应数据
 * @param paths - 路径列表
 * @returns 提取的值对象
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function extractValues(data: unknown, paths: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const path of paths) {
    // 条件注释：路径作为键名，提取的值作为值
    result[path] = extractValue(data, path);
  }

  return result;
}