# Commit 命令

使用 Conventional Commits 规范创建格式化的 Git 提交信息。

## 安装

### Claude Code

```bash
cp commands/commit.md ~/.claude/commands/commit.md
```

### OpenCode

```bash
cp commands/commit.md ~/.opencode/commands/commit.md
```

## 使用方法

### Claude Code

```bash
# 基本用法
/commit

# 跳过预提交检查
/commit --no-verify

# 创建详细格式的提交信息
/commit --style=full

# 指定提交类型
/commit --style=full --type=feat
```

### OpenCode

```text
/commit
/commit --no-verify
/commit --style=full
/commit --style=full --type=feat
```

## 参数说明

| 参数 | 说明 |
|------|------|
| `--no-verify` | 跳过 lint、build 等预提交检查 |
| `--style=simple` | 简洁单行格式（默认） |
| `--style=full` | 详细格式，包含正文和脚注 |
| `--type` | 指定提交类型：feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert |

## 示例

```bash
# 简单提交
/commit
# ✨ feat: add user login

# 详细提交
/commit --style=full
# ✨ feat(auth): add JWT token validation
#
# 实现 JWT 令牌验证中间件...
#
# BREAKING CHANGE: API 现需要 Bearer 令牌
```

## 相关链接

- [英文版本](./commands/commit-en.md)
