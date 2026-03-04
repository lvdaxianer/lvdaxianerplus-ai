# lvdaxianerplus-ai

[English Version](./README.md)

一个为 AI 脚手架打造的命令和技能集合，用于提升代码质量和开发工作流。

## 关于

本仓库包含为 **AI 脚手架** 设计的自定义命令和技能——一个帮助开发者完成软件工程任务的开源 AI CLI 工具。

### 什么是 AI 脚手架？

**AI 脚手架** 是一款集成到开发工作流中的开源 AI 助手，它可以：
- 编写和编辑代码
- 执行命令
- 搜索和浏览代码库
- 执行复杂的多步骤任务

## 包含的命令和技能

### 1. Git 合并命令

选择性合并提交的工具，支持两种模式：
- **快捷模式**：通过参数快速执行（如 `-t=main -c=2`）
- **交互模式**：通过下拉列表选择，灵活配置

**功能：**
- 支持 Cherry-pick 或 Rebase 合并模式
- 快捷模式：直接指定目标分支和提交数
- 交互模式：下拉选择源/目标/提交
- 冲突解决引导

**使用方法：**

```bash
# 快捷模式（推荐）
/git-merge -t=main -c=2              # 将前2个提交 cherry-pick 到 main
/git-merge -t=main -c=2 -m=rebase   # 使用 rebase 模式
/git-merge -s=feature-A -t=main -c=1 # 指定源分支

# 交互模式
/git-merge                    # 完全交互式选择
/git-merge -t=main           # 指定目标，交互选择源
```

**参数：**
| 参数 | 缩写 | 说明 | 必需 |
|------|------|------|------|
| `--target` | `-t` | 目标分支 | 是* |
| `--source` | `-s` | 源分支 | 否（默认当前分支） |
| `--count` | `-c` | 提交数 | 否（快捷模式） |
| `--mode` | `-m` | 合并方式：`pick`/`rebase` | 否（默认 pick） |

### 2. AI 代码生成后格式化

在 AI 生成代码后自动格式化和清理代码。

**功能：**
- 移除未使用的 import
- 按字母顺序排序 import
- 移除未使用的私有方法
- 添加缺失的 Javadoc 注释

**支持的语言：**
- Java
- JavaScript / TypeScript
- Python
- Go

**使用方法：**

```bash
使用 code-formatting-after-ai-generation 技能
```

## 如何安装

### 安装命令

命令存放在 `commands/` 目录下。使用方法：

1. 将命令文件复制到全局命令目录：
```bash
cp -r commands/git-merge.md ~/.claude/commands/
```

2. 或者复制到项目本地命令目录：
```bash
cp -r commands/git-merge.md <你的项目>/.claude/commands/
```

3. 使用命令：
```bash
/git-merge -t=main -c=2
```

### 安装技能

技能存放在 `skills/` 目录下。使用方法：

1. 将技能文件夹复制到全局技能目录：
```bash
cp -r skills/formatting-code ~/.claude/skills/
```

2. 或者复制到项目本地技能目录：
```bash
cp -r skills/formatting-code <你的项目>/.claude/skills/
```

3. 使用技能：
```bash
使用 code-formatting-after-ai-generation 技能
```

## 目录结构

```
lvdaxianerplus-ai/
├── commands/
│   └── git-merge.md      # Git 合并命令
├── skills/
│   └── formatting-code/  # 代码格式化技能
├── README.md             # 英文文档
├── README-zh.md          # 中文文档
└── LICENSE               # MIT 许可证
```

## 环境要求

- **支持的语言：** Java、JavaScript、TypeScript、Python、Go
- **可选工具：**
  - ESLint（用于 JavaScript/TypeScript）
  - google-java-format（用于 Java）
  - isort（用于 Python）
  - goimports（用于 Go）

## 贡献

欢迎贡献！请随时：
- 提交问题
- 创建拉取请求
- 分享你自己的技能

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

**使用 AI 脚手架构建** 🤖
