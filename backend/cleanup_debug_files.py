#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清理调试文件脚本
将根目录下的调试文件移动到cache目录
"""
import os
import sys
import shutil
import glob

# 设置UTF-8编码输出
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def cleanup_debug_files():
    """清理并移动调试文件到cache目录"""
    
    print("=" * 50)
    print("开始清理调试文件...")
    print("=" * 50)
    
    # 确保cache目录存在
    cache_dir = "cache"
    os.makedirs(cache_dir, exist_ok=True)
    print(f"[OK] 确认cache目录存在")
    
    # 需要移动的文件模式
    file_patterns = [
        "addonFamilies_*.json",
        "bandwidth_options_*.json",
        "cpu_options_*.json",
        "server_details_*.json",
        "sk_server_*.json",
        "sysle_server_*.json"
    ]
    
    moved_count = 0
    deleted_count = 0
    
    print("\n扫描并移动调试文件:")
    
    for pattern in file_patterns:
        files = glob.glob(pattern)
        if files:
            print(f"\n  处理 {pattern} ({len(files)} 个文件):")
            for file_path in files:
                try:
                    target_path = os.path.join(cache_dir, file_path)
                    
                    # 如果目标文件已存在，比较哪个更新
                    if os.path.exists(target_path):
                        # 保留较新的文件
                        src_time = os.path.getmtime(file_path)
                        dst_time = os.path.getmtime(target_path)
                        
                        if src_time > dst_time:
                            shutil.move(file_path, target_path)
                            print(f"    [UPDATED] {file_path}")
                            moved_count += 1
                        else:
                            os.remove(file_path)
                            print(f"    [DELETED] {file_path} (cache中有更新版本)")
                            deleted_count += 1
                    else:
                        shutil.move(file_path, target_path)
                        print(f"    [MOVED] {file_path} -> {target_path}")
                        moved_count += 1
                except Exception as e:
                    print(f"    [ERROR] 处理 {file_path} 失败: {e}")
    
    # 移动api_responses目录
    if os.path.exists("api_responses"):
        try:
            target_dir = os.path.join(cache_dir, "api_responses")
            if os.path.exists(target_dir):
                print(f"\n  [INFO] cache/api_responses 已存在，删除旧的根目录版本")
                shutil.rmtree("api_responses")
                deleted_count += 1
            else:
                shutil.move("api_responses", target_dir)
                print(f"\n  [MOVED] api_responses/ -> {target_dir}/")
                moved_count += 1
        except Exception as e:
            print(f"\n  [ERROR] 处理 api_responses 目录失败: {e}")
    
    print("\n" + "=" * 50)
    if moved_count > 0 or deleted_count > 0:
        print(f"[SUCCESS] 清理完成！")
        print(f"  移动: {moved_count} 个文件/目录")
        print(f"  删除: {deleted_count} 个重复文件")
    else:
        print("[SUCCESS] 根目录已经很干净，无需清理")
    print("=" * 50)
    
    # 显示根目录当前状态
    print("\n根目录文件 (排除标准文件):")
    standard_files = {
        'app.py', 'main.py', 'requirements.txt', 'README.txt',
        '.gitignore', 'MIGRATION_GUIDE.md', 'STRUCTURE.md',
        'migrate_files.py', 'migrate_now.py', 'cleanup_debug_files.py'
    }
    standard_dirs = {'data', 'cache', 'logs', 'venv', '__pycache__'}
    
    remaining_files = []
    for item in os.listdir('.'):
        if os.path.isfile(item) and item not in standard_files:
            if item.endswith('.json') or item.endswith('.log'):
                remaining_files.append(item)
    
    if remaining_files:
        print(f"  发现 {len(remaining_files)} 个其他文件:")
        for f in remaining_files[:10]:  # 只显示前10个
            print(f"    - {f}")
        if len(remaining_files) > 10:
            print(f"    ... 还有 {len(remaining_files) - 10} 个文件")
        print("\n  建议: 检查这些文件是否需要移动到cache目录")
    else:
        print("  [CLEAN] 根目录已整洁")

if __name__ == '__main__':
    try:
        cleanup_debug_files()
    except Exception as e:
        print(f"\n[ERROR] 清理过程中出错: {e}")
        import traceback
        traceback.print_exc()
