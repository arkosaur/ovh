# 服务器控制中心使用指南

## 功能概述

服务器控制中心是一个用于管理您已购买的 OVH 独立服务器的控制面板。通过这个页面，您可以方便地查看服务器状态、执行重启、重装系统等操作。

## OVH API 端点说明

基于 OVH API 文档，以下是服务器控制功能使用的主要 API 端点：

### 1. 获取服务器列表
```
GET /dedicated/server
```
返回当前账户下所有独立服务器的服务名称列表。

### 2. 获取服务器详情
```
GET /dedicated/server/{serviceName}
```
获取指定服务器的详细信息，包括：
- 商业型号 (commercialRange)
- 数据中心位置 (datacenter)
- 服务器状态 (state)
- IP 地址 (ip)
- 操作系统 (os)
- 监控状态 (monitoring)

### 3. 重启服务器
```
POST /dedicated/server/{serviceName}/reboot
```
发送重启请求到指定服务器。

### 4. 获取可用系统模板
```
GET /dedicated/server/{serviceName}/install/compatibleTemplates
```
获取服务器兼容的操作系统模板列表。

### 5. 重装系统
```
POST /dedicated/server/{serviceName}/install/start
```
参数：
- `templateName`: 系统模板名称（必需）
- `customHostname`: 自定义主机名（可选）

### 6. 查看任务状态
```
GET /dedicated/server/{serviceName}/task
GET /dedicated/server/{serviceName}/task/{taskId}
```
查看服务器操作任务的执行状态。

## 功能特性

### ✅ 已实现功能

1. **服务器列表展示**
   - 显示所有已购买的服务器
   - 展示服务器名称、型号、数据中心、IP、系统等信息
   - 实时状态指示（运行中、错误、暂停等）

2. **重启服务器**
   - 一键重启服务器
   - 二次确认防止误操作
   - 实时反馈操作结果

3. **重装系统**
   - 查看服务器兼容的系统模板
   - 选择操作系统进行重装
   - 可设置自定义主机名
   - 警告提示防止数据丢失

4. **任务查看**
   - 查看最近 10 个操作任务
   - 显示任务类型、状态、时间等信息
   - 跟踪操作执行进度

## 后端实现

### API 路由

文件位置：`backend/app.py`

```python
# 获取服务器列表
GET /api/server-control/list

# 重启服务器
POST /api/server-control/{service_name}/reboot

# 获取系统模板
GET /api/server-control/{service_name}/templates

# 重装系统
POST /api/server-control/{service_name}/install

# 获取任务列表
GET /api/server-control/{service_name}/tasks
```

### 核心函数

1. **get_my_servers()** - 获取服务器列表
   - 调用 `/dedicated/server` 获取服务器名称
   - 遍历获取每台服务器的详细信息
   - 容错处理，即使部分服务器信息获取失败也不影响整体

2. **reboot_server()** - 重启服务器
   - 调用 `/dedicated/server/{serviceName}/reboot`
   - 记录操作日志

3. **get_os_templates()** - 获取系统模板
   - 获取兼容的系统模板列表
   - 查询每个模板的详细信息（限制前 20 个）

4. **install_os()** - 重装系统
   - 验证必需参数
   - 调用安装 API
   - 返回任务 ID

5. **get_server_tasks()** - 获取任务列表
   - 获取最近 10 个任务
   - 显示任务详情

## 前端实现

### 页面组件

文件位置：`src/pages/ServerControlPage.tsx`

#### 主要功能模块

1. **服务器列表表格**
   - 使用 shadcn/ui Table 组件
   - 响应式设计
   - 状态颜色标识

2. **重装系统对话框**
   - 系统模板选择器
   - 自定义主机名输入
   - 警告提示

3. **任务列表对话框**
   - 任务历史记录
   - 状态展示

#### 状态管理

```typescript
const [servers, setServers] = useState<ServerInfo[]>([]);
const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);
const [osTemplates, setOsTemplates] = useState<OSTemplate[]>([]);
const [serverTasks, setServerTasks] = useState<ServerTask[]>([]);
```

## 使用流程

### 1. 查看服务器列表

访问 `/server-control` 页面，系统会自动加载您账户下的所有服务器。

### 2. 重启服务器

1. 在服务器列表中找到目标服务器
2. 点击"重启"按钮
3. 确认操作
4. 等待操作完成

### 3. 重装系统

1. 点击目标服务器的"重装"按钮
2. 在弹出的对话框中选择系统模板
3. （可选）输入自定义主机名
4. 仔细阅读警告信息
5. 点击"确认重装"
6. 系统将开始重装过程

### 4. 查看任务

1. 点击服务器的"任务"按钮
2. 查看最近的操作历史
3. 了解任务执行状态

## 注意事项

⚠️ **重要提醒**

1. **重装系统会删除所有数据**
   - 重装前务必备份重要数据
   - 操作不可逆，请谨慎操作

2. **重启操作**
   - 重启会导致服务短暂中断
   - 建议在业务低峰期执行

3. **API 权限要求**
   - 需要 `/dedicated/server/*` 的完整权限
   - 在 OVH 控制台创建 API 凭证时确保勾选相关权限

4. **操作日志**
   - 所有操作都会记录在系统日志中
   - 可在"详细日志"页面查看

## 路由配置

- 路径：`/server-control`
- 导航：侧边栏"服务器控制"菜单项
- 图标：终端图标

## 技术栈

- **前端框架**: React + TypeScript
- **UI 组件**: shadcn/ui
- **动画**: Framer Motion
- **状态管理**: React Hooks
- **HTTP 客户端**: Axios (通过 apiClient)
- **后端**: Flask + Python OVH SDK

## 安全性

1. **API 密钥验证**
   - 所有请求都经过 API 密钥验证
   - 使用项目现有的 apiClient

2. **二次确认**
   - 危险操作（重启、重装）需要用户确认
   - 防止误操作

3. **错误处理**
   - 完善的错误捕获和提示
   - 用户友好的错误信息

## 未来扩展

可能的功能扩展方向：

- [ ] 批量操作（批量重启、批量重装）
- [ ] 服务器分组管理
- [ ] 性能监控集成
- [ ] 自动化运维脚本
- [ ] 服务器备份管理
- [ ] 防火墙规则配置
- [ ] SSH 密钥管理
- [ ] 服务器监控告警

## 故障排查

### 常见问题

1. **无法获取服务器列表**
   - 检查 API 密钥配置
   - 确认 API 权限是否正确
   - 查看后端日志

2. **重启/重装失败**
   - 检查服务器当前状态
   - 查看任务列表了解失败原因
   - 联系 OVH 技术支持

3. **系统模板加载失败**
   - 可能是网络问题
   - 刷新页面重试
   - 检查服务器型号是否支持

## 相关文档

- [OVH API 文档](https://eu.api.ovh.com/console/)
- [项目 README](./README.md)
- [API 安全配置](./SECURITY.md)
