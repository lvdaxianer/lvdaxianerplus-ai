# lvdaxianerplus-ai

[English Version](./README.md)

一个为 AI 脚手架打造的命令和技能集合，用于提升代码质量和开发工作流。

## 命令

| 命令 | 描述 | 文档 |
|------|------|------|
| `/commit` | 使用 conventional commits 规范创建格式化的提交信息 | [指南](./commands/commit-zh.md) |
| `/git-merge` | AI 辅助的选择性提交合并工具 | [指南](./commands/git-merge-zh.md) |
| `/discuss` | 交互式需求收集命令 | [指南](./commands/discuss-zh.md) |
| `save-context` | 将重点保存到项目 context 文件 | [指南](./commands/save-context-zh.md) |

## 技能

| 技能 | 描述 | 文档 |
|------|------|------|
| `code-formatting-after-ai-generation` | 在 AI 生成代码后格式化清理代码 | [English](./skills/formatting-code/SKILL.md) / [中文](./skills/formatting-code/SKILL-zh.md) |

## 快速开始

### 安装命令

```bash
# 复制命令文件到全局命令目录
cp commands/commit.md ~/.claude/commands/
cp commands/git-merge.md ~/.claude/commands/
cp commands/discuss.md ~/.claude/commands/
cp commands/save-context.md ~/.claude/commands/
```

### 安装技能

```bash
# 复制技能文件夹到全局技能目录
cp -r skills/formatting-code ~/.claude/skills/
```

## 目录结构

```
lvdaxianerplus-ai/
├── commands/
│   ├── commit.md           # 工具（Tool）
│   ├── commit-zh.md        # 中文指南（Guide）
│   ├── commit-en.md        # 英文指南（Guide）
│   ├── git-merge.md        # 工具（Tool）
│   ├── git-merge-zh.md    # 中文指南（Guide）
│   ├── git-merge-en.md     # 英文指南（Guide）
│   ├── discuss.md          # 工具（Tool，中文）
│   ├── discuss-zh.md      # 中文指南（Guide）
│   ├── discuss-en.md      # 英文指南（Guide）
│   ├── save-context.md    # 工具（Tool）
│   ├── save-context-zh.md # 中文指南（Guide）
│   └── save-context-en.md # 英文指南（Guide）
├── skills/
│   └── formatting-code/
│       ├── SKILL.md       # 工具（Tool）
│       └── SKILL-zh.md    # 中文指南（Guide）
├── README.md              # 英文索引
├── README-zh.md           # 本文件（索引）
└── LICENSE
```

**说明：**
- 实际的命令文件（如 `commit.md`）是被 Claude 调用的命令
- `-zh.md` / `-en.md` 文件是用户使用指南，介绍如何安装和使用

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

**使用 AI 脚手架构建**
