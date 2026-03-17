# Discuss 命令

交互式需求收集命令，通过提问收集项目需求。

## 安装

### Claude Code

```bash
cp commands/discuss.md ~/.claude/commands/discuss.md
```

### OpenCode

```bash
cp commands/discuss.md ~/.opencode/commands/discuss.md
```

## 使用方法

### Claude Code / OpenCode

```text
# 交互模式 - 逐步回答问题
/discuss

# 快速模式 - 直接指定需求
/discuss 用户登录接口
```

## 工作流程

1. **确认角色**：开发者、记者、产品经理、设计师等
2. **使用场景**：描述具体场景
3. **角色考虑**：根据角色选择相关因素
4. **优先级**：P0（紧急）到 P3（低）
5. **验收标准**：定义"完成"的标准
6. **其他详情**：截止日期、预算、依赖、约束

## 支持的角色

- 开发者
- 记者
- 产品经理
- 设计师
- 运营人员
- 数据分析师
- 测试工程师
- 项目经理
- 营销人员
- 客服人员

## 输出

需求保存到项目的 `.ai/requirements-[功能].md` 文件。

## 相关链接

- [英文版本](./commands/discuss-en.md)
