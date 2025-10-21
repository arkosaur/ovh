# 🔒 安全配置指南

本文档详细说明了 OVH 抢购面板的安全机制和配置方法。

## 目录

- [安全机制概述](#安全机制概述)
- [快速配置](#快速配置)
- [详细说明](#详细说明)
- [测试验证](#测试验证)
- [常见问题](#常见问题)

---

## 安全机制概述

本项目实现了完整的前后端API密钥验证机制，包括：

### 🛡️ 核心安全特性

1. **API密钥验证**
   - 所有 `/api/` 路径的请求都需要正确的密钥
   - 前端自动在请求头中添加密钥
   - 后端验证密钥的有效性

2. **时间戳验证（防重放攻击）**
   - 每个请求都包含时间戳
   - 服务器验证时间戳在5分钟有效期内
   - 防止攻击者重放旧的请求

3. **统一错误处理**
   - 401: 认证失败（密钥缺失或无效）
   - 403: 权限不足
   - 友好的中文错误提示

4. **白名单机制**
   - 支持配置不需要验证的路径
   - 例如：健康检查端点

---

## 快速配置

### 步骤 1: 生成安全密钥

选择以下任一方式生成随机密钥：

```bash
# 方式 1: 使用 Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# 方式 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方式 3: 使用 OpenSSL
openssl rand -base64 32
```

**示例输出：**
```
Xk7pQ2vN9mL4sR8tY3wE6uI0oP5aS1dF7gH9jK2lZ4xC8vB6nM3qW1eR5tY7uI9o
```

### 步骤 2: 修改前端配置

编辑 `src/config/constants.ts`：

```typescript
/**
 * API通信密钥
 * 用于验证前端请求，防止后端被直接调用
 * 生产环境请更换为复杂的随机字符串
 */
export const API_SECRET_KEY = 'Xk7pQ2vN9mL4sR8tY3wE6uI0oP5aS1dF7gH9jK2lZ4xC8vB6nM3qW1eR5tY7uI9o';
```

### 步骤 3: 修改后端配置

编辑 `backend/api_key_config.py`：

```python
# API通信密钥
# 必须与前端 src/config/constants.ts 中的 API_SECRET_KEY 保持一致
API_SECRET_KEY = 'Xk7pQ2vN9mL4sR8tY3wE6uI0oP5aS1dF7gH9jK2lZ4xC8vB6nM3qW1eR5tY7uI9o'

# 是否启用API密钥验证
# 开发环境可以设置为 False，生产环境必须设置为 True
ENABLE_API_KEY_AUTH = True
```

### 步骤 4: 重启服务

```bash
# 重启后端
cd backend
python app.py

# 重启前端
cd ..
npm run dev
```

---

## 详细说明

### 前端实现

#### 1. 配置文件 (`src/config/constants.ts`)

```typescript
// API密钥配置
export const API_SECRET_KEY = 'your-secret-key-here';
export const API_URL = 'http://localhost:5000/api';
export const API_TIMEOUT = 30000; // 30秒
```

#### 2. API客户端 (`src/utils/apiClient.ts`)

**请求拦截器：**
```typescript
apiClient.interceptors.request.use(
  (config) => {
    // 添加API密钥到请求头
    config.headers['X-API-Key'] = API_SECRET_KEY;
    
    // 添加时间戳（防重放攻击）
    config.headers['X-Request-Time'] = Date.now().toString();
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**响应拦截器：**
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 401:
          toast.error('认证失败：API密钥无效');
          break;
        case 403:
          toast.error('访问被拒绝：权限不足');
          break;
        // ... 其他错误处理
      }
    }
    return Promise.reject(error);
  }
);
```

### 后端实现

#### 1. 配置文件 (`backend/api_key_config.py`)

```python
# API通信密钥
API_SECRET_KEY = 'your-secret-key-here'

# 是否启用API密钥验证
ENABLE_API_KEY_AUTH = True

# 白名单路径（不需要验证的路径）
WHITELIST_PATHS = [
    '/health',
    '/api/health',
]
```

#### 2. 认证中间件 (`backend/api_auth_middleware.py`)

**全局验证：**
```python
@app.before_request
def verify_api_key():
    # 如果未启用验证，直接放行
    if not ENABLE_API_KEY_AUTH:
        return None
    
    # 放行OPTIONS请求（CORS预检请求）
    if request.method == 'OPTIONS':
        return None
    
    # 只验证/api路径
    if not request.path.startswith('/api/'):
        return None
    
    # 检查白名单
    if request.path in WHITELIST_PATHS:
        return None
    
    # 获取并验证API密钥
    api_key = request.headers.get('X-API-Key')
    
    if not api_key:
        return jsonify({
            'error': 'Missing API key',
            'message': '缺少API密钥，请通过官方前端访问',
            'code': 'NO_API_KEY'
        }), 401
    
    if api_key != API_SECRET_KEY:
        return jsonify({
            'error': 'Invalid API key',
            'message': 'API密钥无效，禁止访问',
            'code': 'INVALID_API_KEY'
        }), 401
    
    # 验证时间戳（可选）
    request_time = request.headers.get('X-Request-Time')
    if request_time:
        try:
            timestamp = int(request_time)
            current_time = int(time.time() * 1000)
            time_diff = abs(current_time - timestamp)
            
            # 5分钟有效期
            if time_diff > 5 * 60 * 1000:
                return jsonify({
                    'error': 'Request expired',
                    'message': '请求已过期（时间戳验证失败）',
                    'code': 'TIMESTAMP_EXPIRED'
                }), 401
        except ValueError:
            pass
    
    return None
```

#### 3. 应用集成 (`backend/app.py`)

```python
from api_auth_middleware import init_api_auth

app = Flask(__name__)
CORS(app)

# 初始化API密钥验证
init_api_auth(app)
```

---

## 测试验证

### 1. 测试正常请求（通过前端）

访问前端应用，所有API请求应该正常工作。

### 2. 测试直接API调用（应该被拒绝）

使用 curl 或 Postman 测试：

**无密钥请求（应该返回401）：**
```bash
curl http://localhost:5000/api/config
```

**预期响应：**
```json
{
  "error": "Missing API key",
  "message": "缺少API密钥，请通过官方前端访问",
  "code": "NO_API_KEY"
}
```

**错误密钥请求（应该返回401）：**
```bash
curl -H "X-API-Key: wrong-key" http://localhost:5000/api/config
```

**预期响应：**
```json
{
  "error": "Invalid API key",
  "message": "API密钥无效，禁止访问",
  "code": "INVALID_API_KEY"
}
```

**正确密钥请求（应该成功）：**
```bash
curl -H "X-API-Key: your-secret-key-here" \
     -H "X-Request-Time: $(date +%s)000" \
     http://localhost:5000/api/config
```

**预期响应：**
```json
{
  "appKey": "...",
  "endpoint": "ovh-eu",
  ...
}
```

### 3. 测试时间戳验证

**过期的时间戳（应该返回401）：**
```bash
# 使用6分钟前的时间戳
OLD_TIME=$(($(date +%s) - 360))
curl -H "X-API-Key: your-secret-key-here" \
     -H "X-Request-Time: ${OLD_TIME}000" \
     http://localhost:5000/api/config
```

**预期响应：**
```json
{
  "error": "Request expired",
  "message": "请求已过期（时间戳验证失败）",
  "code": "TIMESTAMP_EXPIRED"
}
```

---

## 常见问题

### Q1: 前端请求返回401错误

**原因：** 前后端密钥不一致

**解决方案：**
1. 检查 `src/config/constants.ts` 中的 `API_SECRET_KEY`
2. 检查 `backend/api_key_config.py` 中的 `API_SECRET_KEY`
3. 确保两者完全一致（包括大小写）
4. 重启前后端服务

### Q2: 开发环境想临时禁用验证

**解决方案：**

编辑 `backend/api_key_config.py`：
```python
ENABLE_API_KEY_AUTH = False  # 仅开发环境使用
```

**警告：** 生产环境必须设置为 `True`

### Q3: 如何添加白名单路径

**解决方案：**

编辑 `backend/api_key_config.py`：
```python
WHITELIST_PATHS = [
    '/health',
    '/api/health',
    '/api/public/status',  # 添加新的白名单路径
]
```

### Q4: 时间戳验证失败

**原因：** 客户端和服务器时间不同步

**解决方案：**
1. 同步服务器时间：`ntpdate pool.ntp.org`
2. 或者在 `api_auth_middleware.py` 中增加时间容差
3. 或者临时禁用时间戳验证（注释掉相关代码）

### Q5: 如何更改时间戳有效期

**解决方案：**

编辑 `backend/api_auth_middleware.py`，找到：
```python
if time_diff > 5 * 60 * 1000:  # 5分钟
```

修改为：
```python
if time_diff > 10 * 60 * 1000:  # 10分钟
```

### Q6: 生产环境密钥管理建议

**最佳实践：**

1. **使用环境变量：**

   前端 (`.env.production`)：
   ```
   VITE_API_SECRET_KEY=your-secret-key-here
   ```

   后端 (`.env`)：
   ```
   API_SECRET_KEY=your-secret-key-here
   ```

2. **代码中读取环境变量：**

   前端 (`constants.ts`)：
   ```typescript
   export const API_SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY || 'default-dev-key';
   ```

   后端 (`api_key_config.py`)：
   ```python
   import os
   API_SECRET_KEY = os.getenv('API_SECRET_KEY', 'default-dev-key')
   ```

3. **不要将密钥提交到版本控制：**
   
   添加到 `.gitignore`：
   ```
   .env
   .env.local
   .env.production
   ```

---

## 安全建议

### ✅ 推荐做法

1. **定期更换密钥**
   - 建议每3-6个月更换一次
   - 发生安全事件后立即更换

2. **使用强密钥**
   - 至少32个字符
   - 包含大小写字母、数字和特殊字符
   - 使用加密安全的随机生成器

3. **启用HTTPS**
   - 生产环境必须使用HTTPS
   - 防止密钥在传输过程中被窃取

4. **监控异常请求**
   - 记录认证失败的请求
   - 设置告警机制

5. **最小权限原则**
   - 只开放必要的API端点
   - 使用白名单而非黑名单

### ❌ 避免做法

1. **不要在客户端代码中硬编码敏感信息**
   - API密钥是前后端共享的验证凭证
   - 真正敏感的信息（如OVH API密钥）只存储在后端

2. **不要禁用生产环境的验证**
   - `ENABLE_API_KEY_AUTH` 在生产环境必须为 `True`

3. **不要使用弱密钥**
   - 避免使用简单的字符串如 "123456"
   - 避免使用可预测的模式

4. **不要忽略时间戳验证**
   - 时间戳验证是防重放攻击的重要手段

5. **不要将密钥提交到版本控制**
   - 使用 `.gitignore` 排除配置文件
   - 使用环境变量管理密钥

---

## 附录

### A. 完整的请求流程

```
客户端（浏览器）
    ↓
前端应用 (React)
    ↓
API客户端 (apiClient.ts)
    ├─ 添加 X-API-Key 头
    ├─ 添加 X-Request-Time 头
    └─ 发送请求
        ↓
后端服务器 (Flask)
    ↓
认证中间件 (api_auth_middleware.py)
    ├─ 验证路径是否需要认证
    ├─ 检查白名单
    ├─ 验证API密钥
    ├─ 验证时间戳
    └─ 通过/拒绝
        ↓
API路由处理器
    ↓
返回响应
```

### B. 错误代码参考

| 错误代码 | HTTP状态 | 说明 | 解决方案 |
|---------|---------|------|---------|
| NO_API_KEY | 401 | 缺少API密钥 | 确保前端正确配置密钥 |
| INVALID_API_KEY | 401 | API密钥无效 | 检查前后端密钥是否一致 |
| TIMESTAMP_EXPIRED | 401 | 请求已过期 | 同步服务器时间 |

### C. 相关文件清单

**前端：**
- `src/config/constants.ts` - 配置文件
- `src/utils/apiClient.ts` - API客户端

**后端：**
- `backend/api_key_config.py` - 配置文件
- `backend/api_auth_middleware.py` - 认证中间件
- `backend/app.py` - 应用入口

---

## 联系与支持

如有问题或建议，请提交 Issue 或 Pull Request。

**注意：** 请勿在公开渠道分享您的实际API密钥！
