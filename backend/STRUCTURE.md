# 后端文件结构说明

## 目录结构

```
backend/
├── data/                    # 数据文件目录（运行时数据）
│   ├── config.json         # API配置文件
│   ├── logs.json           # 操作日志数据
│   ├── queue.json          # 抢购队列数据
│   ├── history.json        # 购买历史记录
│   └── servers.json        # 服务器列表缓存
│
├── cache/                   # API调试缓存目录
│   ├── ovh_catalog_raw.json    # OVH完整目录数据
│   └── servers/            # 各服务器详细数据
│       └── {plan_code}/    # 按服务器型号分类
│           ├── plan_data.json
│           └── addonFamilies.json
│
├── logs/                    # 应用日志目录
│   └── app.log             # Flask应用运行日志
│
├── app.py                   # 主应用文件
├── requirements.txt         # Python依赖
├── .gitignore              # Git忽略规则
└── venv/                    # Python虚拟环境
```

## 目录说明

### `data/` - 数据文件目录
存放应用运行时的持久化数据：
- **config.json**: OVH API配置、Telegram配置等
- **logs.json**: 用户操作日志（添加队列、购买等）
- **queue.json**: 当前抢购队列
- **history.json**: 历史购买记录
- **servers.json**: 服务器列表缓存（避免频繁调用OVH API）

### `cache/` - 调试缓存目录
存放OVH API原始响应数据，用于调试和分析：
- **ovh_catalog_raw.json**: OVH完整服务器目录原始数据
- **servers/{plan_code}/**: 每个服务器型号的详细配置数据

### `logs/` - 日志目录
存放应用运行日志：
- **app.log**: Flask应用的运行日志，包含INFO、WARNING、ERROR等级别日志

## 迁移说明

如果你之前有旧的数据文件在根目录，首次启动时需要手动迁移：

```bash
# 在backend目录下执行
mkdir -p data cache logs

# 迁移数据文件
mv config.json data/ 2>/dev/null || true
mv logs.json data/ 2>/dev/null || true
mv queue.json data/ 2>/dev/null || true
mv history.json data/ 2>/dev/null || true
mv servers.json data/ 2>/dev/null || true

# 迁移缓存
mv api_data cache/servers 2>/dev/null || true
mv ovh_api_raw_response.json cache/ 2>/dev/null || true

# 迁移日志
mv app.log logs/ 2>/dev/null || true
```

## 自动创建

应用启动时会自动创建这些目录，无需手动创建。

## 备份建议

建议定期备份 `data/` 目录，特别是：
- `config.json` - 包含API密钥
- `history.json` - 购买历史记录
- `queue.json` - 当前队列状态

`cache/` 和 `logs/` 目录可以随时删除，应用会重新生成。
