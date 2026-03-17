# Code Formatting Skill

AI 生成代码后的自动格式化技能。

## 安装

### Claude Code

```bash
cp -r skills/formatting-code ~/.claude/skills/formatting-code
```

### OpenCode

```bash
cp -r skills/formatting-code ~/.opencode/skills/formatting-code
```

## 使用方法

在 AI 生成代码后自动触发，或手动调用：

```
Use code-formatting-after-ai-generation skill
```

## 功能

1. **移除未使用的导入**
2. **按字母顺序排序导入**
3. **移除未使用的私有方法**
4. **添加缺失的 Javadoc 注释**

## 支持语言

| 语言 | 未使用导入 | 导入排序 |
|------|-----------|---------|
| Java | IDE / SpotBugs | google-java-format |
| JavaScript | ESLint | eslint-plugin-import |
| TypeScript | ESLint | eslint-plugin-import |
| Python | flake8 / isort | isort |
| Go | goimports | goimports |

## 注释规范

需要添加注释的：
- 所有公共类
- 所有 public/protected 方法
- 包含复杂逻辑的方法

简单 getter/setter 无需注释。

## 跳过文件

以下文件不格式化：
- `*_generated*.java`
- `*.gen.ts`
- `__pycache__/*`
- `node_modules/*`

## 相关链接

- [英文版本](./skills/formatting-code/SKILL-en.md)
