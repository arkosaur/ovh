# OVH API 路径对比

## 🔧 已修复的问题

### 1. 重装系统API

**❌ 之前使用（错误）：**
```python
POST /dedicated/server/{serviceName}/install/start
```

**✅ 现在使用（正确）：**
```python
POST /dedicated/server/{serviceName}/reinstall
```

### 2. 查询分区方案API

**当前使用（可用）：**
```python
GET /dedicated/installationTemplate/{templateName}/partitionScheme
```
- ✅ 已验证可用
- ✅ 测试脚本成功返回 ['default']
- ✅ 获取到分区详情

**可选的更好方案：**
```python
GET /dedicated/server/{serviceName}/install/compatibleTemplatePartitionSchemes
```
- ✅ 专门为该服务器设计
- ✅ 返回服务器兼容的分区方案
- ⚠️ 需要测试是否更准确

## 📊 参数结构

### 正确的reinstall请求体：

```json
{
  "templateName": "debian11_64",
  "customHostname": "server1.example.com",  // 可选
  "storage": [                               // 可选
    {
      "partitioning": [
        {
          "schemeName": "default",           // 分区方案名称
          "layout": [                        // 可选：完全自定义分区
            {
              "mountPoint": "/",
              "fileSystem": "ext4",
              "size": 20480,
              "raidLevel": 1
            }
          ]
        }
      ]
    }
  ]
}
```

## 🎯 当前实现状态

### ✅ 已实现：
1. 正确的API路径 `/reinstall`
2. 正确的参数结构 `storage.partitioning.schemeName`
3. 分区方案查询和展示
4. 用户可选择默认或自定义分区

### 🔄 可选改进：
1. 使用 `compatibleTemplatePartitionSchemes` API（服务器专用）
2. 支持完全自定义分区（layout参数）

## 🧪 测试建议

### 测试1: 使用默认分区
```
1. 选择 debian11_64
2. 分区方案选择："使用默认分区（推荐）"
3. 提交安装
4. 验证后端日志无分区参数
```

### 测试2: 使用自定义分区方案
```
1. 选择 debian11_64  
2. 分区方案选择："default (3 个分区)"
3. 提交安装
4. 验证后端日志显示：使用自定义分区方案: default
```

### 测试3: 验证API调用
```
后端日志应显示：
POST /dedicated/server/xxx/reinstall
而不是 /install/start
```

## 📝 总结

**修复内容：**
- ✅ API路径从 `/install/start` 改为 `/reinstall`
- ✅ 参数结构使用 `storage.partitioning.schemeName`
- ✅ 用户可选择默认或自定义分区

**建议：**
重启后端并测试，验证新的API路径是否正常工作。
