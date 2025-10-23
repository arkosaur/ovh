# 配置绑定狙击系统 - 实施完成文档

## 📋 实施概览

已完成**配置绑定狙击系统**的完整集成，这是一个基于 API1 型号、配置选择、API2 精准匹配的智能监控下单系统。

---

## 🎯 核心功能

### 1. 智能配置绑定
- 用户输入 API1 型号（如 `24ska01`、`26sklea01-v1`）
- 系统自动查询该型号的所有可用配置组合
- 用户选择并绑定特定配置（内存 + 存储）
- 系统用绑定配置去 API2 中精准匹配真实 planCode

### 2. 双状态监控机制

**已匹配任务** (`matched`)：
- 系统每 60 秒检查 API1 可用性
- 只关注绑定的配置（配置指纹匹配）
- 接受所有非 `unavailable` 的状态（`1H-low`、`1H-high`、`72H`、`240H`、`480H`）
- 发现可用立即添加到购买队列

**待匹配任务** (`pending_match`)：
- 配置在 API2 中暂未发布
- 系统每 60 秒轮询 API2，尝试匹配
- 一旦匹配成功，自动转为已匹配任务
- 继续监控并自动下单

### 3. 自动下单流程
1. 监控线程发现匹配的可用配置
2. 使用 API2 的 planCode 创建购买队列任务
3. 复用现有的 `purchase_server()` 函数
4. 自动处理下单流程
5. Telegram 通知用户

---

## 📁 文件清单

### 后端文件

#### `backend/app.py`（新增内容）
**全局变量**：
- `config_sniper_tasks = []` - 存储所有配置绑定任务
- `config_sniper_running = False` - 监控线程状态标志

**核心函数**：
```python
standardize_config(config_str)               # 标准化配置字符串
find_matching_api2_plans(config_fingerprint) # 在 API2 中匹配
format_memory_display(memory_code)           # 格式化内存显示
format_storage_display(storage_code)         # 格式化存储显示
config_sniper_monitor_loop()                 # 60秒轮询主循环
handle_pending_match_task(task)              # 处理待匹配任务
handle_matched_task(task)                    # 处理已匹配任务
start_config_sniper_monitor()                # 启动监控线程
save_config_sniper_tasks()                   # 保存任务到文件
```

**API 接口**：
```
GET    /api/config-sniper/options/<planCode>  # 获取配置选项
GET    /api/config-sniper/tasks                # 获取所有任务
POST   /api/config-sniper/tasks                # 创建任务
DELETE /api/config-sniper/tasks/<id>          # 删除任务
PUT    /api/config-sniper/tasks/<id>/toggle   # 启用/禁用
POST   /api/config-sniper/tasks/<id>/check    # 手动检查
```

#### `backend/data/config_sniper_tasks.json`（自动创建）
存储所有配置绑定狙击任务的数据文件。

---

### 前端文件

#### `src/pages/ConfigSniperPage.tsx`（新建）
完整的配置绑定狙击页面，包含三个步骤：
1. **步骤 1**: 输入型号代码
2. **步骤 2**: 选择配置组合
3. **步骤 3**: 任务列表管理

**主要功能**：
- 查询配置选项
- 可视化配置选择
- 显示 API2 匹配状态
- 任务管理（启用/禁用/删除/立即检查）
- 实时状态刷新（30秒自动刷新）

#### `src/App.tsx`（修改）
**新增路由**：
```tsx
<Route path="config-sniper" element={<ConfigSniperPage />} />
```

#### `src/components/Sidebar.tsx`（修改）
**新增菜单项**：
```tsx
{ path: "/config-sniper", icon: "target", label: "配置绑定狙击" }
```

**新增图标**：靶心图标（三个同心圆）

---

## 🔄 完整工作流程

### 用户操作流程

```
1. 用户进入"配置绑定狙击"页面
       ↓
2. 输入 API1 型号（如 24ska01）
       ↓
3. 点击"查询配置"
       ↓
4. 系统显示所有可用配置组合
   - 显示内存和存储配置
   - 显示可用机房和状态
   - 显示是否能在 API2 匹配
       ↓
5. 用户选择一个配置并点击"创建监控任务"
       ↓
6. 系统尝试在 API2 中匹配
   ├─ 匹配成功：创建"已匹配"任务
   └─ 匹配失败：创建"待匹配"任务
       ↓
7. 任务开始 60 秒轮询监控
       ↓
8. 发现可用 → 自动加入购买队列 → 自动下单
```

### 后端监控流程

```
config_sniper_monitor_loop() 每 60 秒执行：
    ↓
遍历所有启用的任务
    ↓
对于每个任务：
    ├─ 待匹配任务：
    │   ├─ 尝试在 API2 中匹配
    │   ├─ 匹配成功 → 转为已匹配 → 继续检查可用性
    │   └─ 匹配失败 → 继续等待
    │
    └─ 已匹配任务：
        ├─ 查询 API1 当前可用性
        ├─ 验证配置是否匹配（配置指纹）
        ├─ 检查数据中心状态
        ├─ 状态非 unavailable？
        │   ├─ YES：找到对应 API2 planCode
        │   ├─ 添加到购买队列
        │   ├─ 发送 Telegram 通知
        │   └─ 队列处理器自动下单
        │   
        └─ NO：继续监控
```

---

## 💾 数据结构

### 配置绑定任务结构
```json
{
  "id": "uuid",
  "api1_planCode": "24ska01",
  "bound_config": {
    "memory": "ram-128g-ecc-2133",
    "storage": "softraid-2x480ssd"
  },
  "match_status": "matched",  // or "pending_match"
  "matched_api2": [
    {
      "planCode": "24ska01-128-gra",
      "datacenter": "gra"
    }
  ],
  "enabled": true,
  "last_check": "2025-10-23T08:30:00",
  "created_at": "2025-10-23T08:25:00"
}
```

---

## 🔧 配置指纹匹配算法

### 标准化规则
```python
def standardize_config(config_str):
    # 1. 转为小写
    # 2. 移除产品编号后缀（如 -26sklea01、-24ska01）
    # 3. 移除版本号后缀（如 -v1）
    # 4. 移除机房代码后缀（如 -gra）
    
    # 示例：
    # "ram-128g-ecc-4800-26sklea01" → "ram-128g-ecc-4800"
    # "softraid-2x960nvme-26sklea01" → "softraid-2x960nvme"
```

### 匹配逻辑
```python
# 生成配置指纹（元组）
config_fingerprint = (
    standardize_config(api1_memory),
    standardize_config(api1_storage)
)

# 在 API2 中查找匹配
for plan in api2_catalog['plans']:
    for family in plan['addonFamilies']:
        if family['name'] == 'memory':
            api2_memory = standardize_config(family['default'])
        if family['name'] == 'storage':
            api2_storage = standardize_config(family['default'])
    
    if (api2_memory, api2_storage) == config_fingerprint:
        # 匹配成功！
        return plan['planCode']
```

---

## 🚀 启动说明

### 自动启动
系统启动时会自动：
1. 加载保存的配置绑定任务（`config_sniper_tasks.json`）
2. 启动配置绑定狙击监控线程
3. 开始 60 秒轮询

### 手动操作
- **访问页面**：`http://localhost:8080/config-sniper`
- **创建任务**：输入型号 → 选择配置 → 创建
- **管理任务**：查看任务列表，启用/禁用/删除/立即检查

---

## ⚠️ 重要特性

### 1. 配置精准匹配
- **问题**：同一型号可能有多种配置（不同内存、存储组合）
- **解决**：用户明确绑定配置，系统只监控该配置
- **优势**：避免下错单，100% 确保是用户想要的配置

### 2. 待匹配机制
- **问题**：新型号在 API2 中可能暂未发布
- **解决**：创建待匹配任务，持续轮询直到匹配成功
- **优势**：提前布局，第一时间抢购新型号

### 3. 可用性宽松判断
- **接受状态**：`1H-low`、`1H-high`、`72H`、`240H`、`480H`
- **拒绝状态**：`unavailable`、`unknown`
- **优势**：最大化抢购机会，不错过任何可能

### 4. 复用现有队列
- **无需重复开发**：直接使用现有的 `purchase_server()` 函数
- **统一管理**：所有订单都在购买队列中处理
- **可靠性高**：经过验证的下单流程

---

## 📊 与原有狙击系统对比

| 维度 | 原有系统（AutoSniper） | 配置绑定系统（ConfigSniper） |
|------|----------------------|----------------------------|
| **输入方式** | 直接输入 API1 planCode | 输入 API1 planCode → 选择配置 |
| **配置控制** | 无法指定配置 | 精准绑定配置 |
| **匹配逻辑** | 简单匹配 | 配置指纹匹配 |
| **待匹配** | 不支持 | 支持（60秒轮询） |
| **适用场景** | 已知型号，不关心配置 | 精准配置要求 |

---

## 🎉 实施完成清单

- ✅ 后端配置绑定狙击系统
  - ✅ 配置标准化算法
  - ✅ API2 匹配逻辑
  - ✅ 60秒监控循环
  - ✅ 待匹配任务处理
  - ✅ 已匹配任务处理
  - ✅ 自动加入购买队列
  - ✅ 6个 API 接口

- ✅ 前端配置绑定狙击页面
  - ✅ 三步骤流程设计
  - ✅ 配置可视化选择
  - ✅ 任务列表管理
  - ✅ 实时状态刷新
  - ✅ 响应式设计

- ✅ 系统集成
  - ✅ 路由配置
  - ✅ 侧边栏菜单
  - ✅ API 认证集成
  - ✅ 数据持久化

---

## 📝 使用示例

### 示例 1：监控 24ska01 的 128GB 配置

```
1. 输入型号：24ska01
2. 查询得到 3 种配置：
   - 64GB RAM + 2x480GB SSD
   - 128GB RAM + 2x480GB SSD  ← 选择这个
   - 128GB RAM + 2x960GB SSD

3. 点击创建监控任务
4. 系统在 API2 中匹配成功
5. 开始监控，一旦 gra/rbx 等机房可用，自动下单
```

### 示例 2：监控未发布的 26sklea01-v1

```
1. 输入型号：26sklea01-v1
2. 查询得到配置（如果 API1 中已存在）
3. 选择配置并创建任务
4. 系统尝试匹配 API2 → 失败（未发布）
5. 创建"待匹配"任务
6. 系统每 60 秒检查 API2
7. 一旦 OVH 在 API2 中发布该型号
8. 自动匹配成功 → 转为已匹配 → 开始监控
9. 发现可用 → 自动下单
```

---

## 🔐 安全性

- ✅ 所有 API 请求经过密钥验证（复用 apiClient）
- ✅ 时间戳防重放攻击
- ✅ 任务数据持久化存储
- ✅ Telegram 通知关键事件

---

## 🚀 下一步建议

1. **性能优化**：
   - API2 响应较慢时，考虑缓存产品目录（定期刷新）
   - 预计算配置指纹索引，加快匹配速度

2. **功能增强**：
   - 支持批量创建任务（一次监控多个配置）
   - 支持配置优先级（优先监控某些配置）
   - 支持机房黑白名单

3. **用户体验**：
   - 添加匹配成功率预测
   - 显示配置价格差异（如果 API 提供）
   - 添加配置对比功能

---

**实施日期**：2025-10-23  
**实施状态**：✅ 完成  
**测试状态**：⏳ 待测试

---

## 测试建议

1. **基础功能测试**：
   - 输入已存在的型号（如 24ska01）
   - 查看配置选项是否正确显示
   - 创建任务并验证保存

2. **匹配测试**：
   - 选择已知能匹配的配置
   - 验证是否创建"已匹配"任务
   - 检查 matched_api2 数组是否正确

3. **监控测试**：
   - 等待 60 秒观察日志
   - 验证是否正确检查可用性
   - 验证是否正确添加到购买队列

4. **待匹配测试**：
   - 创建一个不存在的配置任务
   - 验证是否创建"待匹配"任务
   - 观察是否持续轮询

---

**文档版本**：1.0  
**最后更新**：2025-10-23 08:47
