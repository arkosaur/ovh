# 🔍 OVH服务器安装API端点调查

## 🐛 当前错误

```
ERROR: Got an invalid (or empty) URL
OVH-Query-ID: EU.ext-5.68fbfe80...
```

## 🎯 可能的API端点

### 方案1: install/start (推测的新API)
```python
POST /dedicated/server/{serviceName}/install/start
{
  "templateName": "debian11_64",
  "details": {
    "customHostname": "server.example.com"
  }
}
```

### 方案2: confirmInstallation (旧API)
```python
POST /dedicated/server/{serviceName}/confirmInstallation
{
  "templateName": "debian11_64"
}
```

### 方案3: 可能的正确端点
根据OVH API控制台，可能的端点有：
- `/dedicated/server/{serviceName}/install/templateCapabilities`
- `/dedicated/server/{serviceName}/install/compatibleTemplates`
- `/dedicated/server/{serviceName}/install/hardwareRaidProfile`
- `/dedicated/server/{serviceName}/install/status`

## 💡 解决方案

### 当前实现
代码现在会按顺序尝试：
1. 首先尝试 `install/start`
2. 如果失败，降级到 `confirmInstallation`
3. 记录详细的错误日志

### 代码
```python
try:
    # 方案1: install/start
    result = client.post(
        f'/dedicated/server/{service_name}/install/start',
        templateName=template_name
    )
except Exception as e:
    # 方案2: confirmInstallation
    result = client.post(
        f'/dedicated/server/{service_name}/confirmInstallation',
        templateName=template_name
    )
```

## 📝 测试步骤

1. 重启后端查看日志：
   ```
   INFO - 准备发送安装请求到OVH API
   INFO -   - 服务器: ns3002233...
   INFO -   - 模板: debian11_64
   INFO -   - 参数: {...}
   WARNING - install/start失败: ..., 尝试使用confirmInstallation
   INFO - 服务器重装请求已发送
   ```

2. 如果两个都失败，查看完整错误信息

## 🔍 下一步调试

如果两个端点都不对，需要：
1. 查看OVH API Console: https://eu.api.ovh.com/console/
2. 搜索 "install" 相关端点
3. 查看实际的API schema和示例

## 📚 参考资料

- OVH API Console: https://eu.api.ovh.com/console/
- Section: `/dedicated/server`
- 查找 install 相关端点的正确路径和参数

---

**状态**: 🔄 测试中
**日期**: 2025-10-25
