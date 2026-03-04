# lvdaxianerplus-ai

[中文版本](./README-zh.md)

A collection of commands and skills for AI scaffolding to enhance code quality and development workflow.

## About

This repository contains custom commands and skills designed for **AI scaffolding** - an open-source AI-powered CLI tool that helps developers with software engineering tasks.

### What is AI Scaffolding?

**AI scaffolding** is an open source AI assistant that integrates with your development workflow. It can:
- Write and edit code
- Execute commands
- Search and navigate codebases
- Execute complex multi-step tasks

Visit to learn more.

## Commands and Skills Included

### 1. Git Merge Command

Selective commit merging tool with two modes:
- **Quick Mode**: Fast execution via parameters (e.g., `-t=main -c=2`)
- **Interactive Mode**: Dropdown selection for flexible configuration

**Features:**
- Cherry-pick or Rebase merge modes
- Quick mode: specify target branch and commit count directly
- Interactive mode: dropdown selection for source/target/commits
- Conflict resolution guidance

**Usage:**

```bash
# Quick mode (recommended)
/git-merge -t=main -c=2              # Cherry-pick last 2 commits to main
/git-merge -t=main -c=2 -m=rebase   # Use rebase mode
/git-merge -s=feature-A -t=main -c=1 # Specify source branch

# Interactive mode
/git-merge                    # Full interactive selection
/git-merge -t=main           # Specify target, select source interactively
```

**Arguments:**
| Argument | Short | Description | Required |
|----------|-------|-------------|----------|
| `--target` | `-t` | Target branch | Yes* |
| `--source` | `-s` | Source branch | No (default: current) |
| `--count` | `-c` | Number of commits | No (quick mode) |
| `--mode` | `-m` | Merge mode: `pick`/`rebase` | No (default: pick) |

### 2. Code Formatting After AI Generation

Automatically formats and cleans up code after AI generates it.

**Features:**
- Remove unused imports
- Sort imports alphabetically
- Remove unused private methods
- Add missing Javadoc comments

**Supported Languages:**
- Java
- JavaScript / TypeScript
- Python
- Go

**Usage:**

```bash
Use the code-formatting-after-ai-generation skill
```

## How to Install

### Install Commands

Commands are stored in the `commands/` directory. To use a command:

1. Copy the command file to global commands directory:
```bash
cp -r commands/git-merge.md ~/.claude/commands/
```

2. Or copy to project-local commands directory:
```bash
cp -r commands/git-merge.md <your-project>/.claude/commands/
```

3. Use the command:
```bash
/git-merge -t=main -c=2
```

### Install Skills

Skills are stored in the `skills/` directory. To use a skill:

1. Copy the skill folder to global skills directory:
```bash
cp -r skills/formatting-code ~/.claude/skills/
```

2. Or copy to project-local skills directory:
```bash
cp -r skills/formatting-code <your-project>/.claude/skills/
```

2. Use the skill:
```bash
Use the code-formatting-after-ai-generation skill
```

### Directory Structure

```
lvdaxianerplus-ai/
├── commands/
│   └── git-merge.md      # Git merge command
├── skills/
│   └── formatting-code/  # Code formatting skill
├── README.md             # English documentation
├── README-zh.md          # Chinese documentation
└── LICENSE               # MIT License
```

## Requirements

- **Supported Languages:** Java, JavaScript, TypeScript, Python, Go
- **Optional Tools:**
  - ESLint (for JavaScript/TypeScript)
  - google-java-format (for Java)
  - isort (for Python)
  - goimports (for Go)

## Contributing

Contributions are welcome! Please feel free to:
- Submit issues
- Create pull requests
- Share your own skills

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with AI Scaffolding** 🤖
