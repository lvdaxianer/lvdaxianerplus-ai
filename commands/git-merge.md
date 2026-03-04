# Claude Command: /git-merge

选择性合并提交的工具，支持两种模式：
- **快捷模式**：通过参数直接指定，快速执行（如 `-t=main -c=2`）
- **交互模式**：通过下拉列表选择，灵活配置

## argument-hint

argument-hint: [-s=<branch>] [-t=<branch>] [-c=<n>] [-m=pick|rebase]

## Usage

### 快捷模式（推荐）

```bash
/git-merge -t=main -c=2              # 当前分支前2个提交 cherry-pick 到 main
/git-merge --target=main --count=3   # 当前分支前3个提交
/git-merge -t=main -c=2 -m=rebase   # 使用 rebase 模式
/git-merge -s=feature-A -t=main -c=1 # 指定源分支
```

### 交互模式

```bash
/git-merge                    # 完全交互式选择
/git-merge --target=main     # 指定目标，交互选择源
/git-merge --source=feature-A --target=main  # 指定源和目标
/git-merge --mode=rebase     # 指定合并方式
```

## Arguments

| 参数 | 缩写 | 说明 | 值 | 必需 | 默认值 |
|------|------|------|-----|------|--------|
| `--target` | `-t` | 目标分支（要合并到的分支） | 分支名 | **是*** | 无 |
| `--source` | `-s` | 源分支（包含要合并提交的分支） | 分支名 | 否 | 当前分支 |
| `--count` | `-c` | 要合并的最近 N 个提交 | 数字 | 否 | 无（交互模式） |
| `--mode` | `-m` | 合并方式 | `pick` / `rebase` | 否 | `pick` |

### --mode 参数值

| 值 | 说明 |
|-----|------|
| `pick` | Cherry-pick，不改变目标分支历史（默认） |
| `rebase` | Rebase，变基到目标分支，线性历史 |

## 参数处理逻辑

### 模式判断

```
如果提供了 --count/-c：
    → 快捷模式
否则：
    → 交互模式
```

### 快捷模式逻辑

```
1. -t/--target 必须提供 → 否则报错
2. -s/--source 可选，默认当前分支
3. -c/--count 必须提供 → 获取前 N 个提交
4. -m/--mode 可选，默认 pick
5. 验证分支存在
6. 简化确认（可跳过）
7. 执行合并
```

### 交互模式逻辑

```
1. -t/--target 可选 → 下拉选择
2. -s/--source 可选 → 下拉选择
3. -m/--mode 可选 → 下拉选择
4. 下拉多选要合并的提交
5. 确认执行
6. 执行合并
```

## Step 1: Pre-Check - 验证 Git 仓库

```bash
git rev-parse --is-inside-work-tree
```

**If not a git repo:** 报错并退出。

## Step 2: 获取分支列表

```bash
git branch -a --format='%(refname:short>'
```

## Step 3: 获取当前分支

```bash
git branch --show-current
```

## 快捷模式执行流程

### Step A1: 验证参数

```bash
# 验证 target 分支存在
git show-ref --verify --quiet refs/heads/<target>

# 验证 source 分支存在（如果指定）
git show-ref --verify --quiet refs/heads/<source>

# 验证 count 为正整数
[[ "<count>" =~ ^[1-9][0-9]*$ ]]
```

### Step A2: 获取要合并的提交

```bash
# 获取源分支的前 N 个提交
git log <source> --oneline -<count> --format='%h|%s|%ad|%an' --date=short
```

**注意**：如果源分支是当前分支，需要排除正在合并的提交。

### Step A3: 简化确认（可选）

快捷模式可以直接执行，或者只确认一次：

```
即将执行 Cherry-pick 合并：

源分支: <source>
目标分支: <target>
合并方式: <mode>
提交数: <count>

将合并以下提交：
- <hash1> <message1>
- <hash2> <message2>
- ...

确认执行？ Yes/No
```

### Step A4: 执行合并

#### Cherry-pick 模式（默认）

```bash
# 切换到目标分支
git checkout <target>

# 一次性应用所有更改（不提交）
git cherry-pick --no-commit <hash1> <hash2> ...

# 检查冲突
git status --porcelain | grep -E '^U'
```

**如果无冲突：**
```bash
git commit -m "merge: cherry-pick <n> commits from <source>"
```

**如果存在冲突：**
- 跳转到冲突处理流程

#### Rebase 模式

```bash
# 切换到源分支
git checkout <source>

# 执行 rebase
git rebase <target>
```

### Step A5: 冲突处理（Cherry-pick）

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

请解决冲突后，运行以下命令继续：

1. 编辑冲突文件，删除冲突标记
2. git add .
3. git commit -m "merge: cherry-pick <n> commits from <source>"

或选择放弃：
- git cherry-pick --abort
```

### Step A6: 验证结果

```bash
# 显示合并后的提交历史
git log --oneline -5

# 如果是当前分支被修改，检查状态
git status
```

---

## 交互模式执行流程

### Step B1: 处理 -s/--source 参数

**如果提供了 -s/--source：**
- 使用参数值作为源分支
- 验证分支是否存在

**如果未提供 -s/--source：**
使用下拉列表选择源分支：

```
请选择源分支（包含要合并的提交的分支）：
```

**Options:** 所有本地分支

### Step B2: 处理 -t/--target 参数

**如果提供了 -t/--target：**
- 使用参数值作为目标分支
- 验证分支是否存在

**如果未提供 -t/--target：**
使用下拉列表选择目标分支：

```
请选择目标分支（要合并到的分支）：
```

**Options:** 所有本地分支（排除源分支）

### Step B3: 分析提交差异

获取源分支有但目标分支没有的提交（候选提交）。

```bash
git log target..source --oneline --format='%H|%s|%ai|%an' --date=short
```

**If no unique commits:**
```
源分支没有目标分支不存在的提交，无需合并。
```
退出执行。

### Step B4: 处理 -m/--mode 参数

**如果提供了 -m/--mode：**
- `pick` → Cherry-pick
- `rebase` → Rebase
- 其他值 → 报错

**如果未提供 -m/--mode：**
使用下拉列表选择：

```
请选择合并方式：
```

| 选项 | 说明 |
|------|------|
| Cherry-pick | 不改变目标分支历史（推荐） |
| Rebase | 变基到目标分支，线性历史 |

**Default:** Cherry-pick

### Step B5: 选择工作目录

使用下拉列表选择：

```
请选择工作目录方式：
```

| 选项 | 说明 |
|------|------|
| 当前分支直接操作 | 在当前分支直接执行 |
| 使用 Worktree | 创建独立 worktree |

### Step B6: 选择要合并的提交

使用下拉列表多选：

```
源分支 <source> 有以下提交不在 <target> 中：

请选择要合并的提交（可多选）：
```

**Options:** 每个选项格式为 `[hash] message (date)`

**Default:** 全选

### Step B7: 确认执行

```
即将执行合并：

合并方式: <mode>
源分支: <source>
目标分支: <target>
工作目录: <directory>

将合并以下提交：
- <hash1> <message1>
- <hash2> <message2>
- ...

确认是否执行？
```

### Step B8: 执行合并

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

### Step B9: 冲突处理

同快捷模式的冲突处理流程。

### Step B10: 验证结果

```bash
git log --oneline -5
```

---

## Examples

### Example 1: 快捷模式 - 基本用法

```bash
/git-merge -t=main -c=2
```

执行结果：
- 源分支：当前分支
- 目标分支：main
- 提交数：2（当前分支最近 2 个提交）
- 合并方式：Cherry-pick（默认）

### Example 2: 快捷模式 - Rebase

```bash
/git-merge -t=develop -c=3 -m=rebase
```

执行结果：
- 源分支：当前分支
- 目标分支：develop
- 提交数：3
- 合并方式：Rebase

### Example 3: 快捷模式 - 指定源分支

```bash
/git-merge -s=feature-auth -t=main -c=1
```

执行结果：
- 源分支：feature-auth
- 目标分支：main
- 提交数：1
- 合并方式：Cherry-pick

### Example 4: 交互模式 - 完全选择

```bash
/git-merge
```

交互流程：
1. 选择源分支 → feature-A
2. 选择目标分支 → main
3. 选择合并方式 → Cherry-pick
4. 选择工作目录 → 当前分支
5. 选择提交 → 全选
6. 确认执行

### Example 5: 交互模式 - 部分参数

```bash
/git-merge -t=main
```

交互流程：
1. 选择源分支 → feature-B
2. 选择合并方式 → Cherry-pick
3. 选择提交 → 交互选择
4. 确认执行

---

## Error Handling

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| target 分支不存在 | -t 指定的分支不存在 | 检查分支名称 |
| source 分支不存在 | -s 指定的分支不存在 | 检查分支名称 |
| count 不是正整数 | -c 指定的值无效 | 使用正整数 |
| 缺少 target | 没有 -t 参数 | 添加 -t=branch |
| 缺少 count | 快捷模式没有 -c | 添加 -c=N 或去掉 -c 使用交互模式 |
| fatal: bad object | 提交 hash 无效 | 重新获取提交列表 |
| error: could not apply | 冲突 | 按冲突处理流程 |
| The previous cherry-pick | 已有合并进行中 | git cherry-pick --abort |

---

## 快捷模式 vs 交互模式对比

| 特性 | 快捷模式 | 交互模式 |
|------|----------|----------|
| 命令示例 | `/git-merge -t=main -c=2` | `/git-merge` |
| 源分支 | 当前分支（或 -s 指定） | 下拉选择 |
| 目标分支 | -t 指定 | 下拉选择 |
| 提交选择 | 前 N 个（-c 指定） | 下拉多选 |
| 合并方式 | -m 指定（或默认 pick） | 下拉选择 |
| 提问次数 | 0-1 次 | 5-6 次 |
| 适用场景 | 快速合并已知提交 | 不确定要合并哪些 |

---

## Integration

**Called by:**
- 用户手动调用 `/git-merge` 命令

**Requires:**
- Git 仓库
- 分支访问权限

**Pairs with:**
- **using-git-worktrees** - 当用户选择 worktree 模式时
