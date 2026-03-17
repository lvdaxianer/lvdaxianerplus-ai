# Save Context 命令

将重点内容保存到项目的 `.ai/context.md` 文件中。

## 安装

### Claude Code

```bash
cp commands/save-context.md ~/.claude/commands/save-context.md
```

### OpenCode

```bash
cp commands/save-context.md ~/.opencode/commands/save-context.md
```

## 使用方法

### Claude Code / OpenCode

```text
# 保存通用重点
重点：所有接口必须返回统一格式

# 保存模块特定重点（同时保存到两个文件）
重点-editor：编辑器使用 Virtual DOM
重点-api：RESTful API 使用名词复数形式
```

## 保存位置

| 输入格式 | 保存位置 |
|---------|---------|
| `重点：xxx` | `.ai/context.md` |
| `重点-模块名：xxx` | `.ai/模块名-context.md` + `.ai/context.md` |

## 使用场景

- 记录重要的设计决策
- 记录技术规范和约束
- 记录项目重点信息

## 工作流程

1. 检测用户输入的"重点："前缀
2. AI 结合对话上下文提炼内容
3. 呈现确认界面
4. 用户确认后写入文件
5. 同时更新通用 context 和模块特定 context

## 示例

用户输入：`重点-editor：编辑器要用 Virtual DOM`

保存结果：
- `.ai/editor-context.md`: 编辑器相关重点
- `.ai/context.md`: 标记为 `[Editor]` 的通用重点

## 相关链接

- [英文版本](./commands/save-context-en.md)
