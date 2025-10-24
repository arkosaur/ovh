# 🧪 分区功能测试步骤（详细版）

## 前置准备

### 1. 重启后端服务器（必须）
```bash
# 停止当前后端
Ctrl+C

# 重新启动
python backend/app.py
```

### 2. 打开浏览器开发者工具
```
按 F12
切换到 Console 标签
保持打开状态
```

## 📋 详细测试步骤

### 步骤1: 基础检查

1. **刷新前端页面** (Ctrl+F5)
2. **观察Console** - 应该看到服务器列表加载成功
3. **选择一台服务器** - 从下拉菜单中选择

### 步骤2: 打开重装对话框

1. **点击"重装系统"按钮**
2. **观察Console** - 应该看到模板加载
3. **对话框应该正常打开**

### 步骤3: 选择模板并观察分区加载

1. **在"操作系统模板"下拉框中选择一个模板**
   - 推荐选择: `debian11_64` 或 `debian12_64`
   
2. **立即观察Console输出** - 应该看到:
```javascript
[Partition] 开始加载分区方案: {serviceName: "...", templateName: "debian11_64"}
[Partition] API响应: {success: true, schemes: [...]}
[Partition] 自动选择方案: "default"
```

3. **观察UI变化**:
   - 应该先显示 "正在加载分区方案..."
   - 然后显示 Toast: "已加载 X 个分区方案"
   - 最后显示 "分区方案（可选）" 选择器

### 步骤4: 检查分区方案选择器

**应该看到:**
```
分区方案（可选）
┌─────────────────────┐
│ default (4 个分区)  │  ← 这个
└─────────────────────┘
  [查看分区详情]        ← 这个链接
```

**如果没看到:**
1. 检查Console是否有错误
2. 检查Network标签中partition-schemes请求的状态
3. 确认后端已重启

### 步骤5: 查看分区详情

1. **点击"查看分区详情"链接**
2. **应该展开显示分区列表**:
```
┌─────────────────────────────┐
│ /          - 20480 MB        │
│ ext4 | primary | RAID: 1     │
├─────────────────────────────┤
│ /home      - 40960 MB        │
│ ext4 | primary | RAID: 1     │
├─────────────────────────────┤
│ swap       - 4096 MB         │
│ swap | primary | RAID: N/A   │
└─────────────────────────────┘
```

### 步骤6: 测试安装（不实际执行）

1. **（可选）输入自定义主机名**
2. **点击"确认重装"按钮**
3. **在确认对话框中点击"取消"** ← 重要！不要真的重装
4. **观察Console** - 应该看到:
```javascript
[Install] 使用自定义分区方案: default
[Install] 安装数据: {
  templateName: "debian11_64",
  customHostname: "...",
  partitionSchemeName: "default"
}
```

### 步骤7: 验证后端接收

1. **查看后端日志** (运行backend/app.py的终端)
2. **应该看到** (如果真的提交了安装):
```
INFO - [server_control] 使用自定义分区方案: default
INFO - [server_control] 服务器 xxx 系统重装请求已发送，模板: debian11_64
```

## ✅ 成功标志

如果你看到以下所有内容，说明功能正常：

- ✅ Console显示 `[Partition] 开始加载分区方案`
- ✅ Console显示 `[Partition] API响应: {success: true, schemes: [...]}`
- ✅ Console显示 `[Partition] 自动选择方案: default`
- ✅ UI显示 "分区方案（可选）" 选择器
- ✅ 可以点击"查看分区详情"
- ✅ 分区详情正确显示
- ✅ Console显示 `[Install] 使用自定义分区方案: xxx`

## ❌ 常见错误和解决方案

### 错误1: Console显示 404 错误
```
Console: GET .../partition-schemes?templateName=... 404 (Not Found)
```
**解决:** 重启后端服务器

### 错误2: 显示"该模板无可用分区方案"
```
Toast: 该模板无可用分区方案（将使用默认分区）
```
**原因:** 某些模板（特别是Windows、cPanel、Plesk）不支持自定义分区
**解决:** 选择Debian或Ubuntu模板测试

### 错误3: 一直显示"正在加载分区方案..."
```
UI: 一直显示加载动画
Console: 可能有CORS或超时错误
```
**解决:** 
1. 检查Network标签中的请求
2. 确认后端正在运行
3. 检查后端日志

### 错误4: Console无任何输出
```
选择模板后Console什么都没显示
```
**解决:**
1. 刷新页面 (Ctrl+F5)
2. 确认Console没有被过滤
3. 重新选择模板

## 🔧 手动测试API

如果前端有问题，可以直接测试后端：

```bash
# 替换YOUR_SERVER和YOUR_TEMPLATE
curl -X GET "http://localhost:5000/api/server-control/YOUR_SERVER/partition-schemes?templateName=debian11_64"
```

**预期响应:**
```json
{
  "success": true,
  "schemes": [
    {
      "name": "default",
      "priority": 1,
      "partitions": [
        {
          "mountpoint": "/",
          "filesystem": "ext4",
          "size": 20480,
          "order": 1,
          "raid": "1",
          "type": "primary"
        },
        ...
      ]
    }
  ]
}
```

## 📊 调试清单

在报告问题前，请完成：

- [ ] 后端服务器已重启
- [ ] 浏览器已刷新 (Ctrl+F5)
- [ ] Console标签已打开
- [ ] Network标签已打开
- [ ] 已截取Console输出
- [ ] 已截取Network中的API请求
- [ ] 已检查后端日志
- [ ] 已尝试不同的模板

## 💡 快速验证命令

在浏览器Console中运行：

```javascript
// 检查当前状态
console.log('当前状态:', {
  selectedServer,
  selectedTemplate,
  partitionSchemes,
  selectedScheme,
  loadingPartitions
});
```

现在请按照上述步骤测试，并告诉我在哪一步出现了问题！
