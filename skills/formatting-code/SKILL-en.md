# Code Formatting Skill

Auto-formatting skill for AI-generated code.

## Install

### Claude Code

```bash
cp -r skills/formatting-code ~/.claude/skills/formatting-code
```

### OpenCode

```bash
cp -r skills/formatting-code ~/.opencode/skills/formatting-code
```

## Usage

Automatically triggered after AI generates code, or manually invoke:

```
Use code-formatting-after-ai-generation skill
```

## Features

1. **Remove unused imports**
2. **Sort imports alphabetically**
3. **Remove unused private methods**
4. **Add missing Javadoc comments**

## Supported Languages

| Language | Unused Import | Import Sort |
|----------|----------------|--------------|
| Java | IDE / SpotBugs | google-java-format |
| JavaScript | ESLint | eslint-plugin-import |
| TypeScript | ESLint | eslint-plugin-import |
| Python | flake8 / isort | isort |
| Go | goimports | goimports |

## Comment Standards

Required comments for:
- All public classes
- All public/protected methods
- Methods with complex logic

Simple getters/setters don't need comments.

## Skip Files

These files are not formatted:
- `*_generated*.java`
- `*.gen.ts`
- `__pycache__/*`
- `node_modules/*`

## Related Links

- [中文版本](./skills/formatting-code/SKILL-zh.md)
