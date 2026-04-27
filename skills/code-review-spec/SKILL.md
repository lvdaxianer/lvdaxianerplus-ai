---
name: code-review-spec
description: Use when performing code review, code review after changes, code formatting, editing code, modifying code, or when user asks to review code. Applies to all programming languages (Java, Python, Go, TypeScript, Vue, etc.). Checks: code specifications, class/method comments, comment ratio (≥60%), naming conventions, security rules, exception handling, logging standards, database specs, API design, git commit format, dependency management, code complexity limits, null safety, function parameters limit, code duplication detection, magic numbers/constants, collection capacity, string concatenation, equals/hashCode. Trigger automatically when user modifies or formats code.
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

所有代码的 `@author` 注解必须填写 `lvdaxianerplus`。

## 3. 代码规范

> **通用原则**：代码规范不区分开发语言，适用于所有编程语言（Java、Python、Go、TypeScript、Vue 等）。

### 3.1. 方法注释规范

每个方法必须包含完整的文档注释，风格随语言而变。

> **代码示例**：详见 [references/method-comments.md](references/method-comments.md)

### 3.2. 类注释规范

每个类必须包含完整的文档注释。

> **代码示例**：详见 [references/class-comments.md](references/class-comments.md)

### 3.3. 条件分支注释规范

每个 if-else 分支必须包含清晰的注释（所有语言通用）。

> **代码示例**：详见 [references/if-else-comments.md](references/if-else-comments.md)

**注意**：优先使用 if-else 结构而非 switch-case。如必须使用 switch-case，每个 case 必须有对应的 default 分支。

### 3.3.1. if-else 强制配对规范（强制）

> **强制要求**：所有 if 语句**必须**包含 else 分支，不允许存在单独 if 而无 else 的情况。

**核心原则**：
- 每个 if 都必须有对应的 else
- 如果 if 分支是**设置值**的操作，else 分支必须设置一个**合理的值**（根据业务逻辑，else 可能设置初期值、默认值、空值、备选值、降级值等）
- 这是代码健壮性的基础，确保所有分支路径都被正确处理

> **代码示例（正确/错误示例及合理值类型表）**：详见 [references/if-else-pairing.md](references/if-else-pairing.md)

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

> **代码示例（Java/Python/TypeScript）**：详见 [references/batch-processing.md](references/batch-processing.md)

### 3.7. 循环内禁止调用远程服务或数据库

> **通用原则**：禁止在 for、map、forEach、filter 等循环结构中直接调用远程服务或连接数据库。
>
> 此规范适用于所有编程语言，是保障系统稳定性、性能和可维护性的基础要求。

**核心危害**：
- **性能崩塌**：循环内发起远程调用会导致 O(n) 的网络开销，系统响应时间随数据量线性增长
- **资源耗尽**：数据库连接池被快速耗尽，引发连接超时或系统崩溃
- **服务雪崩**：下游服务收到海量并发请求，容易触发限流或熔断
- **事务风险**：在循环内操作数据库可能导致长事务，锁竞争加剧

> **代码示例（正确/错误示例及滑动窗口批处理）**：详见 [references/loop-remote-calls.md](references/loop-remote-calls.md)

**正确做法**：
1. **批量接口**：调用方提供批量查询 API（如 `findAllById(ids)`、`getUsersByIds(ids)`）
2. **内存操作**：循环仅做内存数据转换、聚合等无副作用操作
3. **异步批处理**：如必须分批处理，使用滑动窗口或并发批处理（如每批 100 条）
4. **缓存预热**：热点数据提前加载到缓存，减少循环内远程调用

### 3.8. Java 线程池规范

> **仅适用于 Java**：禁止使用已定义的线程池（如 `ExecutorService`、`@Async` 默认线程池），必须使用自定义线程池。

#### 3.8.1. 线程池定义要求

- 必须定义有意义的 `threadName`（使用 `ThreadFactory` 设置）
- 必须使用有业务含义的日志标识
- 线程池名称应体现业务用途

> **代码示例（正确/错误示例及命名规范表）**：详见 [references/thread-pool.md](references/thread-pool.md)

### 3.9. 空值处理规范（Null Safety）

> **强制要求**：禁止直接返回 `null`，必须使用语言提供的空值安全机制。

**核心原则**：
- 返回值可能不存在时，使用 `Optional`/`T | undefined`/`T | None` 显式声明
- 调用方必须处理可能的空值情况，提供默认值或明确异常
- 参数传递时不使用 Optional 包装，直接传对象并在方法内处理

> **代码示例（Java/TypeScript/Python/Go 各语言规范、返回值/参数/检查规范表）**：详见 [references/null-safety.md](references/null-safety.md)

### 3.10. 函数参数数量限制

> **强制要求**：函数参数数量必须严格控制，超过限制必须重构。

**参数数量规范**：

| 参数数量 | 处理方式 |
|----------|----------|
| 1-3 个 | 直接传参，清晰简洁 |
| 4-5 个 | 使用配置对象/结构体/字典 |
| 6+ 个 | **必须重构**：拆分函数或封装参数类 |

> **代码示例（各语言正确/错误示例、参数对象设计原则）**：详见 [references/function-parameters.md](references/function-parameters.md)

### 3.11. 代码重复检测

> **强制要求**：相同或相似代码出现多次时，必须提取为公共方法/函数。

**重复代码检测标准**：

| 重复程度 | 处理要求 |
|----------|----------|
| 相同代码块 ≥ 3 处 | **必须**提取为公共方法 |
| 相似代码块 ≥ 2 处 | **应该**提取，使用参数区分差异 |
| 结构相似但逻辑不同 | 考虑抽象模板方法模式 |

> **代码示例（各语言提取公共方法、模板方法模式、检测方法）**：详见 [references/code-duplication.md](references/code-duplication.md)

### 3.12. 常量与魔法数字规范

> **强制要求**：禁止在代码中直接使用魔法数字、魔法字符串，必须定义为常量或枚举。

**魔法数字定义**：代码中直接出现的、含义不明确的数字或字符串值。

**常量定义原则**：
- 使用 UPPER_SNAKE_CASE 命名（Go 可用 CamelCase）
- 按业务领域分组组织常量
- 固定选项优先使用枚举，单值阈值使用常量

> **代码示例（各语言常量/枚举示例、命名规范、组织方式）**：详见 [references/magic-numbers.md](references/magic-numbers.md)

### 3.13. 集合初始化容量规范

> **强制要求**：创建集合时必须指定合理的初始容量，避免不必要的扩容开销。

**扩容影响**：
- 每次扩容创建新数组 + 复制旧数据
- 多次扩容导致额外内存分配和 CPU 消耗
- HashMap 需要考虑 loadFactor（默认 0.75）

> **代码示例（各语言集合容量规范、默认容量表、容量计算公式）**：详见 [references/collection-capacity.md](references/collection-capacity.md)

### 3.14. 字符串拼接规范

> **强制要求**：禁止在循环内使用 `+` 或 `concat` 拼接字符串，必须使用 StringBuilder/StringBuffer 或语言的字符串连接方法。

**性能影响**：
- 字符串不可变，每次拼接创建新对象
- 循环内拼接性能呈 O(n²) 下降
- 大量临时对象增加 GC 压力

> **代码示例（各语言正确/错误示例、拼接方法选择指南、性能对比）**：详见 [references/string-concatenation.md](references/string-concatenation.md)

### 3.15. equals/hashCode 规范

> **强制要求**：重写 `equals` 方法时**必须**同时重写 `hashCode` 方法，否则会导致 Map/Set 行为异常。

**契约关系**：
- 相等对象必须有相同的哈希值
- 哈希值相同不一定相等（哈希冲突）
- 多次调用 hashCode 必须返回相同值

> **代码示例（各语言正确实现、IDE生成/Lombok、实现清单）**：详见 [references/equals-hashcode.md](references/equals-hashcode.md)

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

## 6. 异常处理规范（扩展）

### 6.1. OAuth2 认证登录异常日志规范（强制）

> **适用场景**：OAuth2、JWT、SSO 等认证登录流程

**强制要求**：认证登录流程中，所有异常情况及可能导致退出认证的 if 分支**必须打印 WARN 日志**，不得遗漏。

**必须记录 WARN 日志的场景**：

| 场景 | 日志级别 | 示例 |
|------|----------|------|
| Token 过期/无效 | WARN | `[OAuth2认证] Token无效或已过期, tokenId={}` |
| 签名验证失败 | WARN | `[OAuth2认证] Token签名验证失败, error={}` |
| 认证信息缺失 | WARN | `[OAuth2认证] 认证信息缺失, missingField={}` |
| 权限不足/拒绝访问 | WARN | `[OAuth2认证] 权限不足, userId={}, requiredRole={}` |
| 认证服务不可用 | WARN | `[OAuth2认证] 认证服务调用失败, error={}` |
| Token 被吊销 | WARN | `[OAuth2认证] Token已被吊销, tokenId={}` |
| 第三方认证失败 | WARN | `[OAuth2认证] 第三方认证失败, provider={}, error={}` |
| 会话失效/过期 | WARN | `[OAuth2认证] 会话已失效或过期, sessionId={}` |

**示例代码**：

```java
// OAuth2 认证流程中的 WARN 日志示例
public class OAuth2AuthenticationHandler {

    public AuthenticationResult authenticate(String token) {
        // 场景1: Token 为空
        if (token == null || token.isEmpty()) {
            log.warn("[OAuth2认证] Token为空或缺失, requestIp={}", requestIp);
            return AuthenticationResult.fail("Token不能为空");
        }

        // 场景2: Token 格式错误
        if (!isValidTokenFormat(token)) {
            log.warn("[OAuth2认证] Token格式无效, token={}", maskToken(token));
            return AuthenticationResult.fail("Token格式错误");
        }

        try {
            // 认证逻辑
            Claims claims = jwtParser.parseClaimsJws(token).getBody();
            // ...
        } catch (ExpiredJwtException e) {
            log.warn("[OAuth2认证] Token已过期, expiredAt={}", e.getClaims().getExpiration());
            return AuthenticationResult.fail("Token已过期");
        } catch (JwtException e) {
            log.warn("[OAuth2认证] Token解析失败, error={}", e.getMessage());
            return AuthenticationResult.fail("Token无效");
        }

        // 场景3: 用户被禁用
        if (user.isDisabled()) {
            log.warn("[OAuth2认证] 用户已被禁用, userId={}", user.getId());
            return AuthenticationResult.fail("用户已被禁用");
        }

        // 场景4: 权限不足
        if (!hasRequiredRole(user, requiredRole)) {
            log.warn("[OAuth2认证] 权限不足, userId={}, requiredRole={}", user.getId(), requiredRole);
            return AuthenticationResult.fail("权限不足");
        }

        return AuthenticationResult.success(user);
    }
}
```

**核心原则**：
- 认证登录流程中的**任何异常分支**都必须记录 WARN 日志
- 日志需包含足够的上下文信息（tokenId、userId、error、过期时间等）
- 不得在认证流程中静默吞掉异常或只记录 DEBUG 级别
- WARN 日志帮助快速定位认证失败原因，降低安全事件排查成本

### 6.2. 异常类型选择
- **RuntimeException / Error**：程序员错误（逻辑 Bug）
- **CheckedException / IOError**：外部依赖失败（IO、网络）
- **自定义异常**：业务错误

### 6.2. 异常抛出原则
- 不要捕获而不处理（至少记录日志）
- 不要捕获 Throwable/Exception/Error（范围太广）
- 不要在 finally 块中抛出异常

> **代码示例（Java/Go/TypeScript/Python）**：详见 [references/exception-handling.md](references/exception-handling.md)

## 7. 日志规范

### 7.1. 服务间调用日志规范（强制）

> **适用场景**：HTTP/REST、gRPC、GraphQL 等服务间调用

**强制要求**：调用其他服务时，必须将**请求参数、Header、响应状态码和响应体**完整记录到日志中。

**日志记录时机与内容**：

| 调用阶段 | 日志级别 | 必须记录的内容 |
|----------|----------|----------------|
| 发起请求 | DEBUG | 请求 URL、HTTP 方法、Header（脱敏）、请求参数/请求体 |
| 收到响应 | DEBUG | 响应状态码、响应耗时、响应体（脱敏） |
| 调用失败 | WARN | 错误信息、异常堆栈、请求上下文 |

**日志格式规范**：

```
[服务间调用] 阶段|服务名称|接口|状态码|耗时ms
[服务间调用] 阶段|服务名称|接口|状态码|耗时ms|详情(JSON格式)
```

**示例代码**：

```java
// HTTP 服务调用日志示例
public class HttpServiceClient {

    private static final Logger log = LoggerFactory.getLogger(HttpServiceClient.class);

    public UserResponse getUser(Long userId) {
        // 构建请求
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .header("Authorization", "Bearer " + maskToken(token))
            .header("Content-Type", "application/json")
            .GET()
            .build();

        // 记录请求日志 (DEBUG)
        log.debug("[服务间调用] REQUEST|用户服务|/users/{}|GET|X-Request-Id={}, Authorization=Bearer ***",
            userId, request.headers().firstValue("X-Request-Id").orElse("N/A"));

        long startTime = System.currentTimeMillis();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            long duration = System.currentTimeMillis() - startTime;

            // 记录响应日志 (DEBUG)
            log.debug("[服务间调用] RESPONSE|用户服务|/users/{}|{}|{}ms|X-Request-Id={}",
                userId, response.statusCode(), duration,
                response.headers().firstValue("X-Request-Id").orElse("N/A"));

            // 脱敏处理后记录响应体
            if (log.isTraceEnabled()) {
                log.trace("[服务间调用] RESPONSE_BODY|用户服务|/users/{}|{}",
                    userId, maskSensitiveData(response.body()));
            }

            if (response.statusCode() >= 400) {
                log.warn("[服务间调用] ERROR|用户服务|/users/{}|{}|{}ms|错误: {}",
                    userId, response.statusCode(), duration, response.body());
            }

            return parseResponse(response);
        } catch (HttpServiceException e) {
            long duration = System.currentTimeMillis() - startTime;
            log.warn("[服务间调用] EXCEPTION|用户服务|/users/{}|{}|{}ms|服务调用失败: {}",
                userId, "TIMEOUT", duration, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 脱敏处理 - 隐藏敏感信息
     */
    private String maskToken(String token) {
        if (token == null || token.length() <= 8) {
            return "***";
        }
        return token.substring(0, 4) + "***" + token.substring(token.length() - 4);
    }

    /**
     * 脱敏处理 - 隐藏响应体中的敏感字段
     */
    private String maskSensitiveData(String body) {
        if (body == null) {
            return "null";
        }
        return body
            .replaceAll("\"password\"\\s*:\\s*\"[^\"]*\"", "\"password\":\"***\"")
            .replaceAll("\"token\"\\s*:\\s*\"[^\"]*\"", "\"token\":\"***\"")
            .replaceAll("\"secret\"\\s*:\\s*\"[^\"]*\"", "\"secret\":\"***\"")
            .replaceAll("\"creditCard\"\\s*:\\s*\"[^\"]*\"", "\"creditCard\":\"***\"");
    }
}
```

```typescript
// TypeScript 服务调用日志示例
export class ApiService {
    private readonly logger: Logger;

    async getUser(userId: number): Promise<UserResponse> {
        const requestId = generateRequestId();
        const headers = {
            'Authorization': `Bearer ${maskToken(this.token)}`,
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
        };

        // 记录请求日志 (DEBUG)
        this.logger.debug(`[服务间调用] REQUEST|用户服务|/users/${userId}|GET|X-Request-Id=${requestId}`);

        const startTime = Date.now();
        try {
            const response = await fetch(`https://api.example.com/users/${userId}`, {
                method: 'GET',
                headers,
            });

            const duration = Date.now() - startTime;
            const responseBody = await response.text();

            // 记录响应日志 (DEBUG)
            this.logger.debug(`[服务间调用] RESPONSE|用户服务|/users/${userId}|${response.status}|${duration}ms`);

            if (this.logger.isTraceEnabled()) {
                this.logger.trace(`[服务间调用] RESPONSE_BODY|用户服务|/users/${userId}|${maskSensitiveData(responseBody)}`);
            }

            if (!response.ok) {
                this.logger.warn(`[服务间调用] ERROR|用户服务|/users/${userId}|${response.status}|${duration}ms|错误: ${responseBody}`);
            }

            return JSON.parse(responseBody);
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.warn(`[服务间调用] EXCEPTION|用户服务|/users/${userId}|ERROR|${duration}ms|服务调用失败: ${error.message}`);
            throw error;
        }
    }
}
```

**核心原则**：
- 请求和响应日志必须在 **DEBUG** 级别记录
- 错误响应必须在 **WARN** 级别记录
- 敏感信息（Token、Password、CreditCard 等）必须脱敏后记录
- Header 中的 Authorization 字段必须脱敏或省略
- 日志需包含 X-Request-Id 以便链路追踪
- 响应体记录应使用 TRACE 级别，避免影响生产环境日志量

### 7.2. 日志级别
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

> **代码示例（业务标识日志、常见业务标识表、占位符使用）**：详见 [references/logging.md](references/logging.md)

## 8. 数据库规范

- 使用参数化查询，不拼接字符串
- SQL 关键字大写，每条查询都要使用 LIMIT
- 保持事务范围尽可能小，避免长事务
- 不全表扫描，索引列限制（≤ 5）

> **代码示例（SQL查询、Git提交格式）**：详见 [references/database-and-git.md](references/database-and-git.md)

## 12. 代码复杂度约束

| 类型 | 限制 |
|------|------|
| 普通类/模块 | ≤ 350 行 |
| Controller / Handler | ≤ 100 行 |
| Service / Service 层 | ≤ 300 行 |
| 单文件 | ≤ 350 行 |
| 方法/函数行数 | ≤ 20 行 |
| 方法圈复杂度 | ≤ 10 |

### 12.1. 策略模式替代多重 if 判断

> **强制要求**：当代码中存在多个 `if` 分支使用**相等判断**（如 `if (type == "A")`、`if (status === 1)`）时，必须使用**策略模式**替代。

**核心原则**：
- 相等判断的多分支 if-else 会增加代码复杂度，降低可维护性
- 策略模式将每个分支逻辑封装为独立的策略类，符合单一职责原则
- 新增分支时只需添加新策略类，无需修改原有代码（开闭原则）

> **代码示例（正确/错误示例、适用场景判断表、实现方式表）**：详见 [references/strategy-pattern.md](references/strategy-pattern.md)

## 13. 代码审查清单

> **强制执行**：以下清单所有条目均为强制要求，AI 在进行代码审查时必须逐项检查并报告结果。**任何一项不通过，审查结果即为不通过。**
>
> **修改范围确认**：每次代码审查前，必须与用户确认审查范围（全部文件/特定文件/变更部分）

### 13.1. 注释与文档（强制）

- [✅/❌/不适用] **作者标识**：所有代码的 `@author` 必须填写 `lvdaxianerplus`
- [✅/❌/不适用] **方法注释**：所有方法都有完整注释（@param、@return、@author、@date）
- [✅/❌/不适用] **类注释**：所有类都有 Javadoc 风格文档注释
- [✅/❌/不适用] **分支注释**：所有 if-else 分支都有条件说明注释
- [✅/❌/不适用] **注释比例**：注释行数达到总行数的 **60%** 以上

### 13.2. 代码质量（强制）

- [✅/❌/不适用] **方法行数**：每个方法不超过 **20 行**
- [✅/❌/不适用] **方法职责单一**：每个方法只能做一件事，如果涉及多件事必须拆分为多个独立方法
- [✅/❌/不适用] **类行数限制**：每个类不超过 **350 行**，超过必须拆分
- [✅/❌/不适用] **文件行数限制**：单文件不超过 **350 行**，超过必须拆分
- [✅/❌/不适用] **命名规范**：变量和方法命名符合 camelCase，常量使用 UPPER_SNAKE_CASE
- [✅/❌/不适用] **无硬编码**：无硬编码值（密码、密钥、令牌、魔法数字）
- [✅/❌/不适用] **布尔命名**：布尔变量使用 `is`、`has`、`can`、`should` 前缀
- [✅/❌/不适用] **策略模式**：存在 **4+ 个** if 相等判断分支时，必须使用策略模式替代
- [✅/❌/不适用] **空值处理**：禁止直接返回 `null`，必须使用 `Optional`/`T | undefined`/`T | None` 等空值安全机制
- [✅/❌/不适用] **参数数量**：函数参数 ≤ 3 个直接传参，4-5 个使用配置对象，6+ 个必须重构
- [✅/❌/不适用] **代码重复**：相同代码块 ≥ 3 处必须提取公共方法，相似代码 ≥ 2 处应考虑提取
- [✅/❌/不适用] **魔法数字**：禁止直接使用魔法数字/字符串，必须定义为常量或枚举
- [✅/❌/不适用] **集合容量**：创建集合时指定合理的初始容量，避免多次扩容
- [✅/❌/不适用] **字符串拼接**：循环内禁止使用 `+` 拼接，使用 StringBuilder/join 等方法
- [✅/❌/不适用] **equals/hashCode**：重写 equals 必须同时重写 hashCode，保持契约一致

### 13.3. 批量处理（强制）

- [✅/❌/不适用] **禁止 for 循环**：能用批量处理的场景（如 `saveAll()`、`findAllById()`）必须使用批量 API，禁止使用 for 循环逐条处理
- [✅/❌/不适用] **批量查询**：多次数据库查询必须合并为批量查询
- [✅/❌/不适用] **循环内禁止远程/DB调用**：禁止在 for、map、forEach、filter 等循环内直接调用远程服务或连接数据库

### 13.4. Java 线程池（强制，仅 Java）

- [✅/❌/不适用] **自定义线程池**：禁止使用 `ExecutorService` 默认线程池或 `@Async` 默认线程池，必须使用自定义线程池
- [✅/❌/不适用] **有意义名称**：线程池必须定义有意义的 `threadName`（如 `user-handler-%d`）
- [✅/❌/不适用] **线程日志**：线程池执行时必须打印业务日志，包含开始/成功/失败状态

### 13.5. 日志规范（强制）

- [✅/❌/不适用] **业务标识**：所有日志必须带有业务标识，格式为 `[业务标识] 消息内容`
- [✅/❌/不适用] **占位符**：日志必须使用占位符 `{}` 或 `%s`，禁止字符串拼接
- [✅/❌/不适用] **禁止直接输出**：禁止使用 `System.out.println`、`print`、`fmt.Println`
- [✅/❌/不适用] **敏感信息**：日志中不记录密码、密钥、令牌等敏感信息

### 13.6. 异常处理（强制）

- [✅/❌/不适用] **特定异常**：捕获特定异常类型，禁止捕获 `Throwable`/`Exception`
- [✅/❌/不适用] **异常链**：抛出新异常时必须包含原始异常
- [✅/❌/不适用] **日志记录**：捕获异常后至少记录日志，不允许静默吞掉异常

### 13.6.1. OAuth2 认证登录日志（强制）

- [✅/❌/不适用] **认证异常 WARN 日志**：OAuth2/JWT 认证流程中，Token 过期、无效、签名失败、权限不足等异常分支必须打印 WARN 日志
- [✅/❌/不适用] **认证退出分支日志**：所有可能导致退出认证的 if 分支都必须有完整的 WARN 日志记录
- [✅/❌/不适用] **日志上下文完整**：认证相关日志必须包含足够的上下文信息（tokenId、userId、error、过期时间等）

### 13.6.2. 服务间调用日志（强制）

- [✅/❌/不适用] **请求参数日志**：调用其他服务时，DEBUG 级别记录请求 URL、方法、Header、参数/请求体
- [✅/❌/不适用] **响应日志**：DEBUG 级别记录响应状态码、耗时、响应体
- [✅/❌/不适用] **错误日志**：调用失败时 WARN 级别记录错误信息、异常堆栈、请求上下文
- [✅/❌/不适用] **敏感信息脱敏**：日志中的 Token、Password、CreditCard 等敏感信息必须脱敏

### 13.7. 数据库规范（强制）

- [✅/❌/不适用] **参数化查询**：使用参数化查询，禁止字符串拼接 SQL
- [✅/❌/不适用] **LIMIT**：所有查询必须使用 LIMIT
- [✅/❌/不适用] **事务范围**：事务范围尽可能小，避免长事务

### 13.8. 安全规范（强制）

- [✅/❌/不适用] **输入验证**：所有外部输入必须验证
- [✅/❌/不适用] **SQL 注入**：使用参数化查询防注入
- [✅/❌/不适用] **XSS**：用户输入必须过滤或转义

### 13.9. if-else 强制配对规范（强制）

- [✅/❌/不适用] **else 强制**：所有 if 语句**必须**包含 else 分支，不允许存在单独 if 而无 else
- [✅/❌/不适用] **合理值设置**：如果 if 分支是设置值的操作，else 分支必须设置合理值（初期值、默认值、空值、备选值、降级值等）

---

### 审查报告格式

进行代码审查时，必须按以下格式输出结果，每项检查必须给出明确结果：

```
## 代码审查报告

### 修改范围
[用户确认的审查范围：全部文件/特定文件/变更部分]

### 13.1 注释与文档
- [✅/❌/不适用] 作者标识：具体说明
- [✅/❌/不适用] 方法注释：具体说明
- [✅/❌/不适用] 类注释：具体说明
- [✅/❌/不适用] 分支注释：具体说明
- [✅/❌/不适用] 注释比例：具体说明

### 13.2 代码质量
- [✅/❌/不适用] 方法行数：具体说明
- [✅/❌/不适用] 方法职责单一：具体说明
- [✅/❌/不适用] 类行数限制：具体说明（不超过 350 行）
- [✅/❌/不适用] 文件行数限制：具体说明（不超过 350 行）
- [✅/❌/不适用] 命名规范：具体说明
- [✅/❌/不适用] 无硬编码：具体说明
- [✅/❌/不适用] 布尔命名：具体说明
- [✅/❌/不适用] 策略模式：具体说明（4+ 个 if 相等判断分支是否使用策略模式）
- [✅/❌/不适用] 空值处理：具体说明（是否使用空值安全机制）
- [✅/❌/不适用] 参数数量：具体说明（参数是否超过限制）
- [✅/❌/不适用] 代码重复：具体说明（是否有重复代码未提取）
- [✅/❌/不适用] 魔法数字：具体说明（是否有魔法数字未定义常量）
- [✅/❌/不适用] 集合容量：具体说明（是否指定初始容量）
- [✅/❌/不适用] 字符串拼接：具体说明（循环内是否正确拼接）
- [✅/❌/不适用] equals/hashCode：具体说明（是否同时重写）

### 13.9 if-else 强制配对
- [✅/❌/不适用] else 强制：具体说明
- [✅/❌/不适用] 合理值设置：具体说明

### 总体评价
[通过/不通过]

### 需要修复的问题
1. ...
2. ...
```

**任何一项检查不通过，审查结果即为不通过。**