## 用户登录

### 🔵 POST /api/v1/auth/login

**功能描述**：用户通过用户名和密码登录系统，获取访问令牌。

| 字段 | 值 | 描述 |
|------|-----|------|
| **Method** | **POST** | HTTP 请求方法 |
| **Path** | /api/v1/auth/login | 接口路径 |
| **描述** | 用户登录 | 获取访问令牌 |
| **Content-Type** | application/json | 请求内容类型 |

### Header 参数

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| Content-Type | string | 是 | 请求内容类型 | application/json |
| Accept | string | 否 | 接受的内容类型 | application/json |

### Body 请求体

| 字段 | 类型 | 必填 | 描述 | 示例值 |
|------|------|------|------|--------|
| username | string | 是 | 用户名，4-20 位字母或数字 | admin |
| password | string | 是 | 密码，8-32 位 | Password123! |
| captcha | string | 否 | 验证码，4 位数字（开启验证码时必填） | 1234 |
| captchaKey | string | 否 | 验证码 Key（开启验证码时必填） | uuid-key |

### 响应结果

#### 成功响应 (200)

| 状态码 | 描述 | 说明 |
|--------|------|------|
| 200 | OK | 登录成功 |

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "userInfo": {
      "userId": 12345,
      "username": "admin",
      "nickname": "管理员",
      "email": "admin@example.com",
      "roles": ["admin", "user"],
      "permissions": ["user:read", "user:write", "user:delete"]
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 错误响应 (4xx/5xx)

| 状态码 | 描述 | 说明 |
|--------|------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 用户名或密码错误 |
| 403 | Forbidden | 账号被禁用 |
| 429 | Too Many Requests | 登录尝试过于频繁 |
| 500 | Internal Server Error | 服务器内部错误 |

**用户名或密码错误**：

```json
{
  "code": 401,
  "message": "用户名或密码错误",
  "errors": [],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**账号被禁用**：

```json
{
  "code": 403,
  "message": "账号已被禁用，请联系管理员",
  "errors": [],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440002"
}
```

**登录过于频繁**：

```json
{
  "code": 429,
  "message": "登录尝试过于频繁，请 30 分钟后再试",
  "errors": [],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440003"
}
```

### 使用示例

#### 请求示例

```bash
curl -X POST "https://api.example.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Request-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "username": "admin",
    "password": "Password123!",
    "captcha": "1234",
    "captchaKey": "550e8400-e29b-41d4-a716-446655440099"
  }'
```

#### 响应示例

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "userInfo": {
      "userId": 12345,
      "username": "admin",
      "nickname": "管理员",
      "roles": ["admin"]
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 刷新令牌

### 🔵 POST /api/v1/auth/refresh

**功能描述**：使用 Refresh Token 换取新的 Access Token。

| 字段 | 值 | 描述 |
|------|-----|------|
| **Method** | **POST** | HTTP 请求方法 |
| **Path** | /api/v1/auth/refresh | 接口路径 |
| **描述** | 刷新访问令牌 | 使用 refresh token 获取新的 access token |
| **Content-Type** | application/json | 请求内容类型 |

### Body 请求体

| 字段 | 类型 | 必填 | 描述 | 示例值 |
|------|------|------|------|--------|
| refreshToken | string | 是 | 刷新令牌 | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh |

### 响应结果

#### 成功响应 (200)

```json
{
  "code": 200,
  "message": "令牌刷新成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new.refresh",
    "tokenType": "Bearer",
    "expiresIn": 7200
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440010"
}
```

#### 错误响应 (401)

```json
{
  "code": 401,
  "message": "刷新令牌已过期，请重新登录",
  "errors": [],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440011"
}
```

### 使用示例

```bash
curl -X POST "https://api.example.com/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh"
  }'
```

---

## 获取当前用户信息

### 🟢 GET /api/v1/auth/me

**功能描述**：获取当前登录用户的详细信息。

| 字段 | 值 | 描述 |
|------|-----|------|
| **Method** | **GET** | HTTP 请求方法 |
| **Path** | /api/v1/auth/me | 接口路径 |
| **描述** | 获取当前用户信息 | 获取已登录用户的详细信息 |

### Header 参数

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| Authorization | string | 是 | Bearer Token 认证令牌 | Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |

### 响应结果

#### 成功响应 (200)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": 12345,
    "username": "admin",
    "nickname": "管理员",
    "email": "admin@example.com",
    "phone": "13800138000",
    "avatar": "https://example.com/avatars/12345.jpg",
    "gender": "male",
    "birthDate": "1990-01-15",
    "roles": ["admin", "user"],
    "permissions": ["user:read", "user:write", "user:delete"],
    "department": "技术部",
    "position": "高级工程师",
    "lastLoginAt": "2024-01-15T10:30:00Z",
    "createdAt": "2023-06-01T08:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440020"
}
```

#### 错误响应 (401)

```json
{
  "code": 401,
  "message": "访问令牌已过期或无效",
  "errors": [],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440021"
}
```

### 使用示例

```bash
curl -X GET "https://api.example.com/api/v1/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 用户登出

### 🔵 POST /api/v1/auth/logout

**功能描述**：当前用户登出系统，使访问令牌失效。

| 字段 | 值 | 描述 |
|------|-----|------|
| **Method** | **POST** | HTTP 请求方法 |
| **Path** | /api/v1/auth/logout | 接口路径 |
| **描述** | 用户登出 | 使当前令牌失效 |

### Header 参数

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| Authorization | string | 是 | Bearer Token 认证令牌 | Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |

### 响应结果

#### 成功响应 (200)

```json
{
  "code": 200,
  "message": "登出成功",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440030"
}
```

### 使用示例

```bash
curl -X POST "https://api.example.com/api/v1/auth/logout" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
