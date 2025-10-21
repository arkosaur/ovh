"""
API安全测试脚本
用于验证API密钥验证机制是否正常工作
"""

import requests
import time
import json
from api_key_config import API_SECRET_KEY

# 测试配置
BASE_URL = "http://localhost:5000"
TEST_ENDPOINT = "/api/config"

def print_test_result(test_name, success, response=None):
    """打印测试结果"""
    status = "✅ 通过" if success else "❌ 失败"
    print(f"\n{status} - {test_name}")
    if response:
        print(f"   状态码: {response.status_code}")
        try:
            print(f"   响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        except:
            print(f"   响应: {response.text}")

def test_no_api_key():
    """测试1: 无API密钥的请求应该被拒绝"""
    print("\n" + "="*60)
    print("测试1: 无API密钥的请求")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}{TEST_ENDPOINT}")
        success = response.status_code == 401
        print_test_result("无密钥请求应返回401", success, response)
        return success
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False

def test_invalid_api_key():
    """测试2: 错误的API密钥应该被拒绝"""
    print("\n" + "="*60)
    print("测试2: 错误的API密钥")
    print("="*60)
    
    try:
        headers = {
            'X-API-Key': 'wrong-api-key-12345',
            'X-Request-Time': str(int(time.time() * 1000))
        }
        response = requests.get(f"{BASE_URL}{TEST_ENDPOINT}", headers=headers)
        success = response.status_code == 401
        print_test_result("错误密钥应返回401", success, response)
        return success
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False

def test_valid_api_key():
    """测试3: 正确的API密钥应该通过验证"""
    print("\n" + "="*60)
    print("测试3: 正确的API密钥")
    print("="*60)
    
    try:
        headers = {
            'X-API-Key': API_SECRET_KEY,
            'X-Request-Time': str(int(time.time() * 1000))
        }
        response = requests.get(f"{BASE_URL}{TEST_ENDPOINT}", headers=headers)
        success = response.status_code == 200
        print_test_result("正确密钥应返回200", success, response)
        return success
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False

def test_expired_timestamp():
    """测试4: 过期的时间戳应该被拒绝"""
    print("\n" + "="*60)
    print("测试4: 过期的时间戳（6分钟前）")
    print("="*60)
    
    try:
        # 使用6分钟前的时间戳
        old_timestamp = int((time.time() - 360) * 1000)
        headers = {
            'X-API-Key': API_SECRET_KEY,
            'X-Request-Time': str(old_timestamp)
        }
        response = requests.get(f"{BASE_URL}{TEST_ENDPOINT}", headers=headers)
        success = response.status_code == 401
        print_test_result("过期时间戳应返回401", success, response)
        return success
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False

def test_valid_timestamp():
    """测试5: 有效的时间戳应该通过验证"""
    print("\n" + "="*60)
    print("测试5: 有效的时间戳（当前时间）")
    print("="*60)
    
    try:
        headers = {
            'X-API-Key': API_SECRET_KEY,
            'X-Request-Time': str(int(time.time() * 1000))
        }
        response = requests.get(f"{BASE_URL}{TEST_ENDPOINT}", headers=headers)
        success = response.status_code == 200
        print_test_result("有效时间戳应返回200", success, response)
        return success
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False

def test_post_request():
    """测试6: POST请求也应该受到保护"""
    print("\n" + "="*60)
    print("测试6: POST请求验证")
    print("="*60)
    
    try:
        # 测试无密钥的POST请求
        response = requests.post(f"{BASE_URL}/api/queue")
        success = response.status_code == 401
        print_test_result("无密钥POST请求应返回401", success, response)
        return success
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False

def run_all_tests():
    """运行所有测试"""
    print("\n" + "="*60)
    print("🔒 API安全机制测试")
    print("="*60)
    print(f"测试目标: {BASE_URL}")
    print(f"使用密钥: {API_SECRET_KEY[:10]}...")
    
    tests = [
        ("无API密钥请求", test_no_api_key),
        ("错误API密钥请求", test_invalid_api_key),
        ("正确API密钥请求", test_valid_api_key),
        ("过期时间戳请求", test_expired_timestamp),
        ("有效时间戳请求", test_valid_timestamp),
        ("POST请求验证", test_post_request),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ 测试 '{test_name}' 发生异常: {str(e)}")
            results.append((test_name, False))
    
    # 打印总结
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status} - {test_name}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！API安全机制工作正常。")
    else:
        print(f"\n⚠️  有 {total - passed} 个测试失败，请检查配置。")
    
    return passed == total

if __name__ == "__main__":
    print("\n请确保后端服务器正在运行 (python app.py)")
    input("按 Enter 键开始测试...")
    
    try:
        success = run_all_tests()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ 测试过程中发生错误: {str(e)}")
        exit(1)
