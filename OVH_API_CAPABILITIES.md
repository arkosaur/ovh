# 🔍 OVH API 功能清单

## ✅ 已实现的功能

### 1. 服务器基础管理
- **GET** `/dedicated/server` - 获取服务器列表
- **GET** `/dedicated/server/{serviceName}` - 获取服务器详情
- **POST** `/dedicated/server/{serviceName}/reboot` - 重启服务器 ✅ 工作正常

### 2. 系统模板管理
- **GET** `/dedicated/server/{serviceName}/install/compatibleTemplates` - 获取可用OS模板
- **GET** `/dedicated/installationTemplate/{template}/partitionScheme` - 获取分区方案

### 3. 硬件信息
- **GET** `/dedicated/server/{serviceName}/specifications/hardware` - 硬件配置信息 ✅ 工作正常

### 4. 网络管理
- **GET** `/dedicated/server/{serviceName}/ips` - IP地址列表 ✅ 工作正常

### 5. 监控管理
- **GET** `/dedicated/server/{serviceName}/monitoring` - 监控状态
- **PUT** `/dedicated/server/{serviceName}/monitoring` - 开关监控 ✅ 工作正常

### 6. 任务管理
- **GET** `/dedicated/server/{serviceName}/task` - 任务列表 ✅ 工作正常

### 7. 服务信息
- **GET** `/dedicated/server/{serviceName}/serviceInfos` - 服务详情 ✅ 工作正常

---

## 🚀 OVH API 还支持的能力（未实现）

### 📊 监控与统计
```python
# IPMI / KVM 控制台
GET /dedicated/server/{serviceName}/features/ipmi
POST /dedicated/server/{serviceName}/features/ipmi/access

# 流量统计
GET /dedicated/server/{serviceName}/statistics
GET /dedicated/server/{serviceName}/networkInterfaceController

# 带宽监控
GET /dedicated/server/{serviceName}/traffic
```

### 🔧 启动配置
```python
# 启动设备管理
GET /dedicated/server/{serviceName}/boot
GET /dedicated/server/{serviceName}/boot/{bootId}
PUT /dedicated/server/{serviceName}/boot/{bootId}

# 设置启动模式
PUT /dedicated/server/{serviceName}  # 修改bootId
```

### 🌐 网络高级功能
```python
# 反向DNS
GET /dedicated/server/{serviceName}/ips/{ipBlock}/reverse
POST /dedicated/server/{serviceName}/ips/{ipBlock}/reverse

# Failover IP
GET /dedicated/server/{serviceName}/ips/{ipBlock}/move
POST /dedicated/server/{serviceName}/ips/{ipBlock}/move

# MAC地址管理
GET /dedicated/server/{serviceName}/virtualMac
POST /dedicated/server/{serviceName}/virtualMac
```

### 💾 备份功能
```python
# FTP Backup
GET /dedicated/server/{serviceName}/features/backupFTP
POST /dedicated/server/{serviceName}/features/backupFTP
DELETE /dedicated/server/{serviceName}/features/backupFTP

# Backup Storage
GET /dedicated/server/{serviceName}/features/backupCloud
POST /dedicated/server/{serviceName}/features/backupCloud
```

### 🔒 安全功能
```python
# 防火墙配置
GET /dedicated/server/{serviceName}/features/firewall
PUT /dedicated/server/{serviceName}/features/firewall

# BIOS设置
GET /dedicated/server/{serviceName}/biosSettings
GET /dedicated/server/{serviceName}/biosSettings/sgx
POST /dedicated/server/{serviceName}/biosSettings/sgx/configure
```

### 📝 许可证管理
```python
# 查看已安装许可证
GET /dedicated/server/{serviceName}/license

# Windows许可证
GET /license/windows/{serviceName}
POST /license/windows/{serviceName}
```

### 🎛️ RAID配置
```python
# 硬件RAID配置
GET /dedicated/server/{serviceName}/specifications/hardware/raid
GET /dedicated/server/{serviceName}/install/hardwareRaidProfile
```

### 🔄 服务管理
```python
# 服务续费
GET /dedicated/server/{serviceName}/serviceInfos/renew
POST /dedicated/server/{serviceName}/serviceInfos/renew

# 服务升级
GET /dedicated/server/{serviceName}/upgrade
POST /dedicated/server/{serviceName}/upgrade
```

### ⚡ 高级功能
```python
# Vrack (私有网络)
GET /dedicated/server/{serviceName}/vrack
POST /dedicated/server/{serviceName}/vrack

# 二次网卡
GET /dedicated/server/{serviceName}/secondaryDnsDomains

# Burst带宽
GET /dedicated/server/{serviceName}/burst
PUT /dedicated/server/{serviceName}/burst
```

---

## 🎯 推荐优先实现的功能

### 高价值功能

#### 1. **IPMI / KVM 控制台** ⭐⭐⭐⭐⭐
远程访问服务器控制台，无需SSH
```python
@app.route('/api/server-control/<service_name>/console', methods=['GET'])
def get_console_access(service_name):
    result = client.get(f'/dedicated/server/{service_name}/features/ipmi')
    access = client.post(f'/dedicated/server/{service_name}/features/ipmi/access', 
                         type='kvmipHtml5')
    return jsonify({"success": True, "console_url": access})
```

#### 2. **反向DNS管理** ⭐⭐⭐⭐
设置PTR记录，邮件服务器必备
```python
@app.route('/api/server-control/<service_name>/reverse-dns', methods=['GET', 'POST'])
def manage_reverse_dns(service_name):
    if request.method == 'GET':
        # 获取当前反向DNS
        pass
    else:
        # 设置反向DNS
        pass
```

#### 3. **启动模式切换** ⭐⭐⭐⭐
切换到Rescue模式进行维护
```python
@app.route('/api/server-control/<service_name>/boot-mode', methods=['PUT'])
def change_boot_mode(service_name):
    # rescue, normal, harddisk
    boot_id = data.get('bootId')
    client.put(f'/dedicated/server/{service_name}', bootId=boot_id)
```

#### 4. **流量统计** ⭐⭐⭐
查看带宽使用情况
```python
@app.route('/api/server-control/<service_name>/traffic', methods=['GET'])
def get_traffic_stats(service_name):
    # 获取流量统计
    pass
```

#### 5. **备份FTP** ⭐⭐⭐
开启/管理FTP备份空间
```python
@app.route('/api/server-control/<service_name>/backup-ftp', methods=['GET', 'POST', 'DELETE'])
def manage_backup_ftp(service_name):
    # 管理FTP备份
    pass
```

---

## 📊 功能对比

| 功能 | 已实现 | 难度 | 价值 | 推荐 |
|------|--------|------|------|------|
| 服务器列表 | ✅ | 低 | ⭐⭐⭐⭐⭐ | - |
| 重启服务器 | ✅ | 低 | ⭐⭐⭐⭐⭐ | - |
| 硬件信息 | ✅ | 低 | ⭐⭐⭐⭐ | - |
| 监控管理 | ✅ | 低 | ⭐⭐⭐⭐ | - |
| 任务查看 | ✅ | 低 | ⭐⭐⭐⭐ | - |
| **IPMI控制台** | ❌ | 中 | ⭐⭐⭐⭐⭐ | 🔥 强烈推荐 |
| **反向DNS** | ❌ | 低 | ⭐⭐⭐⭐ | 🔥 推荐 |
| **Rescue模式** | ❌ | 中 | ⭐⭐⭐⭐⭐ | 🔥 强烈推荐 |
| **流量统计** | ❌ | 中 | ⭐⭐⭐⭐ | 推荐 |
| 备份FTP | ❌ | 中 | ⭐⭐⭐ | 考虑 |
| 防火墙 | ❌ | 中 | ⭐⭐⭐ | 考虑 |
| Failover IP | ❌ | 高 | ⭐⭐⭐ | 低优先级 |
| RAID配置 | ❌ | 高 | ⭐⭐ | 低优先级 |
| 系统重装 | ❌ | 高 | ⭐⭐⭐⭐⭐ | ⚠️ API问题 |

---

## 💡 实施建议

### Phase 1: 高价值快速实现 (1-2小时)
1. ✅ **反向DNS管理** - API简单，功能实用
2. ✅ **Rescue模式切换** - 维护必备
3. ✅ **IPMI控制台** - 远程管理利器

### Phase 2: 监控增强 (2-3小时)
4. ✅ **流量统计图表** - 可视化带宽使用
5. ✅ **网卡信息** - 详细网络状态

### Phase 3: 备份与安全 (3-4小时)
6. ✅ **备份FTP** - 数据安全
7. ✅ **防火墙管理** - 安全增强

### Phase 4: 高级功能 (按需)
8. Vrack私有网络
9. Failover IP迁移
10. 服务升级/续费

---

## 🔗 参考资源

- **OVH API Console**: https://eu.api.ovh.com/console/#/dedicated/server
- **OVH API文档**: https://help.ovhcloud.com/csm/en-dedicated-servers-api
- **Python SDK**: https://github.com/ovh/python-ovh

---

**更新日期**: 2025-10-25  
**当前状态**: 基础功能完成，待扩展高级功能
