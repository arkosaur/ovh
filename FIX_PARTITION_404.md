# 修复分区方案API 404错误

## 问题
```
OPTIONS /api/server-control/.../partition-schemes?templateName=... HTTP/1.1" 404
```

## 已完成的修复

✅ 1. 后端路由已添加OPTIONS方法支持
```python
@app.route('/api/server-control/<service_name>/partition-schemes', methods=['GET', 'OPTIONS'])
```

## 需要执行的操作

### ⚠️ 重启后端服务器

**步骤：**

1. **停止当前后端服务器**
   - 在运行`python backend/app.py`的终端按 `Ctrl+C`

2. **重新启动后端**
   ```bash
   cd c:\Users\video\Desktop\OVH
   python backend/app.py
   ```

3. **验证路由已加载**
   - 查看启动日志，确认没有错误
   - 刷新前端页面，重新选择模板

## 为什么需要重启？

Flask在debug=False模式下不会自动重载代码。
新添加的OPTIONS方法需要重启服务器才能生效。

## 验证方法

重启后，在前端：
1. 选择服务器
2. 点击"重装系统"
3. 选择一个操作系统模板
4. 应该能看到"分区方案"选择器出现

如果仍然404，检查：
- 后端日志中是否有路由注册信息
- 使用curl测试：
  ```bash
  curl "http://localhost:5000/api/server-control/YOUR_SERVER/partition-schemes?templateName=debian11_64"
  ```
