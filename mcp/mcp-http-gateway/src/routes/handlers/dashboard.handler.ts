/**
 * Dashboard 路由处理器
 *
 * Features:
 * - GET /dashboard - 渲染 Dashboard 页面（HTML）
 * - GET /api/dashboard - 获取 Dashboard 数据（JSON）
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteHandler } from '../router.js';
import type { Config } from '../../config/types.js';
import { handleDashboard } from '../health.js';
import { sendJsonResponse, sendHtmlResponse } from './response.js';
import { join } from 'path';

// CommonJS 兼容：直接使用 __dirname（esbuild 会自动注入）
declare const __dirname: string;

/**
 * EJS 模板渲染函数（延迟加载）
 */
let ejsRenderFile: ((template: string, data: object) => Promise<string>) | null = null;

/**
 * CSS 样式（延迟加载）
 */
let dashboardCss: string | null = null;

/**
 * 模板目录路径（延迟加载）
 */
let templatesDirPath: string | null = null;

/**
 * 初始化 EJS 渲染器
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
async function initEjsRenderer(): Promise<void> {
  // 条件注释：渲染器已初始化时跳过，未初始化时加载 EJS
  if (ejsRenderFile) {
    return;
  } else {
    // EJS 动态导入 - ESM 模式下 renderFile 在 default 中
    const ejsModule = await import('ejs');
    // 获取 renderFile 函数（兼容 ESM/CJS）
    const ejsDefault = (ejsModule as unknown as { default: { renderFile: (path: string, data: object, opts: object) => Promise<string> } }).default;
    const renderFileFn = ejsDefault?.renderFile ?? (ejsModule as unknown as { renderFile: (path: string, data: object, opts: object) => Promise<string> }).renderFile;

    // 条件注释：renderFile 存在时配置渲染器，不存在时跳过
    if (renderFileFn) {
      // 加载 CSS 样式
      try {
        const { getDashboardCss } = await import('../styles/dashboard-css.js');
        dashboardCss = getDashboardCss();
      } catch {
        dashboardCss = '';
      }

      // 加载 fs 模块检查路径
      const fs = await import('fs');

      // 配置 EJS 渲染函数（使用 renderFile 支持 include）
      // 模板文件位于 src/routes/templates（编译后需要指向正确位置）
      // dist/routes/handlers -> ../ -> dist/routes -> ../ -> dist -> ../ -> mcp-http-gateway -> src/routes/templates
      const srcDir = join(__dirname, '..', '..', '..', 'src', 'routes', 'templates');
      const distDir = join(__dirname, '..', 'templates');
      // 条件注释：src 目录存在时使用，不存在时使用 dist 目录
      templatesDirPath = fs.existsSync(srcDir) ? srcDir : distDir;
      ejsRenderFile = async (templatePath: string, data: object) => {
        return renderFileFn(templatePath, data, {
          views: [templatesDirPath!],
          filename: join(templatesDirPath!, 'dashboard'),
        });
      };
    } else {
      // renderFile 不可用，使用 fallback
      ejsRenderFile = null;
      templatesDirPath = null;
    }
  }
}

/**
 * Dashboard HTML 处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param config - 服务配置
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function dashboardHtmlHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _params?: Record<string, string>,
  config?: Config
): Promise<boolean> {
  // 条件注释：配置不存在时返回错误
  if (!config) {
    sendHtmlResponse(res, 500, '<h1>Config not available</h1>');
    return true;
  } else {
    const dashboard = handleDashboard(config);
    await initEjsRenderer();

    // 条件注释：渲染器存在时使用 EJS，不存在时使用内联 HTML
    if (ejsRenderFile) {
      const html = await renderDashboardHtml(dashboard);
      sendHtmlResponse(res, 200, html);
      return true;
    } else {
      // EJS 未加载，使用简化 HTML
      const fallbackHtml = createFallbackHtml(dashboard);
      sendHtmlResponse(res, 200, fallbackHtml);
      return true;
    }
  }
}

/**
 * Dashboard JSON 处理器
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param config - 服务配置
 * @returns 是否处理完成
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export async function dashboardJsonHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _params?: Record<string, string>,
  config?: Config
): Promise<boolean> {
  // 条件注释：配置不存在时返回错误
  if (!config) {
    sendJsonResponse(res, 500, { error: 'Config not available' });
    return true;
  } else {
    const dashboard = handleDashboard(config);
    sendJsonResponse(res, 200, dashboard);
    return true;
  }
}

/**
 * Dashboard 数据类型定义
 */
interface DashboardData {
  metrics: {
    aggregated: {
      totalRequests: number;
      totalSuccesses: number;
      totalErrors: number;
      avgDuration: number;
      successRate: string;
    };
    tools: Record<string, {
      requests: number;
      successes: number;
      errors: number;
      avgDuration: number;
    }>;
  };
  circuitBreakers: Record<string, { state: string; failures: number; successes: number }>;
  toolDescriptions: Record<string, string>;
  cache: { size: number; maxSize: number; ttl: number };
  logs?: Array<{
    timestamp: string;
    tool_name: string;
    level: string;
    message: string;
    method?: string;
    url?: string;
    response_status?: number;
    duration?: number;
    type: 'request' | 'error';
  }>;
}

/**
 * 渲染 Dashboard HTML（使用 EJS）
 *
 * @param data - Dashboard 数据
 * @returns HTML 字符串
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
async function renderDashboardHtml(data: DashboardData): Promise<string> {
  // 条件注释：渲染器存在时使用 EJS 渲染外部模板，不存在时返回 fallback
  if (ejsRenderFile && templatesDirPath) {
    const templatePath = join(templatesDirPath, 'dashboard.ejs');
    return ejsRenderFile(templatePath, { data, css: dashboardCss ?? '' });
  } else {
    return createFallbackHtml(data);
  }
}

/**
 * 创建备用 HTML（当 EJS 未加载时）
 *
 * @param data - Dashboard 数据
 * @returns HTML 字符串
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function createFallbackHtml(data: DashboardData): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Gateway Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; padding: 24px; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .card { background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
    .stat-value { font-size: 36px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>MCP Gateway Dashboard (Fallback)</h1>
    </header>
    <div class="card">
      <div class="stat-value">${data.metrics.aggregated.totalRequests}</div>
      <div>总请求数</div>
    </div>
    <div class="card">
      <div class="stat-value">${data.metrics.aggregated.successRate}</div>
      <div>成功率</div>
    </div>
    <div class="card">
      <div class="stat-value">${data.metrics.aggregated.totalErrors}</div>
      <div>错误数</div>
    </div>
    <div class="card">
      <div class="stat-value">${Math.round(data.metrics.aggregated.avgDuration)}ms</div>
      <div>平均延迟</div>
    </div>
  </div>
</body>
</html>`;
}


/**
 * 创建 Dashboard 路由处理器工厂函数
 *
 * @param config - 服务配置
 * @returns Dashboard 路由策略配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getDashboardRoutes(config: Config): Array<{
  name: string;
  path: string;
  matchType: 'exact';
  methods: string[];
  handler: RouteHandler;
  priority: number;
}> {
  return [
    {
      name: 'dashboard-html',
      path: '/dashboard',
      matchType: 'exact',
      methods: ['GET'],
      handler: (req, res, params) => dashboardHtmlHandler(req, res, params, config),
      priority: 200,
    },
    {
      name: 'dashboard-json',
      path: '/api/dashboard',
      matchType: 'exact',
      methods: ['GET'],
      handler: (req, res, params) => dashboardJsonHandler(req, res, params, config),
      priority: 200,
    },
  ];
}