# SSL 连接错误修复指南

## 错误信息
```
SSLError(MaxRetryError("HTTPSConnectionPool(host='eu.api.ovh.com', port=443): 
Max retries exceeded with url: /1.0/auth/time 
(Caused by SSLError(SSLEOFError(8, '[SSL: UNEXPECTED_EOF_WHILE_READING] 
EOF occurred in violation of protocol (_ssl.c:1077)')))")))
```

## 错误原因

### 1. **SSL/TLS 握手中断**
- OVH API 服务器主动关闭了 SSL 连接
- 可能是协议版本不匹配（TLS 1.0/1.1/1.2/1.3）
- OpenSSL 配置不兼容

### 2. **网络环境问题**
- **防火墙/代理拦截：** 公司或家庭网络的防火墙可能检查/修改 HTTPS 流量
- **SSL 深度检查：** 某些安全软件会解密 HTTPS 连接
- **网络不稳定：** 连接在 SSL 握手期间超时或中断
- **ISP 限制：** 运营商可能限制某些 HTTPS 连接

### 3. **请求频率限制**
- OVH API 有速率限制（Rate Limiting）
- 短时间内过多请求导致服务器主动断开连接
- 典型限制：**每秒 20 个请求**

### 4. **系统配置问题**
- **系统时间不准确：** SSL 证书验证依赖系统时间
- **CA 证书过期：** 根证书库需要更新
- **Python SSL 库版本过旧：** 需要更新 `certifi`, `urllib3`, `requests`

### 5. **OVH API 临时问题**
- API 服务器负载过高
- 维护或故障
- 特定区域的网络问题

## 解决方案

### 方案 1：添加重试机制和错误处理（推荐）

#### 1.1 安装重试库
```bash
pip install urllib3 requests tenacity
```

#### 1.2 修改 `backend/app.py`

在文件顶部添加导入：
```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import urllib3
from requests.exceptions import SSLError, ConnectionError, Timeout
```

添加重试装饰器到 OVH API 调用：
```python
# 使用重试机制包装 OVH API 调用
@retry(
    stop=stop_after_attempt(3),  # 最多重试 3 次
    wait=wait_exponential(multiplier=1, min=2, max=10),  # 指数退避：2s, 4s, 8s
    retry=retry_if_exception_type((SSLError, ConnectionError, Timeout)),
    reraise=True
)
def call_ovh_api_with_retry(client, method, path, **params):
    """带重试机制的 OVH API 调用"""
    if method.upper() == 'GET':
        return client.get(path, **params)
    elif method.upper() == 'POST':
        return client.post(path, **params)
    elif method.upper() == 'PUT':
        return client.put(path, **params)
    elif method.upper() == 'DELETE':
        return client.delete(path, **params)
    else:
        raise ValueError(f"Unsupported HTTP method: {method}")
```

修改 `check_server_availability` 函数：
```python
def check_server_availability(plan_code, options=None):
    client = get_ovh_client()
    if not client:
        return None
    
    try:
        params = {'planCode': plan_code}
        
        if options and len(options) > 0:
            for option in options:
                if 'addonFamily' not in params:
                    params['addonFamily'] = []
                if not isinstance(params['addonFamily'], list):
                    params['addonFamily'] = [params['addonFamily']]
                params['addonFamily'].append(option)
        
        # 使用重试机制
        availabilities = call_ovh_api_with_retry(
            client, 
            'GET', 
            '/dedicated/server/datacenter/availabilities', 
            **params
        )
        
        # ... 其余代码不变
        
    except SSLError as e:
        add_log("ERROR", f"SSL错误 - {plan_code}: {str(e)}")
        add_log("INFO", "建议: 检查网络连接、防火墙设置或系统时间")
        return None
    except ConnectionError as e:
        add_log("ERROR", f"连接错误 - {plan_code}: {str(e)}")
        return None
    except Exception as e:
        add_log("ERROR", f"查询可用性失败 - {plan_code}: {str(e)}")
        return None
```

### 方案 2：升级 SSL 库

```bash
# 更新相关包
pip install --upgrade certifi urllib3 requests
pip install --upgrade ovh

# 验证版本
python -c "import ssl; print(ssl.OPENSSL_VERSION)"
python -c "import certifi; print(certifi.where())"
```

### 方案 3：调整请求间隔（防止限流）

在 `backend/app.py` 中添加请求限流：

```python
import time
from threading import Lock

# 全局请求限流器
class APIRateLimiter:
    def __init__(self, max_calls_per_second=10):
        self.max_calls_per_second = max_calls_per_second
        self.min_interval = 1.0 / max_calls_per_second
        self.last_call_time = 0
        self.lock = Lock()
    
    def wait_if_needed(self):
        with self.lock:
            now = time.time()
            elapsed = now - self.last_call_time
            if elapsed < self.min_interval:
                sleep_time = self.min_interval - elapsed
                time.sleep(sleep_time)
            self.last_call_time = time.time()

# 创建全局限流器（每秒最多 10 个请求）
api_rate_limiter = APIRateLimiter(max_calls_per_second=10)

# 在所有 OVH API 调用前添加
def check_server_availability(plan_code, options=None):
    client = get_ovh_client()
    if not client:
        return None
    
    # 限流
    api_rate_limiter.wait_if_needed()
    
    try:
        # ... API 调用
```

### 方案 4：检查系统配置

#### 4.1 检查系统时间
```bash
# Windows
echo %date% %time%

# 如果时间不准确，同步网络时间
w32tm /resync
```

#### 4.2 更新 CA 证书
```bash
pip install --upgrade certifi
```

#### 4.3 测试 OVH API 连接
```python
# test_ovh_connection.py
import ovh
import ssl
import certifi

print("SSL Version:", ssl.OPENSSL_VERSION)
print("Certifi Location:", certifi.where())

try:
    client = ovh.Client(
        endpoint='ovh-eu',
        application_key='your_key',
        application_secret='your_secret',
        consumer_key='your_consumer'
    )
    
    # 测试简单调用
    result = client.get('/auth/time')
    print("✅ 连接成功！服务器时间:", result)
except Exception as e:
    print("❌ 连接失败:", e)
```

### 方案 5：使用代理或 VPN

如果是网络环境问题：

```python
# 在 get_ovh_client() 中添加代理支持
def get_ovh_client():
    # ... 配置检查 ...
    
    try:
        # 如果需要代理
        client = ovh.Client(
            endpoint=config["endpoint"],
            application_key=config["appKey"],
            application_secret=config["appSecret"],
            consumer_key=config["consumerKey"],
            timeout=30,  # 增加超时时间
            # 如果使用代理
            # http_proxy='http://proxy:8080',
            # https_proxy='https://proxy:8080',
        )
        return client
    except Exception as e:
        add_log("ERROR", f"Failed to initialize OVH client: {str(e)}")
        return None
```

### 方案 6：降级 SSL 设置（不推荐，仅用于测试）

```python
import ssl
import urllib3

# 仅用于测试，不推荐在生产环境使用
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 允许旧版本 TLS
ssl_context = ssl.create_default_context()
ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
```

## 快速诊断步骤

### 1. 检查网络连接
```bash
# 测试是否能访问 OVH API
ping eu.api.ovh.com
curl -I https://eu.api.ovh.com/1.0/auth/time
```

### 2. 检查 Python 环境
```python
import ssl
import certifi
import requests

print("Python SSL:", ssl.OPENSSL_VERSION)
print("Certifi:", certifi.where())

# 测试 HTTPS 连接
try:
    r = requests.get('https://eu.api.ovh.com/1.0/auth/time', timeout=10)
    print("✅ HTTPS 连接正常:", r.json())
except Exception as e:
    print("❌ HTTPS 连接失败:", e)
```

### 3. 查看详细错误
在 `backend/app.py` 中启用详细日志：

```python
import logging

# 启用 urllib3 调试日志
logging.getLogger('urllib3').setLevel(logging.DEBUG)

# 在 OVH API 调用时捕获详细错误
try:
    result = client.get('/dedicated/server/datacenter/availabilities', planCode=plan_code)
except Exception as e:
    import traceback
    add_log("ERROR", f"详细错误:\n{traceback.format_exc()}")
```

## 推荐配置

### 完整的错误处理和重试配置：

```python
from tenacity import retry, stop_after_attempt, wait_exponential
from requests.exceptions import SSLError, ConnectionError, Timeout
import time

class OVHAPIHelper:
    def __init__(self, client):
        self.client = client
        self.rate_limiter = APIRateLimiter(max_calls_per_second=10)
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((SSLError, ConnectionError, Timeout)),
    )
    def get(self, path, **params):
        self.rate_limiter.wait_if_needed()
        try:
            return self.client.get(path, **params)
        except SSLError as e:
            add_log("WARNING", f"SSL错误，正在重试: {str(e)}")
            raise
        except Exception as e:
            add_log("ERROR", f"API调用失败: {str(e)}")
            raise

# 使用方法
helper = OVHAPIHelper(client)
result = helper.get('/dedicated/server/datacenter/availabilities', planCode=plan_code)
```

## 常见问题

**Q: 错误是偶尔出现还是一直存在？**
- 偶尔出现 → 网络不稳定或请求过快，使用重试机制
- 一直存在 → 系统配置或网络环境问题

**Q: 是否在特定时间段出现？**
- 是 → 可能是 OVH API 服务器负载问题或维护时间

**Q: 是否使用了代理或 VPN？**
- 是 → 可能是代理的 SSL 检查导致

**Q: 多台机器是否都有此问题？**
- 仅本机 → 本机配置问题
- 所有机器 → 网络环境或 OVH API 问题

## 监控和日志

添加详细的错误监控：

```python
# 记录 SSL 错误统计
ssl_error_count = 0
last_ssl_error_time = None

def check_server_availability(plan_code, options=None):
    global ssl_error_count, last_ssl_error_time
    
    try:
        # ... API 调用
        ssl_error_count = 0  # 成功后重置
    except SSLError as e:
        ssl_error_count += 1
        last_ssl_error_time = time.time()
        
        add_log("ERROR", f"SSL错误 #{ssl_error_count}: {str(e)}")
        
        if ssl_error_count >= 5:
            add_log("CRITICAL", "连续 SSL 错误过多，请检查网络环境！")
        
        return None
```

## 总结

**推荐优先级：**

1. ✅ **添加重试机制**（方案 1）- 解决偶发性问题
2. ✅ **添加请求限流**（方案 3）- 防止触发 API 限制
3. ✅ **升级 SSL 库**（方案 2）- 确保兼容性
4. ⚠️ **检查系统配置**（方案 4）- 排除本地问题
5. ⚠️ **使用代理/VPN**（方案 5）- 绕过网络限制
6. ❌ **降级 SSL**（方案 6）- 仅用于调试，不安全

**最佳实践：**
- 实现重试机制（指数退避）
- 限制请求频率（每秒不超过 10 个）
- 详细的错误日志记录
- 监控 SSL 错误频率
- 定期更新依赖库
