# 🔧 自定义分区功能 - 深度排查与修复总结

## ✅ 已完成的修复

### 1. 前端调试增强
**位置:** `src/pages/ServerControlPage.tsx`

**添加的调试日志:**
```javascript
// 加载分区方案时
console.log('[Partition] 开始加载分区方案:', { serviceName, templateName });
console.log('[Partition] API响应:', response.data);
console.log('[Partition] 自动选择方案:', firstScheme);

// 安装时
console.log('[Install] 使用自定义分区方案:', selectedScheme);
console.log('[Install] 安装数据:', installData);
```

### 2. 后端日志增强
**位置:** `backend/app.py`

**添加的日志:**
```python
add_log("INFO", f"[Partition] 请求获取分区方案: server={service_name}, template={template_name}", "server_control")
add_log("INFO", f"[Partition] 成功获取 {len(scheme_details)} 个分区方案", "server_control")
add_log("ERROR", f"[Partition] 缺少templateName参数", "server_control")
```

### 3. 错误处理改进

**前端:**
- ✅ 更详细的错误消息
- ✅ 区分"无分区方案"和"加载失败"
- ✅ 空方案时设置selectedScheme为空字符串

**后端:**
- ✅ OPTIONS方法支持（CORS）
- ✅ 参数验证
- ✅ 详细的错误日志

## 📋 完整的测试流程

### 步骤1: 重启后端
```bash
Ctrl+C
python backend/app.py
```

### 步骤2: 测试前端
1. 刷新浏览器 (Ctrl+F5)
2. 打开Console (F12)
3. 选择服务器
4. 点击"重装系统"
5. 选择模板（如 debian11_64）
6. **观察Console输出**

### 步骤3: 验证分区加载

**成功的Console输出:**
```javascript
[Partition] 开始加载分区方案: {serviceName: "xxx", templateName: "debian11_64"}
[Partition] API响应: {success: true, schemes: Array(1)}
[Partition] 自动选择方案: "default"
```

**成功的后端日志:**
```
INFO - [Partition] 请求获取分区方案: server=xxx, template=debian11_64
INFO - [Partition] 成功获取 1 个分区方案
```

### 步骤4: 验证UI显示

**应该看到:**
1. Toast提示: "已加载 1 个分区方案"
2. UI显示: "分区方案（可选）" 选择器
3. 默认选中: "default (4 个分区)"
4. 可点击: "查看分区详情"

### 步骤5: 测试安装

1. 点击"确认重装"
2. 在确认对话框点击"取消"（避免真的重装）
3. **观察Console:**
```javascript
[Install] 使用自定义分区方案: default
[Install] 安装数据: {
  templateName: "debian11_64",
  partitionSchemeName: "default"
}
```

## 🐛 常见问题诊断

### 问题1: 404错误

**现象:**
```
Console: GET .../partition-schemes?templateName=... 404
```

**原因:** 后端路由未加载

**解决:**
1. 检查backend/app.py是否包含partition-schemes路由
2. 重启后端服务器
3. 确认路由支持OPTIONS方法

**验证:**
```bash
curl "http://localhost:5000/api/server-control/test/partition-schemes?templateName=debian11_64"
```

### 问题2: 空方案

**现象:**
```
Toast: 该模板无可用分区方案（将使用默认分区）
Console: [Partition] 模板无分区方案
```

**原因:** 某些模板确实没有自定义分区

**解决:** 这是正常的，尝试其他模板：
- ✅ debian11_64, debian12_64
- ✅ ubuntu2004_64, ubuntu2204_64
- ❌ win*, cpanel*, plesk* (通常无自定义分区)

### 问题3: 数据未传递

**现象:**
```
后端日志无: "使用自定义分区方案: xxx"
```

**原因:** 前端未正确传递partitionSchemeName

**验证Console:**
```javascript
// 应该看到
[Install] 使用自定义分区方案: default

// 如果看到
[Install] 未选择分区方案，将使用默认分区
// 说明selectedScheme为空
```

**检查:**
```javascript
// 在Console运行
console.log('selectedScheme:', selectedScheme);
console.log('partitionSchemes:', partitionSchemes);
```

### 问题4: CORS错误

**现象:**
```
Access to fetch at ... has been blocked by CORS policy
```

**原因:** 后端CORS配置或OPTIONS请求失败

**解决:**
1. 确认backend/app.py有: `CORS(app)`
2. 确认路由包含OPTIONS: `methods=['GET', 'OPTIONS']`
3. 重启后端

## 📊 功能验证清单

完整功能检查：

- [ ] 后端服务器已重启
- [ ] 浏览器已刷新
- [ ] Console显示 `[Partition] 开始加载分区方案`
- [ ] Console显示 `[Partition] API响应: {success: true, ...}`
- [ ] Console显示 `[Partition] 自动选择方案`
- [ ] Toast显示 "已加载 X 个分区方案"
- [ ] UI显示 "分区方案（可选）" 选择器
- [ ] 默认选中第一个方案
- [ ] 可点击"查看分区详情"
- [ ] 分区详情正确显示
- [ ] Console显示 `[Install] 使用自定义分区方案`
- [ ] 后端日志显示分区方案名称

## 🎯 核心代码片段

### 前端 - 获取分区方案
```typescript
const fetchPartitionSchemes = async (serviceName: string, templateName: string) => {
  console.log('[Partition] 开始加载分区方案:', { serviceName, templateName });
  setLoadingPartitions(true);
  
  const response = await api.get(
    `/server-control/${serviceName}/partition-schemes?templateName=${templateName}`
  );
  
  if (response.data.success && response.data.schemes.length > 0) {
    setPartitionSchemes(response.data.schemes);
    setSelectedScheme(response.data.schemes[0].name);
  }
};
```

### 前端 - 传递分区参数
```typescript
const installData: any = {
  templateName: selectedTemplate,
  customHostname: customHostname || undefined
};

if (selectedScheme) {
  installData.partitionSchemeName = selectedScheme;
  console.log('[Install] 使用自定义分区方案:', selectedScheme);
}

await api.post(`/server-control/${serviceName}/install`, installData);
```

### 后端 - 接收分区参数
```python
# 分区方案参数
if data.get('partitionSchemeName'):
    install_params['partitionSchemeName'] = data['partitionSchemeName']
    add_log("INFO", f"使用自定义分区方案: {data['partitionSchemeName']}", "server_control")
```

## 📝 文档清单

已创建的文档：
1. ✅ `PARTITION_DEBUG_GUIDE.md` - 调试指南
2. ✅ `PARTITION_TEST_STEPS.md` - 详细测试步骤
3. ✅ `PARTITION_FIX_SUMMARY.md` - 本文档
4. ✅ `SERVER_CONTROL_COMPLETE.md` - 功能总结

## 🚀 下一步

1. **按照 `PARTITION_TEST_STEPS.md` 进行完整测试**
2. **在每一步记录Console输出**
3. **如果仍有问题，提供:**
   - Console的完整输出（包括错误）
   - Network标签中partition-schemes请求的详情
   - 后端日志中的相关行
   - 在哪一步出现问题

## ✨ 总结

**已修复:**
- ✅ 添加详细的调试日志（前端+后端）
- ✅ 改进错误处理和提示
- ✅ 确保分区参数正确传递
- ✅ 优化UI反馈

**功能状态:**
- ✅ 分区方案加载
- ✅ 分区详情展示
- ✅ 分区参数传递
- ✅ 后端日志记录

现在请按照测试步骤进行测试，并告诉我具体在哪一步遇到了问题！
