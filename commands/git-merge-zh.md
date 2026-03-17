# Git Merge 命令

AI 辅助的 Git 选择性合并工具，智能分析提交历史并推荐要合并的提交。

## 安装

### Claude Code

```bash
cp commands/git-merge.md ~/.claude/commands/git-merge.md
```

### OpenCode

```bash
cp commands/git-merge.md ~/.opencode/commands/git-merge.md
```

## 快速使用

### Claude Code / OpenCode

```text
# 快速模式：将当前分支的 1 个提交合并到 main
/git-merge -t main

# 合并 2 个提交
/git-merge -t main -c 2

# 使用 rebase 模式
/git-merge -t main -c 3 -m rebase

# 指定源分支
/git-merge -s feature-auth -t main

# 交互模式（完整选择）
/git-merge
```

## 参数说明

| 参数 | 简写 | 说明 |
|------|------|------|
| `--target` | `-t` | 目标分支（必填） |
| `--source` | `-s` | 源分支（默认当前分支） |
| `--count` | `-c` | 要合并的提交数（默认 1） |
| `--mode` | `-m` | 合并方式：pick（默认）或 rebase |

## 两种模式

**快速模式**：适合已知要合并哪些提交的场景
- 使用 `-t` 指定目标分支
- AI 自动分析并推荐提交

**交互模式**：适合不确定要合并哪些提交的场景
- 纯 `/git-merge` 启动
- AI 智能分析提交相关性并推荐

## 相关链接

- [英文版本](./commands/git-merge-en.md)
