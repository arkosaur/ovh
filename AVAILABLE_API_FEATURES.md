# OVH Dedicated Server API 可用功能清单

基于官方API文档：https://eu.api.ovh.com/console/?section=%2Fdedicated%2Fserver&branch=v1

## ✅ 已实现功能

1. **服务器列表** - `GET /dedicated/server`
2. **服务器信息** - `GET /dedicated/server/{serviceName}`  
3. **重启服务器** - `POST /dedicated/server/{serviceName}/reboot`
4. **重装系统** - `POST /dedicated/server/{serviceName}/reinstall`
5. **任务列表** - `GET /dedicated/server/{serviceName}/task`
6. **启动模式管理** - `GET/PUT /dedicated/server/{serviceName}/boot`
7. **监控开关** - `GET/PUT /dedicated/server/{serviceName}/monitoring`
8. **硬件信息** - `GET /dedicated/server/{serviceName}/specifications/hardware`
9. **IP管理** - `GET /dedicated/server/{serviceName}/ips`
10. **系统模板** - `GET /dedicated/server/{serviceName}/install/compatibleTemplates`
11. **分区方案** - `GET /dedicated/installationTemplate/{template}/partitionScheme`

---

## 🚀 可扩展功能（按优先级）

### 🔥 高优先级（实用且易实现）

#### 1. **Backup FTP管理** ⭐⭐⭐⭐⭐
```
GET  /dedicated/server/{serviceName}/features/backupFTP
POST /dedicated/server/{serviceName}/features/backupFTP
DEL  /dedicated/server/{serviceName}/features/backupFTP
POST /dedicated/server/{serviceName}/features/backupFTP/password
GET  /dedicated/server/{serviceName}/features/backupFTP/access
POST /dedicated/server/{serviceName}/features/backupFTP/access
DEL  /dedicated/server/{serviceName}/features/backupFTP/access/{ipBlock}
```
- 功能：管理500GB免费备份FTP空间
- 用途：激活/停用、重置密码、管理IP白名单

#### 2. **服务器更新信息** ⭐⭐⭐⭐⭐
```
PUT /dedicated/server/{serviceName}
```
- 功能：更新服务器显示名称、监控邮箱等
- 用途：自定义服务器标签、设置告警联系人

#### 3. **Burst流量管理** ⭐⭐⭐⭐
```
GET /dedicated/server/{serviceName}/burst
PUT /dedicated/server/{serviceName}/burst
```
- 功能：管理突发流量配置
- 用途：开启/关闭流量突发功能

#### 4. **防火墙配置** ⭐⭐⭐⭐
```
GET /dedicated/server/{serviceName}/features/firewall
PUT /dedicated/server/{serviceName}/features/firewall  
```
- 功能：OVH防火墙开关
- 用途：启用/禁用DDoS防护

#### 5. **反向DNS管理** ⭐⭐⭐⭐
```
GET /dedicated/server/{serviceName}/reverse
POST /dedicated/server/{serviceName}/reverse
DEL /dedicated/server/{serviceName}/reverse/{ipReverse}
```
- 功能：配置IP反向解析
- 用途：设置PTR记录，邮件服务器必备

---

### 🌟 中优先级（有用但较复杂）

#### 6. **网络接口配置** ⭐⭐⭐
```
GET /dedicated/server/{serviceName}/networkInterfaceController
GET /dedicated/server/{serviceName}/virtualNetworkInterface
```
- 功能：查看网络接口详情
- 用途：网络诊断、虚拟接口管理

#### 7. **OLA (Overthe-Link Aggregation)** ⭐⭐⭐
```
POST /dedicated/server/{serviceName}/ola/aggregation
GET /dedicated/server/{serviceName}/ola/aggregation/{id}
```
- 功能：网络聚合配置
- 用途：链路聚合，提升网络性能

#### 8. **二次销售许可证** ⭐⭐⭐
```
GET /dedicated/server/{serviceName}/license/windows
GET /dedicated/server/{serviceName}/license/cpanel
```
- 功能：查看已激活的许可证
- 用途：许可证管理

#### 9. **服务续费设置** ⭐⭐⭐
```
GET /dedicated/server/{serviceName}/serviceInfos
PUT /dedicated/server/{serviceName}/serviceInfos
```
- 功能：查看和修改续费类型
- 用途：设置自动/手动续费

---

### 💡 低优先级（特殊场景）

#### 10. **BIOS设置** (Beta) ⭐⭐
```
GET /dedicated/server/{serviceName}/biosSettings
GET /dedicated/server/{serviceName}/biosSettings/sgx
POST /dedicated/server/{serviceName}/biosSettings/sgx/configure
```
- 功能：查看和配置BIOS（SGX）
- 用途：特殊安全需求

#### 11. **Backup Cloud** (Beta) ⭐⭐
```
GET  /dedicated/server/{serviceName}/features/backupCloud
POST /dedicated/server/{serviceName}/features/backupCloud
DEL  /dedicated/server/{serviceName}/features/backupCloud
```
- 功能：云备份服务管理
- 用途：付费云备份

#### 12. **联系人变更** ⭐
```
POST /dedicated/server/{serviceName}/changeContact
```
- 功能：更改服务器联系人
- 用途：转移管理权限

#### 13. **服务终止** ⭐
```
POST /dedicated/server/{serviceName}/terminate
POST /dedicated/server/{serviceName}/confirmTermination
```
- 功能：终止服务器合同
- 用途：退租服务器

---

## 📋 推荐实现顺序

### 第一批（即刻可实现）
1. ✅ **Backup FTP管理** - 最实用
2. ✅ **服务器更新信息** - 简单实用
3. ✅ **反向DNS管理** - 邮件服务必备
4. ✅ **Burst流量管理** - 流量控制
5. ✅ **防火墙配置** - 安全必备

### 第二批（按需实现）
6. **网络接口查看** - 诊断工具
7. **服务续费设置** - 计费管理
8. **二次许可证** - Windows/cPanel用户需要

### 第三批（特殊需求）
9. **OLA网络聚合** - 高级网络
10. **BIOS配置** - 特殊硬件
11. **联系人变更** - 权限转移

---

## 🎯 建议实现的5大核心功能

### 1. 🗄️ **Backup FTP管理中心**
- 激活/停用500GB免费FTP
- 查看FTP连接信息
- 重置FTP密码
- 管理IP访问白名单
- **UI**: 独立的"备份FTP"标签页

### 2. ✏️ **服务器信息编辑**
- 修改服务器显示名称
- 设置监控邮箱
- 更新服务器描述
- **UI**: 在服务器信息卡片添加"编辑"按钮

### 3. 🔄 **反向DNS配置器**
- 列出所有IP及其反向DNS
- 添加/修改PTR记录
- 删除反向DNS
- **UI**: 在IP管理区域添加"反向DNS"列

### 4. 📊 **Burst流量开关**
- 查看当前Burst状态
- 开启/关闭突发流量
- 查看Burst配额使用情况
- **UI**: 在网络信息区域添加开关

### 5. 🛡️ **防火墙管理**
- 查看防火墙状态
- 开启/关闭OVH防火墙
- 查看防护模式
- **UI**: 在安全设置区域添加开关

---

## 🔧 技术实现要点

### 后端 (Flask)
```python
# Backup FTP
@app.route('/api/server-control/<service_name>/backup-ftp', methods=['GET', 'POST', 'DELETE'])

# 服务器信息更新
@app.route('/api/server-control/<service_name>', methods=['PUT'])

# 反向DNS
@app.route('/api/server-control/<service_name>/reverse', methods=['GET', 'POST', 'DELETE'])

# Burst流量
@app.route('/api/server-control/<service_name>/burst', methods=['GET', 'PUT'])

# 防火墙
@app.route('/api/server-control/<service_name>/firewall', methods=['GET', 'PUT'])
```

### 前端 (React + TypeScript)
- 在现有的ServerControlPage添加新标签页
- 或创建独立的功能区域
- 使用现有的Cyber主题风格
- 集成Toast通知和确认对话框

---

## 📚 参考文档

- **OVH API Console**: https://eu.api.ovh.com/console/?section=%2Fdedicated%2Fserver
- **Python SDK**: https://github.com/ovh/python-ovh
- **公开文档**: https://help.ovh.com/csm/en-dedicated-servers

---

**生成时间**: 2025-10-25
**状态**: 建议清单，等待实现
