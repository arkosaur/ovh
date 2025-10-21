# OVH 抢购面板

## 📸 界面预览

### 主面板
![主面板](https://raw.githubusercontent.com/coolci/OVH/main/UI/MAIN.png)

### 服务器列表
![服务器列表](https://raw.githubusercontent.com/coolci/OVH/main/UI/SERVERS.png)

### 抢购队列
![抢购队列](https://raw.githubusercontent.com/coolci/OVH/main/UI/QUEUE.png)

### 抢购历史
![抢购历史](https://raw.githubusercontent.com/coolci/OVH/main/UI/HISTORY.png)

### 抢购日志
![抢购日志](https://raw.githubusercontent.com/coolci/OVH/main/UI/LOG.png)

### API设置
![API设置](https://raw.githubusercontent.com/coolci/OVH/main/UI/API.png)

## 🚀 运行说明

### 前端运行

1. 安装依赖
```bash
npm install
```

2. 启动开发服务器
```bash
npm run dev
```

### 后端运行

1. 安装依赖
```bash
pip install -r requirements.txt
```

2. 启动服务器
```bash
python app.py
```

## ⚙️ 配置说明

运行之前请修改以下文件中的 API 配置：

1. 在 `/src/pages` 目录下
2. 在 `/src/context` 目录下

找到以下代码：
```javascript
// Backend API URL (update this to match your backend)
const API_URL = 'http://localhost:5000/api';
```

修改为你的实际服务器地址：
```javascript
const API_URL = 'http://你的服务器IP:5000/api';
```

## 🔒 安全配置

本项目实现了双层安全保护：

### 1. 前端密码保护 🔐

访问前端页面需要输入密码。

**默认密码：** `admin123`

**修改密码：** 编辑 `src/config/constants.ts` 文件
```typescript
// 修改此处的密码
export const FRONTEND_PASSWORD = '你的新密码';

// 开发环境可临时禁用密码保护
export const ENABLE_FRONTEND_PASSWORD = false;
```

### 2. API密钥验证

前后端通信使用API密钥验证机制，防止后端被直接调用。

### 生产环境部署前必须修改密钥

**重要：** 默认密钥仅供开发使用，生产环境必须更换！

1. **修改前端密钥** (`src/config/constants.ts`)
```typescript
export const API_SECRET_KEY = '你的复杂随机密钥';
```

2. **修改后端密钥** (`backend/api_key_config.py`)
```python
API_SECRET_KEY = '你的复杂随机密钥'  # 必须与前端保持一致
```

### 密钥生成建议

使用以下方式生成安全的随机密钥：

```bash
# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# OpenSSL
openssl rand -base64 32
```

### 安全特性

- ✅ API密钥验证：所有API请求需要正确的密钥
- ✅ 时间戳验证：防止重放攻击（5分钟有效期）
- ✅ 自动拦截：前端自动添加密钥到所有请求
- ✅ 友好提示：认证失败时显示清晰的错误信息

### 开发环境配置

如需在开发环境临时禁用验证，修改 `backend/api_key_config.py`：

```python
ENABLE_API_KEY_AUTH = False  # 仅开发环境使用
```

**警告：** 生产环境必须设置为 `True`

## 📝 注意事项

- 请确保服务器 IP 地址正确
- 确保服务器端口 5000 已开放
- 确保 API 服务正常运行
- **生产环境必须修改默认API密钥**
- 前后端密钥必须保持一致
- 前端默认运行在 8080 端口
- 后端默认运行在 5000 端口
- 如果端口被占用，可以在配置文件中修改

## 🔧 常见问题

### 配置API后服务器列表不加载？

**原因：** 认证状态变化需要一点时间同步

**解决方案：**
1. 保存API配置后，等待2-3秒
2. 如果仍未加载，手动刷新页面（F5）
3. 查看浏览器控制台是否有错误信息

详细排查指南请参考：`TROUBLESHOOTING_SERVERS.md`

### 所有API请求返回401错误？

**原因：** OPTIONS预检请求被拦截

**解决方案：**
1. 确保后端已更新到最新版本
2. 重启后端服务：`python app.py`
3. 刷新前端页面

详细修复说明请参考：`HOTFIX_401_ERROR.md`
