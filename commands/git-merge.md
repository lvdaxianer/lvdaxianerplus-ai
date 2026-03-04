# Claude 命令: Git Merge

AI 辅助的代码合并工具。通过 AI 分析提交历史和代码变更，智能推荐需要合并的提交，让选择性合并更高效。

## 使用方法

### 快速模式（推荐）

```bash
/git-merge -t main                    # 从当前分支合并1个提交到 main（默认 -c=1）
/git-merge -t main -c 2               # 从当前分支合并2个提交到 main
/git-merge -t main -c 3 -m rebase    # 使用 rebase 模式，合并3个提交
/git-merge -s feature-A -t main       # 从 feature-A 合并1个提交到 main
/git-merge -s feature-A -t main -c 2  # 从 feature-A 合并2个提交到 main
```

### 交互模式

```bash
/git-merge                    # 完全交互式选择
```

## 参数

| 参数 | 简写 | 描述 | 值 | 必填 | 默认值 |
|------|------|------|-----|------|--------|
| `--target` | `-t` | 目标分支（合并到的分支） | 分支名 | 快速模式必填* | 无 |
| `--source` | `-s` | 源分支（包含要合并的提交） | 分支名 | 否 | 当前分支 |
| `--count` | `-c` | 要合并的最近提交数量 | 数字 | 否 | 1 |
| `--mode` | `-m` | 合并方式 | `pick` / `rebase` | 否 | `pick` |

*快速模式下必填（当提供 -t 时）

### --mode 取值

| 值 | 描述 |
|----|------|
| `pick` | Cherry-pick，不会更改目标分支历史（默认） |
| `rebase` | 变基到目标分支，直线历史 |

## 参数处理逻辑

### 模式判断

```
如果提供了 -t/--target：
    → 快速模式
否则：
    → 交互模式（纯 /git-merge）
```

### 快速模式逻辑

```
1. -t/--target 必填 → 未提供则报错
2. -s/--source 可选，默认为当前分支
3. -c/--count 可选，默认为 1
4. -m/--mode 可选，默认为 pick
5. 验证分支是否存在
6. 获取提交列表（AI 分析提交内容）
7. AI 推荐要合并的提交
8. 执行合并
```

### 交互模式逻辑

```
1. -s/--source → 下拉选择
2. -t/--target → 下拉选择
3. AI 分析源分支的提交历史和变更内容
4. AI 智能推荐需要合并的提交（通过复选框多选）
5. -m/--mode → 下拉选择
6. 确认执行
7. 执行合并
```

## 步骤 1：预检查 - 验证 Git 仓库

```bash
git rev-parse --is-inside-work-tree
```

**如果不是 git 仓库：** 报错并退出。

## 步骤 2：获取分支列表

```bash
git branch -a --format='%(refname:short)'
```

## 步骤 3：获取当前分支

```bash
git branch --show-current
```

---

## 快速模式执行流程

### 步骤 A1：验证参数

```bash
# 验证目标分支存在
git show-ref --verify --quiet refs/heads/<target>

# 验证源分支存在（如果指定了）
git show-ref --verify --quiet refs/heads/<source>

# 验证数量是正整数（如果提供了）
[[ "<count>" =~ ^[1-9][0-9]*$ ]]
```

### 步骤 A2：AI 分析提交

```bash
# 从源分支获取最近 N 个提交
git log <source> --oneline -<count> --format='%h|%s|%ad|%an' --date=short
```

**AI 分析内容：**
- 读取每个提交的 diff 内容
- 分析提交之间的关联性
- 识别功能模块和变更范围
- 推荐最可能需要合并的提交

### 步骤 A3：AI 推荐提交

```
AI 分析结果：

源分支最近 5 个提交：

1. a1b2c3d feat(auth): 添加 JWT 验证中间件
   变更文件：src/middleware/auth.js, src/utils/jwt.js
   建议：✅ 推荐合并

2. e4f5g6h fix: 修复登录页样式问题
   变更文件：src/views/login.vue
   建议：⚠️ 考虑合并

3. i7j8k9l docs: 更新 API 文档
   变更文件：docs/api.md
   建议：❌ 通常不需要合并

是否采纳 AI 建议？
- 是：合并推荐的提交
- 否：显示所有提交供手动选择
```

### 步骤 A4：简化确认

快速模式可以直接执行，或带单次确认：

```
即将执行 Cherry-pick 合并：

源分支：<source>
目标分支：<target>
合并方式：<mode>
提交数量：<count>

AI 推荐合并以下提交：
- <hash1> <message1>
- <hash2> <message2>
- ...

确认执行？是/否
```

### 步骤 A5：执行合并

#### Cherry-pick 模式（默认）

```bash
# 切换到目标分支
git checkout <target>

# 一次性应用所有更改（不提交）
git cherry-pick --no-commit <hash1> <hash2> ...

# 检查冲突
git status --porcelain | grep -E '^U'
```

**如果没有冲突：**
```bash
git commit -m "merge: cherry-pick <n> commits from <source>"
```

**如果存在冲突：**
- 跳转到冲突处理流程

#### Rebase 模式

```bash
# 切换到源分支
git checkout <source>

# 执行变基
git rebase <target>
```

### 步骤 A6：冲突处理（Cherry-pick）

```bash
# 显示冲突文件
git diff --name-only --diff-filter=U
```

**冲突处理流程：**

```
⚠️ 检测到冲突！

冲突文件：
- file1.js
- file2.css

解决步骤：

1. 编辑冲突文件，移除冲突标记
2. git add .
3. git commit -m "merge: cherry-pick <n> commits from <source>"

或者中止：
- git cherry-pick --abort
```

### 步骤 A7：验证结果

```bash
# 显示已合并的提交历史
git log --oneline -5

# 如果当前分支被修改，检查状态
git status
```

---

## 交互模式执行流程

### 步骤 B1：选择源分支

下拉选择源分支：

```
选择源分支（包含要合并的提交的分支）：
```

**选项：** 所有本地分支

### 步骤 B2：选择目标分支

下拉选择目标分支：

```
选择目标分支（合并到的分支）：
```

**选项：** 所有本地分支（排除源分支）

### 步骤 B3：AI 分析源分支提交

```bash
git log <source> --oneline --format='%H|%s|%ai|%an' --date=short -n 50
```

**AI 分析内容：**

```
AI 分析源分支提交：

共发现 12 个提交，AI 智能分类：

🟢 高相关性（建议优先合并）
  - abc1234 feat(auth): 添加 JWT 验证中间件
  - def5678 refactor(auth): 简化 token 验证逻辑

🟡 中相关性（视情况合并）
  - ghi9012 fix: 修复登录页样式问题
  - jkl3456 style: 统一代码格式化

🔴 低相关性（通常不合并）
  - mno7890 docs: 更新 API 文档
  - pqr1234 chore: 更新依赖版本
```

### 步骤 B4：AI 智能推荐提交

**关键：AI 根据提交内容和关联性智能推荐**

复选框选择提交：

```
基于 AI 分析，推荐以下提交合并：

🟢 abc1234 feat(auth): 添加 JWT 验证中间件 (2024-01-15)
   变更：src/middleware/auth.js, src/utils/jwt.js
   原因：核心功能，与目标分支无冲突

🟢 def5678 refactor(auth): 简化 token 验证逻辑 (2024-01-15)
   变更：src/utils/auth.js
   原因：重构上述功能，依赖上一个提交

🟡 ghi9012 fix: 修复登录页样式问题 (2024-01-14)
   变更：src/views/login.vue
   原因：独立修复，可单独合并

☑ 全部采纳 AI 建议
☐ 自定义选择
```

**选项格式：** `[hash] message (date)`
```
☑ abc1234 feat: add user login (2024-01-15)
☐ abc5678 fix: resolve memory leak (2024-01-14)
☑ abc9012 docs: update API docs (2024-01-13)
```

**默认：** 采纳 AI 推荐

### 步骤 B5：选择合并方式

下拉选择：

```
选择合并方式：
```

| 选项 | 描述 |
|------|------|
| Cherry-pick | 不会更改目标分支历史（推荐） |
| Rebase | 变基到目标分支，直线历史 |

**默认：** Cherry-pick

### 步骤 B6：确认执行

```
即将执行合并：

合并方式：<mode>
源分支：<source>
目标分支：<target>
AI 推荐合并：
- <hash1> <message1>
- <hash2> <message2>
- ...

确认执行？
```

### 步骤 B7：执行合并

#### Cherry-pick 模式

```bash
git checkout <target>
git cherry-pick --no-commit <hash1> <hash2> ...
```

#### Rebase 模式

```bash
git checkout <source>
git rebase <target>
```

### 步骤 B8：冲突处理

与快速模式冲突处理流程相同。

### 步骤 B9：验证结果

```bash
git log --oneline -5
```

---

## 示例

### 示例 1：快速模式 - 基本用法

```bash
/git-merge -t main
```

结果：
- 源分支：当前分支
- 目标分支：main
- 提交数量：1（默认）
- 合并方式：Cherry-pick（默认）
- AI 自动分析并推荐提交

### 示例 2：快速模式 - 指定提交数量

```bash
/git-merge -t main -c 2
```

结果：
- 源分支：当前分支
- 目标分支：main
- 提交数量：2（当前分支最近2个提交）
- 合并方式：Cherry-pick（默认）
- AI 分析最近2个提交，推荐合并策略

### 示例 3：快速模式 - Rebase

```bash
/git-merge -t develop -c 3 -m rebase
```

结果：
- 源分支：当前分支
- 目标分支：develop
- 提交数量：3
- 合并方式：Rebase

### 示例 4：快速模式 - 指定源分支

```bash
/git-merge -s feature-auth -t main
```

结果：
- 源分支：feature-auth
- 目标分支：main
- 提交数量：1（默认）
- 合并方式：Cherry-pick（默认）

### 示例 5：交互模式

```bash
/git-merge
```

交互流程：
1. 选择源分支 → feature-A
2. 选择目标分支 → main
3. AI 分析提交，智能推荐
4. 采纳 AI 建议或自定义选择
5. 选择合并方式 → Cherry-pick
6. 确认执行

---

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 目标分支不存在 | -t 指定的分支不存在 | 检查分支名 |
| 源分支不存在 | -s 指定的分支不存在 | 检查分支名 |
| 数量不是正整数 | -c 指定的值无效 | 使用正整数 |
| 缺少目标 | 快速模式下没有 -t 参数 | 添加 -t branch |
| fatal: bad object | 无效的提交哈希 | 重新获取提交列表 |
| error: could not apply | 存在冲突 | 遵循冲突处理流程 |
| The previous cherry-pick | 合并已在进行中 | git cherry-pick --abort |

---

## 快速模式 vs 交互模式对比

| 特性 | 快速模式 | 交互模式 |
|------|----------|----------|
| 命令示例 | `/git-merge -t main` | `/git-merge` |
| 源分支 | 当前分支（或 -s 指定） | 下拉选择 |
| 目标分支 | -t 指定 | 下拉选择 |
| 提交选择 | 前 N 个 + AI 推荐 | **AI 智能推荐** |
| 合并方式 | -m 指定（或默认 pick） | 下拉选择 |
| 询问次数 | 0-1 次 | 4-5 次 |
| 使用场景 | 已知要合并哪些提交 | 不确定要合并哪些提交 |

---

## 注意事项

- AI 推荐基于提交变更内容分析，仅供参考，最终决策由用户决定
- 合并前请确认目标分支状态，避免覆盖他人工作
- 交互模式下，AI 会分析每个提交的功能相关性，建议优先合并关联性高的提交
- 复杂合并场景建议使用交互模式获取更详细的 AI 分析
