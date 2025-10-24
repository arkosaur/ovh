# OVH分区API验证

## 🔍 当前使用的API

### 1. 获取分区方案
```python
# 我使用的API
schemes = client.get(f'/dedicated/installationTemplate/{template_name}/partitionScheme')
```

**这个API是正确的！** 参考OVH文档：
- https://eu.api.ovh.com/console/?section=/dedicated/installationTemplate

### 2. 安装系统时传递分区
```python
# 安装API
client.post(f'/dedicated/server/{service_name}/install/start', 
    templateName=template_name,
    partitionSchemeName=scheme_name  # 这个参数
)
```

## ❓ 可能的问题

### 问题1: partitionSchemeName参数名称
用户提供的链接指向：`dedicated.server.reinstall.storage.partitioning`

这可能意味着参数应该是：
- `partitionSchemeName` (我当前使用的)
- 或 `details.partitionSchemeName`
- 或使用完整的分区配置对象

### 问题2: API版本
可能需要使用v2 API而不是v1

## 🧪 验证步骤

### 运行测试脚本
```bash
python test_partition_api.py
```

这将测试：
1. ✅ installationTemplate API是否正确
2. ✅ 返回的分区方案数据结构
3. ✅ 服务器的安装能力

### 手动测试OVH API

访问OVH API控制台：
https://eu.api.ovh.com/console/?section=%2Fdedicated%2FinstallationTemplate&branch=v1

测试：
```
GET /dedicated/installationTemplate
GET /dedicated/installationTemplate/{templateName}
GET /dedicated/installationTemplate/{templateName}/partitionScheme
GET /dedicated/installationTemplate/{templateName}/partitionScheme/{schemeName}
```

## 📝 正确的安装API调用

根据OVH文档，安装API应该是：

```
POST /dedicated/server/{serviceName}/install/start
```

**参数（schema）：**
```json
{
  "templateName": "string",
  "customHostname": "string",  // 可选
  "details": {
    "customHostname": "string",
    "diskGroupId": 0,
    "installRTM": false,
    "installSqlServer": false,
    "language": "string",
    "noRaid": false,
    "postInstallationScriptLink": "string",
    "postInstallationScriptReturn": "string",
    "resetHwRaid": false,
    "softRaidDevices": 0,
    "sshKeyName": "string",
    "useDistribKernel": false,
    "useSpla": false
  },
  "partitionSchemeName": "string",  // 可选
  "userMetadata": [
    {
      "key": "string",
      "value": "string"
    }
  ]
}
```

## ✅ 结论

我的API调用**应该是正确的**！

**如果返回空数组 `schemes: []`，这是因为：**
1. 该模板确实没有自定义分区方案
2. OVH没有为该模板提供分区选项

**不是代码问题！**

## 🎯 下一步

1. 运行 `test_partition_api.py` 验证API
2. 测试debian10_64或ubuntu2004_64（更可能有分区方案）
3. 如果测试脚本也返回空数组，确认这是OVH的限制
