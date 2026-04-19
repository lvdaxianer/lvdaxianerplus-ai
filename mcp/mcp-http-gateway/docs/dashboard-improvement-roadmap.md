# MCP HTTP Gateway Dashboard 产品改进路线图

## Context

基于产品分析，当前 Dashboard 存在以下核心问题：

1. **功能完整性不足**：API 已定义但 UI 未实现（告警、配置编辑、审计日志等）
2. **数据展示维度不足**：无历史趋势、无分页筛选、无 P50/P95/P99
3. **交互体验缺陷**：无操作反馈、无确认弹窗、模态框交互不便
4. **Mock 数据持久化问题**：内存存储重启丢失
5. **导航结构单一**：仅 2 个页面，信息架构不完整

**改进目标**：打造完整的运维监控 Dashboard，支撑运维决策。

---

## 改进路线图（按优先级排序）

---

### Phase 1：交互体验完善（1人周）⚡️ 高优先级

**目标**：零风险高收益，立即改善用户体验

| 改进项 | 当前问题 | 解决方案 | 修改文件 |
|-------|---------|---------|---------|
| Toast 操作反馈 | 保存/删除无提示 | 添加 Toast 组件 | `http-server.ts` |
| 清空缓存确认弹窗 | 误操作无法撤销 | 添加确认弹窗 | `http-server.ts` |
| Escape 键关闭模态框 | 只能点击 X | 添加键盘监听 | `http-server.ts` |
| JSON 格式化按钮 | 手动格式化易出错 | 添加格式化按钮 | `http-server.ts` |
| Mock 配置预设模板 | 配置效率低 | 添加常用模板下拉 | `http-server.ts` |

**实现要点**：

```html
<!-- Toast 组件 -->
<div id="toast" class="toast hidden">
  <span class="toast-icon">✓</span>
  <span class="toast-message">操作成功</span>
</div>

<!-- 确认弹窗 -->
<div id="confirm-modal" class="modal hidden">
  <div class="modal-content">
    <h3>确认清空缓存？</h3>
    <p>此操作不可撤销</p>
    <button onclick="confirmClearCache()">确认</button>
    <button onclick="closeConfirm()">取消</button>
  </div>
</div>
```

**验证方式**：
1. 清空缓存 → 弹出确认弹窗 → 点击取消 → 缓存保留
2. 保存 Mock 配置 → Toast 显示「保存成功」
3. 打开模态框 → 按 Escape → 模态框关闭
4. 点击 JSON 格式化按钮 → JSON 自动格式化

---

### Phase 2：数据深度增强（2人周）📊 核心改进

**目标**：提升数据展示深度，支撑运维决策

#### 2.1 Mock 数据 SQLite 持久化

| 当前问题 | 解决方案 | 修改文件 |
|---------|---------|---------|
| 内存存储重启丢失 | 新增 mock_configs 表持久化 | `database/connection.ts`, `mock.ts` |

**新增表结构**：
```sql
CREATE TABLE mock_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 0,
  response TEXT,
  delay INTEGER,
  status_code INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);
```

#### 2.2 日志分页筛选

| 当前问题 | 解决方案 | 修改文件 |
|---------|---------|---------|
| 仅显示 15 条 | 分页 + 时间筛选 + 工具筛选 | `sqlite-logger.ts`, `http-server.ts` |

**新增 API**：
```typescript
// 分页查询
getRecentLogsPaginated(options: {
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
  toolName?: string;
  status?: 'success' | 'error';
})
```

#### 2.3 P50/P95/P99 延迟指标

| 当前问题 | 解决方案 | 修改文件 |
|---------|---------|---------|
| 仅显示平均延迟 | 计算百分位数延迟 | `sqlite-logger.ts`, `health.ts` |

**新增计算函数**：
```typescript
function calculatePercentiles(durations: number[]): {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}
```

**验证方式**：
1. 配置 Mock → 重启服务 → Mock 配置仍存在
2. 日志筛选：选择日期范围 → 显示对应日志
3. 总览页显示 P50/P95/P99 指标

---

### Phase 3：功能完整性（4人周）🔧 架构完善

**目标**：补齐 API 已定义但 UI 未实现的功能

#### 3.1 历史趋势图表

| 新增内容 | 实现方式 | 修改文件 |
|---------|---------|---------|
| 7天请求趋势图 | Chart.js 折线图 | `health.ts`, `http-server.ts` |
| 错误率趋势图 | Chart.js 折线图 | `health.ts`, `http-server.ts` |
| 延迟趋势图 | Chart.js 折线图 | `health.ts`, `http-server.ts` |

**新增数据接口**：
```typescript
interface TrendData {
  date: string;
  requests: number;
  errors: number;
  avgDuration: number;
}

getTrendData(days: number): TrendData[]
```

#### 3.2 告警管理 UI 页面

| 新增页面 | 功能 | 修改文件 |
|---------|-----|---------|
| 告警列表 | 显示告警、严重级别筛选 | `http-server.ts` |
| 告警解决 | 标记已解决、批量解决 | `http-server.ts` |

**页面结构**：
```html
<div id="alerts-page" class="page hidden">
  <!-- 筛选：严重级别、日期、解决状态 -->
  <!-- 告警列表表格 -->
  <!-- 批量解决按钮 -->
</div>
```

#### 3.3 工具调用 Top N 排行

| 新增内容 | 实现方式 | 修改文件 |
|---------|---------|---------|
| 高频工具 Top 10 | 请求次数排序 | `health.ts`, `http-server.ts` |
| 问题工具 Top 10 | 错误次数排序 | `health.ts`, `http-server.ts` |
| 慢工具 Top 10 | 平均延迟排序 | `health.ts`, `http-server.ts` |

#### 3.4 配置在线编辑器

| 新增页面 | 功能 | 修改文件 |
|---------|-----|---------|
| 配置编辑页 | JSON 编辑器、实时校验 | `http-server.ts` |
| 配置备份恢复 | 备份列表、一键回滚 | `http-server.ts` |

**编辑器功能**：
- Monaco Editor 或 CodeMirror
- JSON Schema 实时校验
- 保存前格式化
- 备份版本列表

**验证方式**：
1. 点击趋势图表 → 数据正确展示 7 天趋势
2. 点击告警页面 → 显示告警列表 → 标记解决成功
3. Top N 排行正确显示高频/问题/慢工具
4. 配置编辑器实时校验错误 JSON

---

### Phase 4：导航结构完善（2人周）🧭 信息架构

**目标**：完善导航结构，信息架构完整

| 新增页面 | 功能 | 位置 |
|---------|-----|-----|
| 日志详情页 | 分页、筛选、搜索 | 导航第 3 项 |
| 统计分析页 | 趋势图表、Top N | 导航第 4 项 |
| 告警管理页 | 告警列表、解决 | 导航第 5 项 |
| 配置编辑页 | JSON 编辑、备份 | 导航第 6 项 |

**导航结构**：
```html
<nav>
  <a href="#overview" class="nav-item active">总览</a>
  <a href="#tools" class="nav-item">工具管理</a>
  <a href="#logs" class="nav-item">日志详情</a>
  <a href="#stats" class="nav-item">统计分析</a>
  <a href="#alerts" class="nav-item">告警管理</a>
  <a href="#config" class="nav-item">配置编辑</a>
</nav>
```

---

## 文件修改清单

| 文件 | Phase | 修改内容 |
|------|-------|---------|
| `src/routes/http-server.ts` | 1-4 | Toast、确认弹窗、新页面、导航 |
| `src/routes/health.ts` | 2-3 | P50/P95/P99、趋势数据、Top N |
| `src/features/mock.ts` | 2 | SQLite 持久化读写 |
| `src/database/connection.ts` | 2 | mock_configs 表定义 |
| `src/database/sqlite-logger.ts` | 2 | 分页查询、百分位数计算 |

---

## 实现顺序

```
Week 1: Phase 1（交互体验完善）
Week 2-3: Phase 2（数据深度增强）
Week 4-7: Phase 3（功能完整性）
Week 8-9: Phase 4（导航结构完善）
```

---

## 验证方式

### Phase 1 验证
```bash
# 启动服务
npm run build && node dist/index.js --http

# 测试 Toast
curl -X POST http://localhost:11112/api/mock -d '{"enabled":true}'
# 期望：Dashboard 显示 Toast「全局 Mock 已开启」

# 测试确认弹窗
点击「清空缓存」按钮 → 弹出确认弹窗 → 点击取消 → 缓存保留
```

### Phase 2 验证
```bash
# 测试 Mock 持久化
配置 Mock → 重启服务 → 检查 Mock 配置是否存在

# 测试分页筛选
curl "http://localhost:11112/api/logs?page=1&pageSize=20&toolName=getUser"
# 期望：返回指定工具的日志

# 测试百分位数
curl http://localhost:11112/api/dashboard
# 期望：返回 p50, p95, p99 字段
```

### Phase 3-4 验证
```bash
# 测试趋势图表
打开 Dashboard → 点击「统计分析」 → 查看 7 天趋势图

# 测试告警管理
打开 Dashboard → 点击「告警管理」 → 标记告警已解决

# 测试配置编辑
打开 Dashboard → 点击「配置编辑」 → 编辑 JSON → 保存 → 查看备份
```

---

*Generated by Claude Code | Date: 2026-04-19*