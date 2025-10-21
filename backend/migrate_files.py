#!/usr/bin/env python3
"""
文件迁移脚本
将旧的数据文件从根目录迁移到新的目录结构中
"""
import os
import shutil

def migrate_files():
    """迁移文件到新的目录结构"""
    
    # 创建目录
    directories = ['data', 'cache', 'logs']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✓ 创建目录: {directory}/")
    
    # 需要迁移的数据文件
    data_files = {
        'config.json': 'data/config.json',
        'logs.json': 'data/logs.json',
        'queue.json': 'data/queue.json',
        'history.json': 'data/history.json',
        'servers.json': 'data/servers.json',
    }
    
    # 迁移数据文件
    print("\n迁移数据文件:")
    for old_path, new_path in data_files.items():
        if os.path.exists(old_path):
            shutil.move(old_path, new_path)
            print(f"✓ {old_path} -> {new_path}")
        else:
            print(f"  {old_path} (不存在，跳过)")
    
    # 迁移日志文件
    print("\n迁移日志文件:")
    if os.path.exists('app.log'):
        shutil.move('app.log', 'logs/app.log')
        print(f"✓ app.log -> logs/app.log")
    else:
        print(f"  app.log (不存在，跳过)")
    
    # 迁移缓存文件
    print("\n迁移缓存文件:")
    if os.path.exists('ovh_api_raw_response.json'):
        shutil.move('ovh_api_raw_response.json', 'cache/ovh_catalog_raw.json')
        print(f"✓ ovh_api_raw_response.json -> cache/ovh_catalog_raw.json")
    else:
        print(f"  ovh_api_raw_response.json (不存在，跳过)")
    
    # 迁移api_data目录
    if os.path.exists('api_data'):
        if os.path.exists('cache/servers'):
            print(f"  cache/servers 已存在，删除旧的 api_data/")
            shutil.rmtree('api_data')
        else:
            shutil.move('api_data', 'cache/servers')
            print(f"✓ api_data/ -> cache/servers/")
    else:
        print(f"  api_data/ (不存在，跳过)")
    
    print("\n✅ 迁移完成！")
    print("\n注意:")
    print("- 旧文件已移动到新位置")
    print("- 可以安全删除根目录下的其他 .json 和 .log 文件")
    print("- 启动 app.py 后会自动使用新的目录结构")

if __name__ == '__main__':
    print("=" * 50)
    print("OVH 后端文件迁移工具")
    print("=" * 50)
    print("\n将旧文件迁移到新的目录结构:")
    print("- data/    (数据文件)")
    print("- cache/   (缓存文件)")
    print("- logs/    (日志文件)")
    print()
    
    response = input("是否继续？(y/n): ")
    if response.lower() in ['y', 'yes']:
        migrate_files()
    else:
        print("已取消")
