# lvdaxianerplus-ai

[中文版本](./README-zh.md)

A collection of commands and skills for AI scaffolding to enhance code quality and development workflow.

## Commands

| Command | Description | Documentation |
|---------|-------------|---------------|
| `/commit` | Create well-formatted commits with conventional commit messages | [Guide](./commands/commit-en.md) |
| `/git-merge` | AI-assisted selective commit merging tool | [Guide](./commands/git-merge-en.md) |
| `/discuss` | Interactive requirement gathering command | [Guide](./commands/discuss-en.md) |
| `save-context` | Save key points to project context files | [Guide](./commands/save-context-en.md) |

## Skills

| Skill | Description | Documentation |
|-------|-------------|---------------|
| `code-formatting-after-ai-generation` | Format and clean up code after AI generates it | [English](./skills/formatting-code/SKILL.md) / [中文](./skills/formatting-code/SKILL-zh.md) |

## Quick Start

### Install Commands

```bash
# Copy command files to global commands directory
cp commands/commit.md ~/.claude/commands/
cp commands/git-merge.md ~/.claude/commands/
cp commands/discuss.md ~/.claude/commands/
cp commands/save-context.md ~/.claude/commands/
```

### Install Skills

```bash
# Copy skill folders to global skills directory
cp -r skills/formatting-code ~/.claude/skills/
```

## Directory Structure

```
lvdaxianerplus-ai/
├── commands/
│   ├── commit.md           # 工具（Tool）
│   ├── commit-zh.md        # 中文指南（Guide）
│   ├── commit-en.md        # 英文指南（Guide）
│   ├── git-merge.md        # 工具（Tool）
│   ├── git-merge-zh.md    # 中文指南（Guide）
│   ├── git-merge-en.md     # 英文指南（Guide）
│   ├── discuss.md          # 工具（Tool，英文）
│   ├── discuss-zh.md      # 中文指南（Guide）
│   ├── discuss-en.md      # 英文指南（Guide）
│   ├── save-context.md    # 工具（Tool）
│   ├── save-context-zh.md # 中文指南（Guide）
│   └── save-context-en.md # 英文指南（Guide）
├── skills/
│   └── formatting-code/
│       ├── SKILL.md       # 工具（Tool）
│       └── SKILL-zh.md    # 中文指南（Guide）
├── README.md              # English index
├── README-zh.md           # 中文索引
└── LICENSE
```

**Note:**
- The actual command files (e.g., `commit.md`) are the ones invoked by Claude
- The `-zh.md` / `-en.md` files are user guides explaining how to install and use

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with AI Scaffolding**
