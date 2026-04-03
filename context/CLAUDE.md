---
name: code-review-spec
description: Use when performing code review, code review after changes, code formatting, editing code, modifying code, or when user asks to review code. Applies to all programming languages (Java, Python, Go, TypeScript, Vue, etc.). Checks: code specifications, class/method comments, comment ratio (≥40%), naming conventions, security rules, exception handling, logging standards, database specs, API design, git commit format, dependency management, and code complexity limits. Trigger automatically when user modifies or formats code.
---

# code-review-spec.md

## 角色定义

> 你是一位经验丰富的架构师，具备深厚的技术专长和强烈的代码美学意识，能够从整体视角审视代码质量，专注于可维护性、可扩展性和性能优化。

---

# 第一部分：规范类（必须遵守的底线）

> **特别重要**：规范类不区分开发语言，适用于所有编程语言（Java、Python、Go、TypeScript、Vue 等）。
> 规范约束的是行为和格式，而非语法——请根据具体语言的惯用法选择对应风格的注释格式。

---

## 1. 代码修改范围

> 存在 git 的项目：执行 `git diff`，仅针对修改部分优化
> 不存在 git 的项目：全局修改

## 2. 作者标识

所有代码的 `@author` / `@author` 注解必须填写 `乌骓`。

## 3. 代码规范

> **通用原则**：代码规范不区分开发语言，适用于所有编程语言（Java、Python、Go、TypeScript、Vue 等）。

### 3.1. 方法注释规范

每个方法必须包含完整的文档注释，风格随语言而变：

<details>
<summary><b>Java / Go</b></summary>

```java
/**
 * 方法功能的简要描述
 *
 * @param paramName 参数描述（有效值、无效值）
 * @param paramName2 参数描述
 * @return 返回值描述（可能的值、边界情况）
 * @author 乌骓
 * @date 创建日期（格式：yyyy-MM-dd）
 */
public void methodName(String paramName) {

}
```

```go
// MethodName 方法功能的简要描述
//
// Parameters:
//   - paramName: 参数描述（有效值、无效值）
//   - paramName2: 参数描述
//
// Returns: 返回值描述（可能的值、边界情况）
//
// Author: 乌骓
// Date: 2024-01-15
func MethodName(paramName string) {

}
```

</details>

<details>
<summary><b>TypeScript / Vue (TypeScript)</b></summary>

```typescript
/**
 * 方法功能的简要描述
 *
 * @param paramName - 参数描述（有效值、无效值）
 * @param paramName2 - 参数描述
 * @returns 返回值描述（可能的值、边界情况）
 * @author 乌骓
 * @date 2024-01-15
 */
function methodName(paramName: string): void {

}

/**
 * Vue 组合式函数示例
 *
 * @param userId - 用户 ID（有效值 > 0）
 * @returns 用户信息对象
 * @author 乌骓
 * @date 2024-01-15
 */
async function fetchUser(userId: number): Promise<User> {

}
```

```typescript
// Vue 组件方式（script setup）
// <script setup lang="ts">
/**
 * 获取用户信息
 *
 * @param userId - 用户 ID（有效值 > 0）
 * @returns 用户信息对象
 * @author 乌骓
 * @date 2024-01-15
 */
const getUser = async (userId: number): Promise<User> => {

};
```

</details>

<details>
<summary><b>Python</b></summary>

```python
def method_name(param_name: str) -> None:
    """
    方法功能的简要描述

    Args:
        param_name: 参数描述（有效值、无效值）
        param_name2: 参数描述

    Returns:
        返回值描述（可能的值、边界情况）

    Author: 乌骓
    Date: 2024-01-15
    """
    pass
```

```python
async def fetch_user(user_id: int) -> dict:
    """
    获取用户信息

    Args:
        user_id: 用户 ID（有效值 > 0）

    Returns:
        用户信息字典

    Raises:
        UserNotFoundError: 用户不存在时抛出

    Author: 乌骓
    Date: 2024-01-15
    """
    pass
```

</details>

### 3.2. 类注释规范

每个类必须包含完整的文档注释：

<details>
<summary><b>Java / Go</b></summary>

```java
/**
 * 类描述，说明核心功能和职责
 *
 * @author 乌骓
 * @date 创建日期（格式：yyyy-MM-dd）
 */
public class ClassName {

}
```

```go
// PackageName 类/模块描述，说明核心功能和职责
//
// Author: 乌骓
// Date: 2024-01-15
package service
```

</details>

<details>
<summary><b>TypeScript / Vue</b></summary>

```typescript
/**
 * 类/模块描述，说明核心功能和职责
 *
 * @author 乌骓
 * @date 2024-01-15
 */
export class UserService {

}

/**
 * Vue 组件描述，说明核心功能和职责
 *
 * @author 乌骓
 * @date 2024-01-15
 */
export default defineComponent({

});
```

</details>

<details>
<summary><b>Python</b></summary>

```python
"""
类/模块描述，说明核心功能和职责

Author: 乌骓
Date: 2024-01-15
"""
class UserService:

    pass
```

```python
"""
Vue 组件模块描述，说明核心功能和职责

Author: 乌骓
Date: 2024-01-15
"""
```

</details>

### 3.3. 条件分支注释规范

每个 if-else 分支必须包含清晰的注释（所有语言通用）：

<details>
<summary><b>Java / Go / TypeScript / Python</b></summary>

```java
// 条件注释：什么情况下触发此分支
if (condition) {
    // 处理逻辑
} else {
    // 替代处理逻辑
}
```

```go
// 条件注释：什么情况下触发此分支
if condition {
    // 处理逻辑
} else {
    // 替代处理逻辑
}
```

```typescript
// 条件注释：什么情况下触发此分支
if (condition) {
    // 处理逻辑
} else {
    // 替代处理逻辑
}
```

```python
# 条件注释：什么情况下触发此分支
if condition:
    # 处理逻辑
    pass
else:
    # 替代处理逻辑
    pass
```

</details>

**注意**：优先使用 if-else 结构而非 switch-case。如必须使用 switch-case，每个 case 必须有对应的 default 分支。

### 3.4. 代码注释要求

注释行数必须占代码文件总行数的至少 **60%**。

### 3.5. 方法行数限制

每个方法不得超过 **20 行**。如果超过，必须立即重构，将复杂逻辑提取为独立的私有方法。

**重构原则**：每个方法只做一件事，方法名应清晰表达其功能。

### 3.6. 批量处理规范

> **通用原则**：能用批量处理的场景，禁止使用 for 循环逐条处理。

批量处理的优势：
- 减少数据库/网络往返次数
- 提升系统整体吞吐量
- 降低资源占用

<details>
<summary><b>Java</b></summary>

```java
// 错误：for 循环逐条处理
for (User user : users) {
    userRepository.save(user);
}

// 正确：批量处理
userRepository.saveAll(users);
```

```java
// 错误：for 循环逐条查询
for (Long id : ids) {
    User user = userRepository.findById(id);
    // 处理逻辑
}

// 正确：批量查询
List<User> users = userRepository.findAllById(ids);
```

</details>

<details>
<summary><b>Python</b></summary>

```python
# 错误：for 循环逐条处理
for item in items:
    process_item(item)

# 正确：批量处理
process_batch(items)
```

```python
# 错误：for 循环逐条插入
for record in records:
    db.insert(record)

# 正确：批量插入
db.insert_many(records)
```

</details>

<details>
<summary><b>TypeScript</b></summary>

```typescript
// 错误：for 循环逐条处理
for (const id of ids) {
    await api.delete(id);
}

// 正确：批量处理
await api.deleteBatch(ids);
```

```typescript
// 错误：for 循环逐条查询
for (const id of ids) {
    const item = await db.findById(id);
}

# 正确：批量查询
const items = await db.findByIds(ids);
```

</details>

### 3.7. Java 线程池规范

> **仅适用于 Java**：禁止使用已定义的线程池（如 `ExecutorService`、`@Async` 默认线程池），必须使用自定义线程池。

#### 3.7.1. 线程池定义要求

- 必须定义有意义的 `threadName`（使用 `ThreadFactory` 设置）
- 必须使用有业务含义的日志标识
- 线程池名称应体现业务用途

#### 3.7.2. 线程池定义示例

```java
// 定义业务线程池
private static final ThreadFactory USER_THREAD_FACTORY = new ThreadFactoryBuilder()
    .setNameFormat("user-handler-%d")
    .setUncaughtExceptionHandler((t, e) -> {
        log.error("[用户处理] 线程 {} 异常", t.getName(), e);
    })
    .build();

private final ExecutorService userExecutor = new ThreadPoolExecutor(
    10, 20, 60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(1000),
    USER_THREAD_FACTORY,
    new ThreadPoolExecutor.CallerRunsPolicy()
);

// 线程池执行时必须打印日志
public void processUserTask(User user) {
    userExecutor.execute(() -> {
        log.info("[用户处理] 开始处理用户: {}", user.getId());
        try {
            // 业务逻辑
            log.info("[用户处理] 用户处理成功: {}", user.getId());
        } catch (Exception e) {
            log.error("[用户处理] 用户处理失败: {}", user.getId(), e);
        }
    });
}
```

#### 3.7.3. 常见业务线程池命名

| 业务场景 | 线程池名称示例 |
|----------|---------------|
| 用户处理 | `user-handler-%d`、`user-processor-%d` |
| 订单处理 | `order-handler-%d`、`order-processor-%d` |
| 消息发送 | `msg-sender-%d`、`notification-sender-%d` |
| 数据同步 | `data-sync-%d`、`sync-worker-%d` |
| 文件处理 | `file-processor-%d`、`file-handler-%d` |

#### 3.7.4. 错误示例

```java
// 错误：使用匿名线程池，无有意义名称
ExecutorService executor = Executors.newFixedThreadPool(10);

// 错误：使用 @Async 默认线程池
@Async
public void process() {
    // 无法追踪线程
}

// 错误：缺少日志
executor.execute(() -> {
    doSomething();
});
```

## 4. 命名规范

### 4.1. 文件命名
- 类文件使用 PascalCase（如 `UserService.java`、`UserService.ts`）
- Vue 组件文件使用 PascalCase 或 kebab-case（如 `UserCard.vue`）
- 变量和方法使用 camelCase
- 配置文件使用 kebab-case
- 常量使用 UPPER_SNAKE_CASE
- Python 文件使用 snake_case（如 `user_service.py`）

### 4.2. 变量命名
- 布尔变量使用 `is`、`has`、`can`、`should` 前缀
- 集合变量使用复数形式
- 避免单字母名称（循环变量除外）

### 4.3. 方法命名
- `get`/`set`：属性访问
- `find`/`search`：查询
- `create`/`update`/`delete`：增删改操作
- `validate`/`check`：验证
- `handle`/`process`：处理逻辑

## 5. 安全规范

- 不硬编码密码、密钥或令牌
- 使用环境变量或配置中心管理 secrets
- 日志中不记录敏感信息
- 所有外部输入必须验证
- SQL 使用参数化查询
- XSS 过滤和清理

## 6. 异常处理规范

### 6.1. 异常类型选择
- **RuntimeException / Error**：程序员错误（逻辑 Bug）
- **CheckedException / IOError**：外部依赖失败（IO、网络）
- **自定义异常**：业务错误

### 6.2. 异常抛出原则
- 不要捕获而不处理（至少记录日志）
- 不要捕获 Throwable/Exception/Error（范围太广）
- 不要在 finally 块中抛出异常

### 6.3. 异常处理示例

<details>
<summary><b>Java</b></summary>

```java
try {
    // 业务逻辑
} catch (SpecificException e) {
    // 处理特定异常
    throw new BusinessException("错误描述", e);
}

// 异常链
throw new BusinessException("原始错误", causeException);
```

</details>

<details>
<summary><b>Go</b></summary>

```go
result, err := doSomething()
if err != nil {
    // 处理特定错误
    return fmt.Errorf("操作失败: %w", err)
}
```

</details>

<details>
<summary><b>TypeScript / Vue</b></summary>

```typescript
try {
    // 业务逻辑
} catch (error) {
    // 处理特定错误
    if (error instanceof SpecificException) {
        throw new BusinessException("错误描述", error);
    }
    throw error;
}
```

```typescript
// Vue 组合式函数中的错误处理
const fetchUser = async (userId: number): Promise<User> => {
    try {
        const response = await api.getUser(userId);
        return response.data;
    } catch (error) {
        if (error instanceof NotFoundError) {
            throw new UserNotFoundException(`用户 ${userId} 不存在`, error);
        }
        throw error;
    }
};
```

</details>

<details>
<summary><b>Python</b></summary>

```python
try:
    # 业务逻辑
    pass
except SpecificException as e:
    # 处理特定异常
    raise BusinessException("错误描述") from e

# 异常链
raise BusinessException("原始错误") from cause_exception
```

</details>

## 7. 日志规范

### 7.1. 日志级别
| 级别 | 使用场景 |
|------|----------|
| ERROR | 需要立即处理系统级错误 |
| WARN | 不影响运行但潜在的问题 |
| INFO | 业务流程中的关键里程碑 |
| DEBUG | 开发和调试信息 |

### 7.2. 日志格式
```
timestamp [thread-name] level class-name:line-number - message
```

### 7.3. 日志输出规范
- 不使用 `System.out.println` / `print` / `fmt.Println` 等直接输出
- 使用占位符在日志消息中
- 日志文件必须配置轮转策略
- **必须带有业务标识**，格式：`[业务标识] 消息内容`

#### 7.3.1. 业务标识日志示例

```java
// 正确：带有业务标识
log.info("[用户登录] 用户登录成功, userId={}", userId);
log.warn("[订单处理] 库存不足, orderId={}", orderId);
log.error("[支付服务] 支付失败, orderId={}, error={}", orderId, e.getMessage());

// 错误：缺少业务标识
log.info("用户登录成功, userId={}", userId);
log.info("订单处理完成");
```

```go
// 正确：带有业务标识
log.WithFields(log.Fields{"business": "user-login"}).Info("[用户登录] 用户登录成功")
log.WithFields(log.Fields{"business": "order"}).Error("[订单处理] 订单处理失败")

// 错误：缺少业务标识
log.Info("用户登录成功")
```

```typescript
// 正确：带有业务标识
logger.info('[用户登录] 用户登录成功', { userId });
logger.error('[支付服务] 支付异常', { orderId, error: e.message });

// 错误：缺少业务标识
logger.info('用户登录成功');
```

```python
# 正确：带有业务标识
logger.info(f"[用户登录] 用户登录成功, user_id={user_id}")
logger.error(f"[订单处理] 订单处理失败, order_id={order_id}")

# 错误：缺少业务标识
logger.info("用户登录成功")
```

#### 7.3.2. 常见业务标识

| 业务场景 | 日志标识 | 示例 |
|----------|----------|------|
| 用户登录 | `[用户登录]` | `log.info("[用户登录] 用户登录成功")` |
| 用户注册 | `[用户注册]` | `log.info("[用户注册] 新用户注册成功")` |
| 订单创建 | `[订单创建]` | `log.info("[订单创建] 订单创建成功")` |
| 订单支付 | `[订单支付]` | `log.info("[订单支付] 支付成功")` |
| 文件上传 | `[文件上传]` | `log.info("[文件上传] 文件上传成功")` |
| 数据同步 | `[数据同步]` | `log.info("[数据同步] 同步完成")` |
| 接口调用 | `[API调用]` | `log.info("[API调用] 调用外部接口成功")` |

<details>
<summary><b>Java (SLF4J)</b></summary>

```java
// 正确
log.info("User {} logged in successfully", username);

// 错误
log.info("User " + username + " logged in successfully");
```

</details>

<details>
<summary><b>Go</b></summary>

```go
// 正确
log.Printf("User %s logged in successfully", username)

// 错误
log.Printf("User " + username + " logged in successfully")

// 使用结构化日志（推荐）
log.WithFields(log.Fields{
    "user": username,
}).Info("User logged in successfully")
```

</details>

<details>
<summary><b>TypeScript / Vue</b></summary>

```typescript
// 正确：使用占位符
logger.info(`User ${username} logged in successfully`);

// 错误：不使用日志库
console.log("User " + username + " logged in successfully");

// Vue 项目中推荐使用结构化日志
const logger = {
    info: (message: string, meta?: Record<string, unknown>) => {
        console.log(JSON.stringify({ level: 'info', message, ...meta }));
    }
};
```

</details>

<details>
<summary><b>Python</b></summary>

```python
import logging

logger = logging.getLogger(__name__)

# 正确：使用占位符
logger.info("User %s logged in successfully", username)

# 错误：字符串拼接
logger.info("User " + username + " logged in successfully")

# 使用结构化日志（推荐）
logger.info("User %s logged in successfully", username, extra={"user": username})
```

</details>

## 8. 数据库规范

- 使用参数化查询，不拼接字符串
- SQL 关键字大写，每条查询都要使用 LIMIT
- 保持事务范围尽可能小，避免长事务
- 不全表扫描，索引列限制（≤ 5）

```sql
-- 正确
SELECT * FROM `users` WHERE `id` = ? LIMIT 10;

-- 错误
SELECT * FROM users WHERE id = " + userId;
```

## 9. API 设计规范

### 9.1. RESTful 设计
| 方法 | 用途 |
|------|------|
| GET | 查询 |
| POST | 创建 |
| PUT | 全量更新 |
| PATCH | 部分更新 |
| DELETE | 删除 |

### 9.2. 响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

## 10. Git 提交规范

### 10.1. 提交信息格式
```
<type>: <subject>
<body>
```

### 10.2. 类型分类
| 类型 | 描述 |
|------|------|
| feat | 新功能 |
| fix | 修复 Bug |
| refactor | 代码重构 |
| docs | 文档更新 |
| test | 测试相关 |
| chore | 构建/工具变更 |

### 10.3. 提交粒度
- 每次提交只做一件事
- 包含相关 issue 编号

```bash
git commit -m "$(cat <<'EOF'
feat: 添加用户登录功能

实现基于 JWT 的用户认证流程
关联 issue: #123

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## 11. 依赖管理规范

### 11.1. Java (Maven/Gradle)

```xml
<properties>
    <spring-boot.version>3.2.0</spring-boot.version>
</properties>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <version>${spring-boot.version}</version>
</dependency>
```

**禁用依赖**：`junit:junit`（使用 JUnit 5）

### 11.2. Go

```go
module github.com/example/project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/spf13/viper v1.18.2
)
```

**注意**：不使用第三方库的无用依赖，定期清理 `go.mod`。

### 11.3. TypeScript / Vue (npm/pnpm)

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

**注意**：生产依赖和开发依赖严格区分，使用 lock 文件锁定版本。

### 11.4. Python

```toml
[project]
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn>=0.27.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
]
```

**注意**：不使用 SNAPSHOT 版本，不使用 `latest` 标签。

### 11.5. 通用原则

- 无传递依赖（使用 `<optional>true</optional>` / `<scope>provided</scope>` / `extras`）
- 不使用 SNAPSHOT 版本
- 不使用 `latest` 标签
- 集中管理依赖版本

## 12. 代码复杂度约束

| 类型 | 限制 |
|------|------|
| 普通类/模块 | ≤ 500 行 |
| Controller / Handler | ≤ 100 行 |
| Service / Service 层 | ≤ 300 行 |
| 单文件 | ≤ 800 行 |
| 方法/函数行数 | ≤ 20 行 |
| 方法圈复杂度 | ≤ 10 |

## 13. 代码审查清单

> **强制执行**：以下清单所有条目均为强制要求，AI 在进行代码审查时必须逐项检查并报告结果。**任何一项不通过，审查结果即为不通过。**

### 13.1. 注释与文档（强制）

- [ ] **作者标识**：所有代码的 `@author` 必须填写 `乌骓`
- [ ] **方法注释**：所有方法都有完整注释（@param、@return、@author、@date）
- [ ] **类注释**：所有类都有 Javadoc 风格文档注释
- [ ] **分支注释**：所有 if-else 分支都有条件说明注释
- [ ] **注释比例**：注释行数达到总行数的 **60%** 以上

### 13.2. 代码质量（强制）

- [ ] **方法行数**：每个方法不超过 **20 行**
- [ ] **命名规范**：变量和方法命名符合 camelCase，常量使用 UPPER_SNAKE_CASE
- [ ] **无硬编码**：无硬编码值（密码、密钥、令牌、魔法数字）
- [ ] **布尔命名**：布尔变量使用 `is`、`has`、`can`、`should` 前缀

### 13.3. 批量处理（强制）

- [ ] **禁止 for 循环**：能用批量处理的场景（如 `saveAll()`、`findAllById()`）必须使用批量 API，禁止使用 for 循环逐条处理
- [ ] **批量查询**：多次数据库查询必须合并为批量查询

### 13.4. Java 线程池（强制，仅 Java）

- [ ] **自定义线程池**：禁止使用 `ExecutorService` 默认线程池或 `@Async` 默认线程池，必须使用自定义线程池
- [ ] **有意义名称**：线程池必须定义有意义的 `threadName`（如 `user-handler-%d`）
- [ ] **线程日志**：线程池执行时必须打印业务日志，包含开始/成功/失败状态

### 13.5. 日志规范（强制）

- [ ] **业务标识**：所有日志必须带有业务标识，格式为 `[业务标识] 消息内容`
- [ ] **占位符**：日志必须使用占位符 `{}` 或 `%s`，禁止字符串拼接
- [ ] **禁止直接输出**：禁止使用 `System.out.println`、`print`、`fmt.Println`
- [ ] **敏感信息**：日志中不记录密码、密钥、令牌等敏感信息

### 13.6. 异常处理（强制）

- [ ] **特定异常**：捕获特定异常类型，禁止捕获 `Throwable`/`Exception`
- [ ] **异常链**：抛出新异常时必须包含原始异常
- [ ] **日志记录**：捕获异常后至少记录日志，不允许静默吞掉异常

### 13.7. 数据库规范（强制）

- [ ] **参数化查询**：使用参数化查询，禁止字符串拼接 SQL
- [ ] **LIMIT**：所有查询必须使用 LIMIT
- [ ] **事务范围**：事务范围尽可能小，避免长事务

### 13.8. 安全规范（强制）

- [ ] **输入验证**：所有外部输入必须验证
- [ ] **SQL 注入**：使用参数化查询防注入
- [ ] **XSS**：用户输入必须过滤或转义

---

### 审查报告格式

进行代码审查时，必须按以下格式输出结果：

```
## 代码审查报告

### 13.1 注释与文档
- [✅/❌] 作者标识
- [✅/❌] 方法注释
...（逐项列出）

### 总体评价
[通过/不通过]

### 需要修复的问题
1. ...
2. ...
```

**任何一项检查不通过，审查结果即为不通过。**

---

# 第二部分：测试案例

## 14. 测试覆盖率要求

- 核心业务代码覆盖率 ≥ 80%
- 新代码必须包含相应测试
- 关键路径必须 100% 覆盖

## 15. 测试命名规范

使用 `should_xxx_when_xxx` 格式，描述测试场景（所有语言通用）：

```java
@Test
void should_return_user_when_user_exists() {

}
```

```typescript
it('should_return_user_when_user_exists', () => {

});
```

```python
def test_should_return_user_when_user_exists():

    pass
```

```go
func TestShouldReturnUserWhenUserExists(t *testing.T) {

}
```

## 16. 测试结构（given-when-then）

所有语言均使用 given-when-then 结构组织测试：

```java
@Test
void should_return_user_when_user_exists() {
    // given: 准备测试数据
    User user = new User("test@example.com");

    // when: 执行被测方法
    User result = userService.findByEmail("test@example.com");

    // then: 验证结果
    assertNotNull(result);
    assertEquals("test@example.com", result.getEmail());
}
```

## 17. 测试代码示例

### 17.1. 单元测试示例

<details>
<summary><b>Java (JUnit 5 + Mockito)</b></summary>

```java
/**
 * 用户服务测试类
 *
 * @author 乌骓
 * @date 2024-01-15
 */
class UserServiceTest {

    private UserService userService;
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userService = new UserService(userRepository);
    }

    @Test
    void should_return_user_when_user_exists() {
        // given: 准备测试数据
        User expectedUser = new User("test@example.com");
        when(userRepository.findByEmail("test@example.com"))
            .thenReturn(expectedUser);

        // when: 执行被测方法
        User result = userService.findByEmail("test@example.com");

        // then: 验证结果
        assertNotNull(result);
        assertEquals("test@example.com", result.getEmail());
    }

    @Test
    void should_throw_exception_when_user_not_found() {
        // given: 模拟用户不存在
        when(userRepository.findByEmail("notexist@example.com"))
            .thenReturn(null);

        // when & then: 验证抛出异常
        assertThrows(UserNotFoundException.class, () -> {
            userService.findByEmail("notexist@example.com");
        });
    }
}
```

</details>

<details>
<summary><b>Go (testing)</b></summary>

```go
// Package service 用户服务测试
package service

import (
    "testing"
)

// TestUserService_ShouldReturnUserWhenUserExists 用户服务测试
//
// Given: 准备测试数据
// When: 执行被测方法
// Then: 验证结果
//
// Author: 乌骓
// Date: 2024-01-15
func TestUserService_ShouldReturnUserWhenUserExists(t *testing.T) {
    // given: 准备测试数据
    expectedUser := &User{Email: "test@example.com"}

    // when: 执行被测方法
    result := userService.FindByEmail("test@example.com")

    // then: 验证结果
    if result == nil {
        t.Errorf("expected user, got nil")
    }
    if result.Email != expectedUser.Email {
        t.Errorf("expected %s, got %s", expectedUser.Email, result.Email)
    }
}
```

</details>

<details>
<summary><b>TypeScript / Vue (Vitest)</b></summary>

```typescript
/**
 * 用户服务测试类
 *
 * @author 乌骓
 * @date 2024-01-15
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UserService', () => {
    // given: 准备测试数据
    let userService: UserService;
    let userRepository: jest.Mocked<UserRepository>;

    beforeEach(() => {
        // given: 创建 mock
        userRepository = {
            findByEmail: vi.fn(),
        } as any;
        userService = new UserService(userRepository);
    });

    // when: 执行被测方法
    it('should_return_user_when_user_exists', async () => {
        // given: 模拟用户存在
        const expectedUser = { email: 'test@example.com' };
        userRepository.findByEmail.mockResolvedValue(expectedUser);

        // when: 执行被测方法
        const result = await userService.findByEmail('test@example.com');

        // then: 验证结果
        expect(result).not.toBeNull();
        expect(result?.email).toBe('test@example.com');
    });

    // then: 验证抛出异常
    it('should_throw_exception_when_user_not_found', async () => {
        // given: 模拟用户不存在
        userRepository.findByEmail.mockResolvedValue(null);

        // when & then: 验证抛出异常
        await expect(
            userService.findByEmail('notexist@example.com')
        ).rejects.toThrow(UserNotFoundException);
    });
});
```

```typescript
// Vue 组件测试示例
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserCard from './UserCard.vue';

/**
 * UserCard 组件测试
 *
 * @author 乌骓
 * @date 2024-01-15
 */
describe('UserCard', () => {
    // given: 准备测试数据
    const mockUser = {
        name: '张三',
        email: 'zhangsan@example.com',
    };

    // when: 执行被测方法
    it('should_display_user_info', () => {
        // given: 挂载组件
        const wrapper = mount(UserCard, {
            props: { user: mockUser },
        });

        // then: 验证结果
        expect(wrapper.text()).toContain('张三');
        expect(wrapper.text()).toContain('zhangsan@example.com');
    });
});
```

</details>

<details>
<summary><b>Python (pytest)</b></summary>

```python
"""
用户服务测试类

Author: 乌骓
Date: 2024-01-15
"""
import pytest
from unittest.mock import Mock


class TestUserService:
    """用户服务测试类"""

    def setup_method(self):
        """测试初始化"""
        self.user_repository = Mock()
        self.user_service = UserService(self.user_repository)

    def test_should_return_user_when_user_exists(self):
        """当用户存在时返回用户"""
        # given: 准备测试数据
        expected_user = User(email="test@example.com")
        self.user_repository.find_by_email.return_value = expected_user

        # when: 执行被测方法
        result = self.user_service.find_by_email("test@example.com")

        # then: 验证结果
        assert result is not None
        assert result.email == "test@example.com"

    def test_should_raise_exception_when_user_not_found(self):
        """当用户不存在时抛出异常"""
        # given: 模拟用户不存在
        self.user_repository.find_by_email.return_value = None

        # when & then: 验证抛出异常
        with pytest.raises(UserNotFoundException):
            self.user_service.find_by_email("notexist@example.com")
```

</details>

### 17.2. 重构示例

**原始代码（超过 20 行）**：

```java
public void processOrder(Order order) {
    // 验证订单
    if (order == null) throw new IllegalArgumentException();
    if (order.getItems().isEmpty()) throw new IllegalArgumentException();
    // 计算价格
    BigDecimal total = BigDecimal.ZERO;
    for (Item item : order.getItems()) {
        total = total.add(item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
    }
    // 应用折扣
    if (total.compareTo(BigDecimal.valueOf(100)) > 0) {
        total = total.multiply(BigDecimal.valueOf(0.9));
    }
    // 保存订单
    order.setTotal(total);
    orderRepository.save(order);
    // 发送通知
    notificationService.sendOrderConfirmation(order);
}
```

**重构后（所有语言通用模式）**：

```java
public void processOrder(Order order) {
    validateOrder(order);
    BigDecimal total = calculateTotal(order);
    BigDecimal finalTotal = applyDiscount(total);
    saveAndNotify(order, finalTotal);
}
```

```typescript
// TypeScript 重构示例
async function processOrder(order: Order): Promise<void> {
    await validateOrder(order);
    const total = calculateTotal(order);
    const finalTotal = applyDiscount(total);
    await saveAndNotify(order, finalTotal);
}
```

```go
// Go 重构示例
func ProcessOrder(order *Order) error {
    if err := validateOrder(order); err != nil {
        return err
    }
    total := calculateTotal(order)
    finalTotal := applyDiscount(total)
    return saveAndNotify(order, finalTotal)
}
```

```python
# Python 重构示例
def process_order(order: Order) -> None:
    validate_order(order)
    total = calculate_total(order)
    final_total = apply_discount(total)
    save_and_notify(order, final_total)
```

## 18. 测试覆盖率报告示例

```
=============================== coverage report ===============================
File                                          |   % |  Stmts |  Miss |  Branches |  Miss
------------------------------------------------------------------------------------------------
com/example/service/UserService.java           | 100 |     45 |     0 |       10 |     0
com/example/service/OrderService.java         | 85  |    120 |    18 |       25 |     4
======================================================================================
TOTAL                                         | 92  |    165 |    18 |       35 |     4
=============================== 80% threshold PASSED ===============================
```
