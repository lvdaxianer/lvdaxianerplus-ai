/**
 * Dashboard CSS 样式模块
 *
 * Features:
 * - 外部化 CSS 样式
 * - Bento Grid 设计
 * - Toast 组件样式
 * - Modal 组件样式
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

/**
 * 获取 Dashboard CSS 样式字符串
 *
 * @returns CSS 样式字符串
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getDashboardCss(): string {
  return `
    :root {
      --primary: #3B82F6;
      --primary-dark: #2563EB;
      --secondary: #60A5FA;
      --cta: #F97316;
      --bg: #F8FAFC;
      --text: #1E293B;
      --text-muted: #64748B;
      --border: #E2E8F0;
      --card: #FFFFFF;
      --success: #22C55E;
      --error: #EF4444;
      --warning: #F59E0B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 24px;
    }
    .container { max-width: 1400px; margin: 0 auto; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
    .header h1 { font-size: 24px; font-weight: 700; color: var(--text); }
    .header-nav { display: flex; gap: 8px; }
    .nav-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms;
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }
    .nav-btn:hover { background: #F1F5F9; }
    .nav-btn.active { background: var(--primary); border-color: var(--primary); color: white; }

    /* Bento Grid */
    .bento-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
    .card {
      background: var(--card);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 24px;
      transition: all 150ms;
    }
    .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .card-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-title svg { width: 16px; height: 16px; }

    /* Grid spans */
    .span-3 { grid-column: span 3; }
    .span-4 { grid-column: span 4; }
    .span-6 { grid-column: span 6; }
    .span-8 { grid-column: span 8; }
    .span-12 { grid-column: span 12; }

    /* Stats */
    .stat-value { font-size: 36px; font-weight: 700; line-height: 1; }
    .stat-label { font-size: 14px; color: var(--text-muted); margin-top: 8px; }
    .stat-success .stat-value { color: var(--success); }
    .stat-error .stat-value { color: var(--error); }

    /* Table */
    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; font-size: 14px; }
    th { color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); }
    tr:hover td { background: #F8FAFC; }
    .badge { padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .badge-on { background: #DCFCE7; color: #166534; }
    .badge-off { background: #F3F4F6; color: #6B7280; }
    .badge-open { background: #FEE2E2; color: #991B1B; }
    .badge-closed { background: #DCFCE7; color: #166534; }
    .badge-half_open { background: #FEF3C7; color: #92400E; }

    /* Buttons */
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary { background: var(--primary); color: white; border: none; }
    .btn-primary:hover { background: var(--primary-dark); }
    .btn-secondary { background: var(--card); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { background: #F1F5F9; }
    .btn-success { background: var(--success); color: white; border: none; }
    .btn-success:hover { background: #16A34A; }
    .btn-danger { background: var(--error); color: white; border: none; }
    .btn-danger:hover { background: #DC2626; }
    .btn-sm { padding: 6px 12px; font-size: 13px; }

    /* Modal */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.6);
      backdrop-filter: blur(4px);
      z-index: 50;
      align-items: center;
      justify-content: center;
    }
    .modal.show { display: flex; }
    .modal-box {
      background: var(--card);
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }
    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 { font-size: 18px; font-weight: 600; }
    .modal-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #F1F5F9;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-close:hover { background: #E2E8F0; }
    .modal-body { padding: 24px; overflow-y: auto; }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    /* Toast */
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .toast {
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: toastIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .toast-success { background: #DCFCE7; color: #166534; }
    .toast-error { background: #FEE2E2; color: #991B1B; }
    .toast-warning { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
    .toast-info { background: #DBEAFE; color: #1D4ED8; }
    @keyframes toastIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    /* Form */
    .form-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .form-group { flex: 1; min-width: 150px; }
    .form-label { font-size: 14px; font-weight: 500; margin-bottom: 6px; display: block; }
    .form-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
    }
    .form-input:focus { outline: none; border-color: var(--primary); }
    .json-editor {
      width: 100%;
      min-height: 200px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      resize: vertical;
      background: #F8FAFC;
    }

    /* Page */
    .page { display: none; }
    .page.active { display: block; }

    /* Responsive */
    @media (max-width: 1024px) {
      .span-3, .span-4, .span-6, .span-8 { grid-column: span 6; }
    }
    @media (max-width: 768px) {
      .span-3, .span-4, .span-6, .span-8, .span-12 { grid-column: span 12; }
      .header { flex-direction: column; align-items: flex-start; }
    }
  `;
}