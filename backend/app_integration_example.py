"""
集成示例：如何在 app.py 中使用 OVH API Helper
解决 SSL 错误和 API 限流问题
"""

# 在 app.py 顶部添加导入
from ovh_api_helper import OVHAPIHelper, get_global_helper

# ============================================
# 方式 1: 使用全局辅助实例（推荐）
# ============================================

def check_server_availability_v1(plan_code, options=None):
    """使用全局辅助实例的版本"""
    client = get_ovh_client()
    if not client:
        return None
    
    # 获取全局辅助实例（自动限流和重试）
    helper = get_global_helper(client, max_calls_per_second=10)
    
    try:
        params = {'planCode': plan_code}
        
        if options and len(options) > 0:
            for option in options:
                if 'addonFamily' not in params:
                    params['addonFamily'] = []
                if not isinstance(params['addonFamily'], list):
                    params['addonFamily'] = [params['addonFamily']]
                params['addonFamily'].append(option)
        
        # 使用 helper.get() 替代 client.get()
        # 自动包含重试机制和限流
        availabilities = helper.get('/dedicated/server/datacenter/availabilities', **params)
        
        result = {}
        for item in availabilities:
            datacenters = item.get("datacenters", [])
            for dc_info in datacenters:
                availability = dc_info.get("availability", "unknown")
                datacenter_name = dc_info.get("datacenter")
                
                if not availability or availability == "unknown":
                    result[datacenter_name] = "unknown"
                elif availability == "unavailable":
                    result[datacenter_name] = "unavailable"
                else:
                    result[datacenter_name] = availability
        
        config_info = f" (配置: {', '.join(options)})" if options else " (默认配置)"
        add_log("INFO", f"成功检查 {plan_code}{config_info} 的可用性: {result}")
        
        # 可选：定期输出统计信息
        if helper.total_requests % 50 == 0:
            stats = helper.get_stats()
            add_log("INFO", f"API 统计: {stats}")
        
        return result
        
    except Exception as e:
        add_log("ERROR", f"查询可用性失败 - {plan_code}: {str(e)}")
        import traceback
        add_log("DEBUG", f"详细错误:\n{traceback.format_exc()}")
        return None


# ============================================
# 方式 2: 每次创建新的辅助实例
# ============================================

def check_server_availability_v2(plan_code, options=None):
    """每次创建辅助实例的版本"""
    client = get_ovh_client()
    if not client:
        return None
    
    # 创建辅助实例
    helper = OVHAPIHelper(client, max_calls_per_second=10, max_retries=3)
    
    try:
        params = {'planCode': plan_code}
        
        if options and len(options) > 0:
            for option in options:
                if 'addonFamily' not in params:
                    params['addonFamily'] = []
                if not isinstance(params['addonFamily'], list):
                    params['addonFamily'] = [params['addonFamily']]
                params['addonFamily'].append(option)
        
        # 使用辅助实例进行 API 调用
        availabilities = helper.get('/dedicated/server/datacenter/availabilities', **params)
        
        # ... 处理结果（同上）
        result = {}
        for item in availabilities:
            datacenters = item.get("datacenters", [])
            for dc_info in datacenters:
                availability = dc_info.get("availability", "unknown")
                datacenter_name = dc_info.get("datacenter")
                
                if not availability or availability == "unknown":
                    result[datacenter_name] = "unknown"
                elif availability == "unavailable":
                    result[datacenter_name] = "unavailable"
                else:
                    result[datacenter_name] = availability
        
        config_info = f" (配置: {', '.join(options)})" if options else " (默认配置)"
        add_log("INFO", f"成功检查 {plan_code}{config_info} 的可用性: {result}")
        return result
        
    except Exception as e:
        add_log("ERROR", f"查询可用性失败 - {plan_code}: {str(e)}")
        return None


# ============================================
# 方式 3: 装饰器模式（更优雅）
# ============================================

def with_ovh_api_helper(func):
    """装饰器：为函数添加 OVH API 辅助功能"""
    def wrapper(*args, **kwargs):
        # 获取 client
        client = get_ovh_client()
        if not client:
            return None
        
        # 创建或获取辅助实例
        helper = get_global_helper(client)
        
        # 将 helper 注入到函数中
        kwargs['api_helper'] = helper
        
        try:
            return func(*args, **kwargs)
        except Exception as e:
            add_log("ERROR", f"函数 {func.__name__} 执行失败: {str(e)}")
            return None
    
    return wrapper


@with_ovh_api_helper
def check_server_availability_v3(plan_code, options=None, api_helper=None):
    """使用装饰器的版本"""
    if not api_helper:
        return None
    
    try:
        params = {'planCode': plan_code}
        
        if options and len(options) > 0:
            for option in options:
                if 'addonFamily' not in params:
                    params['addonFamily'] = []
                if not isinstance(params['addonFamily'], list):
                    params['addonFamily'] = [params['addonFamily']]
                params['addonFamily'].append(option)
        
        # 使用注入的 api_helper
        availabilities = api_helper.get('/dedicated/server/datacenter/availabilities', **params)
        
        result = {}
        for item in availabilities:
            datacenters = item.get("datacenters", [])
            for dc_info in datacenters:
                availability = dc_info.get("availability", "unknown")
                datacenter_name = dc_info.get("datacenter")
                
                if not availability or availability == "unknown":
                    result[datacenter_name] = "unknown"
                elif availability == "unavailable":
                    result[datacenter_name] = "unavailable"
                else:
                    result[datacenter_name] = availability
        
        config_info = f" (配置: {', '.join(options)})" if options else " (默认配置)"
        add_log("INFO", f"成功检查 {plan_code}{config_info} 的可用性: {result}")
        return result
        
    except Exception as e:
        add_log("ERROR", f"查询可用性失败 - {plan_code}: {str(e)}")
        return None


# ============================================
# 其他需要调用 OVH API 的函数也可以使用
# ============================================

@with_ovh_api_helper
def get_server_list(api_helper=None):
    """获取服务器列表"""
    if not api_helper:
        return None
    
    try:
        # 使用 api_helper 替代 client
        plans = api_helper.get('/dedicated/server')
        return plans
    except Exception as e:
        add_log("ERROR", f"获取服务器列表失败: {str(e)}")
        return None


@with_ovh_api_helper
def purchase_server(queue_item, api_helper=None):
    """购买服务器"""
    if not api_helper:
        return False
    
    try:
        plan_code = queue_item["planCode"]
        datacenter = queue_item["datacenter"]
        
        # 使用 api_helper.post() 进行购买
        result = api_helper.post(
            f'/dedicated/server/{plan_code}/order',
            datacenter=datacenter
        )
        
        add_log("INFO", f"成功购买服务器: {plan_code} @ {datacenter}")
        return True
        
    except Exception as e:
        add_log("ERROR", f"购买服务器失败: {str(e)}")
        return False


# ============================================
# API 统计端点（可选）
# ============================================

@app.route('/api/ovh-stats', methods=['GET'])
def get_ovh_stats():
    """获取 OVH API 调用统计"""
    client = get_ovh_client()
    if not client:
        return jsonify({'error': 'Client not initialized'}), 500
    
    helper = get_global_helper(client)
    stats = helper.get_stats()
    
    return jsonify({
        'stats': stats,
        'timestamp': int(time.time())
    })


# ============================================
# 安装依赖说明
# ============================================

"""
在项目根目录运行：

pip install tenacity

如果需要更新 SSL 相关库：

pip install --upgrade certifi urllib3 requests ovh

"""

# ============================================
# 完整的 requirements.txt 示例
# ============================================

"""
Flask==2.3.0
Flask-CORS==4.0.0
ovh==1.1.0
requests==2.31.0
urllib3==2.0.7
certifi==2023.7.22
tenacity==8.2.3
"""
