#!/usr/bin/env python3
"""
测试OVH分区API - 验证正确的API路径
"""
import ovh
import json

# 读取配置
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(script_dir, 'backend', 'data', 'config.json')

with open(config_path, 'r') as f:
    config = json.load(f)

# 初始化OVH客户端
client = ovh.Client(
    endpoint=config['endpoint'],
    application_key=config['appKey'],
    application_secret=config['appSecret'],
    consumer_key=config['consumerKey']
)

print("=== OVH分区API测试 ===\n")

# 1. 获取服务器列表
print("1. 获取服务器列表...")
servers = client.get('/dedicated/server')
if servers:
    server_name = servers[0]
    print(f"   使用服务器: {server_name}\n")
else:
    print("   错误：没有找到服务器")
    exit(1)

# 2. 获取可用模板
print("2. 获取可用模板...")
try:
    templates_response = client.get(f'/dedicated/server/{server_name}/install/compatibleTemplates')
    templates = templates_response.get('ovh', [])
    print(f"   找到 {len(templates)} 个OVH模板")
    if templates:
        print(f"   示例模板: {templates[:5]}\n")
except Exception as e:
    print(f"   错误: {e}\n")

# 3. 测试不同的分区API
test_template = 'debian11_64'
print(f"3. 测试分区API（模板: {test_template}）...\n")

# 方法1: 查询installationTemplate的partitionScheme
print("   方法1: /dedicated/installationTemplate/{template}/partitionScheme")
try:
    schemes = client.get(f'/dedicated/installationTemplate/{test_template}/partitionScheme')
    print(f"   ✓ 成功! 返回: {schemes}")
    
    if schemes:
        # 获取第一个方案的详细信息
        scheme_name = schemes[0]
        print(f"\n   获取方案详情: {scheme_name}")
        scheme_info = client.get(f'/dedicated/installationTemplate/{test_template}/partitionScheme/{scheme_name}')
        print(f"   方案信息: {json.dumps(scheme_info, indent=2)}")
        
        # 获取分区列表
        partitions = client.get(f'/dedicated/installationTemplate/{test_template}/partitionScheme/{scheme_name}/partition')
        print(f"   分区列表: {partitions}")
except Exception as e:
    print(f"   ✗ 失败: {e}")

print("\n" + "="*50)

# 方法2: 查询服务器的安装选项
print("\n   方法2: /dedicated/server/{server}/install/templateCapabilities")
try:
    capabilities = client.get(f'/dedicated/server/{server_name}/install/templateCapabilities')
    print(f"   ✓ 成功!")
    
    # 查找debian11_64的能力
    if 'templates' in capabilities:
        for tmpl in capabilities.get('templates', []):
            if tmpl.get('bitFormat') == 64 and 'debian' in tmpl.get('distribution', '').lower():
                print(f"\n   找到Debian模板:")
                print(f"   - 分发: {tmpl.get('distribution')}")
                print(f"   - 族: {tmpl.get('family')}")
                print(f"   - 分区方案: {tmpl.get('partitionScheme')}")
                break
except Exception as e:
    print(f"   ✗ 失败: {e}")

print("\n" + "="*50)

# 方法3: 检查默认分区方案
print("\n   方法3: 检查模板默认分区")
try:
    template_info = client.get(f'/dedicated/installationTemplate/{test_template}')
    print(f"   模板信息:")
    print(f"   - 默认语言: {template_info.get('defaultLanguage')}")
    print(f"   - 分发: {template_info.get('distribution')}")
    if 'customization' in template_info:
        print(f"   - 支持自定义: {template_info.get('customization')}")
except Exception as e:
    print(f"   ✗ 失败: {e}")

print("\n" + "="*50)
print("\n结论:")
print("- 如果方法1成功但返回空数组，说明该模板确实没有自定义分区方案")
print("- 如果方法1失败，说明API路径不对")
print("- 建议使用返回非空数组的模板（如debian10_64或ubuntu2004_64）")
