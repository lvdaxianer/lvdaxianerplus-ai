/**
 * 请求和响应转换（增强版）
 *
 * 功能增强：
 * - 变量替换：{param}、{timestamp}、{uuid}、{random}
 * - 嵌套字段访问：{data.user.name}、{items[0].id}
 * - 表达式计算：{{value + 10}}、{{value * 2}}
 * - 默认值：{value|default}、{value ?? 'default'}
 * - 字段筛选：pick、omit
 * - 字段重命名：rename
 * - 对象展平：flatten
 * - 表达式转换：expressions
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */

import type { ResponseTransformConfig, RequestTransformConfig } from '../config/types.js';
import {
  processTemplate,
  processObjectTemplate,
  extractValue,
  extractValues,
  type TemplateContext,
} from './template-engine.js';
import { logger } from '../middleware/logger.js';

/**
 * 增强版请求参数转换
 *
 * 支持两种配置格式：
 * 1. 旧版 requestTransform（简单字段映射）：Record<string, string>
 * 2. 新版 requestTransformConfig（增强转换配置）
 *
 * @param args - 原始参数
 * @param transform - 旧版字段映射配置
 * @param transformConfig - 新版增强配置
 * @returns 转换后的参数
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function transformRequest(
  args: Record<string, unknown>,
  transform?: Record<string, string>,
  transformConfig?: RequestTransformConfig
): Record<string, unknown> {
  // 条件注释：新版配置优先
  if (transformConfig) {
    return transformRequestEnhanced(args, transformConfig);
  }

  // 条件注释：旧版配置兼容
  if (transform) {
    return transformRequestLegacy(args, transform);
  }

  // 条件注释：无配置返回原参数
  return args;
}

/**
 * 旧版请求参数转换（兼容）
 *
 * 仅支持字段名映射。
 *
 * @param args - 原始参数
 * @param transform - 字段映射配置
 * @returns 转换后的参数
 *
 * @author lvdaxianerplus
 * @date 2026-04-18
 */
function transformRequestLegacy(
  args: Record<string, unknown>,
  transform: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    // 条件注释：使用映射后的键名，无映射则保持原键名
    const newKey = transform[key] ?? key;
    result[newKey] = value;
  }

  logger.debug('[请求转换] 旧版字段映射完成', {
    inputKeys: Object.keys(args),
    outputKeys: Object.keys(result),
  });

  return result;
}

/**
 * 新版请求参数转换（增强）
 *
 * 支持：
 * - template：模板替换
 * - expressions：表达式转换
 * - defaultValues：默认值填充
 * - rename：字段重命名
 * - addFields：新增字段
 *
 * @param args - 原始参数
 * @param config - 增强配置
 * @returns 转换后的参数
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function transformRequestEnhanced(
  args: Record<string, unknown>,
  config: RequestTransformConfig
): Record<string, unknown> {
  // ===== 步骤 1：模板替换 =====
  let result: Record<string, unknown>;

  if (config.template) {
    // 条件注释：使用模板引擎处理参数对象
    const context: TemplateContext = { args };
    result = processObjectTemplate(args, context) as Record<string, unknown>;
  } else {
    result = { ...args };
  }

  // ===== 步骤 2：表达式转换 =====
  if (config.expressions) {
    const context: TemplateContext = { args: result };

    for (const [newKey, expression] of Object.entries(config.expressions)) {
      // 条件注释：表达式作为模板处理
      const processedValue = processTemplate(`{{${expression}}}`, context);

      // 条件注释：尝试解析为数值或保留字符串
      try {
        const numValue = parseFloat(processedValue);

        if (!isNaN(numValue)) {
          result[newKey] = numValue;
        } else {
          result[newKey] = processedValue;
        }
      } catch {
        result[newKey] = processedValue;
      }
    }
  }

  // ===== 步骤 3：默认值填充 =====
  if (config.defaultValues) {
    for (const [key, defaultValue] of Object.entries(config.defaultValues)) {
      // 条件注释：仅对缺失或空值字段填充默认值
      if (result[key] === undefined || result[key] === null) {
        result[key] = defaultValue;
      }
    }
  }

  // ===== 步骤 4：字段重命名 =====
  if (config.rename) {
    for (const [oldKey, newKey] of Object.entries(config.rename)) {
      // 条件注释：仅对存在的字段重命名
      if (oldKey in result) {
        result[newKey] = result[oldKey];
        delete result[oldKey];
      }
    }
  }

  // ===== 步骤 5：新增字段 =====
  if (config.addFields) {
    const context: TemplateContext = { args: result };

    for (const [key, expression] of Object.entries(config.addFields)) {
      // 条件注释：表达式作为模板处理
      result[key] = processTemplate(expression, context);
    }
  }

  logger.debug('[请求转换] 增强转换完成', {
    inputKeys: Object.keys(args),
    outputKeys: Object.keys(result),
  });

  return result;
}

/**
 * 增强版响应数据转换
 *
 * 支持：
 * - pick：字段筛选（支持嵌套路径）
 * - omit：字段排除
 * - rename：字段重命名
 * - template：模板替换
 * - expressions：表达式转换
 * - defaultValues：默认值填充
 * - flatten：对象展平
 *
 * @param data - 响应数据
 * @param config - 转换配置
 * @returns 转换后的数据
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
export function transformResponse(
  data: unknown,
  config: ResponseTransformConfig
): unknown {
  // 条件注释：非对象数据直接返回（可应用 template）
  if (!data || typeof data !== 'object') {
    // 条件注释：template 配置时处理字符串
    if (typeof data === 'string' && config.template) {
      return processTemplate(data, { args: {} });
    }

    return data;
  }

  const obj = data as Record<string, unknown>;
  let result: Record<string, unknown> = { ...obj };

  // ===== 步骤 1：模板替换 =====
  if (config.template) {
    // 条件注释：使用模板引擎处理响应对象
    const context: TemplateContext = { args: obj };
    result = processObjectTemplate(config.template, context) as Record<string, unknown>;

    // 条件注释：模板结果可能是字符串，尝试解析为对象
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch {
        // 解析失败保留字符串
      }
    }
  }

  // ===== 步骤 2：表达式转换 =====
  if (config.expressions) {
    const context: TemplateContext = { args: obj };

    for (const [newKey, expression] of Object.entries(config.expressions)) {
      // 条件注释：表达式作为模板处理
      result[newKey] = processTemplate(`{{${expression}}}`, context);
    }
  }

  // ===== 步骤 3：字段筛选（pick） =====
  if (config.pick && config.pick.length > 0) {
    // 条件注释：支持嵌套路径提取
    result = extractValuesByPaths(obj, config.pick);
  }

  // ===== 步骤 4：字段排除（omit） =====
  if (config.omit && config.omit.length > 0) {
    for (const path of config.omit) {
      // 条件注释：支持嵌套路径删除
      deleteNestedValue(result, path);
    }
  }

  // ===== 步骤 5：字段重命名（rename） =====
  if (config.rename) {
    // 条件注释：支持嵌套路径重命名
    for (const [oldPath, newName] of Object.entries(config.rename)) {
      renameNestedField(result, oldPath, newName);
    }
  }

  // ===== 步骤 6：默认值填充 =====
  if (config.defaultValues) {
    for (const [path, defaultValue] of Object.entries(config.defaultValues)) {
      // 条件注释：仅对缺失或空值字段填充默认值
      const currentValue = getNestedValue(result, path);

      if (currentValue === undefined || currentValue === null) {
        setNestedValue(result, path, defaultValue);
      }
    }
  }

  // ===== 步骤 7：对象展平（flatten） =====
  if (config.flatten) {
    result = flattenObject(result, config.flattenPrefix ?? '_');
  }

  logger.debug('[响应转换] 转换完成', {
    inputKeys: Object.keys(obj),
    outputKeys: Object.keys(result),
  });

  return result;
}

/**
 * 按路径列表提取值
 *
 * 支持嵌套路径如 data.user.name。
 *
 * @param obj - 源对象
 * @param paths - 路径列表
 * @returns 提取的对象
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function extractValuesByPaths(
  obj: Record<string, unknown>,
  paths: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const path of paths) {
    // 条件注释：路径作为键名（最后一部分）
    const keyName = getLastNameFromPath(path);
    const value = getNestedValue(obj, path);

    if (value !== undefined) {
      result[keyName] = value;
    }
  }

  return result;
}

/**
 * 从路径中提取最后一个名称
 *
 * 示例：data.user.name → name
 *
 * @param path - 路径字符串
 * @returns 最后一个名称
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function getLastNameFromPath(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] ?? path;
}

/**
 * 获取嵌套字段值（简化版）
 *
 * @param obj - 对象
 * @param path - 路径
 * @returns 字段值
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path || typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    // 条件注释：支持数组索引访问（如 items[0]）
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);

    if (arrayMatch) {
      const arrayKey = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);

      if (typeof current === 'object' && current !== null) {
        const arr = (current as Record<string, unknown>)[arrayKey];

        if (Array.isArray(arr)) {
          current = arr[index];
        } else {
          return undefined;
        }
      }
    } else {
      // 条件注释：普通对象属性访问
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

/**
 * 删除嵌套字段值
 *
 * @param obj - 对象
 * @param path - 路径
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function deleteNestedValue(obj: Record<string, unknown>, path: string): void {
  const parts = path.split('.');
  const lastKey = parts.pop();

  if (!lastKey) {
    return;
  }

  // 条件注释：获取父对象
  const parent = getNestedValue(obj, parts.join('.'));

  if (typeof parent === 'object' && parent !== null) {
    delete (parent as Record<string, unknown>)[lastKey];
  }
}

/**
 * 设置嵌套字段值
 *
 * @param obj - 对象
 * @param path - 路径
 * @param value - 值
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.');
  const lastKey = parts.pop();

  if (!lastKey) {
    return;
  }

  // 条件注释：获取或创建父对象
  let current: Record<string, unknown> = obj;

  for (const part of parts) {
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }

    current = current[part] as Record<string, unknown>;
  }

  current[lastKey] = value;
}

/**
 * 重命名嵌套字段
 *
 * @param obj - 对象
 * @param oldPath - 原路径
 * @param newName - 新名称
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function renameNestedField(
  obj: Record<string, unknown>,
  oldPath: string,
  newName: string
): void {
  // 条件注释：获取原值
  const value = getNestedValue(obj, oldPath);

  if (value === undefined) {
    return;
  }

  // 条件注释：删除原字段
  deleteNestedValue(obj, oldPath);

  // 条件注释：设置新字段（在同层级）
  const parentPath = oldPath.split('.').slice(0, -1).join('.');
  const parent = parentPath ? getNestedValue(obj, parentPath) : obj;

  if (typeof parent === 'object' && parent !== null) {
    (parent as Record<string, unknown>)[newName] = value;
  }
}

/**
 * 展平嵌套对象
 *
 * 示例：{ user: { name: 'test' } } → { user_name: 'test' }
 *
 * @param obj - 对象
 * @param prefix - 前缀分隔符
 * @returns 展平后的对象
 *
 * @author lvdaxianerplus
 * @date 2026-04-22
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix: string = '_'
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // 条件注释：嵌套对象递归展平
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const flattened = flattenObject(value as Record<string, unknown>, prefix);

      for (const [subKey, subValue] of Object.entries(flattened)) {
        result[`${key}${prefix}${subKey}`] = subValue;
      }
    } else {
      // 条件注释：非对象值直接添加
      result[key] = value;
    }
  }

  return result;
}
