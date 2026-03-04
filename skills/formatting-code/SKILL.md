---
name: code-formatting-after-ai-generation
description: Use when AI generates code and code cleanup/formatting is needed - removes unused imports, sorts imports alphabetically, removes unused methods, and adds missing Javadoc comments
---

# Code Formatting After AI Generation

## Overview

This skill automatically formats and cleans up code after AI generates it. It ensures code quality by removing unused imports, sorting imports, removing unused methods, and adding missing documentation comments.

## When to Use

- Immediately after AI generates any code
- When reviewing code before committing
- When code has inconsistent import organization

## Core Actions

### 1. Remove Unused Imports

Detect and remove imports that are not used in the code.

**Java:** Use IDE or tools like `google-java-format`, `SpotBugs`
**JavaScript/TypeScript:** Use ESLint with `no-unused-imports` rule
**Python:** Use `isort` combined with IDE unused import detection

### 2. Sort Imports Alphabetically

Organize imports in alphabetical order.

**Java:**
```
import android.xxx;
import com.xxx;
import org.xxx;
```

**JavaScript/TypeScript:**
```javascript
// React imports first
import React from 'react';

// Third-party libraries
import { Button } from 'antd';
import lodash from 'lodash';

// Local imports
import { utils } from './utils';
import { config } from '@/config';
```

**Python:**
```python
# Standard library
import os
import sys

# Third-party
import numpy as np
import pandas as pd

# Local application
from . import models
from .utils import helper
```

### 3. Remove Unused Methods

Identify and remove private methods that are never called.

**Detection approach:**
- Use IDE warnings (IntelliJ IDEA, VSCode)
- Use static analysis tools
- Review code manually if tools unavailable

**Important:** Only remove methods that are:
- `private` (not part of public API)
- Not used within the same class
- Not overriding any interface/base class method

### 4. Add Missing Comments

Add Javadoc-style comments to classes and methods that lack documentation.

**Required for:**
- All public classes
- All public/protected methods
- All methods with complex logic

**Comment format:**
```java
/**
 * 获取菜单列表
 * <p>
 * GET /api/menu/v1
 *
 * @param query       查询条件
 * @param pageRequest 分页参数
 * @return 菜单分页列表
 */
public PageResult<MenuVO> getMenuList(Query query, PageRequest pageRequest) {
    // implementation
}
```

**For classes:**
```java
/**
 * 菜单服务类
 * <p>
 * 提供菜单的增删改查等业务逻辑
 *
 * @author lvdaxianer
 */
public class MenuService {
}
```

**For simple getters/setters:** No comment needed

**For constructors:**
```java
/**
 * 构造方法
 *
 * @param id 菜单ID
 */
public MenuService(Long id) {
}
```

## Quick Reference

| Language | Unused Import Tool | Import Sort Tool |
|----------|-------------------|------------------|
| Java | IDE / SpotBugs | google-java-format |
| JavaScript | ESLint | eslint-plugin-import |
| TypeScript | ESLint | eslint-plugin-import |
| Python | flake8 / isort | isort |
| Go | goimports | goimports |

## Common Mistakes

1. **Removing used imports** - Always verify usage before removal
2. **Removing public methods** - Only remove private unused methods
3. **Over-commenting** - Don't add comments to simple getters/setters
4. **Wrong sort order** - Some languages require specific grouping before alphabetical

## File Patterns to Skip

Do not format auto-generated files:
- `*_generated*.java`
- `*.gen.ts`
- `__pycache__/*`
- `node_modules/*`
- Build output directories
