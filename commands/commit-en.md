# Commit Command

Create well-formatted Git commit messages using Conventional Commits specification.

## Install

### Claude Code

```bash
cp commands/commit.md ~/.claude/commands/commit.md
```

### OpenCode

```bash
cp commands/commit.md ~/.opencode/commands/commit.md
```

## Usage

### Claude Code

```bash
# Basic usage
/commit

# Skip pre-commit checks
/commit --no-verify

# Create detailed commit with body and footer
/commit --style=full

# Specify commit type
/commit --style=full --type=feat
```

### OpenCode

```text
/commit
/commit --no-verify
/commit --style=full
/commit --style=full --type=feat
```

## Options

| Option | Description |
|--------|-------------|
| `--no-verify` | Skip lint, build pre-commit checks |
| `--style=simple` | Single-line format (default) |
| `--style=full` | Detailed format with body and footer |
| `--type` | Commit type: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert |

## Examples

```bash
# Simple commit
/commit
# ✨ feat: add user login

# Detailed commit
/commit --style=full
# ✨ feat(auth): add JWT token validation
#
# Implement JWT token validation middleware...
#
# BREAKING CHANGE: API now requires Bearer token
```

## Related Links

- [中文版本](./commands/commit-zh.md)
