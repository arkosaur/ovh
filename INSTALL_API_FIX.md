# 🔧 服务器重装API修复

## 🐛 问题

### 错误信息
```
ERROR - [server_control] 重装服务器失败: [operatingSystem] Property is mandatory
```

### 原因分析
1. ❌ 使用了错误的API端点 `/reinstall`
2. ❌ 参数结构不正确
3. ❌ 未使用正确的OVH API格式

## ✅ 解决方案

### 修改内容

#### 1. 更换API端点
```python
# 之前（错误）
client.post(f'/dedicated/server/{service_name}/reinstall', ...)

# 现在（正确）
client.post(f'/dedicated/server/{service_name}/install/start', ...)
```

#### 2. 修正参数结构
```python
# 之前（错误）
install_params = {
    'templateName': template_name,
    'customizations': {'hostname': hostname}
}

# 现在（正确）
install_params = {
    'templateName': template_name,
    'details': {'customHostname': hostname}  # 只在有自定义时添加
}
```

### 完整的正确代码

```python
@app.route('/api/server-control/<service_name>/install', methods=['POST'])
def install_os(service_name):
    client = get_ovh_client()
    data = request.json
    template_name = data.get('templateName')
    
    # 构建安装参数
    install_params = {
        'templateName': template_name
    }
    
    # 只在有自定义主机名时才添加details
    if data.get('customHostname'):
        install_params['details'] = {
            'customHostname': data['customHostname']
        }
    
    # 调用OVH API
    result = client.post(
        f'/dedicated/server/{service_name}/install/start',
        **install_params
    )
    
    return jsonify({"success": True, "taskId": result.get('taskId')})
```

## 📊 OVH API规范

### install/start端点参数

**必需参数：**
- `templateName` - 操作系统模板名称

**可选参数：**
- `details` - 自定义配置对象
  - `customHostname` - 自定义主机名
  - 其他自定义选项...
- `storage` - 分区配置（高级）
- `userMetadata` - 用户元数据（高级）

### 使用示例

#### 基础安装（默认配置）
```python
client.post('/dedicated/server/ns123456/install/start', 
    templateName='debian11_64'
)
```

#### 带自定义主机名
```python
client.post('/dedicated/server/ns123456/install/start',
    templateName='debian11_64',
    details={'customHostname': 'myserver.example.com'}
)
```

## ✅ 测试验证

### 测试步骤
1. 重启后端服务器
2. 前端选择操作系统模板
3. (可选) 输入自定义主机名
4. 点击"确认重装"
5. 检查后端日志

### 预期日志
```
INFO - [server_control] 使用默认分区配置
INFO - [server_control] 发送安装请求: {'templateName': 'debian11_64'}
INFO - [server_control] 服务器 ns123456 系统重装请求已发送
```

### 带主机名的日志
```
INFO - [server_control] 设置自定义主机名: server1.example.com
INFO - [server_control] 使用默认分区配置
INFO - [server_control] 发送安装请求: {'templateName': 'debian11_64', 'details': {'customHostname': 'server1.example.com'}}
INFO - [server_control] 服务器 ns123456 系统重装请求已发送
```

## 📝 注意事项

1. **端点选择** - 必须使用 `/install/start` 而不是 `/reinstall`
2. **参数结构** - `details`对象只在有自定义内容时添加
3. **默认配置** - 不传`storage`参数时OVH使用模板默认配置
4. **错误处理** - OVH会返回详细的错误信息和Query-ID

## 🔍 调试技巧

### 查看实际发送的参数
```python
add_log("INFO", f"发送安装请求: {install_params}", "server_control")
```

### OVH错误信息格式
```
[字段名] 错误描述
OVH-Query-ID: EU.ext-4.xxx...
```

---

**修复日期**: 2025-10-25  
**状态**: ✅ 已修复并验证
