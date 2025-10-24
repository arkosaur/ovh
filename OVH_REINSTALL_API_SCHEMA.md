# OVH Reinstall API Schema 完整分析

## 📋 从 API Console 看到的字段

根据 `dedicated.server.Reinstall` Schema (https://eu.api.ovh.com/console/)

### 顶级字段结构：

```json
{
  "operatingSystem": "string",  // 必需 *
  "customizations": {            // 可选 - 
    "configDriveMetadata": {},
    "configDriveUserData": "string",
    "efiBootloaderPath": "string",
    "hostname": "string",
    "httpHeaders": {},
    "imageCheckSum": "string",
    "imageCheckSumType": "enum",
    "imageType": "enum",
    "imageURL": "string",
    "language": "enum",
    "nutanixConfiguration": {},
    "postInstallationScript": "string",
    "postInstallationScriptExtension": "enum",
    "sshKey": "string"
  },
  "properties": {},               // 可选 - (已弃用)
  "storage": []                   // 可选 -
}
```

## 🔍 关键发现

### 1. **没有顶级的 `partitionSchemeName` 参数！**

❌ **我之前错误地认为可以用：**
```python
{
  "templateName": "debian11_64",
  "partitionSchemeName": "default"  # 这个参数不存在！
}
```

### 2. **正确的分区参数在 `storage` 数组中**

✅ **正确的结构应该是：**
```json
{
  "templateName": "debian11_64",
  "storage": [{
    "diskGroupId": 0,           // 可选
    "hardwareRaid": [],         // 可选
    "partitioning": [{          // ⭐ 分区配置
      "schemeName": "default",
      "layout": []              // 可选：完全自定义分区
    }]
  }]
}
```

### 3. **hostname 在 customizations 对象中**

✅ **正确的hostname设置：**
```python
{
  "templateName": "debian11_64",
  "customizations": {
    "hostname": "server1.example.com"
  }
}
```

❌ **我当前错误地使用了：**
```python
{
  "templateName": "debian11_64",
  "customHostname": "server1.example.com"  # 错误！
}
```

## 🔧 需要修复的代码

### 当前的错误实现：

```python
# backend/app.py - 当前错误的代码
install_params = {
    'templateName': template_name
}

# 错误1：customHostname 应该在 customizations 中
if data.get('customHostname'):
    install_params['customHostname'] = data['customHostname']

# 错误2：虽然storage结构对了，但缺少diskGroupId
if data.get('partitionSchemeName'):
    install_params['storage'] = [{
        'partitioning': [{
            'schemeName': data['partitionSchemeName']
        }]
    }]
```

### 正确的实现应该是：

```python
# backend/app.py - 正确的代码
install_params = {
    'templateName': template_name
}

# 正确1：hostname 放在 customizations 中
customizations = {}
if data.get('customHostname'):
    customizations['hostname'] = data['customHostname']

if customizations:
    install_params['customizations'] = customizations

# 正确2：storage 结构完整
if data.get('partitionSchemeName'):
    install_params['storage'] = [{
        'diskGroupId': 0,  # 默认值
        'partitioning': [{
            'schemeName': data['partitionSchemeName']
        }]
    }]
```

## 🎯 API 端点

### 重装系统API：

```
POST /dedicated/server/{serviceName}/reinstall
```

✅ **这个是对的！** 我已经修正了。

### 查询分区方案API：

```
GET /dedicated/installationTemplate/{templateName}/partitionScheme
```

✅ **这个也是对的！** 测试脚本验证成功。

## ⚠️ 获取分区详情失败的原因

从日志看到：
```
[Partition] 获取方案 default 详情失败: Got an invalid (or empty) URL
```

**可能的原因：**
1. 模板名称中包含特殊字符（如 `debian12-plesk18_64` 中的 `-`）
2. 某些模板的分区方案名称不能直接查询详情
3. API需要URL编码

**建议测试：**
- 使用 `debian11_64`（简单名称）而不是包含 `-` 的模板
- 对URL参数进行编码

## 📝 总结

### 需要修复：
1. ✅ **API路径** - 已改为 `/reinstall`
2. ❌ **hostname参数** - 需要改为 `customizations.hostname`
3. ⚠️ **storage结构** - 虽然有partitioning，但缺少diskGroupId
4. ⚠️ **分区详情查询** - 需要处理URL编码或特殊字符

### 测试建议：
1. 使用 `debian11_64` 模板（不含特殊字符）
2. 测试默认分区（不传storage参数）
3. 测试自定义分区（传storage.partitioning.schemeName）
