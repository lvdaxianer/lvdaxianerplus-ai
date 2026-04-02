# Code Review Spec - 全局自动触发配置指南

本文档说明如何配置 Claude Code 实现代码审查的**自动触发**功能。

---

## 目录

- [概述](#概述)
- [配置步骤](#配置步骤)
- [文件位置](#文件位置)
- [工作流程](#工作流程)
- [验证配置](#验证配置)
- [常见问题](#常见问题)

---

## 概述

通过配置 `PostToolUse` Hook，可以在以下场景**自动触发** code-review-spec skill：

| 触发条件 | 描述 |
|---------|------|
| `Edit` | 修改代码文件后 |
| `Write` | 写入新文件后 |

**检查范围**：
- 类/方法 Javadoc 注释
- 注释占比 ≥40%
- 命名规范
- 方法行数限制（≤20行）
- 安全规范
- 异常处理
- 日志规范
- 代码复杂度约束

---

## 配置步骤

### 1. 配置文件

需要在 `~/.claude/settings.json` 中添加以下配置：

```json
{
  "permissions": {
    "allow": [
      "Skill(code-review-spec)",
      "Read"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "agent",
            "prompt": "Review the modified code file using code-review-spec skill.\n\nExtract the file path from the hook arguments ($ARGUMENTS), read the file, and check:\n- Class and method documentation (Javadoc/comments)\n- Comment ratio (must be ≥40%)\n- Naming conventions\n- Method length (≤20 lines)\n- Security, exception handling, logging standards\n- Code complexity limits\n\nIMPORTANT: \n1. Only review and fix code files (.java, .ts, .tsx, .js, .py, .go, .vue, .sql, etc.)\n2. Do NOT edit .claude directory, skills directory, or settings files\n3. Only fix CRITICAL issues - missing class/method comments, comment ratio <40%, method length >20 lines\n4. Report findings briefly, do not overwhelm\n\nHook arguments: $ARGUMENTS",
            "timeout": 120,
            "statusMessage": "Running code review..."
          }
        ]
      }
    ]
  }
}
```

### 2. 配置说明

| 配置项 | 说明 |
|-------|------|
| `matcher` | 匹配工具名称，支持正则表达式，如 `Edit\|Write` |
| `type: agent` | 使用 Agent 执行代码审查 |
| `prompt` | Agent 的提示词，包含审查规则 |
| `timeout` | 超时时间（秒） |
| `statusMessage` | 状态栏显示消息 |

### 3. Skill 文件位置

将 skill 文件放置到全局目录：

```
~/.claude/skills/code-review-spec/SKILL.md
```

---

## 文件位置

```
~/.claude/
├── settings.json          # 全局配置（包含 hook）
└── skills/
    └── code-review-spec/
        └── SKILL.md      # Skill 定义文件
```

---

## 工作流程

```
1. 用户编辑代码 (Edit/Write)
         ↓
2. PostToolUse Hook 触发
         ↓
3. Agent 执行 code-review-spec skill
         ↓
4. 审查代码并报告问题
         ↓
5. 如有严重问题，自动修复
```

---

## 验证配置

### 1. 检查 JSON 语法

```bash
jq empty ~/.claude/settings.json && echo "JSON 有效"
```

### 2. 重启 Claude Code

```
/hooks
```

或重启 Claude Code 应用以加载新配置。

### 3. 测试触发

编辑任意代码文件，观察是否触发代码审查。

---

## 常见问题

### Q: Hook 没有触发？

1. 检查 `~/.claude/settings.json` JSON 语法是否正确
2. 运行 `/hooks` 确认 hook 已加载
3. 重启 Claude Code

### Q: 如何禁用自动触发？

删除 `~/.claude/settings.json` 中的 `hooks` 配置项。

### Q: 如何限制只审查特定文件类型？

当前配置已默认限制代码文件（.java, .ts, .tsx, .js, .py, .go, .vue, .sql）。

如需进一步限制，修改 `prompt` 中的文件类型判断逻辑。

### Q: 权限不足？

确保 `permissions.allow` 中包含：
- `Skill(code-review-spec)`
- `Read`

---

## 相关文档

- [SKILL.md](./SKILL.md) - Skill 详细定义
- [Claude Code Hooks 文档](https://docs.claude.code/hooks)
