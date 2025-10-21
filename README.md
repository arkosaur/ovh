# 🚀 首次运行配置指南

欢迎使用 OVH 幻影狙击手抢购系统！本指南将帮助您快速完成首次配置。

---

## 📋 目录

1. [环境准备](#环境准备)
2. [前端密码配置](#前端密码配置)
3. [API通信密钥配置](#api通信密钥配置)
4. [后端API地址配置](#后端api地址配置)
5. [OVH API配置](#ovh-api配置)
6. [启动服务](#启动服务)
7. [首次登录](#首次登录)
8. [验证配置](#验证配置)

---

## 🔧 环境准备

### 1. 系统要求

- **Node.js**: 16.x 或更高版本
- **Python**: 3.8 或更高版本
- **浏览器**: Chrome/Firefox/Edge（最新版本）

### 2. 安装依赖

#### 后端依赖
```bash
cd backend
pip install -r requirements.txt
```

#### 前端依赖
```bash
npm install
```

---

## 🔐 前端密码配置

### 配置位置
**文件：** `src/config/constants.ts`

### 默认配置
```typescript
/**
 * 前端访问密码
 * 用于保护前端页面访问
 * 默认密码：admin123
 * 生产环境请修改此密码！
 */
export const FRONTEND_PASSWORD = 'admin123';

/**
 * 是否启用前端密码保护
 * 开发环境可以设置为 false，生产环境建议设置为 true
 */
export const ENABLE_FRONTEND_PASSWORD = true;
```

### ⚠️ 重要：修改默认密码

**第83行：修改密码**
```typescript
export const FRONTEND_PASSWORD = '你的新密码';  // 建议使用强密码
```

### 密码建议
- ✅ 推荐：`MyOVH@2024!Secure`
- ✅ 推荐：`Phantom$Sniper#2024`
- ❌ 避免：`admin123`、`password`、`123456`

### 禁用密码保护（仅开发环境）
```typescript
export const ENABLE_FRONTEND_PASSWORD = false;  // 跳过密码验证
```

---

## 🔑 API通信密钥配置

前后端通信需要使用相同的密钥进行验证，防止后端被直接调用。

### 1. 前端配置

**文件：** `src/config/constants.ts`

**第75行：修改API密钥**
```typescript
/**
 * API通信密钥
 * 用于验证前端请求，防止后端被直接调用
 * 生产环境请更换为复杂的随机字符串
 */
export const API_SECRET_KEY = 'ovh-phantom-sniper-2024-secret-key';  // ⚠️ 修改这里
```

### 2. 后端配置

**文件：** `backend/api_key_config.py`

**第8行：修改API密钥（必须与前端一致）**
```python
# API通信密钥
# 必须与前端 src/config/constants.ts 中的 API_SECRET_KEY 保持一致
API_SECRET_KEY = 'ovh-phantom-sniper-2024-secret-key'  # ⚠️ 修改这里
```

### ⚠️ 重要提醒

**前后端密钥必须完全一致！**

### 生成强密钥

使用以下方式生成随机密钥：

**Python方式：**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**输出示例：**
```
xJ7mK9pQrS2tUvWxYz0AbCdEfGhIjKlMnOpQrStUvWxYz
```

将生成的密钥同时替换到前后端配置中。

### 3. 启用/禁用API密钥验证

**后端配置文件：** `backend/api_key_config.py`

**第12行：**
```python
# 是否启用API密钥验证
# 开发环境可以设置为 False，生产环境必须设置为 True
ENABLE_API_KEY_AUTH = True  # 生产环境必须为 True
```

**开发调试时可临时禁用：**
```python
ENABLE_API_KEY_AUTH = False  # 仅开发环境使用
```

---

## 🌐 后端API地址配置

### 本地开发环境

**默认配置：** 前后端都在本地运行，无需修改。

- 前端：`http://localhost:8080`
- 后端：`http://localhost:5000`

### 远程部署环境

如果后端部署在远程服务器，需要修改前端的API地址配置。

**文件：** `src/config/constants.ts`

**第68行：修改后端API地址**
```typescript
/**
 * 后端API地址
 */
export const API_URL = 'http://localhost:5000/api';  // ⚠️ 修改这里
```

### 配置示例

**场景1：后端在本地**
```typescript
export const API_URL = 'http://localhost:5000/api';
```

**场景2：后端在局域网服务器**
```typescript
export const API_URL = 'http://192.168.1.100:5000/api';
```

**场景3：后端在公网服务器（使用域名）**
```typescript
export const API_URL = 'https://api.yourdomain.com/api';
```

**场景4：后端在公网服务器（使用IP）**
```typescript
export const API_URL = 'http://123.45.67.89:5000/api';
```

### ⚠️ 注意事项

1. **协议选择**
   - 本地/内网：使用 `http://`
   - 公网生产环境：建议使用 `https://`（需配置SSL证书）

2. **端口号**
   - 后端默认端口：`5000`
   - 如果修改了后端端口，前端配置也要对应修改

3. **跨域问题**
   - 后端已配置CORS，支持跨域访问
   - 如遇到跨域问题，检查后端 `app.py` 中的 CORS 配置

4. **防火墙**
   - 确保服务器防火墙开放了后端端口（默认5000）
   - 云服务器还需要在安全组中开放端口

---

## 🔧 OVH API配置

### 获取OVH API密钥

1. **访问 OVH API控制台**
   - EU区域：https://eu.api.ovh.com/createToken/
   - CA区域：https://ca.api.ovh.com/createToken/

2. **填写应用信息**
   - Application name: `OVH Phantom Sniper`
   - Application description: `OVH服务器抢购工具`

3. **设置权限**
   - GET `/dedicated/server/*` - 读取服务器信息
   - POST `/order/*` - 创建订单
   - GET `/me` - 读取账户信息

4. **生成密钥**
   - 获得三个密钥：
     - **Application Key** (AK)
     - **Application Secret** (AS)
     - **Consumer Key** (CK)

### 配置方式

**方式1：通过Web界面配置（推荐）**

1. 启动系统后访问前端
2. 点击侧边栏"API设置"
3. 填写以下信息：
   ```
   Application Key: 你的AK
   Application Secret: 你的AS
   Consumer Key: 你的CK
   Endpoint: ovh-eu (欧洲) 或 ovh-ca (加拿大)
   ```
4. 点击"保存设置"

**方式2：直接修改配置文件**

**文件：** `backend/data/config.json`

```json
{
  "appKey": "你的Application Key",
  "appSecret": "你的Application Secret",
  "consumerKey": "你的Consumer Key",
  "endpoint": "ovh-eu",
  "tgToken": "",
  "tgChatId": "",
  "iam": "go-ovh-ie",
  "zone": "IE"
}
```

### Telegram通知配置（可选）

如果需要Telegram通知功能：

1. **创建Telegram Bot**
   - 与 @BotFather 对话
   - 发送 `/newbot` 创建机器人
   - 获取 Bot Token

2. **获取Chat ID**
   - 与你的Bot对话
   - 访问：`https://api.telegram.org/bot<你的Token>/getUpdates`
   - 找到 `chat.id` 字段

3. **配置到系统**
   ```json
   {
     "tgToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
     "tgChatId": "123456789"
   }
   ```

---

## 🚀 启动服务

### 1. 启动后端服务

```bash
cd backend
python app.py
```

**预期输出：**
```
 * Running on http://127.0.0.1:5000
 * Restarting with stat
 * Debugger is active!
```

**验证后端：**
```bash
curl http://localhost:5000/api/health
```

### 2. 启动前端服务

**新开一个终端：**
```bash
npm run dev
```

**预期输出：**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

---

## 🔓 首次登录

### 1. 访问前端

打开浏览器访问：**http://localhost:8080**

### 2. 输入前端密码

**默认密码：** `admin123`

（如果你已修改，使用你设置的密码）

### 3. 进入主界面

登录成功后会看到系统主界面。

---

## ✅ 验证配置

### 1. 检查API密钥配置

打开浏览器开发者工具（F12），检查：

**Console标签：**
- 不应有401错误
- 不应有"API密钥无效"提示

**Network标签：**
- API请求应返回200状态码
- 请求头应包含 `X-API-Key`

### 2. 配置OVH API

1. 点击侧边栏"API设置"
2. 填写OVH API信息
3. 点击"保存设置"
4. 应该显示"API设置已保存"

### 3. 测试服务器列表

1. 点击侧边栏"服务器列表"
2. 等待1-2分钟（首次加载需要时间）
3. 应该显示OVH服务器列表

**如果成功：**
- ✅ 显示多台服务器
- ✅ 可以点击"检测可用性"
- ✅ 可以添加到抢购队列

**如果失败：**
- ❌ 检查OVH API配置是否正确
- ❌ 检查网络连接
- ❌ 查看后端日志：`backend/logs/app.log`

---

## 📝 配置文件清单

### 前端配置

| 文件 | 配置项 | 说明 |
|------|--------|------|
| `src/config/constants.ts` | `FRONTEND_PASSWORD` | 前端访问密码 |
| `src/config/constants.ts` | `ENABLE_FRONTEND_PASSWORD` | 是否启用密码保护 |
| `src/config/constants.ts` | `API_SECRET_KEY` | API通信密钥 |
| `src/config/constants.ts` | `API_URL` | 后端API地址 |

### 后端配置

| 文件 | 配置项 | 说明 |
|------|--------|------|
| `backend/api_key_config.py` | `API_SECRET_KEY` | API通信密钥（需与前端一致） |
| `backend/api_key_config.py` | `ENABLE_API_KEY_AUTH` | 是否启用API验证 |
| `backend/data/config.json` | `appKey` | OVH Application Key |
| `backend/data/config.json` | `appSecret` | OVH Application Secret |
| `backend/data/config.json` | `consumerKey` | OVH Consumer Key |

---

## 🔒 安全检查清单

部署前请确认：

- [ ] 已修改前端访问密码（不要使用 `admin123`）
- [ ] 已修改API通信密钥（不要使用默认值）
- [ ] 前后端API密钥配置一致
- [ ] 生产环境 `ENABLE_API_KEY_AUTH = True`
- [ ] 生产环境 `ENABLE_FRONTEND_PASSWORD = True`
- [ ] OVH API密钥已配置
- [ ] 已测试服务器列表加载
- [ ] 已测试抢购队列功能

---

## 🐛 常见问题

### Q1: 前端显示401错误？

**原因：** 前后端API密钥不一致

**解决：**
1. 检查 `src/config/constants.ts` 中的 `API_SECRET_KEY`
2. 检查 `backend/api_key_config.py` 中的 `API_SECRET_KEY`
3. 确保两者完全一致
4. 重启前后端服务

### Q2: 忘记前端密码？

**解决：**
1. 打开 `src/config/constants.ts`
2. 查看 `FRONTEND_PASSWORD` 的值
3. 或临时设置 `ENABLE_FRONTEND_PASSWORD = false`

### Q3: 服务器列表加载失败？

**原因：** OVH API配置错误或网络问题

**解决：**
1. 检查OVH API密钥是否正确
2. 检查网络连接
3. 查看后端日志：`backend/logs/app.log`
4. 点击"刷新"按钮重试

### Q4: 首次加载很慢？

**正常现象！** 首次从OVH获取服务器列表需要1-2分钟。

**说明：**
- 首次加载：1-2分钟
- 后续访问：1-3秒（使用缓存）

### Q5: 如何修改后端地址？

**详见：** [后端API地址配置](#后端api地址配置) 章节

**快速说明：** 修改 `src/config/constants.ts` 中的 `API_URL` 配置

不同场景的配置示例：
- 本地：`http://localhost:5000/api`
- 局域网：`http://192.168.1.100:5000/api`
- 公网：`http://你的服务器IP:5000/api`

---

## 📚 进阶配置

### 修改端口

**后端端口：**
编辑 `backend/app.py` 最后一行：
```python
app.run(host='0.0.0.0', port=5000, debug=True)  # 修改port
```

**前端端口：**
编辑 `vite.config.ts`：
```typescript
export default defineConfig({
  server: {
    port: 8080  // 修改这里
  }
})
```

### 修改缓存时间

**文件：** `src/config/constants.ts`

```typescript
// 缓存过期时间（2小时）
export const CACHE_EXPIRY = 2 * 60 * 60 * 1000;  // 修改这里
```

### 修改API超时时间

**文件：** `src/config/constants.ts`

```typescript
export const API_TIMEOUT = 120000;  // 120秒，可根据需要调整
```

---

## 📞 获取帮助

如果遇到问题：

1. **查看日志**
   - 前端：浏览器控制台（F12）
   - 后端：`backend/logs/app.log`

2. **常见问题**
   - 查看 `README.md` 中的"常见问题"部分

---

## ✅ 配置完成

完成以上步骤后，你的OVH抢购系统就配置好了！

**下一步：**
1. 添加服务器到抢购队列
2. 配置抢购间隔时间
3. 开始监控OVH库存

---

**祝您抢购顺利！** 🎉

---

*文档版本：1.0*  
*最后更新：2025-10-21*
