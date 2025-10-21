# 文件迁移指南

## 快速开始

### 方法 1: 自动迁移（推荐）

运行迁移脚本自动整理文件：

```bash
cd backend
python migrate_files.py
```

脚本会自动：
- ✅ 创建 `data/`、`cache/`、`logs/` 目录
- ✅ 移动所有数据文件到 `data/`
- ✅ 移动缓存文件到 `cache/`
- ✅ 移动日志文件到 `logs/`
- ✅ 重命名和整理旧的API数据

### 方法 2: 手动迁移

如果你想手动迁移，在PowerShell中执行：

```powershell
# 创建目录
New-Item -ItemType Directory -Force -Path data, cache, logs

# 迁移数据文件
Move-Item -Path config.json -Destination data\ -ErrorAction SilentlyContinue
Move-Item -Path logs.json -Destination data\ -ErrorAction SilentlyContinue
Move-Item -Path queue.json -Destination data\ -ErrorAction SilentlyContinue
Move-Item -Path history.json -Destination data\ -ErrorAction SilentlyContinue
Move-Item -Path servers.json -Destination data\ -ErrorAction SilentlyContinue

# 迁移日志
Move-Item -Path app.log -Destination logs\ -ErrorAction SilentlyContinue

# 迁移缓存
Move-Item -Path ovh_api_raw_response.json -Destination cache\ovh_catalog_raw.json -ErrorAction SilentlyContinue
Move-Item -Path api_data -Destination cache\servers -ErrorAction SilentlyContinue
```

## 迁移后的文件结构

```
backend/
├── data/                    # ✨ 新：数据文件目录
│   ├── config.json
│   ├── logs.json
│   ├── queue.json
│   ├── history.json
│   └── servers.json
│
├── cache/                   # ✨ 新：缓存目录
│   ├── ovh_catalog_raw.json
│   └── servers/
│       └── {plan_code}/
│
├── logs/                    # ✨ 新：日志目录
│   └── app.log
│
├── app.py
├── requirements.txt
└── migrate_files.py         # ✨ 新：迁移脚本
```

## 检查迁移结果

迁移完成后，确认：

1. ✅ `data/` 目录包含所有数据文件
2. ✅ `cache/` 目录包含API缓存
3. ✅ `logs/` 目录包含日志文件
4. ✅ 根目录只保留必要的 `.py` 和 `.txt` 文件

## 启动应用

迁移完成后，正常启动应用：

```bash
python app.py
```

应用会自动使用新的目录结构，无需额外配置。

## 清理旧文件

如果迁移成功，可以安全删除根目录下的旧文件：

```powershell
# 仅在确认迁移成功后执行！
Remove-Item config.json -ErrorAction SilentlyContinue
Remove-Item logs.json -ErrorAction SilentlyContinue
Remove-Item queue.json -ErrorAction SilentlyContinue
Remove-Item history.json -ErrorAction SilentlyContinue
Remove-Item servers.json -ErrorAction SilentlyContinue
Remove-Item app.log -ErrorAction SilentlyContinue
Remove-Item ovh_api_raw_response.json -ErrorAction SilentlyContinue
Remove-Item -Recurse api_data -ErrorAction SilentlyContinue
```

## 注意事项

1. **备份**：迁移前建议备份重要数据文件（特别是 `config.json` 和 `history.json`）
2. **Git**：已添加 `.gitignore` 忽略 `data/`、`cache/`、`logs/` 目录
3. **权限**：确保应用有权限创建和写入这些目录
4. **重启**：迁移后重启应用即可生效

## 回滚

如果需要回滚到旧的文件结构：

```powershell
# 将文件移回根目录
Move-Item -Path data\* -Destination . -Force
Move-Item -Path logs\app.log -Destination . -Force
Move-Item -Path cache\ovh_catalog_raw.json -Destination ovh_api_raw_response.json -Force
Move-Item -Path cache\servers -Destination api_data -Force

# 删除新目录
Remove-Item -Recurse data, cache, logs
```

## 需要帮助？

查看详细文档：
- `STRUCTURE.md` - 文件结构说明
- `OPTIMIZATION.md` - 优化说明文档
