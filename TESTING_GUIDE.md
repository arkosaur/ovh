# 服务器控制中心 - 功能测试指南

## ✅ 已实现的功能清单

### 前端功能（全新优化版本）

**改进点**：
1. ✅ 按需加载 - 只在切换标签时加载对应数据
2. ✅ 独立加载状态 - 每个功能有独立的loading状态
3. ✅ 错误处理 - 每个API调用都有try-catch
4. ✅ 避免并发请求 - 减少CORS问题

### 测试步骤

#### 1. 概览标签 ✅
**功能**: 查看服务器基本信息、重启服务器

**测试步骤**:
1. 打开页面，应该自动加载服务器列表
2. 在下拉菜单选择一台服务器
3. 查看显示的信息（名称、型号、数据中心、IP、系统、状态）
4. 点击"重启服务器"按钮，确认对话框，检查是否成功

**API调用**:
- `GET /api/server-control/list`
- `POST /api/server-control/{serviceName}/reboot`

#### 2. 配置标签 ⚙️
**功能**: 监控开关、硬件信息查看

**测试步骤**:
1. 点击"配置"标签
2. 查看监控状态（已开启/已关闭）
3. 点击监控开关按钮，检查是否切换成功
4. 查看硬件配置（CPU、核心、内存、RAID）

**API调用**:
- `GET /api/server-control/{serviceName}/monitoring`
- `PUT /api/server-control/{serviceName}/monitoring`
- `GET /api/server-control/{serviceName}/hardware`

#### 3. 网络标签 🌐
**功能**: 查看IP地址列表

**测试步骤**:
1. 点击"网络"标签
2. 查看所有IP地址列表
3. 每个IP显示地址和类型

**API调用**:
- `GET /api/server-control/{serviceName}/ips`

#### 4. 服务标签 ℹ️
**功能**: 查看服务信息（到期时间、续费状态）

**测试步骤**:
1. 点击"服务"标签
2. 查看服务状态
3. 查看到期时间
4. 查看创建时间
5. 查看自动续费状态

**API调用**:
- `GET /api/server-control/{serviceName}/serviceinfo`

---

## 🔍 故障排查

### 如果遇到CORS错误

**原因**: 后端服务器未运行或CORS配置问题

**解决方法**:
1. 确认后端服务器正在运行
2. 检查 `backend/app.py` 中的 CORS 配置：
   ```python
   from flask_cors import CORS
   app = Flask(__name__)
   CORS(app)  # 应该存在这一行
   ```

### 如果遇到404错误

**原因**: API路径不匹配

**检查清单**:
1. 后端所有API端点都存在 ✅
2. 前端API调用路径正确 ✅
3. apiClient配置的base URL正确

### 如果数据不显示

**排查步骤**:
1. 打开浏览器开发者工具（F12）
2. 切换到Network标签
3. 点击对应的功能标签
4. 查看API请求是否成功（状态码200）
5. 查看响应数据是否正确

---

## 📊 API端点对照表

| 功能 | 方法 | 端点 | 状态 |
|------|------|------|------|
| 服务器列表 | GET | `/api/server-control/list` | ✅ |
| 重启服务器 | POST | `/api/server-control/{name}/reboot` | ✅ |
| 获取模板 | GET | `/api/server-control/{name}/templates` | ✅ |
| 重装系统 | POST | `/api/server-control/{name}/install` | ✅ |
| 任务列表 | GET | `/api/server-control/{name}/tasks` | ✅ |
| 启动配置 | GET | `/api/server-control/{name}/boot` | ✅ |
| 设置启动 | PUT | `/api/server-control/{name}/boot/{id}` | ✅ |
| 监控状态 | GET | `/api/server-control/{name}/monitoring` | ✅ |
| 设置监控 | PUT | `/api/server-control/{name}/monitoring` | ✅ |
| 硬件信息 | GET | `/api/server-control/{name}/hardware` | ✅ |
| IP列表 | GET | `/api/server-control/{name}/ips` | ✅ |
| 反向DNS | GET | `/api/server-control/{name}/reverse` | ✅ |
| 设置DNS | POST | `/api/server-control/{name}/reverse` | ✅ |
| 服务信息 | GET | `/api/server-control/{name}/serviceinfo` | ✅ |
| 分区方案 | GET | `/api/server-control/{name}/partition-schemes` | ✅ |

---

## 🚀 快速测试命令

### 使用curl测试后端API

```bash
# 1. 测试服务器列表
curl http://localhost:5000/api/server-control/list

# 2. 测试硬件信息（替换YOUR_SERVER_NAME）
curl http://localhost:5000/api/server-control/YOUR_SERVER_NAME/hardware

# 3. 测试监控状态
curl http://localhost:5000/api/server-control/YOUR_SERVER_NAME/monitoring
```

---

## 📝 已知限制

1. 重装系统功能 - 需要单独实现UI
2. 反向DNS设置 - 需要单独实现UI
3. 启动模式切换 - 需要单独实现UI
4. 分区方案查看 - 需要单独实现UI

这些功能的**后端API已完成**，只需添加前端UI即可。

---

## ✨ 下一步扩展

如果基础功能都正常，可以继续添加：
- 重装系统对话框
- 启动模式选择器
- 反向DNS配置表单
- 任务历史查看

所有后端API都已就绪！
