# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- 修复 SQLite 日志记录失败问题 (5a14fac)

- before write_file (c6f2dcc)

### Changed
- before patch (70542f4)

- before patch (80b491b)

### Changed
- 更新变更日志 (fb8123c)

- 添加 MCP 架构图生成器完整实现 (83be717)

### Changed
- initialize speckit workflow for mcp-arch-diagram (fbf89b0)

- 更新渲染方案为 Puppeteer 内置渲染 (f2b2105)

### Changed
- 添加 mcp-arch-diagram 设计文档 (e7cead4)

- 更新变更日志 (d50c8cb)

### Changed
- 清理临时文件和更新配置 (91cc2d3)

- 更新依赖和配置文件 (fb7d274)

### Changed
- 精简文档，聚焦核心能力 (e8dc0b5)

- 添加 Dashboard 改造故事线文档 (ee9f3f6)

### Changed
- 增强 Mock 工具功能 (309bec3)

- 增强 SQLite 日志持久化功能 (90ed1d7)

### Changed
- 集成 handlers 和 EJS 模板 (8d1d32e)

- 使用 EJS 模板替代硬编码 HTML (2d22b75)

### Changed
- 拆分路由处理为独立 handler 模块 (603dcd0)

- 重构代码审查规范，提取代码示例并新增多个规范章节 (c282aee)

### Changed
- 增强 Dashboard 功能和 SQLite 持久化日志 (729f7f1)

- 添加 MCP HTTP Gateway 服务 (678299f)

### Changed
- 增强代码审查规范 (6ec63ee)

- 将浏览器测试改为可选，移除强制要求 (6eadabe)

### Changed
- 增强故事线技能测试场景覆盖和 Chrome DevTools 测试要求 (c0b9a49)

- 更新变更日志 (951053d)

### Changed
- 更新变更日志 (76ed121)

- 更新变更日志 (d1e6096)

### Changed
- 添加故事线编写技能 (story-line) (031066e)

- 规范化 CHANGELOG 格式 (2dec3c4)

### Added
- 添加故事线编写技能 (story-line)，由 Superpowers brainstorm 驱动，支持 Chrome DevTools MCP 测试验证

### Changed
- 更新变更日志 (3031d35)
- 更新 Spec-Kit 规范说明和变更日志 (51b2f6b)
- 添加循环内禁止调用远程服务或数据库规范 (269f7d2)
- 添加 if-else 强制配对规范 (48a8c92)
- 拆分文档为 Spec-Kit 和 OpenSpec 双文档并更新 README (0bec5d8)
- 更新 README 添加 api-doc skill (dda038c)
- 添加 API 接口文档编写规范 skill (83e7cde)
- 将作者标识从乌骓修改为 lvdaxianerplus (64db6ec)
- 完善代码审查清单格式 (4385f6c)
- 完善代码审查清单，标记全部为强制要求 (7510451)
- 添加代码审查新规范 (ad1bef8)
- 添加 CLAUDE.md 上下文配置说明 (9b3c53f)
- 增强错误记录功能 (46690d1)
- 更新 CHANGELOG (fd03fb7)
- 更新注释比例要求和作者标识 (1ac53cc)
- 更新 CHANGELOG (a4c2b06)
- 清理旧的命令文件 (0158177)
- 简化 README 文档结构 (e09bfb7)
- 重构为双重触发机制 skill (28ce628)
- 新增全局 Hook 配置指南 (ab2de56)
- 将 code-review-spec 从 context 迁移到 skills 目录 (e8a6ba4)
- 新增产品经理 Skill (cac4d36)
- 新增 DDD 最佳实践 Skill (aba792e)
- 扩展 code-review-spec.md 多语言示例覆盖 (bd81ca7)
- 重构项目上下文结构为 code-review-spec.md (b12f5d6)
- 更新 CHANGELOG (58cdae3)
- 更新 CHANGELOG (4e46ee8)
- 重构项目上下文结构并更新文档 (5794d66)
- add project context and update gitignore (7274dbe)
- update README index files with guide links (0978c75)
- add formatting-code skill guide files (2aa73ce)
- add save-context command guide files (8373594)
- add discuss command guide files (e93f505)
- add git-merge command guide files (4f7823a)
- add commit command guide files (2a5a444)
- 新增 /commit 命令 (6c91712)
- 更新 README 文档，反映 save-context 重构 (4f69846)
- 重构 save-context skill 为 commands 目录结构 (e41b71a)
- 更新 CHANGELOG，添加 recent changes 记录 (a4aff56)
- 新增需求讨论命令 /discuss (73bb445)
- 更新 save-context skill，增强 AI 上下文理解与提炼功能 (bf44afa)
- 更新 README 文档，添加 save-context skill 说明 (b58b022)
- 添加 AI 理解与用户确认流程 (7a0e9a4)
- 添加 save-context skill 最佳实践案例 (69221a9)
- 更新 save-context skill，触发词改为"重点"，支持双文件更新 (ab12bf8)
- 添加 save-context-note skill，支持保存注意事项到 .ai/context (50003b8)
- 更新 git-merge 命令，添加 AI 辅助选择提交功能 (8bd7ed6)
- 更新 git-merge 命令文档 (ecbd9e7)
- add git-merge command and reorganize project structure (23b5d26)
- 更新 CHANGELOG (3df5e2a)
- 更新 README 区分 OpenCode 和 Claude Code (4c188e0)
- 添加代码格式化 SKILL 支持 (447adbd)
