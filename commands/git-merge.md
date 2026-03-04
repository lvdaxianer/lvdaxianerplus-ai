# Claude Command: /git-merge

A tool for selective commit merging with two modes:
- **Quick Mode**: Direct parameter execution (e.g., `-t main -c 2`)
- **Interactive Mode**: Dropdown selection for flexible configuration

## argument-hint

argument-hint: [-s <branch>] [-t <branch>] [-c <n>] [-m pick|rebase]

## Usage

### Quick Mode (Recommended)

```bash
/git-merge -t main                    # Merge 1 commit from current branch to main (default -c=1)
/git-merge -t main -c 2                # Merge 2 commits from current branch to main
/git-merge -t main -c 3 -m rebase      # Use rebase mode, merge 3 commits
/git-merge -s feature-A -t main        # Merge 1 commit from feature-A to main
/git-merge -s feature-A -t main -c 2   # Merge 2 commits from feature-A to main
```

### Interactive Mode

```bash
/git-merge                    # Fully interactive selection
```

## Arguments

| Parameter | Short | Description | Value | Required | Default |
|-----------|-------|-------------|-------|----------|---------|
| `--target` | `-t` | Target branch (branch to merge into) | branch name | **Yes*** | none |
| `--source` | `-s` | Source branch (branch containing commits to merge) | branch name | No | current branch |
| `--count` | `-c` | Number of most recent commits to merge | number | No | 1 |
| `--mode` | `-m` | Merge method | `pick` / `rebase` | No | `pick` |

*Required only in Quick Mode (when -t is provided)

### --mode Values

| Value | Description |
|-------|-------------|
| `pick` | Cherry-pick, does not change target branch history (default) |
| `rebase` | Rebase onto target branch, linear history |

## Parameter Processing Logic

### Mode Determination

```
If -t/--target is provided:
    → Quick Mode
Else:
    → Interactive Mode (pure /git-merge)
```

### Quick Mode Logic

```
1. -t/--target is required → error if not provided
2. -s/--source is optional, defaults to current branch
3. -c/--count is optional, defaults to 1
4. -m/--mode is optional, defaults to pick
5. Validate branch exists
6. Simplified confirmation (can skip)
7. Execute merge
```

### Interactive Mode Logic

```
1. -t/--target → dropdown selection
2. -s/--source → dropdown selection
3. -m/--mode → dropdown selection
4. Multi-select commits via dropdown
5. Confirm execution
6. Execute merge
```

## Step 1: Pre-Check - Validate Git Repository

```bash
git rev-parse --is-inside-work-tree
```

**If not a git repo:** Error and exit.

## Step 2: Get Branch List

```bash
git branch -a --format='%(refname:short)'
```

## Step 3: Get Current Branch

```bash
git branch --show-current
```

## Quick Mode Execution Flow

### Step A1: Validate Parameters

```bash
# Validate target branch exists
git show-ref --verify --quiet refs/heads/<target>

# Validate source branch exists (if specified)
git show-ref --verify --quiet refs/heads/<source>

# Validate count is positive integer (if provided)
[[ "<count>" =~ ^[1-9][0-9]*$ ]]
```

### Step A2: Get Commits to Merge

```bash
# Get the most recent N commits from source branch
git log <source> --oneline -<count> --format='%h|%s|%ad|%an' --date=short
```

**Note:** If source branch is the current branch, exclude the commit being merged.

### Step A3: Simplified Confirmation (Optional)

Quick mode can execute directly, or with single confirmation:

```
About to execute Cherry-pick merge:

Source branch: <source>
Target branch: <target>
Merge method: <mode>
Commit count: <count>

Will merge the following commits:
- <hash1> <message1>
- <hash2> <message2>
- ...

Confirm execution? Yes/No
```

### Step A4: Execute Merge

#### Cherry-pick Mode (Default)

```bash
# Switch to target branch
git checkout <target>

# Apply all changes at once (without committing)
git cherry-pick --no-commit <hash1> <hash2> ...

# Check for conflicts
git status --porcelain | grep -E '^U'
```

**If no conflicts:**
```bash
git commit -m "merge: cherry-pick <n> commits from <source>"
```

**If conflicts exist:**
- Jump to conflict handling flow

#### Rebase Mode

```bash
# Switch to source branch
git checkout <source>

# Execute rebase
git rebase <target>
```

### Step A5: Conflict Handling (Cherry-pick)

```bash
# Show conflicting files
git diff --name-only --diff-filter=U
```

**Conflict handling flow:**

```
⚠️ Conflicts detected!

Conflicting files:
- file1.js
- file2.css

To resolve, run the following commands:

1. Edit conflicting files, remove conflict markers
2. git add .
3. git commit -m "merge: cherry-pick <n> commits from <source>"

Or abort:
- git cherry-pick --abort
```

### Step A6: Verify Result

```bash
# Show merged commit history
git log --oneline -5

# If current branch was modified, check status
git status
```

---

## Interactive Mode Execution Flow

### Step B1: Handle -s/--source Parameter

**If -s/--source is provided:**
- Use parameter value as source branch
- Validate branch exists

**If -s/--source is not provided:**
Dropdown to select source branch:

```
Select source branch (branch containing commits to merge):
```

**Options:** All local branches

### Step B2: Handle -t/--target Parameter

**If -t/--target is provided:**
- Use parameter value as target branch
- Validate branch exists

**If -t/--target is not provided:**
Dropdown to select target branch:

```
Select target branch (branch to merge into):
```

**Options:** All local branches (excluding source branch)

### Step B3: Analyze Commit Differences

Get commits that exist in source but not in target (candidate commits).

```bash
git log target..source --oneline --format='%H|%s|%ai|%an' --date=short
```

**If no unique commits:**
```
Source branch has no commits that don't exist in target, no merge needed.
```
Exit execution.

### Step B4: Handle -m/--mode Parameter

**If -m/--mode is provided:**
- `pick` → Cherry-pick
- `rebase` → Rebase
- Other values → Error

**If -m/--mode is not provided:**
Dropdown to select:

```
Select merge method:
```

| Option | Description |
|--------|-------------|
| Cherry-pick | Does not change target branch history (recommended) |
| Rebase | Rebase onto target branch, linear history |

**Default:** Cherry-pick

### Step B5: Select Working Directory

Dropdown to select:

```
Select working directory method:
```

| Option | Description |
|--------|-------------|
| Current branch direct operation | Execute on current branch |
| Use Worktree | Create isolated worktree |

### Step B6: Select Commits to Merge

Multi-select via dropdown:

```
Source branch <source> has the following commits not in <target>:

Select commits to merge (multi-select):
```

**Options:** Each option formatted as `[hash] message (date)`

**Default:** Select all

### Step B7: Confirm Execution

```
About to execute merge:

Merge method: <mode>
Source branch: <source>
Target branch: <target>
Working directory: <directory>

Will merge the following commits:
- <hash1> <message1>
- <hash2> <message2>
- ...

Confirm execution?
```

### Step B8: Execute Merge

#### Cherry-pick Mode

```bash
git checkout <target>
git cherry-pick --no-commit <hash1> <hash2> ...
```

#### Rebase Mode

```bash
git checkout <source>
git rebase <target>
```

### Step B9: Conflict Handling

Same as Quick Mode conflict handling flow.

### Step B10: Verify Result

```bash
git log --oneline -5
```

---

## Examples

### Example 1: Quick Mode - Basic Usage

```bash
/git-merge -t main
```

Result:
- Source branch: current branch
- Target branch: main
- Commit count: 1 (default)
- Merge method: Cherry-pick (default)

### Example 2: Quick Mode - Specify Commit Count

```bash
/git-merge -t main -c 2
```

Result:
- Source branch: current branch
- Target branch: main
- Commit count: 2 (most recent 2 commits from current branch)
- Merge method: Cherry-pick (default)

### Example 3: Quick Mode - Rebase

```bash
/git-merge -t develop -c 3 -m rebase
```

Result:
- Source branch: current branch
- Target branch: develop
- Commit count: 3
- Merge method: Rebase

### Example 4: Quick Mode - Specify Source Branch

```bash
/git-merge -s feature-auth -t main
```

Result:
- Source branch: feature-auth
- Target branch: main
- Commit count: 1 (default)
- Merge method: Cherry-pick (default)

### Example 5: Interactive Mode

```bash
/git-merge
```

Interactive flow:
1. Select source branch → feature-A
2. Select target branch → main
3. Select merge method → Cherry-pick
4. Select working directory → Current branch
5. Select commits → Select all
6. Confirm execution

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Target branch does not exist | Branch specified by -t doesn't exist | Check branch name |
| Source branch does not exist | Branch specified by -s doesn't exist | Check branch name |
| Count is not a positive integer | Value specified by -c is invalid | Use positive integer |
| Missing target | No -t parameter in Quick Mode | Add -t branch |
| fatal: bad object | Invalid commit hash | Re-fetch commit list |
| error: could not apply | Conflicts exist | Follow conflict handling flow |
| The previous cherry-pick | Merge already in progress | git cherry-pick --abort |

---

## Quick Mode vs Interactive Mode Comparison

| Feature | Quick Mode | Interactive Mode |
|---------|------------|------------------|
| Command example | `/git-merge -t main` | `/git-merge` |
| Source branch | Current branch (or -s specified) | Dropdown selection |
| Target branch | -t specified | Dropdown selection |
| Commit selection | First N commits (-c specified) | Dropdown multi-select |
| Merge method | -m specified (or default pick) | Dropdown selection |
| Questions asked | 0-1 | 5-6 |
| Use case | Quick merge of known commits | Uncertain which commits to merge |

---

## Integration

**Called by:**
- User manually invokes `/git-merge` command

**Requires:**
- Git repository
- Branch access permissions

**Pairs with:**
- **using-git-worktrees** - When user selects worktree mode
