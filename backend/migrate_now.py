#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文件迁移脚本 - 自动执行版本
直接迁移文件，无需确认
"""
import os
import sys
import shutil

# 设置UTF-8编码输出
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def migrate_files():
    """迁移文件到新的目录结构"""
    
    print("=" * 50)
    print("开始迁移文件...")
    print("=" * 50)
    
    # 创建目录
    directories = ['data', 'cache', 'logs']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"[OK] 创建目录: {directory}/")
    
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
    moved_count = 0
    for old_path, new_path in data_files.items():
        if os.path.exists(old_path) and not os.path.exists(new_path):
            shutil.move(old_path, new_path)
            print(f"[OK] {old_path} -> {new_path}")
            moved_count += 1
        elif os.path.exists(new_path):
            print(f"  {old_path} -> 目标已存在，跳过")
        else:
            print(f"  {old_path} (不存在，跳过)")
    
    # 迁移日志文件
    print("\n迁移日志文件:")
    if os.path.exists('app.log') and not os.path.exists('logs/app.log'):
        shutil.move('app.log', 'logs/app.log')
        print(f"[OK] app.log -> logs/app.log")
        moved_count += 1
    elif os.path.exists('logs/app.log'):
        print(f"  app.log -> 目标已存在，跳过")
    else:
        print(f"  app.log (不存在，跳过)")
    
    # 迁移缓存文件
    print("\n迁移缓存文件:")
    if os.path.exists('ovh_api_raw_response.json') and not os.path.exists('cache/ovh_catalog_raw.json'):
        shutil.move('ovh_api_raw_response.json', 'cache/ovh_catalog_raw.json')
        print(f"[OK] ovh_api_raw_response.json -> cache/ovh_catalog_raw.json")
        moved_count += 1
    elif os.path.exists('cache/ovh_catalog_raw.json'):
        print(f"  ovh_api_raw_response.json -> 目标已存在，跳过")
    else:
        print(f"  ovh_api_raw_response.json (不存在，跳过)")
    
    # 迁移api_data目录
    if os.path.exists('api_data') and not os.path.exists('cache/servers'):
        shutil.move('api_data', 'cache/servers')
        print(f"[OK] api_data/ -> cache/servers/")
        moved_count += 1
    elif os.path.exists('cache/servers'):
        print(f"  api_data/ -> 目标已存在，跳过")
        # 如果cache/servers已存在，删除旧的api_data
        if os.path.exists('api_data'):
            print(f"  删除旧的 api_data/ 目录")
            shutil.rmtree('api_data')
    else:
        print(f"  api_data/ (不存在，跳过)")
    
    print("\n" + "=" * 50)
    if moved_count > 0:
        print(f"[SUCCESS] 迁移完成！共迁移 {moved_count} 个文件/目录")
    else:
        print("[SUCCESS] 所有文件已在正确位置，无需迁移")
    print("=" * 50)
    
    # 显示当前目录结构
    print("\n当前目录结构:")
    for root, dirs, files in os.walk('.'):
        # 跳过venv和隐藏目录
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'venv']
        level = root.replace('.', '', 1).count(os.sep)
        indent = ' ' * 2 * level
        print(f'{indent}{os.path.basename(root)}/')
        subindent = ' ' * 2 * (level + 1)
        for file in sorted(files)[:5]:  # 只显示前5个文件
            print(f'{subindent}{file}')
        if len(files) > 5:
            print(f'{subindent}... 还有 {len(files) - 5} 个文件')

if __name__ == '__main__':
    try:
        migrate_files()
    except Exception as e:
        print(f"\n[ERROR] 迁移过程中出错: {e}")
        import traceback
        traceback.print_exc()
