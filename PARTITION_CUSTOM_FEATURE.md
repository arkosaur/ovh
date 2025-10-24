# 自定义分区配置功能设计

## 🎯 功能目标

用户可以选择：
1. **使用预定义方案** - 选择模板自带的分区方案（如"default"）
2. **完全自定义分区** - 手动配置每个分区的挂载点、大小、文件系统等

## 📋 OVH API 支持

### 选项1: 使用预定义方案
```json
{
  "storage": [{
    "diskGroupId": 0,
    "partitioning": [{
      "schemeName": "default"
    }]
  }]
}
```

### 选项2: 自定义分区布局
```json
{
  "storage": [{
    "diskGroupId": 0,
    "partitioning": [{
      "layout": [
        {
          "mountPoint": "/",
          "fileSystem": "ext4",
          "size": 20480,        // MB, 0 = 使用剩余空间
          "raidLevel": 1,       // 可选
          "order": 1,
          "type": "primary"
        }
      ]
    }]
  }]
}
```

## 🎨 UI设计

### 分区配置模式选择
```
[ ] 使用默认分区（推荐）
[ ] 使用预定义方案
    └─ 下拉选择: default (3个分区)
[ ] 完全自定义分区（高级）
    └─ 分区编辑器
```

### 自定义分区编辑器

```
┌─ 分区配置 ────────────────────────────────┐
│                                            │
│  分区 1 - 根分区                     [删除] │
│  挂载点: [/          ▼]                    │
│  文件系统: [ext4      ▼]                   │
│  大小: [20480] MB  ( 0 = 使用剩余空间 )     │
│  RAID级别: [1        ▼]                    │
│  类型: [primary    ▼]                      │
│                                            │
├────────────────────────────────────────────┤
│  分区 2 - Boot分区                   [删除] │
│  挂载点: [/boot      ▼]                    │
│  文件系统: [ext4      ▼]                   │
│  大小: [512] MB                            │
│  ...                                       │
├────────────────────────────────────────────┤
│                                            │
│  [+ 添加分区]                              │
│                                            │
└────────────────────────────────────────────┘
```

## 🔧 实现步骤

### 前端实现

#### 1. 添加分区模式状态
```typescript
type PartitionMode = 'default' | 'scheme' | 'custom';
const [partitionMode, setPartitionMode] = useState<PartitionMode>('default');
const [customLayout, setCustomLayout] = useState<PartitionLayout[]>([]);
```

#### 2. 分区配置类型
```typescript
interface PartitionLayout {
  mountPoint: string;
  fileSystem: string;
  size: number;         // MB
  raidLevel?: number;
  order: number;
  type: string;
}
```

#### 3. UI组件
- 模式选择Radio按钮
- 预定义方案下拉框
- 自定义分区编辑器（添加/编辑/删除分区）

### 后端实现

#### 修改安装API接收参数
```python
# backend/app.py
data = request.json
partition_mode = data.get('partitionMode')  # 'default', 'scheme', 'custom'

if partition_mode == 'scheme':
    # 使用预定义方案
    install_params['storage'] = [{
        'diskGroupId': 0,
        'partitioning': [{
            'schemeName': data['partitionSchemeName']
        }]
    }]
elif partition_mode == 'custom':
    # 使用自定义布局
    install_params['storage'] = [{
        'diskGroupId': 0,
        'partitioning': [{
            'layout': data['customLayout']  # 分区数组
        }]
    }]
# else: 默认，不传storage参数
```

## 📝 字段选项

### 文件系统 (fileSystem)
- ext3, ext4
- xfs, btrfs
- swap
- ntfs (Windows)
- fat16
- vmfs5, vmfs6 (VMware)
- zfs

### RAID级别 (raidLevel)
- 0 - 条带化（无冗余）
- 1 - 镜像（推荐）
- 5 - 分布式奇偶校验
- 6 - 双重奇偶校验
- 7, 10 - 其他级别

### 挂载点 (mountPoint)
- / (根分区，必需)
- /boot (引导分区)
- /home (用户目录)
- /var (变量数据)
- /tmp (临时文件)
- swap (交换空间)

### 分区类型 (type)
- primary (主分区)
- logical (逻辑分区)

## ⚠️ 验证规则

1. **必须有根分区** - mountPoint = "/"
2. **分区大小合理** - 总和不超过磁盘容量
3. **至少一个分区** - 不能为空
4. **挂载点唯一** - 不能重复（除swap外）
5. **大小为0只能有1个** - 表示使用剩余空间

## 🎯 推荐的预设分区方案

### 标准Linux服务器
```
/ (ext4, 20GB, RAID1)
/boot (ext4, 512MB, RAID1)
swap (swap, 4GB, RAID1)
```

### 大数据服务器
```
/ (ext4, 50GB, RAID1)
/boot (ext4, 512MB, RAID1)
/var (ext4, 100GB, RAID5)
/home (xfs, 剩余空间, RAID5)
swap (swap, 16GB, RAID1)
```

## 🚀 实施优先级

**Phase 1 (当前):**
- ✅ 使用默认分区
- ✅ 选择预定义方案

**Phase 2 (下一步):**
- ⏳ 自定义分区编辑器UI
- ⏳ 前端验证逻辑
- ⏳ 后端接收自定义布局

**Phase 3 (未来):**
- ⏳ 预设方案模板
- ⏳ 分区大小计算器
- ⏳ 高级选项（LVM, ZFS等）
