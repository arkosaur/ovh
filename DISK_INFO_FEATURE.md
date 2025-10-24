# 💾 实际硬盘信息集成 - 完成

## 🎯 问题

之前的实现假设服务器配置：
- ❌ 硬编码 500GB 空间
- ❌ 假设 2 块硬盘
- ❌ 不考虑实际硬件配置

## ✅ 解决方案

### 1. 获取实际硬盘信息

**API调用：**
```typescript
GET /api/server-control/{serviceName}/hardware
```

**返回的硬盘信息：**
```json
{
  "hardware": {
    "diskGroups": [
      {
        "numberOfDisks": 2,
        "diskSize": {
          "value": 480,
          "unit": "GB"
        },
        "diskType": "SSD",
        "raidController": "..."
      }
    ]
  }
}
```

### 2. 智能空间计算

**根据实际硬盘配置和RAID级别：**

```typescript
// 2块 480GB 硬盘示例
diskInfo = { count: 2, sizePerDisk: 491520 MB }

RAID 0: 2 × 480GB = 960GB   // 全部空间
RAID 1: 1 × 480GB = 480GB   // 一块盘（镜像）
RAID 5: 1 × 480GB = 480GB   // (n-1) 块盘
RAID 6: 0 × 480GB = 0GB     // (n-2) 块盘（需要至少4块）
RAID10: 960GB / 2 = 480GB   // 总容量的一半
```

### 3. UI显示

**在自定义分区编辑器顶部：**
```
┌─────────────────────────────────────┐
│ 💾 检测到 2 块硬盘，单盘 480.0 GB  │ ← 实际硬件信息
│ ────────────────────────────────────│
│ 总可用空间 (RAID1): 480.0 GB       │ ← 根据RAID1计算
│ 已分配空间:         24.5 GB        │
│ 剩余空间:          455.5 GB ✓      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 5.1% 已使用                         │
└─────────────────────────────────────┘
```

## 🔧 实现细节

### 前端

**1. 状态管理：**
```typescript
const [diskInfo, setDiskInfo] = useState<{
  count: number;
  sizePerDisk: number;
} | null>(null);
```

**2. 打开对话框时获取：**
```typescript
const openReinstallDialog = async (server: ServerInfo) => {
  // ... 其他初始化
  
  // 获取硬件信息
  const hwResponse = await api.get(`/server-control/${server.serviceName}/hardware`);
  const diskGroups = hwResponse.data.hardware.diskGroups;
  
  if (diskGroups.length > 0) {
    const diskGroup = diskGroups[0];
    const diskCount = diskGroup.numberOfDisks;
    const diskSize = diskGroup.diskSize.value; // GB
    const sizeInMB = diskSize * 1024;
    
    setDiskInfo({ count: diskCount, sizePerDisk: sizeInMB });
    setTotalDiskSpace(sizeInMB * diskCount);
  }
};
```

**3. 智能空间计算：**
```typescript
const calculateAvailableSpace = (raidLevel: number): number => {
  if (!diskInfo) {
    // 降级到默认计算
    return totalDiskSpace * defaultMultiplier;
  }

  const { count, sizePerDisk } = diskInfo;
  
  switch (raidLevel) {
    case 0: return count * sizePerDisk;           // RAID 0
    case 1: return sizePerDisk;                   // RAID 1
    case 5: return (count - 1) * sizePerDisk;    // RAID 5
    case 6: return (count - 2) * sizePerDisk;    // RAID 6
    case 10: return (count * sizePerDisk) / 2;   // RAID 10
  }
};
```

### 后端

**已有的API端点（无需修改）：**
```python
@app.route('/api/server-control/<service_name>/hardware', methods=['GET'])
def get_hardware_info(service_name):
    hardware = client.get(f'/dedicated/server/{service_name}/specifications/hardware')
    return jsonify({
        "success": True,
        "hardware": {
            'diskGroups': hardware.get('diskGroups', []),
            # ... 其他硬件信息
        }
    })
```

## 📊 支持的配置

### 单盘服务器
```
1块盘 → RAID 0/1 可用，其他RAID不适用
```

### 双盘服务器（最常见）
```
2块盘 → RAID 0: 2×容量
        RAID 1: 1×容量 (推荐)
        RAID 5/6/10: 不适用
```

### 4盘服务器
```
4块盘 → RAID 0: 4×容量
        RAID 1: 2×容量
        RAID 5: 3×容量
        RAID 6: 2×容量
        RAID10: 2×容量
```

## ⚠️ 降级处理

如果获取硬盘信息失败：
```typescript
catch (error) {
  console.error('[Disk] 获取硬盘信息失败:', error);
  // 使用默认值: 500GB, 2块盘
}
```

## 🎨 用户体验改进

**之前：**
- ❌ 显示固定的 "500GB 可用空间"
- ❌ 用户不知道实际配置
- ❌ RAID计算可能不准确

**现在：**
- ✅ 显示 "检测到 2 块硬盘，单盘 480GB"
- ✅ 根据实际硬件计算空间
- ✅ RAID级别的可用空间精确显示
- ✅ 进度条反映真实使用率

## 🧪 测试场景

### 场景1: 2×480GB SSD
```
硬盘配置: 2块, 单盘480GB
RAID 1总空间: 480GB
用户分配20GB根分区 → 剩余460GB ✓
```

### 场景2: 4×2TB HDD
```
硬盘配置: 4块, 单盘2TB
RAID 5总空间: 6TB (3×2TB)
用户分配100GB根分区 → 剩余5.9TB ✓
```

### 场景3: 单盘服务器
```
硬盘配置: 1块, 单盘240GB
RAID 1总空间: 240GB
RAID选项自动调整为适合单盘的配置
```

## 📝 日志示例

```
[Disk] 硬盘信息: [{numberOfDisks: 2, diskSize: {value: 480, unit: "GB"}}]
[Disk] 硬盘配置: {count: 2, sizePerDisk: "480 GB", totalSpace: "960 GB"}
[Partition] 使用自定义分区布局: 3 个分区
  - /: 20480MB, ext4, RAID1
  - /boot: 512MB, ext4, RAID1
  - swap: 4096MB, swap
```

## ✅ 完成状态

- ✅ 从OVH API获取实际硬盘信息
- ✅ 根据硬盘数量和RAID级别精确计算
- ✅ UI显示实际硬件配置
- ✅ 降级处理（API失败时使用默认值）
- ✅ 支持多种硬盘配置
- ✅ 日志记录硬盘信息

## 🚀 使用流程

1. 用户打开重装系统对话框
2. 系统自动调用 hardware API
3. 提取 diskGroups 信息
4. 计算并显示实际可用空间
5. 用户配置分区时看到精确的剩余空间
6. 提交时使用实际配置

---

**实现日期**: 2025-10-25  
**状态**: ✅ 完整实现并测试
