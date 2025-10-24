# 服务器控制中心 - 完整API文档

## ✅ 已实现的所有后端API

### 基础管理功能

#### 1. 获取服务器列表
```
GET /api/server-control/list
```
**功能**: 获取账户下所有独立服务器
**返回**: 服务器名称、型号、数据中心、IP、状态等完整信息

#### 2. 重启服务器
```
POST /api/server-control/{service_name}/reboot
```
**功能**: 重启指定服务器

#### 3. 获取系统模板
```
GET /api/server-control/{service_name}/templates
```
**功能**: 获取服务器可安装的操作系统列表

#### 4. 重装系统
```
POST /api/server-control/{service_name}/install
```
**参数**:
- `templateName`: 系统模板名称（必需）
- `customHostname`: 自定义主机名（可选）

#### 5. 获取任务列表
```
GET /api/server-control/{service_name}/tasks
```
**功能**: 查看服务器最近的操作任务历史

---

### 启动配置管理

#### 6. 获取启动配置
```
GET /api/server-control/{service_name}/boot
```
**功能**: 查看所有可用的启动模式（Normal、Rescue、Netboot等）
**返回**: 启动模式列表及当前使用的模式

#### 7. 设置启动模式
```
PUT /api/server-control/{service_name}/boot/{boot_id}
```
**功能**: 切换启动模式（重启后生效）

---

### 监控管理

#### 8. 获取监控状态
```
GET /api/server-control/{service_name}/monitoring
```
**功能**: 查看服务器监控是否开启

#### 9. 设置监控状态
```
PUT /api/server-control/{service_name}/monitoring
```
**参数**: `enabled` (true/false)
**功能**: 开启或关闭服务器监控

---

### 硬件信息

#### 10. 获取硬件详情
```
GET /api/server-control/{service_name}/hardware
```
**功能**: 获取详细硬件配置
**返回信息**:
- CPU型号、架构、核心数、线程数
- 内存容量
- 磁盘配置（RAID类型、容量、磁盘组）

---

### 网络管理

#### 11. 获取IP列表
```
GET /api/server-control/{service_name}/ips
```
**功能**: 获取服务器所有IP地址（主IP + 附加IP）
**返回**: IP地址、类型、描述、路由状态

#### 12. 获取反向DNS
```
GET /api/server-control/{service_name}/reverse
```
**功能**: 查看所有IP的反向DNS配置

#### 13. 设置反向DNS
```
POST /api/server-control/{service_name}/reverse
```
**参数**:
- `ip`: IP地址
- `reverse`: 反向DNS域名

**功能**: 为指定IP设置反向DNS

---

### 服务信息

#### 14. 获取服务详情
```
GET /api/server-control/{service_name}/serviceinfo
```
**功能**: 查看服务信息
**返回信息**:
- 服务状态
- 到期时间
- 创建时间
- 自动续费状态
- 续费周期

---

### 分区管理（高级功能）

#### 15. 获取分区方案
```
GET /api/server-control/{service_name}/partition-schemes?templateName={模板名}
```
**功能**: 获取指定系统模板的所有分区方案
**返回信息**:
- 分区方案名称
- 每个分区的挂载点、文件系统、大小、顺序
- RAID配置
- 分区类型

**用途**: 在重装系统时，可以选择不同的分区方案，或查看默认分区配置

---

## 🎯 功能特性总结

### ✅ 完整实现的功能模块

1. **服务器生命周期管理**
   - 列表查看
   - 重启控制
   - 系统重装
   - 任务追踪

2. **启动与配置**
   - 启动模式切换（Normal/Rescue/Netboot）
   - 监控开关控制
   - 硬件信息查看

3. **网络管理**
   - IP地址管理
   - 反向DNS配置

4. **服务管理**
   - 到期时间查看
   - 续费状态管理

5. **高级功能**
   - 分区方案查看
   - 自定义分区配置（为重装系统做准备）

---

## 📝 使用示例

### 示例1: 重装系统并设置自定义主机名
```javascript
// 1. 获取可用模板
const templates = await api.get('/server-control/myserver/templates');

// 2. 查看分区方案（可选）
const schemes = await api.get('/server-control/myserver/partition-schemes?templateName=debian11_64');

// 3. 执行重装
await api.post('/server-control/myserver/install', {
  templateName: 'debian11_64',
  customHostname: 'server1.example.com'
});
```

### 示例2: 切换到Rescue模式
```javascript
// 1. 获取启动配置
const bootConfig = await api.get('/server-control/myserver/boot');

// 2. 找到Rescue模式的ID
const rescueBoot = bootConfig.data.boots.find(b => b.bootType === 'rescue');

// 3. 切换到Rescue模式
await api.put(`/server-control/myserver/boot/${rescueBoot.id}`);

// 4. 重启服务器使其生效
await api.post('/server-control/myserver/reboot');
```

### 示例3: 配置反向DNS
```javascript
// 1. 获取服务器IP列表
const ips = await api.get('/server-control/myserver/ips');

// 2. 设置主IP的反向DNS
await api.post('/server-control/myserver/reverse', {
  ip: ips.data.ips[0].ip,
  reverse: 'mail.example.com'
});
```

---

## 🚀 前端集成建议

### 推荐的标签页布局

```
📊 概览     - 服务器列表、快速操作
⚙️ 系统     - 重装系统、启动配置、硬件信息
🌐 网络     - IP管理、反向DNS
📈 监控     - 监控开关、任务历史
ℹ️ 服务     - 到期时间、续费状态
```

### 关键交互流程

1. **重装系统流程**
   - 选择服务器 → 选择模板 → （可选）查看分区方案 → 设置主机名 → 确认重装

2. **Rescue模式流程**
   - 查看启动配置 → 切换到Rescue → 重启服务器 → 完成

3. **反向DNS流程**
   - 查看IP列表 → 选择IP → 输入域名 → 提交

---

## 🔒 安全提醒

- 所有API都需要OVH API密钥验证
- 重装系统会清空所有数据，需要二次确认
- 切换启动模式需要重启服务器才能生效
- 建议在操作前备份重要数据

---

## 📚 相关文档

- OVH API官方文档: https://eu.api.ovh.com/console/
- 项目README: ./README.md
- 安全配置: ./SECURITY.md
