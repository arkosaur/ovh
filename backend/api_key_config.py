"""
API密钥配置
用于验证前端请求，防止后端被直接调用
"""

# API通信密钥
# 必须与前端 src/config/constants.ts 中的 API_SECRET_KEY 保持一致
API_SECRET_KEY = 'ovh-phantom-sniper-2024-secret-key'

# 是否启用API密钥验证
# 开发环境可以设置为 False，生产环境必须设置为 True
ENABLE_API_KEY_AUTH = True

# 白名单路径（不需要验证的路径）
# 例如健康检查、静态文件等
WHITELIST_PATHS = [
    '/health',
    '/api/health',
]
