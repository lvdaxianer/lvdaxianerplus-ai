# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-04-22

### Added

- ✨ **增强请求/响应转换模板**
  - 新增 template-engine.ts 模板引擎
  - 变量替换：`{param}`、`{timestamp}`、`{uuid}`、`{random}`、`{date}`、`{now}`
  - 嵌套字段访问：`{data.user.name}`、`{items[0].id}`
  - 表达式计算：`{{value + 10}}`、`{{value * 2}}`
  - 默认值语法：`{value|default}`、`{value ?? 'default'}`
  - 日期部分变量：`{year}`、`{month}`、`{day}`、`{hour}`、`{minute}`、`{second}`
  - 新增 RequestTransformConfig 配置类型
  - 增强 ResponseTransformConfig 配置类型
  - 支持 omit 字段排除、flatten 对象展平、defaultValues 默认值填充
  - 支持 expressions 表达式转换、addFields 新增字段

- ✨ **链路追踪 ID（Tracing）**
  - 新增 trace.ts 链路追踪模块
  - 生成唯一 Trace ID（UUID 或短 ID）
  - Trace ID 在请求生命周期中传递
  - 日志中包含 Trace ID
  - HTTP 响应头返回 Trace ID（X-Trace-ID）
  - 向后端传递 Trace ID
  - Dashboard API：`/api/trace/:id`、`/api/trace/recent`、`/api/trace/tool/:name`、`/api/trace/stats`
  - 新增 trace_logs 数据库表
  - 新增 TraceConfig 配置类型

- 📝 **文档更新**
  - 更新 README 功能表格，添加模板转换和链路追踪相关条目
  - 更新 CHANGELOG 版本记录

---

## [1.2.0] - 2026-04-22

### Added

- ✨ **SSE 模式支持**：持久连接，避免每次会话端口冲突
  - 新增 `--transport=sse` CLI 参数
  - 新增 `startSseServer` 函数
  - 支持 VSCode MCP 扩展 SSE 连接

- ✨ **工具级配置持久化**：SQLite 优先级机制
  - 首次启动：同步配置文件到 SQLite
  - 后续启动：使用 SQLite 配置，忽略配置文件
  - 工具级缓存配置持久化
  - 工具级 Mock 配置持久化

- ✨ **尝试次数限制（Attempt Tracking）**
  - 全局 `maxAttempts` 配置（默认 3 次）
  - 失败时返回 `metadata` 字段（尝试次数、剩余次数、建议）
  - 成功后清除尝试记录

- ✨ **工具描述增强字段**：`beforeDescription` 和 `afterDescription`
  - 可选字段，用于向 LLM 提供额外上下文
  - 返回给 MCP 客户端时拼接：`beforeDescription + description + afterDescription`
  - Dashboard 不显示这两个字段，仅显示 `description`

- ✨ **请求限流（Rate Limit）**
  - 令牌桶算法（Token Bucket）：允许突发流量
  - 滑动窗口算法（Sliding Window）：精确控制速率
  - 全局限流配置：`rateLimit.globalLimit`（默认 100/秒）
  - 工具级限流配置：`rateLimit.toolLimits`（优先级高于全局）
  - Dashboard API：`/api/rate-limit`、`/api/rate-limit/tools`

- ✨ **并发控制（Concurrency Control）**
  - 最大并发请求限制：`concurrency.maxConcurrent`（默认 50）
  - 等待队列机制：超出限制的请求进入队列等待
  - 队列超时配置：`concurrency.queueTimeout`（默认 30 秒）
  - Dashboard API：`/api/concurrency`

- ✨ **超时强制中断（Timeout Abort）**
  - AbortController 强制中断机制：防止请求无限等待
  - 全局超时配置：`timeout.read`（默认 30 秒）
  - 工具级超时配置：`tools[name].timeout`（优先级高于全局）
  - Dashboard API：`/api/timeout`

### Fixed

- 🔧 **缓存 TTL 修复**：TTL=0 永不过期
  - 修复 LRUCache 自动过期导致缓存数据丢失
  - 修复 `initCache` 每次调用清除已有数据
  - 支持每条目 TTL（工具级缓存）

- 🔧 **SSE 连接修复**
  - 使用 SSEServerTransport（而非 StreamableHTTPServerTransport）
  - 移除多余的 `transport.start()` 调用
  - 存储 `{ server, transport }` 确保消息处理

### Changed

- 📝 完善 README 文档
  - 添加 MCP 配置方式（SSE / STDIO）
  - 添加核心能力说明（8 项功能）
  - 添加故障排查指南

---

## [1.1.0] - 2026-04-21

### Fixed

- 🔧 修复 SQLite 日志记录失败问题（named parameter 缺失）

### Added

- ✨ 新增 Dashboard 分页日志查询 API
- ✨ 新增工具级缓存配置管理 API
- ✨ 新增工具级 Mock 配置管理 API

### Changed

- 📝 完善 README 文档，添加 API 端点说明和故障排查章节

---

## [1.0.0] - 2026-04-19

### Added

- 🎉 初始版本发布
- ✨ **熔断器（Circuit Breaker）**
  - CLOSED / OPEN / HALF_OPEN 状态流转
  - 故障阈值配置
- ✨ **降级策略（Fallback）**
  - 缓存兜底（忽略 TTL）
  - Mock 数据兜底
- ✨ **缓存机制**
  - LRU 缓存策略
  - TTL 过期控制
  - 工具级缓存配置
- ✨ **Mock 模式**
  - 全局 Mock 开关
  - 工具级 Mock 配置
  - 动态数据生成
- ✨ **SQLite 日志记录**
  - 请求日志
  - 响应日志
  - 错误日志
- ✨ **Dashboard 监控面板**
  - 实时统计
  - 日志查询
  - 配置编辑
  - 热更新

---

## Links

[1.2.0]: https://github.com/lvdaxianer/lvdaxianerplus-ai/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/lvdaxianer/lvdaxianerplus-ai/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/lvdaxianer/lvdaxianerplus-ai/releases/tag/v1.0.0