# 数据中心代码映射说明

## 问题说明

OVH API返回的数据中心代码与前端使用的代码不一致，需要进行映射。

## 正确的映射关系

### 孟买数据中心

| 位置 | 使用的代码 | 说明 |
|------|-----------|------|
| **前端服务器命名** | `-mum` | 例如：`24rise012-mum` |
| **前端数据中心列表** | `mum` | 显示为：MUM - 孟买 (印度) |
| **OVH API返回** | `ynm` | API实际返回的代码 |

### 映射逻辑

```typescript
// API返回：{ynm: "1H-high"}
// 映射后：{mum: "1H-high"}

const normalizedData: Record<string, string> = {};
Object.entries(response.data).forEach(([dc, status]) => {
  // 将ynm映射为mum（孟买的API代码是ynm，前端使用mum）
  const normalizedDc = dc === 'ynm' ? 'mum' : dc;
  normalizedData[normalizedDc] = status as string;
});
```

## 完整的数据中心列表

| 代码 | 名称 | 地区 | 国旗 | API返回 |
|------|------|------|------|---------|
| gra | 格拉夫尼茨 | 法国 | 🇫🇷 | gra |
| sbg | 斯特拉斯堡 | 法国 | 🇫🇷 | sbg |
| rbx | 鲁贝 | 法国 | 🇫🇷 | rbx |
| bhs | 博阿尔诺 | 加拿大 | 🇨🇦 | bhs |
| hil | 希尔斯伯勒 | 美国 | 🇺🇸 | hil |
| vin | 维也纳 | 美国 | 🇺🇸 | vin |
| sgp | 新加坡 | 新加坡 | 🇸🇬 | sgp |
| syd | 悉尼 | 澳大利亚 | 🇦🇺 | syd |
| **mum** | **孟买** | **印度** | **🇮🇳** | **ynm** ⚠️ 需要映射 |
| waw | 华沙 | 波兰 | 🇵🇱 | waw |
| fra | 法兰克福 | 德国 | 🇩🇪 | fra |
| lon | 伦敦 | 英国 | 🇬🇧 | lon |

## 修改的文件

### 1. `src/config/ovhConstants.ts`

```typescript
export const OVH_DATACENTERS: DatacenterInfo[] = [
  // ...
  { code: "mum", name: "孟买", region: "印度", flag: "🇮🇳", countryCode: "in" }, // ✅ 正确
  // ...
];
```

**错误示例：**
```typescript
{ code: "yum", ... } // ❌ 错误，应该是mum
```

### 2. `src/pages/ServersPage.tsx` - 可用性查询映射

```typescript
const checkAvailability = async (planCode: string) => {
  // ...
  const response = await axios.get(`${API_URL}/availability/${planCode}`);
  
  // 映射API代码到前端代码
  const normalizedData: Record<string, string> = {};
  Object.entries(response.data).forEach(([dc, status]) => {
    const normalizedDc = dc === 'ynm' ? 'mum' : dc; // ✅ ynm → mum
    normalizedData[normalizedDc] = status as string;
  });
  
  setAvailability(prev => ({
    ...prev,
    [planCode]: normalizedData
  }));
};
```

### 3. `src/pages/ServersPage.tsx` - 数据中心过滤

```typescript
OVH_DATACENTERS.filter(dc => {
  const planCodeLower = server.planCode.toLowerCase();
  
  if (planCodeLower.includes('-mum')) {
    return dc.code === 'mum'; // ✅ 正确
  }
  
  return true;
})
```

**错误示例：**
```typescript
if (planCodeLower.includes('-mum')) {
  return dc.code === 'yum'; // ❌ 错误
}
```

## 工作流程

### 1. 服务器命名
```
24rise012-mum  ← 前端服务器代码（使用mum后缀）
```

### 2. 数据中心过滤
```
planCode: "24rise012-mum"
  ↓ 检测到 -mum 后缀
  ↓ 只显示 code === 'mum' 的数据中心
  ↓
显示: MUM - 孟买 (印度)
```

### 3. 可用性查询
```
前端请求: GET /api/availability/24rise012-mum
  ↓
API响应: {ynm: "1H-high"}
  ↓ 映射: ynm → mum
  ↓
存储为: {mum: "1H-high"}
  ↓
显示: MUM 孟买 - 1H-high (绿色)
```

## 为什么需要映射？

1. **历史原因**：OVH API使用的是 `ynm` 作为孟买的代码
2. **前端统一**：前端使用更直观的 `mum` (Mumbai的缩写)
3. **服务器命名**：服务器型号使用 `-mum` 后缀（如 `24rise012-mum`）

## 测试验证

### 测试步骤
1. 搜索 `24rise012-mum`
2. 应该只显示 MUM（孟买）数据中心
3. 点击"检查可用性"
4. 控制台应显示：
   ```
   获取到 24rise012-mum 的可用性数据: {ynm: "1H-high"}
   标准化后的可用性数据: {mum: "1H-high"}
   ```
5. MUM数据中心应显示绿色的 `1H-high`

### 预期结果
✅ MUM显示为孟买
✅ 可用性状态正确着色
✅ 没有 YUM 的任何痕迹

## 注意事项

⚠️ **不要使用 `yum`**
- `yum` 不是有效的数据中心代码
- API返回的是 `ynm`
- 前端应该使用 `mum`

⚠️ **其他数据中心不需要映射**
- 只有孟买需要 `ynm → mum` 映射
- 其他数据中心前后端代码一致

## 总结

| 项目 | 值 |
|------|-----|
| 前端服务器后缀 | `-mum` |
| 前端数据中心代码 | `mum` |
| API返回代码 | `ynm` |
| 映射方向 | `ynm` → `mum` |
| 显示名称 | MUM - 孟买 (印度) 🇮🇳 |

**记住：前端始终使用 `mum`，API返回 `ynm`，需要映射！**
