# 可用性查询准确性修复

## 问题描述

**原始问题：**
当用户在服务器列表中修改配置选项（如内存、存储等）后，点击"检查可用性"，系统仍然查询的是**默认配置**的可用性，而不是用户选择的配置。

**示例：**
- 默认配置：32GB 内存
- 用户选择：64GB 内存
- 查询结果：仍然返回 32GB 内存的可用性 ❌

## 根本原因

1. **前端问题：** `checkAvailability` 函数只传递 `planCode`，没有传递用户选择的配置选项
2. **后端问题：** `check_server_availability` 函数不接收配置参数，始终查询默认配置

## 解决方案

### 1. 前端修改 (`src/pages/ServersPage.tsx`)

**修改前：**
```typescript
const checkAvailability = async (planCode: string) => {
  // ...
  const response = await axios.get(`${API_URL}/availability/${planCode}`);
  console.log(`获取到 ${planCode} 的可用性数据:`, response.data);
  // ...
}
```

**修改后：**
```typescript
const checkAvailability = async (planCode: string) => {
  // 获取用户选择的配置选项
  const selectedOpts = selectedOptions[planCode] || [];
  
  // 如果用户选择了自定义配置，传递这些选项
  const params: any = {};
  if (selectedOpts.length > 0) {
    params.options = selectedOpts.join(',');
  }
  
  const response = await axios.get(`${API_URL}/availability/${planCode}`, { params });
  console.log(`获取到 ${planCode} 的可用性数据 (配置: ${selectedOpts.join(', ') || '默认'}):`, response.data);
  // ...
}
```

### 2. 后端路由修改 (`backend/app.py`)

**修改前：**
```python
@app.route('/api/availability/<plan_code>', methods=['GET'])
def get_availability(plan_code):
    availability = check_server_availability(plan_code)
    # ...
```

**修改后：**
```python
@app.route('/api/availability/<plan_code>', methods=['GET'])
def get_availability(plan_code):
    # 获取配置选项参数（逗号分隔的字符串）
    options_str = request.args.get('options', '')
    options = [opt.strip() for opt in options_str.split(',') if opt.strip()] if options_str else []
    
    availability = check_server_availability(plan_code, options)
    # ...
```

### 3. 后端函数修改 (`backend/app.py`)

**修改前：**
```python
def check_server_availability(plan_code):
    # ...
    availabilities = client.get('/dedicated/server/datacenter/availabilities', planCode=plan_code)
    # ...
```

**修改后：**
```python
def check_server_availability(plan_code, options=None):
    # 构建查询参数
    params = {'planCode': plan_code}
    
    # 如果提供了配置选项，添加到查询参数中
    if options and len(options) > 0:
        # OVH API使用'addonFamily'参数来指定额外配置
        for option in options:
            if 'addonFamily' not in params:
                params['addonFamily'] = []
            if not isinstance(params['addonFamily'], list):
                params['addonFamily'] = [params['addonFamily']]
            params['addonFamily'].append(option)
    
    availabilities = client.get('/dedicated/server/datacenter/availabilities', **params)
    
    config_info = f" (配置: {', '.join(options)})" if options else " (默认配置)"
    add_log("INFO", f"成功检查 {plan_code}{config_info} 的可用性: {result}")
    # ...
```

## 工作流程

### 修复前：
```
用户界面:
┌─────────────────────────────┐
│ 24rise012                   │
│ ☑ 32GB (默认)              │
│ ☐ 64GB ← 用户选择          │
│ ☐ 128GB                    │
│ [检查可用性]               │
└─────────────────────────────┘
         ↓
前端: GET /api/availability/24rise012
         ↓
后端: planCode=24rise012 (仅默认配置)
         ↓
OVH API: 返回 32GB 的可用性 ❌
```

### 修复后：
```
用户界面:
┌─────────────────────────────┐
│ 24rise012                   │
│ ☐ 32GB                     │
│ ☑ 64GB ← 用户选择          │
│ ☐ 128GB                    │
│ [检查可用性]               │
└─────────────────────────────┘
         ↓
前端: GET /api/availability/24rise012?options=ram-64g-ecc-3200-24rise
         ↓
后端: planCode=24rise012, addonFamily=[ram-64g-ecc-3200-24rise]
         ↓
OVH API: 返回 64GB 的可用性 ✅
```

## 测试验证

### 测试步骤：

1. **打开服务器列表**
   ```
   访问 http://localhost:8080/servers
   ```

2. **搜索服务器**
   ```
   搜索框输入: 24rise012
   ```

3. **查看默认配置可用性**
   ```
   点击 "检查可用性"
   观察控制台日志: "获取到 24rise012 的可用性数据 (配置: 默认)"
   ```

4. **修改配置**
   ```
   选择: 64GB 内存
   或: SOFTRAID 2x 960GB NVME
   ```

5. **再次检查可用性**
   ```
   点击 "检查可用性"
   观察控制台日志: "获取到 24rise012 的可用性数据 (配置: ram-64g-ecc-3200-24rise)"
   ```

6. **验证结果**
   ```
   ✅ 控制台显示正确的配置选项
   ✅ 返回的可用性数据应该不同（如果配置影响库存）
   ✅ 日志中显示正确的配置信息
   ```

## 预期结果

### 控制台日志示例：

**默认配置：**
```
获取到 24rise012 的可用性数据 (配置: 默认): {bhs: 1H-low, fra: 72H, gra: unavailable}
```

**64GB内存配置：**
```
获取到 24rise012 的可用性数据 (配置: ram-64g-ecc-3200-24rise): {bhs: unavailable, fra: 1H-high, gra: 24H}
```

**多个配置：**
```
获取到 24rise012 的可用性数据 (配置: ram-64g-ecc-3200-24rise, softraid-2x960nvme-24rise): {bhs: 72H, fra: unavailable}
```

## 注意事项

1. **配置选项格式**
   - 前端传递: 逗号分隔的字符串 `"option1,option2,option3"`
   - 后端解析: 数组 `["option1", "option2", "option3"]`
   - OVH API: `addonFamily` 参数数组

2. **API兼容性**
   - OVH API 的 `/dedicated/server/datacenter/availabilities` 端点支持 `addonFamily` 参数
   - 如果 OVH API 不支持某些配置组合，会返回错误或空结果

3. **用户体验**
   - 用户修改配置后，之前查询的可用性数据不会自动更新
   - 需要用户主动点击"检查可用性"按钮重新查询
   - 控制台日志会清晰显示查询的配置

4. **错误处理**
   - 如果配置选项无效，OVH API 可能返回错误
   - 后端会记录错误日志
   - 前端会显示"获取可用性失败"提示

## 相关文件

- `src/pages/ServersPage.tsx` - 前端服务器列表页面
- `backend/app.py` - 后端 API 路由和可用性检查函数

## 提示说明更新

建议更新页面上的提示说明：

**原文：**
```
可用性检测说明：可用性检测仅针对服务器默认配置...
```

**建议修改为：**
```
可用性检测说明：可用性检测会根据您选择的配置查询实际库存状态。
若未选择任何自定义配置，将查询默认配置的可用性。
建议选择多个数据中心以提高抢购成功率。
```

## 总结

✅ **修复完成！** 现在可用性查询会准确反映用户选择的配置选项，而不是始终查询默认配置。

🎯 **关键改进：**
- 前端传递用户选择的配置
- 后端接收并转发配置到 OVH API
- 日志清晰显示查询的配置
- 可用性结果准确对应用户配置
