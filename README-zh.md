# lvdaxianerplus-ai

[English Version](./README.md)

一个为 AI 脚手架打造的命令和技能集合，用于提升代码质量和开发工作流。

## 命令

| 命令 | 描述 |
|------|------|
| `/commit` | 使用 conventional commits 规范创建格式化的提交信息 |
| `/git-merge` | AI 辅助的选择性提交合并工具 |
| `/discuss` | 交互式需求收集命令 |

## 技能

| 技能 | 描述 |
|------|------|
| `save-context` | 自动将会话上下文保存到 .ai/context.md 文件（手动或首次工具调用触发） |
| `code-formatting-after-ai-generation` | 在 AI 生成代码后格式化清理代码 |
| `ddd` | DDD 最佳实践 |
| `code-review-spec` | 代码审查（文档和复杂度规范） |
| `product-manager` | 产品经理最佳实践 |
| `api-doc` | API 接口文档编写规范，包含各 HTTP 方法的完整示例 |

## 安装

### 命令

```bash
cp commands/*.md ~/.claude/commands/
```

### 技能

```bash
cp -r skills/* ~/.claude/skills/
```

### CLAUDE.md 上下文

部分技能（如 `code-review-spec`）已配置为项目级 CLAUDE.md 上下文，可自动加载：

```bash
cp context/CLAUDE.md /path/to/your/project/.claude/CLAUDE.md
```

## 全局 Hook 配置

如需在每次编辑时自动进行代码审查，可在 `~/.claude/settings.json` 中添加：

```json
{
  "permissions": {
    "allow": ["Skill(code-review-spec)", "Skill(save-context)", "Read", "Write", "Bash"]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{"type": "agent", "prompt": "Review using code-review-spec...", "timeout": 120}]
      },
      {
        "matcher": "Bash|Read|Edit|Write|Glob|Grep",
        "hooks": [{"type": "agent", "prompt": "Execute save-context skill...", "timeout": 60}]
      }
    ]
  }
}
```

---

**使用 AI 脚手架构建**
