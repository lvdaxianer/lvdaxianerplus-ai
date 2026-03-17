# Git Merge Command

AI-assisted Git selective merge tool that analyzes commit history and recommends commits to merge.

## Install

### Claude Code

```bash
cp commands/git-merge.md ~/.claude/commands/git-merge.md
```

### OpenCode

```bash
cp commands/git-merge.md ~/.opencode/commands/git-merge.md
```

## Quick Usage

### Claude Code / OpenCode

```text
# Quick mode: merge 1 commit from current branch to main
/git-merge -t main

# Merge 2 commits
/git-merge -t main -c 2

# Use rebase mode
/git-merge -t main -c 3 -m rebase

# Specify source branch
/git-merge -s feature-auth -t main

# Interactive mode (full selection)
/git-merge
```

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--target` | `-t` | Target branch (required) |
| `--source` | `-s` | Source branch (default: current branch) |
| `--count` | `-c` | Number of commits to merge (default: 1) |
| `--mode` | `-m` | Merge mode: pick (default) or rebase |

## Two Modes

**Quick Mode**: When you know which commits to merge
- Use `-t` to specify target branch
- AI automatically analyzes and recommends commits

**Interactive Mode**: When unsure which commits to merge
- Use `/git-merge` alone
- AI analyzes commit relevance and recommends

## Related Links

- [中文版本](./commands/git-merge-zh.md)
