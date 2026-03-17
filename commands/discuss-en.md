# Discuss Command

Interactive requirement gathering command for collecting project requirements.

## Install

### Claude Code

```bash
cp commands/discuss.md ~/.claude/commands/discuss.md
```

### OpenCode

```bash
cp commands/discuss.md ~/.opencode/commands/discuss.md
```

## Usage

### Claude Code / OpenCode

```text
# Interactive mode - answer questions step by step
/discuss

# Quick mode - specify requirement directly
/discuss User Login API
```

## How It Works

1. **Confirm Role**: Developer, Journalist, Product Manager, Designer, etc.
2. **Use Case**: Describe the specific scenario
3. **Role Considerations**: Select relevant factors based on role
4. **Priority**: P0 (urgent) to P3 (low)
5. **Acceptance Criteria**: Define what "done" means
6. **Other Details**: Deadline, budget, dependencies, constraints

## Supported Roles

- Developer
- Journalist
- Product Manager
- Designer
- Operations
- Data Analyst
- QA Engineer
- Project Manager
- Marketing
- Customer Support

## Output

Requirements are saved to `.ai/requirements-[feature].md` in your project.

## Related Links

- [中文版本](./commands/discuss-zh.md)
