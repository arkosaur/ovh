# API 配置统一化

## 问题

之前每个文件都单独定义 API_URL：

```typescript
// Dashboard.tsx
const API_URL = 'http://localhost:5000/api';

// ServersPage.tsx
const API_URL = 'http://localhost:5000/api';

// LogsPage.tsx
const API_URL = 'http://localhost:5000/api';

// ... 其他文件
```

**问题：**
- ❌ 配置分散在多个文件
- ❌ 修改需要更新所有文件
- ❌ 容易遗漏某些文件
- ❌ 不同环境（开发/生产）切换困难

## 解决方案

### 1. 统一配置文件

**位置：** `src/config/constants.ts`

```typescript
/**
 * 后端API地址
 */
export const API_URL = 'http://localhost:5000/api';

/**
 * API请求重试次数
 */
export const API_RETRY_COUNT = 1;

/**
 * API请求超时时间（毫秒）
 */
export const API_TIMEOUT = 30000;
```

### 2. 所有文件统一导入

```typescript
// ✅ 正确做法
import { API_URL } from "@/config/constants";

// ❌ 错误做法
const API_URL = 'http://localhost:5000/api';
```

### 3. 已更新的文件

✅ `src/pages/Dashboard.tsx`
✅ `src/pages/ServersPage.tsx`
✅ `src/pages/LogsPage.tsx`
✅ `src/pages/HistoryPage.tsx`
✅ `src/context/APIContext.tsx`
✅ `src/components/CacheManager.tsx`

## 使用方法

### 开发环境

保持默认配置：
```typescript
export const API_URL = 'http://localhost:5000/api';
```

### 生产环境

方式 1：直接修改 `constants.ts`
```typescript
export const API_URL = 'https://your-production-api.com/api';
```

方式 2：使用环境变量（推荐）
```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

然后在项目根目录创建 `.env` 文件：
```env
# .env.development
VITE_API_URL=http://localhost:5000/api

# .env.production
VITE_API_URL=https://your-production-api.com/api
```

### 方式 3：动态配置（高级）

在 `constants.ts` 中：
```typescript
// 根据环境自动选择
export const API_URL = 
  import.meta.env.MODE === 'production'
    ? 'https://api.production.com/api'
    : 'http://localhost:5000/api';
```

## 优势

### ✅ 集中管理
- 所有配置在一个文件中
- 一次修改，全局生效

### ✅ 环境切换
- 轻松切换开发/生产环境
- 支持环境变量配置

### ✅ 类型安全
- TypeScript 类型检查
- IDE 自动补全

### ✅ 易于维护
- 修改方便
- 不会遗漏文件

## 其他可统一的配置

### 缓存配置
```typescript
// src/config/constants.ts
export const CACHE_KEY = 'ovh-servers-cache';
export const CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2小时
```

### WebSocket 配置
```typescript
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
```

### 轮询间隔
```typescript
export const POLLING_INTERVAL = 5000; // 5秒
export const QUEUE_CHECK_INTERVAL = 3000; // 3秒
```

### API 端点
```typescript
export const API_ENDPOINTS = {
  servers: `${API_URL}/servers`,
  queue: `${API_URL}/queue`,
  availability: `${API_URL}/availability`,
  logs: `${API_URL}/logs`,
  history: `${API_URL}/history`,
  cache: `${API_URL}/cache`,
  stats: `${API_URL}/stats`,
} as const;
```

使用示例：
```typescript
import { API_ENDPOINTS } from "@/config/constants";

const response = await axios.get(API_ENDPOINTS.servers);
```

## 环境变量完整示例

### 1. 安装 Vite 类型支持

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 2. 创建环境文件

```env
# .env.development
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
VITE_APP_TITLE=OVH幻影狙击手 (开发)

# .env.production
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com
VITE_APP_TITLE=OVH幻影狙击手

# .env.staging
VITE_API_URL=https://api-staging.yourdomain.com/api
VITE_WS_URL=wss://api-staging.yourdomain.com
VITE_APP_TITLE=OVH幻影狙击手 (测试)
```

### 3. 更新 constants.ts

```typescript
// src/config/constants.ts

/**
 * 后端API地址
 * 优先使用环境变量，否则使用默认值
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * WebSocket地址
 */
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

/**
 * 应用标题
 */
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'OVH幻影狙击手';

/**
 * 是否为生产环境
 */
export const IS_PRODUCTION = import.meta.env.MODE === 'production';

/**
 * 是否启用调试模式
 */
export const DEBUG_MODE = !IS_PRODUCTION;
```

### 4. 构建命令

```json
{
  "scripts": {
    "dev": "vite --mode development",
    "build": "vite build --mode production",
    "build:staging": "vite build --mode staging",
    "preview": "vite preview"
  }
}
```

## 安全注意事项

### ⚠️ 不要提交敏感信息

```gitignore
# .gitignore
.env
.env.local
.env.*.local
.env.production
```

### ✅ 提交模板文件

```env
# .env.example
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
VITE_APP_TITLE=OVH幻影狙击手
```

## 验证配置

创建一个调试工具来验证配置：

```typescript
// src/utils/debugConfig.ts
import { API_URL, IS_PRODUCTION, DEBUG_MODE } from "@/config/constants";

export const logConfig = () => {
  if (DEBUG_MODE) {
    console.group('🔧 Configuration');
    console.log('API URL:', API_URL);
    console.log('Mode:', import.meta.env.MODE);
    console.log('Production:', IS_PRODUCTION);
    console.log('Debug:', DEBUG_MODE);
    console.groupEnd();
  }
};

// 在 App.tsx 中调用
// logConfig();
```

## 总结

✅ **已完成：** 所有文件统一使用 `@/config/constants` 中的 `API_URL`

✅ **优势：**
- 一处修改，全局生效
- 支持多环境配置
- 易于维护和扩展
- 类型安全

✅ **下一步（可选）：**
- 添加环境变量支持
- 创建更多统一配置
- 添加配置验证工具

现在你只需要修改 `src/config/constants.ts` 中的 `API_URL`，所有页面都会自动使用新的配置！🎉
