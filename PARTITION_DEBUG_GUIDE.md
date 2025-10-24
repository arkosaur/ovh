# 自定义分区功能深度排查

## 🔍 问题诊断

### 检查点1: 后端API是否返回分区方案

**测试命令:**
```bash
# 替换YOUR_SERVER和YOUR_TEMPLATE
curl "http://localhost:5000/api/server-control/YOUR_SERVER/partition-schemes?templateName=YOUR_TEMPLATE"
```

**预期结果:**
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

**常见问题:**
- ❌ 404错误 → 后端未重启
- ❌ success: false → 模板名称错误或模板无分区方案
- ❌ schemes为空数组 → 该模板确实没有自定义分区

### 检查点2: 前端是否正确调用

**步骤:**
1. 打开浏览器 F12
2. 切换到 Console 标签
3. 选择服务器并点击"重装系统"
4. 选择一个系统模板
5. 观察 Console 输出

**应该看到:**
```javascript
// 如果成功
Toast: "已加载 X 个分区方案"

// 如果失败
Console Error: "获取分区方案失败: ..."
Toast: "获取分区方案失败，请重启后端服务器"
```

### 检查点3: 分区UI是否显示

**正常流程:**
```
选择模板
  ↓
显示"正在加载分区方案..."（1-2秒）
  ↓
显示"分区方案（可选）"选择器
  ↓
可以选择不同方案
  ↓
可以点击"查看分区详情"
```

**异常情况:**
- ⚠️ 一直显示"正在加载..." → API调用超时/失败
- ⚠️ 显示"该模板无可用分区方案" → API返回空数组（正常）
- ⚠️ 什么都不显示 → 检查loadingPartitions状态

### 检查点4: 安装时是否传递分区参数

**在安装前添加调试日志:**

打开浏览器Console，在提交安装前，应该能看到:
```javascript
installData = {
  templateName: "debian11_64",
  customHostname: "server1.example.com", // 可选
  partitionSchemeName: "default" // 如果选择了分区方案
}
```

## 🐛 已知问题和修复

### 问题1: 分区方案未传递给后端

**原因:** 前端只在selectedScheme有值时才传递

**修复:** 确保始终传递（即使为空）

### 问题2: 某些模板无分区方案

**现象:** 显示"该模板无可用分区方案"

**原因:** OVH某些模板（特别是cPanel、Plesk等）不支持自定义分区

**解决:** 这是正常的，选择其他模板测试

### 问题3: 404错误

**原因:** 后端OPTIONS请求失败

**解决:** 重启后端服务器

## 🧪 测试用例

### 测试1: 标准Debian模板（应该有分区方案）
```
模板: debian11_64
预期: 有1-3个分区方案
方案名称: default, 等
```

### 测试2: Windows模板（可能无分区方案）
```
模板: win-*
预期: 可能无分区方案
```

### 测试3: 自定义分区安装
```
1. 选择 debian11_64
2. 查看分区方案: default
3. 查看分区详情，确认有4-6个分区
4. 提交安装
5. 检查后端日志是否有: "使用自定义分区方案: default"
```

## 📋 调试清单

- [ ] 后端服务器已重启
- [ ] 后端日志无ERROR
- [ ] 浏览器Console无错误
- [ ] Network标签显示partition-schemes请求成功(200)
- [ ] 分区方案选择器正确显示
- [ ] 能够查看分区详情
- [ ] 安装时后端日志显示分区方案名称

## 🔧 手动测试完整流程

```bash
# 1. 重启后端
Ctrl+C
python backend/app.py

# 2. 在浏览器中
# - 刷新页面
# - 选择服务器
# - 点击"重装系统"
# - 选择 debian11_64
# - 等待分区方案加载
# - 检查是否显示"分区方案（可选）"

# 3. 查看浏览器Console
# 应该看到成功加载的提示

# 4. 查看后端日志
# 应该看到partition-schemes请求成功
```

## 💡 快速验证脚本

在浏览器Console运行：
```javascript
// 检查状态
console.log('Template:', selectedTemplate);
console.log('Schemes:', partitionSchemes);
console.log('Selected:', selectedScheme);
console.log('Loading:', loadingPartitions);

// 手动触发加载
fetchPartitionSchemes('YOUR_SERVER_NAME', 'debian11_64');
```
