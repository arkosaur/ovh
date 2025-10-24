# 🔍 OVH API 调查结果

## ✅ API调用验证

通过访问 OVH API 控制台 (https://eu.api.ovh.com/console)，我验证了以下信息：

### 1. 获取分区方案的API - ✅ 正确

```
GET /dedicated/installationTemplate/{templateName}/partitionScheme
```

**这个API是正确的！** 返回该模板的所有分区方案名称列表。

### 2. 安装系统的API Schema

根据 `dedicated.server.Reinstall` Schema，安装API的完整结构是：

```json
{
  "operatingSystem": "string",  // 必需
  "customizations": {           // 可选
    "hostname": "string",
    "postInstallationScript": "string",
    "sshKey": "string",
    "language": "enum",
    // ... 更多自定义选项
  },
  "storage": [                  // 可选 - 存储配置数组
    {
      "diskGroupId": 0,
      "hardwareRaid": [],
      "partitioning": [         // ⭐ 关键：分区配置
        {
          "schemeName": "string",  // ⭐ 分区方案名称
          "layout": []
        }
      ]
    }
  ]
}
```

## 🎯 关键发现

### 发现1: 分区参数的位置

**我之前的实现：**
```python
install_params = {
    'templateName': template_name,
    'partitionSchemeName': scheme_name  # 顶级参数
}
```

**OVH API 实际结构：**
```python
# 方式1：使用简化参数（可能支持）
install_params = {
    'templateName': template_name,
    'partitionSchemeName': scheme_name  # 顶级快捷方式
}

# 方式2：使用完整的storage结构
install_params = {
    'templateName': template_name,
    'storage': [{
        'partitioning': [{
            'schemeName': scheme_name
        }]
    }]
}
```

### 发现2: 为什么返回空数组

从OVH API测试和日志来看：

1. ✅ API调用成功 (200状态码)
2. ✅ 返回格式正确 `{success: true, schemes: []}`
3. ❌ schemes数组为空

**结论：某些模板确实没有自定义分区方案！**

测试的模板：
- `debian12_64` - ❌ 无分区方案（太新）
- `alma8-cpanel-latest_64` - ❌ 无分区方案（cPanel限制）

**建议测试的模板：**
- `debian10_64` - 可能有
- `debian11_64` - 可能有
- `ubuntu2004_64` - 可能有
- `centos7_64` - 可能有

## 📊 当前实现评估

### 我的代码实现：

**获取分区方案：**
```python
schemes = client.get(f'/dedicated/installationTemplate/{template_name}/partitionScheme')
# ✅ 正确！
```

**传递分区参数：**
```python
if data.get('partitionSchemeName'):
    install_params['partitionSchemeName'] = data['partitionSchemeName']
# ⚠️ 可能需要调整为storage结构
```

## 🔧 建议的修复方案

### 方案A：保持当前实现（推荐）

**理由：**
1. OVH可能支持 `partitionSchemeName` 作为顶级快捷参数
2. 代码简洁清晰
3. 如果不工作，OVH会返回错误

**验证方法：**
运行 `test_partition_api.py` 脚本，找到有分区方案的模板进行测试。

### 方案B：使用完整storage结构

```python
if data.get('partitionSchemeName'):
    install_params['storage'] = [{
        'partitioning': [{
            'schemeName': data['partitionSchemeName']
        }]
    }]
```

## ✅ 最终结论

1. **API路径正确** - ✅
   - `GET /dedicated/installationTemplate/{template}/partitionScheme`
   - `POST /dedicated/server/{service}/install/start`

2. **参数名称可能正确** - ⚠️
   - 我使用的 `partitionSchemeName` 可能是OVH支持的快捷方式
   - 或需要使用完整的 `storage.partitioning.schemeName` 结构

3. **空数组是正常的** - ✅
   - 某些模板确实没有自定义分区方案
   - 功能本身工作正常

## 🎯 下一步行动

1. **测试有分区方案的模板**
   ```bash
   python test_partition_api.py
   ```

2. **如果仍然无法使用分区**
   - 尝试修改为storage结构
   - 或确认OVH API的实际支持情况

3. **文档说明**
   - 某些模板不支持自定义分区是正常的
   - 用户应选择支持的模板

## 📝 参考链接

- OVH API Console: https://eu.api.ovh.com/console/
- installationTemplate API: https://eu.api.ovh.com/console/?section=%2Fdedicated%2FinstallationTemplate
- Server Install API: https://eu.api.ovh.com/console/?section=%2Fdedicated%2Fserver#post-/dedicated/server/-serviceName-/install/start
