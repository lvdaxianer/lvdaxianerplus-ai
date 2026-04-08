# lvdaxianerplus-ai

[中文版本](./README-zh.md)

A collection of commands and skills for AI scaffolding to enhance code quality and development workflow.

## Commands

| Command | Description |
|---------|-------------|
| `/commit` | Create well-formatted commits with conventional commit messages |
| `/git-merge` | AI-assisted selective commit merging tool |
| `/discuss` | Interactive requirement gathering command |

## Skills

| Skill | Description |
|-------|-------------|
| `save-context` | Auto-save session context to .ai/context.md files (triggered manually or on first tool call) |
| `code-formatting-after-ai-generation` | Format and clean up code after AI generates it |
| `ddd` | Domain-Driven Design best practices |
| `code-review-spec` | Code review with documentation and complexity standards |
| `product-manager` | Product management best practices |
| `api-doc` | API documentation writing specification with examples for all HTTP methods |

## Install

### Commands

```bash
cp commands/*.md ~/.claude/commands/
```

### Skills

```bash
cp -r skills/* ~/.claude/skills/
```

### CLAUDE.md Context

Some skills (like `code-review-spec`) are configured as project-level CLAUDE.md context and load automatically:

```bash
cp context/CLAUDE.md /path/to/your/project/.claude/CLAUDE.md
```

## Global Hook Configuration

For automatic code review on every edit, add to `~/.claude/settings.json`:

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

**Built with AI Scaffolding**
