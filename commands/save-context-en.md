# Save Context Command

Save key points to project's `.ai/context.md` file.

## Install

### Claude Code

```bash
cp commands/save-context.md ~/.claude/commands/save-context.md
```

### OpenCode

```bash
cp commands/save-context.md ~/.opencode/commands/save-context.md
```

## Usage

### Claude Code / OpenCode

```text
# Save general key point
重点：All APIs must return unified format

# Save module-specific key point (saves to both files)
重点-editor：Editor uses Virtual DOM
重点-api：RESTful APIs use plural nouns
```

## Save Locations

| Input Format | Save Location |
|--------------|---------------|
| `重点：xxx` | `.ai/context.md` |
| `重点-模块名：xxx` | `.ai/模块名-context.md` + `.ai/context.md` |

## Use Cases

- Record important design decisions
- Record technical specifications and constraints
- Record project key information

## Workflow

1. Detect "重点：" prefix in user input
2. AI refines content based on conversation context
3. Show confirmation UI
4. User confirms, write to file
5. Update both general context and module-specific context

## Example

User inputs: `重点-editor：编辑器要用 Virtual DOM`

Save results:
- `.ai/editor-context.md`: Editor-specific key point
- `.ai/context.md`: Key point marked with `[Editor]` tag

## Related Links

- [中文版本](./commands/save-context-zh.md)
