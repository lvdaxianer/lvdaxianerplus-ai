---
name: api-doc
description: 用于编写 API 接口文档。当用户需要编写、创建、格式化 API 接口文档时触发，包括描述 API 端点、Header 参数、Body 请求体、响应结果、使用示例等场景。适用于后端 API 文档编写、接口规范制定、API 文档模板生成等任务。
---

# API 接口文档编写规范

## 角色定义

> 你是一位专业的 API 文档工程师，负责编写清晰、规范、易读的 API 接口文档。

---

## 1. 文档结构

每个 API 接口文档必须包含以下章节：

1. **基本信息** - **Method**（突出显示）、Path、描述
2. **Header 参数** - 请求头参数（包含认证信息）
3. **Path 参数** - URL 路径参数
4. **Query 参数** - 查询字符串参数
5. **Body 请求体** - 请求参数结构（POST/PUT/PATCH）
6. **响应结果** - 成功和错误响应格式
7. **使用示例** - 每种 HTTP 方法的 cURL 请求示例和响应示例

---

## 2. HTTP 方法规范

### 2.1 方法一览

| Method | 用途 | 说明 | 示例 |
|--------|------|------|------|
| **GET** | 查询 | 获取资源列表或单个资源 | 查询用户列表、获取用户详情 |
| **POST** | 创建 | 创建新资源 | 创建用户、创建订单 |
| **PUT** | 全量更新 | 替换整个资源 | 更新用户全部信息 |
| **PATCH** | 部分更新 | 更新资源的部分字段 | 修改用户手机号 |
| **DELETE** | 删除 | 删除指定资源 | 删除用户、删除订单 |

### 2.2 方法与 Body 关系

| Method | Body | 说明 |
|--------|------|------|
| GET | 无 | GET 请求不带请求体 |
| POST | 有 | 请求体格式为 JSON |
| PUT | 有 | 请求体格式为 JSON |
| PATCH | 有 | 请求体格式为 JSON |
| DELETE | 无 | DELETE 请求通常不带请求体 |

---

## 3. 基本信息

**必须突出显示 Method**：

```markdown
## 获取用户详情

### 🔵 GET /api/v1/users/{userId}

**功能描述**：根据用户 ID 获取用户的详细信息，包括基本信息、扩展资料等。

| 字段 | 值 | 描述 |
|------|-----|------|
| **Method** | **GET** | HTTP 请求方法，必须大写突出显示 |
| **Path** | /api/v1/users/{userId} | 接口路径，{userId} 为路径参数 |
| **描述** | 获取用户详情 | 接口功能简述 |
```

---

## 4. Header 参数

```markdown
### Header 参数

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| Authorization | string | 是 | Bearer Token 认证令牌 | Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| Content-Type | string | POST/PUT/PATCH 时必填 | 请求内容类型 | application/json |
| Accept | string | 否 | 接受的内容类型 | application/json |
| Request-ID | string | 否 | 请求唯一标识，用于追踪 | 550e8400-e29b-41d4-a716-446655440000 |
```

### 认证类型说明

| 认证类型 | Header 值 | 描述 |
|----------|-----------|------|
| Bearer Token | Authorization: Bearer \<token\> | JWT Token 认证 |
| API Key | Authorization: ApiKey \<key\> | API 密钥认证 |
| Basic Auth | Authorization: Basic \<base64\> | 用户名:密码 Base64 编码 |

---

## 5. Path 参数

```markdown
### Path 参数

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| userId | integer | 是 | 用户 ID | 12345 |
| orderId | string | 是 | 订单编号 | ORD-20240101-001 |
```

---

## 6. Query 参数

```markdown
### Query 参数

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| page | integer | 否 | 页码，默认 1 | 1 |
| pageSize | integer | 否 | 每页数量，默认 20，最大 100 | 20 |
| sort | string | 否 | 排序字段，格式：field:asc/desc | createdAt:desc |
| status | string | 否 | 筛选状态 | active |
| keyword | string | 否 | 搜索关键字 | 张三 |
```

---

## 7. Body 请求体

```markdown
### Body 请求体

**Content-Type**: application/json

| 字段 | 类型 | 必填 | 描述 | 示例值 |
|------|------|------|------|--------|
| username | string | 是 | 用户名，4-20 位字母或数字 | john_doe |
| email | string | 是 | 邮箱地址，有效邮箱格式 | user@example.com |
| password | string | 是 | 密码，8-32 位 | Password123! |
| phone | string | 否 | 手机号，11 位数字 | 13800138000 |
| gender | string | 否 | 性别：male/female/other | male |
| birthDate | string | 否 | 出生日期，格式：yyyy-MM-dd | 1990-01-15 |
| tags | array | 否 | 用户标签列表 | ["vip","active"] |
| profile | object | 否 | 用户资料对象 | {...} |
```

#### 请求体结构示例

```json
{
  "username": "john_doe",
  "email": "user@example.com",
  "password": "Password123!",
  "phone": "13800138000",
  "gender": "male",
  "birthDate": "1990-01-15",
  "tags": ["vip", "active"],
  "profile": {
    "nickname": "John",
    "avatar": "https://example.com/avatar.jpg",
    "bio": "Hello world"
  }
}
```

### 数据类型规范

| 类型 | 描述 | 示例值 |
|------|------|--------|
| string | 字符串 | "hello" |
| integer | 32 位整数 | 123 |
| long | 64 位整数 | 9223372036854775807 |
| float | 单精度浮点数 | 3.14 |
| double | 双精度浮点数 | 3.14159265358979 |
| boolean | 布尔值 | true/false |
| array | 数组 | [1, 2, 3] |
| object | 对象 | {"key": "value"} |
| date | 日期，yyyy-MM-dd 格式 | 2024-01-15 |
| datetime | 日期时间，ISO 8601 格式 | 2024-01-15T10:30:00Z |

---

## 8. 响应结果

### 8.1 响应格式

```markdown
### 响应结果

#### 成功响应 (2xx)

| 状态码 | 描述 | 说明 |
|--------|------|------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 请求成功但无返回内容（通常用于 DELETE） |
```

**成功响应示例**：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 错误响应 (4xx/5xx)

| 状态码 | 描述 | 说明 |
|--------|------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未授权或 Token 失效 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 422 | Unprocessable Entity | 请求格式正确但语义错误 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器内部错误 |

**错误响应示例**：

```json
{
  "code": 400,
  "message": "请求参数验证失败",
  "errors": [
    {
      "field": "email",
      "message": "邮箱格式不正确"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 8.2 响应字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| code | integer | 业务状态码，与 HTTP 状态码对应 |
| message | string | 状态描述信息 |
| data | object/null | 响应数据主体，可为 null |
| errors | array | 错误详情列表，仅错误响应时返回 |
| timestamp | string | 服务器时间戳，ISO 8601 格式 |
| requestId | string | 请求唯一标识，用于日志追踪 |

### 8.3 分页响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 9. 使用示例（每种 Method 都必须有）

### 🟢 GET 示例

#### 获取用户详情

**接口**：`GET /api/v1/users/{userId}`

**请求示例**：

```bash
curl -X GET "https://api.example.com/api/v1/users/12345" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept: application/json"
```

**响应示例**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": 12345,
    "username": "john_doe",
    "email": "user@example.com",
    "phone": "13800138000",
    "gender": "male",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

#### 获取用户列表（带分页）

**接口**：`GET /api/v1/users`

**请求示例**：

```bash
curl -X GET "https://api.example.com/api/v1/users?page=1&pageSize=20&status=active" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept: application/json"
```

**响应示例**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "userId": 12345,
        "username": "john_doe",
        "email": "user@example.com"
      },
      {
        "userId": 12346,
        "username": "jane_doe",
        "email": "jane@example.com"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 🟢 DELETE 示例

#### 删除用户

**接口**：`DELETE /api/v1/users/{userId}`

**请求示例**：

```bash
curl -X DELETE "https://api.example.com/api/v1/users/12345" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept: application/json"
```

**响应示例**：

```json
{
  "code": 204,
  "message": "用户删除成功",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 🔵 POST 示例

#### 创建用户

**接口**：`POST /api/v1/users`

**请求示例**：

```bash
curl -X POST "https://api.example.com/api/v1/users" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Request-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "username": "john_doe",
    "email": "user@example.com",
    "password": "Password123!",
    "phone": "13800138000",
    "gender": "male"
  }'
```

**响应示例**：

```json
{
  "code": 201,
  "message": "用户创建成功",
  "data": {
    "userId": 12345,
    "username": "john_doe",
    "email": "user@example.com",
    "phone": "13800138000",
    "gender": "male",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**错误响应示例**：

```json
{
  "code": 400,
  "message": "请求参数验证失败",
  "errors": [
    {
      "field": "email",
      "message": "邮箱格式不正确"
    },
    {
      "field": "password",
      "message": "密码长度不能少于 8 位"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 🟡 PUT 示例

#### 全量更新用户

**接口**：`PUT /api/v1/users/{userId}`

**请求示例**：

```bash
curl -X PUT "https://api.example.com/api/v1/users/12345" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "username": "john_doe_updated",
    "email": "newemail@example.com",
    "password": "NewPassword123!",
    "phone": "13900139000",
    "gender": "female"
  }'
```

**响应示例**：

```json
{
  "code": 200,
  "message": "用户更新成功",
  "data": {
    "userId": 12345,
    "username": "john_doe_updated",
    "email": "newemail@example.com",
    "phone": "13900139000",
    "gender": "female",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "timestamp": "2024-01-15T11:00:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440001"
}
```

---

### 🟡 PATCH 示例

#### 部分更新用户

**接口**：`PATCH /api/v1/users/{userId}`

**请求示例**：

```bash
curl -X PATCH "https://api.example.com/api/v1/users/12345" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "phone": "13900139000"
  }'
```

**响应示例**：

```json
{
  "code": 200,
  "message": "用户更新成功",
  "data": {
    "userId": 12345,
    "username": "john_doe",
    "email": "user@example.com",
    "phone": "13900139000",
    "gender": "male",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "timestamp": "2024-01-15T11:00:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440002"
}
```

---

## 10. 完整 API 文档模板

```markdown
## [接口名称]

### 🔵 [METHOD] /api/v1/[resource]

**功能描述**：接口的详细功能描述。

| 字段 | 值 | 描述 |
|------|-----|------|
| **Method** | **GET/POST/PUT/PATCH/DELETE** | HTTP 方法 |
| **Path** | /api/v1/resource | 接口路径 |
| **描述** | 功能描述 | 接口简述 |
| **Content-Type** | application/json | POST/PUT/PATCH 时必填 |

### Header 参数

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| Authorization | string | 是 | Bearer Token 认证令牌 |
| Content-Type | string | POST/PUT/PATCH | 请求内容类型 |

### Path 参数（如有）

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| id | integer | 是 | 资源ID |

### Query 参数（如有）

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| page | integer | 否 | 页码 |

### Body 请求体（如有）

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| field | string | 是 | 字段描述 |

### 响应结果

#### 成功响应 (2xx)

| 状态码 | 描述 |
|--------|------|
| 200 | OK |

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "uuid"
}
```

#### 错误响应 (4xx/5xx)

| 状态码 | 描述 |
|--------|------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |

```json
{
  "code": 400,
  "message": "error message",
  "errors": [],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "uuid"
}
```

### 使用示例

#### 请求示例

\`\`\`bash
curl -X [METHOD] "https://api.example.com/api/v1/resource" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
\`\`\`

#### 响应示例

\`\`\`json
{
  "code": 200,
  "message": "success",
  "data": {}
}
\`\`\`
```

---

## 11. 编写规范检查清单

- [ ] **Method 突出显示**（使用 🔵🟢🟡 等颜色标记或加粗）
- [ ] GET 请求：无 Body，有 Query 参数示例
- [ ] POST 请求：有 Body 请求示例
- [ ] PUT 请求：有 Body 请求示例
- [ ] PATCH 请求：有 Body 请求示例
- [ ] DELETE 请求：有请求示例
- [ ] 包含成功响应示例
- [ ] 包含错误响应示例
- [ ] cURL 示例完整（包含 Header、Body）
- [ ] 响应示例使用格式化 JSON
