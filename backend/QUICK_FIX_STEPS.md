# SSL 错误快速修复步骤

## 🚀 快速开始（5分钟修复）

### 步骤 1: 安装依赖

打开命令行，在 `backend` 目录执行：

```bash
pip install tenacity
pip install --upgrade certifi urllib3 requests ovh
```

### 步骤 2: 复制辅助文件

确保 `ovh_api_helper.py` 文件在 `backend` 目录中

### 步骤 3: 修改 app.py

在 `app.py` 文件顶部添加导入（第15行左右）：

```python
from ovh_api_helper import get_global_helper
```

### 步骤 4: 修改 check_server_availability 函数

找到 `check_server_availability` 函数（第241行左右），替换为：

```python
def check_server_availability(plan_code, options=None):
    client = get_ovh_client()
    if not client:
        return None
    
    # 使用辅助类（自动重试和限流）
    helper = get_global_helper(client, max_calls_per_second=10)
    
    try:
        params = {'planCode': plan_code}
        
        if options and len(options) > 0:
            for option in options:
                if 'addonFamily' not in params:
                    params['addonFamily'] = []
                if not isinstance(params['addonFamily'], list):
                    params['addonFamily'] = [params['addonFamily']]
                params['addonFamily'].append(option)
        
        # 使用 helper.get() 替代 client.get()
        availabilities = helper.get('/dedicated/server/datacenter/availabilities', **params)
        result = {}
        
        for item in availabilities:
            datacenters = item.get("datacenters", [])
            
            for dc_info in datacenters:
                availability = dc_info.get("availability", "unknown")
                datacenter_name = dc_info.get("datacenter")
                
                if not availability or availability == "unknown":
                    result[datacenter_name] = "unknown"
                elif availability == "unavailable":
                    result[datacenter_name] = "unavailable"
                else:
                    result[datacenter_name] = availability
                
        config_info = f" (配置: {', '.join(options)})" if options else " (默认配置)"
        add_log("INFO", f"成功检查 {plan_code}{config_info} 的可用性: {result}")
        return result
        
    except Exception as e:
        add_log("ERROR", f"Failed to check availability for {plan_code}: {str(e)}")
        return None
```

### 步骤 5: 重启后端服务器

```bash
# 停止当前运行的服务器 (Ctrl+C)
# 然后重新启动
python app.py
```

## ✅ 验证修复

### 1. 查看日志

启动后观察日志，应该看到：
- ✅ 重试成功的日志（如果之前有 SSL 错误）
- ✅ API 调用统计信息

### 2. 测试可用性查询

在前端页面：
1. 搜索一个服务器（如 `24rise012`）
2. 点击"检查可用性"
3. 观察是否成功返回结果

### 3. 检查错误率

如果仍有 SSL 错误，会看到：
- ⚠️ "SSL 错误，正在重试" - 表示重试机制正在工作
- ❌ "连续 SSL 错误过多" - 需要检查网络环境

## 🔧 进阶修复

### 如果仍然有 SSL 错误

#### 选项 A: 检查系统时间

```bash
# Windows
echo %date% %time%

# 同步网络时间
w32tm /resync
```

#### 选项 B: 测试 OVH API 连接

创建 `test_connection.py`：

```python
import ovh
import ssl
import certifi

print("SSL 版本:", ssl.OPENSSL_VERSION)
print("证书位置:", certifi.where())

# 替换为你的实际配置
client = ovh.Client(
    endpoint='ovh-eu',
    application_key='your_key',
    application_secret='your_secret',
    consumer_key='your_consumer'
)

try:
    time_result = client.get('/auth/time')
    print("✅ 连接成功！服务器时间:", time_result)
except Exception as e:
    print("❌ 连接失败:", e)
```

运行：
```bash
python test_connection.py
```

#### 选项 C: 增加超时时间

在 `get_ovh_client()` 函数中：

```python
def get_ovh_client():
    # ... 配置检查 ...
    
    try:
        client = ovh.Client(
            endpoint=config["endpoint"],
            application_key=config["appKey"],
            application_secret=config["appSecret"],
            consumer_key=config["consumerKey"],
            timeout=30  # 增加超时到 30 秒
        )
        return client
    except Exception as e:
        add_log("ERROR", f"Failed to initialize OVH client: {str(e)}")
        return None
```

#### 选项 D: 降低请求频率

修改 `ovh_api_helper.py` 中的限流参数：

```python
# 从每秒 10 个请求降低到每秒 5 个
helper = get_global_helper(client, max_calls_per_second=5)
```

或在创建时：

```python
helper = OVHAPIHelper(client, max_calls_per_second=5)
```

## 📊 监控

### 添加 API 统计端点

在 `app.py` 中添加：

```python
@app.route('/api/ovh-stats', methods=['GET'])
def get_ovh_stats():
    """获取 OVH API 调用统计"""
    client = get_ovh_client()
    if not client:
        return jsonify({'error': 'Client not initialized'}), 500
    
    from ovh_api_helper import get_global_helper
    helper = get_global_helper(client)
    stats = helper.get_stats()
    
    return jsonify(stats)
```

访问 `http://localhost:5000/api/ovh-stats` 查看统计。

## 🐛 故障排除

### 问题：仍然出现 SSL 错误

**可能原因：**
1. 网络环境有 SSL 深度检查
2. 防火墙拦截 HTTPS
3. 系统时间不准确
4. CA 证书过期

**解决方法：**
1. 尝试使用移动热点测试
2. 检查防火墙设置
3. 同步系统时间
4. 更新证书：`pip install --upgrade certifi`

### 问题：请求被限流

**症状：**
- 返回 429 错误
- 日志显示 "rate limit exceeded"

**解决方法：**
降低请求频率：
```python
helper = get_global_helper(client, max_calls_per_second=3)
```

### 问题：重试次数过多

**症状：**
- 每次请求都重试 3 次
- 响应很慢

**解决方法：**
减少重试次数：
```python
helper = OVHAPIHelper(client, max_retries=2)
```

或修改 `ovh_api_helper.py` 中的装饰器：
```python
@retry(
    stop=stop_after_attempt(2),  # 从 3 改为 2
    wait=wait_exponential(multiplier=1, min=1, max=5),  # 减少等待时间
    # ...
)
```

## 📝 日志级别

如果需要更详细的调试信息，在 `app.py` 顶部添加：

```python
import logging

# 启用详细日志
logging.basicConfig(level=logging.DEBUG)
logging.getLogger('urllib3').setLevel(logging.DEBUG)
logging.getLogger('ovh').setLevel(logging.DEBUG)
```

## 🎯 成功标志

修复成功后，你应该看到：

✅ **日志中：**
```
INFO - 成功检查 24rise012 (默认配置) 的可用性: {...}
```

✅ **前端页面：**
- 可用性查询正常返回结果
- 没有频繁的错误提示

✅ **统计信息：**
```json
{
  "total_requests": 100,
  "failed_requests": 0,
  "success_rate": "100.0%",
  "ssl_error_count": 0
}
```

## 📞 需要帮助？

如果问题仍然存在：

1. **收集信息：**
   - Python 版本：`python --version`
   - SSL 版本：`python -c "import ssl; print(ssl.OPENSSL_VERSION)"`
   - 完整错误日志

2. **检查网络：**
   ```bash
   ping eu.api.ovh.com
   curl -I https://eu.api.ovh.com/1.0/auth/time
   ```

3. **查看详细文档：**
   - 阅读 `SSL_ERROR_FIX.md` 完整指南
   - 查看 `app_integration_example.py` 集成示例

## 总结

这个快速修复方案提供了：
- ✅ 自动重试机制（3次，指数退避）
- ✅ 请求限流（每秒最多10个）
- ✅ 详细的错误日志
- ✅ API 调用统计
- ✅ SSL 错误监控

大多数 SSL 错误会被自动重试并成功！🎉
