# 💾 硬盘数量选择功能 - 完成

## 🎯 功能说明

根据OVH官方界面设计，用户可以选择使用几块硬盘进行安装，系统会根据选择的硬盘数量自动计算可用空间。

## 📸 OVH官方界面参考

```
Disks used for this installation: [2 ▼] SSD
Total space: 894.1 GiB
Space remaining: 0.0 MiB
```

## ✅ 实现功能

### 1. 硬盘数量选择

**UI显示：**
```
┌────────────────────────────────────────┐
│ 💾 检测到 2 块硬盘，每块 480.0 GB     │
│                                        │
│ 使用硬盘数量: [2 ▼]  总空间: 960GB   │  ← 可选择1或2
│ ───────────────────────────────────────│
│ 总可用空间 (RAID1): 480.0 GB          │  ← 根据选择自动计算
│ 已分配空间:         24.5 GB           │
│ 剩余空间:          455.5 GB ✓         │
└────────────────────────────────────────┘
```

### 2. 智能空间计算

**根据选择的硬盘数量和RAID级别：**

#### 选择1块硬盘
```
1块 × 480GB = 480GB (无RAID)
```

#### 选择2块硬盘
```
RAID 0: 2 × 480GB = 960GB
RAID 1: 1 × 480GB = 480GB (镜像)
```

#### 选择4块硬盘
```
RAID 0: 4 × 480GB = 1920GB
RAID 1: 2 × 480GB = 960GB (镜像对)
RAID 5: 3 × 480GB = 1440GB (n-1块)
RAID 6: 2 × 480GB = 960GB (n-2块)
RAID10: 2 × 480GB = 960GB (一半)
```

## 🔧 技术实现

### 前端

**1. 状态管理：**
```typescript
const [selectedDiskCount, setSelectedDiskCount] = useState<number>(2);
```

**2. UI组件：**
```tsx
<select
  value={selectedDiskCount}
  onChange={(e) => setSelectedDiskCount(parseInt(e.target.value))}>
  {Array.from({ length: diskInfo.count }, (_, i) => i + 1).map(num => (
    <option key={num} value={num}>{num}</option>
  ))}
</select>
```

**3. 空间计算：**
```typescript
const calculateAvailableSpace = (raidLevel: number): number => {
  const usedDiskCount = selectedDiskCount;
  const { sizePerDisk } = diskInfo;
  
  if (usedDiskCount === 1) {
    return sizePerDisk; // 单盘无RAID
  }
  
  switch (raidLevel) {
    case 0: return usedDiskCount * sizePerDisk;
    case 1: return sizePerDisk;
    case 5: return (usedDiskCount - 1) * sizePerDisk;
    // ... 其他RAID级别
  }
};
```

**4. 提交数据：**
```typescript
installData.diskCount = selectedDiskCount; // 发送到后端
```

### 后端

**接收并处理：**
```python
disk_count = data.get('diskCount', 2)
add_log("INFO", f"使用 {disk_count} 块硬盘", "server_control")

install_params['storage'] = [{
    'diskGroupId': 0,
    'numberOfDisks': disk_count,  # OVH API参数
    'partitioning': [{ 'layout': custom_layout }]
}]
```

**日志输出：**
```
使用自定义分区布局: 3 个分区, 使用 2 块硬盘
  - /: 20480MB, ext4, RAID1
  - /boot: 512MB, ext4, RAID1
  - swap: 4096MB, swap
```

## 🎨 用户体验

### 场景1: 单盘服务器
```
检测到 1 块硬盘，每块 240GB
使用硬盘数量: [1]  (唯一选项)
总空间: 240GB
可用空间: 240GB (无RAID)
```

### 场景2: 双盘服务器
```
检测到 2 块硬盘，每块 480GB
使用硬盘数量: [1 ▼] [2 ▼]  可选择
选择 1块: 480GB可用
选择 2块: RAID1 → 480GB可用
         RAID0 → 960GB可用
```

### 场景3: 四盘服务器
```
检测到 4 块硬盘，每块 2TB
使用硬盘数量: [1 ▼] [2 ▼] [3 ▼] [4 ▼]
选择 4块: RAID5 → 6TB可用 (3×2TB)
```

## 📋 OVH API 参数

**发送到OVH的storage结构：**
```json
{
  "storage": [{
    "diskGroupId": 0,
    "numberOfDisks": 2,  // ← 用户选择的硬盘数量
    "partitioning": [{
      "layout": [
        {
          "mountPoint": "/",
          "fileSystem": "ext4",
          "size": 20480,
          "raidLevel": 1,
          "order": 1,
          "type": "primary"
        }
      ]
    }]
  }]
}
```

## ⚠️ 注意事项

1. **单盘限制**：选择1块硬盘时，不支持RAID（RAID需要至少2块盘）
2. **RAID限制**：
   - RAID 5需要至少3块盘
   - RAID 6需要至少4块盘
   - RAID 10需要至少4块盘（且必须是偶数）
3. **默认值**：自动设置为服务器的实际硬盘数量

## 🧪 测试场景

### 测试1: 选择不同硬盘数量
- [x] 2块硬盘服务器
- [x] 选择1块 → 480GB可用
- [x] 选择2块 → RAID1=480GB, RAID0=960GB
- [x] 切换选择 → 空间实时更新

### 测试2: 空间计算验证
- [x] 分区总大小超过可用空间 → 显示警告
- [x] size=0的分区显示实际剩余空间
- [x] 进度条正确反映使用率

### 测试3: 提交验证
- [x] 后端接收到diskCount参数
- [x] OVH API收到numberOfDisks
- [x] 日志记录正确的硬盘数量

## ✅ 完成状态

- ✅ 前端UI：硬盘数量选择器
- ✅ 前端逻辑：空间动态计算
- ✅ 后端处理：diskCount参数
- ✅ OVH API：numberOfDisks字段
- ✅ 日志记录：显示硬盘数量
- ✅ 用户体验：实时更新反馈

## 🚀 使用流程

1. 打开重装系统对话框
2. 选择"完全自定义分区"
3. 系统自动检测硬盘（如：2块×480GB）
4. **用户选择使用几块硬盘** ← 新功能
5. 系统根据选择计算可用空间
6. 配置分区并提交
7. 后端发送numberOfDisks到OVH

---

**实现日期**: 2025-10-25  
**参考**: OVH官方界面设计  
**状态**: ✅ 完整实现并与OVH接口对齐
