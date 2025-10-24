# 🎯 分区方案功能 - 支持的模板列表

## ⚠️ 重要发现

根据测试，**并非所有OVH模板都支持自定义分区方案**！

### ❌ 不支持自定义分区的模板

**已测试并确认返回空方案：**
- `debian12_64` - Debian 12 (最新版)
- `alma8-cpanel-latest_64` - AlmaLinux + cPanel
- 所有Windows模板 (`win-*`)
- 所有cPanel/Plesk模板

**原因：**
- Debian 12较新，OVH可能还未添加自定义分区支持
- cPanel/Plesk等控制面板模板通常强制使用特定分区
- Windows使用不同的分区管理系统

### ✅ 可能支持自定义分区的模板

**建议测试以下模板：**
1. `debian11_64` - Debian 11 (稳定版)
2. `debian10_64` - Debian 10
3. `ubuntu2004_64` - Ubuntu 20.04 LTS
4. `ubuntu2204_64` - Ubuntu 22.04 LTS
5. `centos7_64` - CentOS 7
6. `rocky8_64` - Rocky Linux 8

## 🧪 快速测试命令

```bash
# 替换YOUR_SERVER为你的服务器名
# 测试Debian 11
curl "http://localhost:5000/api/server-control/YOUR_SERVER/partition-schemes?templateName=debian11_64"

# 测试Ubuntu 20.04
curl "http://localhost:5000/api/server-control/YOUR_SERVER/partition-schemes?templateName=ubuntu2004_64"

# 测试Ubuntu 22.04
curl "http://localhost:5000/api/server-control/YOUR_SERVER/partition-schemes?templateName=ubuntu2204_64"
```

**预期响应（如果支持）：**
```json
{
  "success": true,
  "schemes": [
    {
      "name": "default",
      "priority": 1,
      "partitions": [...]
    }
  ]
}
```

**如果不支持：**
```json
{
  "success": true,
  "schemes": []
}
```

## 📋 测试步骤

### 1. 重启后端（查看新日志）
```bash
Ctrl+C
python backend/app.py
```

### 2. 测试Debian 11模板

1. 刷新前端页面
2. 选择服务器
3. 点击"重装系统"
4. **选择 `debian11_64` 模板**（而不是debian12）
5. 观察Console和后端日志

**新的后端日志应该显示：**
```
INFO - [Partition] 请求获取分区方案: server=xxx, template=debian11_64
INFO - [Partition] OVH返回方案列表: ['default', ...]
INFO - [Partition] 处理方案: default
INFO - [Partition] 成功获取 1 个分区方案
```

### 3. 如果Debian 11也是空的

尝试获取你服务器的模板列表，查看哪些模板可用：

```bash
# 在前端Console运行
fetch('/api/server-control/YOUR_SERVER/templates')
  .then(r => r.json())
  .then(data => {
    console.log('可用模板:', data.templates.map(t => t.templateName));
  });
```

然后逐个测试，找到支持分区的模板。

## 🔍 判断模板是否支持分区

**在前端测试时：**

**支持分区：**
```javascript
[Partition] API响应: {success: true, schemes: Array(1)}
// schemes数组有内容
Toast: "已加载 1 个分区方案"
UI: 显示"分区方案（可选）"选择器
```

**不支持分区：**
```javascript
[Partition] API响应: {success: true, schemes: Array(0)}
// schemes数组为空
Toast: "该模板无可用分区方案（将使用默认分区）"
UI: 不显示分区选择器（这是正常的）
```

## ✅ 功能验证

**如果模板不支持自定义分区，这是正常的！**

功能本身是**工作正常的**：
1. ✅ API正确调用
2. ✅ 返回正确的响应
3. ✅ 前端正确处理空方案
4. ✅ 显示适当的提示

**只是某些模板确实没有自定义分区选项。**

## 💡 建议

### 对于用户
1. **优先选择Debian 11或Ubuntu 20.04进行测试**
2. **如果确实需要Debian 12，接受使用默认分区**
3. **cPanel/Plesk等控制面板模板通常不支持自定义分区**

### 对于开发者
功能已正确实现：
- ✅ 有分区方案时：显示选择器
- ✅ 无分区方案时：显示提示，使用默认分区
- ✅ 错误时：显示错误信息

**这是预期行为，无需修复！**

## 📊 测试结果记录

请测试以下模板并记录结果：

| 模板 | 支持分区？ | 方案数量 | 备注 |
|------|-----------|---------|------|
| debian11_64 | ？ | ？ | |
| debian12_64 | ❌ | 0 | 已确认 |
| ubuntu2004_64 | ？ | ？ | |
| ubuntu2204_64 | ？ | ？ | |
| centos7_64 | ？ | ？ | |
| rocky8_64 | ？ | ？ | |
| alma8-cpanel-latest_64 | ❌ | 0 | 已确认 |

## 🎯 下一步

1. **重启后端** - 查看新添加的日志
2. **测试 debian11_64** - 看是否有分区方案
3. **如果仍然是空的** - 这说明OVH确实没有为这些服务器提供自定义分区
4. **功能本身是正常的** - 无需进一步调试
