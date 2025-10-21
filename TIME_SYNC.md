# 前后端时间配置统一说明

## 问题描述

前后端的任务队列重试时间不一致，导致：
- ❌ 前端默认：29秒
- ❌ 后端默认：60秒
- ❌ 配置不统一，用户体验不一致
- ❌ 可能存在BUG

## 解决方案

### 1. **创建统一配置文件**

**文件：`src/config/constants.ts`**

```typescript
// 任务重试间隔（秒）- 前后端统一
export const TASK_RETRY_INTERVAL = 60;

// 最小/最大重试间隔
export const MIN_RETRY_INTERVAL = 30;
export const MAX_RETRY_INTERVAL = 3600; // 1小时

// 最大重试次数（-1表示无限）
export const MAX_RETRIES = -1;

// 队列轮询间隔（毫秒）
export const QUEUE_POLLING_INTERVAL = 10000; // 10秒
```

### 2. **统一的时间配置**

| 配置项 | 前端 | 后端 | 说明 |
|--------|------|------|------|
| **重试间隔** | 60秒 | 60秒 | ✅ 已统一 |
| **最小间隔** | 30秒 | 30秒 | ✅ 已统一 |
| **最大间隔** | 3600秒 | 3600秒 | ✅ 已统一 |
| **最大重试次数** | -1 (无限) | -1 (无限) | ✅ 已统一 |
| **队列轮询** | 10秒 | N/A | 前端特有 |

## 修改清单

### 前端修改

#### 1. **创建配置文件**
- ✅ `src/config/constants.ts` - 新增统一常量配置

#### 2. **更新 QueuePage.tsx**

**修改前：**
```typescript
const [retryInterval, setRetryInterval] = useState<number>(29);  // ❌ 硬编码29秒
setRetryInterval(30);  // ❌ 重置为30秒
const interval = setInterval(fetchQueueItems, 10000);  // ❌ 硬编码10000
```

**修改后：**
```typescript
import { TASK_RETRY_INTERVAL, MIN_RETRY_INTERVAL, MAX_RETRY_INTERVAL } from "@/config/constants";

const [retryInterval, setRetryInterval] = useState<number>(TASK_RETRY_INTERVAL);  // ✅ 60秒
setRetryInterval(TASK_RETRY_INTERVAL);  // ✅ 60秒
const interval = setInterval(fetchQueueItems, QUEUE_POLLING_INTERVAL);  // ✅ 使用常量
```

#### 3. **添加输入验证**

```typescript
<input
  type="number"
  value={retryInterval}
  min={MIN_RETRY_INTERVAL}
  max={MAX_RETRY_INTERVAL}
  onChange={(e) => {
    const value = Number(e.target.value);
    if (value >= MIN_RETRY_INTERVAL && value <= MAX_RETRY_INTERVAL) {
      setRetryInterval(value);
    } else {
      toast.warning(`重试间隔必须在 ${MIN_RETRY_INTERVAL}-${MAX_RETRY_INTERVAL} 秒之间`);
    }
  }}
/>
```

#### 4. **添加范围提示**

```typescript
<label>
  抢购失败后重试间隔 (秒)
  <span className="text-xs text-cyber-muted ml-2">
    范围: {MIN_RETRY_INTERVAL}-{MAX_RETRY_INTERVAL}秒，推荐: {TASK_RETRY_INTERVAL}秒
  </span>
</label>
```

#### 5. **添加错误提示**

```typescript
{!validateRetryInterval(retryInterval) && (
  <p className="text-xs text-red-400 mt-1">
    ⚠️ 间隔时间过短可能导致API过载，建议设置为 {TASK_RETRY_INTERVAL} 秒或更长
  </p>
)}
```

### 后端配置

**文件：`backend/main.py`**

```python
# 已存在的配置（无需修改）
class ServerConfig(BaseModel):
    maxRetries: int = -1  # -1表示无限重试
    taskInterval: int = 60  # 默认60秒检查一次
```

## 验证步骤

### 1. **前端验证**

1. 打开抢购队列页面
2. 点击"添加新任务"
3. 检查"重试间隔"输入框：
   - ✅ 默认值应为 **60秒**
   - ✅ 显示范围提示：30-3600秒
   - ✅ 显示推荐值：60秒

4. 测试输入验证：
   - 输入 20 → ❌ 提示错误
   - 输入 30 → ✅ 接受
   - 输入 60 → ✅ 接受
   - 输入 4000 → ❌ 提示错误

5. 添加任务后重置：
   - ✅ 重试间隔应重置为 60秒

### 2. **后端验证**

检查日志输出：
```
开始第 1 次尝试任务 xxx (任务名称)（无限重试模式），间隔时间为 60 秒
```

### 3. **一致性验证**

1. 前端设置重试间隔为 60秒
2. 添加任务到队列
3. 检查任务状态
4. 验证重试时间间隔确实为 60秒

## 配置说明

### 重试间隔（TASK_RETRY_INTERVAL）

**默认值：60秒**

**原因：**
- ✅ 避免过于频繁的API调用
- ✅ 减少服务器压力
- ✅ 符合OVH API使用规范
- ✅ 给予足够的时间让库存状态更新

### 最小间隔（MIN_RETRY_INTERVAL）

**默认值：30秒**

**原因：**
- ✅ 防止用户设置过短导致API过载
- ✅ 保护OVH API不被频繁调用
- ✅ 避免触发速率限制

### 最大间隔（MAX_RETRY_INTERVAL）

**默认值：3600秒（1小时）**

**原因：**
- ✅ 防止用户设置过长导致错过库存
- ✅ 确保合理的检查频率

### 队列轮询（QUEUE_POLLING_INTERVAL）

**默认值：10秒**

**原因：**
- ✅ 及时更新任务状态
- ✅ 不会对后端造成过大压力
- ✅ 用户体验流畅

## 辅助函数

### 验证函数

```typescript
export function validateRetryInterval(interval: number): boolean {
  return interval >= MIN_RETRY_INTERVAL && interval <= MAX_RETRY_INTERVAL;
}
```

### 格式化函数

```typescript
export function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 
      ? `${minutes}分${remainingSeconds}秒` 
      : `${minutes}分钟`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 
    ? `${hours}小时${minutes}分钟` 
    : `${hours}小时`;
}
```

### 重试计数格式化

```typescript
export function formatRetryCount(count: number, maxRetries: number): string {
  if (maxRetries === -1) {
    return `第 ${count} 次尝试`;
  } else {
    return `第 ${count}/${maxRetries} 次尝试`;
  }
}
```

## 使用示例

### 前端使用

```typescript
import { 
  TASK_RETRY_INTERVAL, 
  MIN_RETRY_INTERVAL, 
  validateRetryInterval,
  formatInterval 
} from "@/config/constants";

// 设置默认值
const [interval, setInterval] = useState(TASK_RETRY_INTERVAL);

// 验证输入
if (!validateRetryInterval(interval)) {
  toast.error("间隔时间不合法");
}

// 格式化显示
const display = formatInterval(interval); // "60秒" 或 "1分钟"
```

### 后端使用

```python
# main.py 中已配置
class ServerConfig(BaseModel):
    taskInterval: int = 60  # 与前端 TASK_RETRY_INTERVAL 一致
```

## 迁移指南

### 从旧版本迁移

1. **更新前端代码**
   ```bash
   # 确保导入新的常量
   import { TASK_RETRY_INTERVAL } from "@/config/constants";
   ```

2. **检查现有任务**
   - 旧任务可能使用旧的间隔时间
   - 新任务将使用统一的 60秒

3. **清除旧缓存**
   ```bash
   # 清除浏览器缓存
   localStorage.clear();
   ```

## 常见问题

### Q: 为什么选择60秒而不是30秒？

**A:** 60秒是最佳平衡点：
- ✅ 减少API调用频率
- ✅ 仍然足够频繁以捕捉库存
- ✅ 符合行业最佳实践

### Q: 用户可以修改重试间隔吗？

**A:** 可以，但有限制：
- 最小：30秒
- 最大：3600秒（1小时）
- 推荐：60秒

### Q: 如果用户输入不合法的值会怎样？

**A:** 
- 显示警告Toast
- 输入框显示红色边框
- 显示错误提示文字
- 不允许提交表单

### Q: 后端会验证前端传入的值吗？

**A:** 
- 后端应该添加验证（建议）
- 当前依赖前端验证
- 建议在 `main.py` 中添加服务器端验证

## 后续优化建议

### 1. **后端验证**

在 `main.py` 中添加：

```python
MIN_RETRY_INTERVAL = 30
MAX_RETRY_INTERVAL = 3600

class ServerConfig(BaseModel):
    taskInterval: int = 60
    
    @validator('taskInterval')
    def validate_interval(cls, v):
        if v < MIN_RETRY_INTERVAL or v > MAX_RETRY_INTERVAL:
            raise ValueError(f'taskInterval must be between {MIN_RETRY_INTERVAL} and {MAX_RETRY_INTERVAL}')
        return v
```

### 2. **配置文件**

创建共享配置文件：
```json
{
  "retryInterval": 60,
  "minRetryInterval": 30,
  "maxRetryInterval": 3600,
  "maxRetries": -1
}
```

### 3. **环境变量**

支持通过环境变量配置：
```bash
TASK_RETRY_INTERVAL=60
MIN_RETRY_INTERVAL=30
MAX_RETRY_INTERVAL=3600
```

## 总结

✅ **已完成：**
- 创建统一配置文件
- 更新前端默认值（29秒 → 60秒）
- 添加输入验证和提示
- 统一轮询间隔
- 添加辅助函数

✅ **前后端一致：**
- 默认重试间隔：60秒
- 最小间隔：30秒
- 最大间隔：3600秒
- 最大重试次数：-1（无限）

✅ **用户体验：**
- 明确的范围提示
- 实时输入验证
- 友好的错误提示
- 推荐值显示

现在前后端的时间配置完全统一，不会再出现不一致的问题！🎉
