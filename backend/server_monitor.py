"""
服务器监控模块
定时检查服务器可用性变化并发送通知
"""

import threading
import time
from datetime import datetime
import traceback


class ServerMonitor:
    """服务器监控类"""
    
    def __init__(self, check_availability_func, send_notification_func, add_log_func):
        """
        初始化监控器
        
        Args:
            check_availability_func: 检查服务器可用性的函数
            send_notification_func: 发送通知的函数
            add_log_func: 添加日志的函数
        """
        self.check_availability = check_availability_func
        self.send_notification = send_notification_func
        self.add_log = add_log_func
        
        self.subscriptions = []  # 订阅列表
        self.known_servers = set()  # 已知服务器集合
        self.running = False  # 运行状态
        self.check_interval = 60  # 检查间隔（秒），默认60秒
        self.thread = None
        
        self.add_log("INFO", "服务器监控器初始化完成", "monitor")
    
    def add_subscription(self, plan_code, datacenters=None, notify_available=True, notify_unavailable=False):
        """
        添加服务器订阅
        
        Args:
            plan_code: 服务器型号代码
            datacenters: 要监控的数据中心列表，None或空列表表示监控所有
            notify_available: 是否在有货时提醒
            notify_unavailable: 是否在无货时提醒
        """
        # 检查是否已存在
        existing = next((s for s in self.subscriptions if s["planCode"] == plan_code), None)
        if existing:
            self.add_log("WARNING", f"订阅已存在: {plan_code}，将更新配置", "monitor")
            existing["datacenters"] = datacenters or []
            existing["notifyAvailable"] = notify_available
            existing["notifyUnavailable"] = notify_unavailable
            # 确保历史记录字段存在
            if "history" not in existing:
                existing["history"] = []
            return
        
        subscription = {
            "planCode": plan_code,
            "datacenters": datacenters or [],
            "notifyAvailable": notify_available,
            "notifyUnavailable": notify_unavailable,
            "lastStatus": {},  # 记录上次状态
            "createdAt": datetime.now().isoformat(),
            "history": []  # 历史记录
        }
        
        self.subscriptions.append(subscription)
        self.add_log("INFO", f"添加订阅: {plan_code}, 数据中心: {datacenters or '全部'}", "monitor")
    
    def remove_subscription(self, plan_code):
        """删除订阅"""
        original_count = len(self.subscriptions)
        self.subscriptions = [s for s in self.subscriptions if s["planCode"] != plan_code]
        
        if len(self.subscriptions) < original_count:
            self.add_log("INFO", f"删除订阅: {plan_code}", "monitor")
            return True
        return False
    
    def clear_subscriptions(self):
        """清空所有订阅"""
        count = len(self.subscriptions)
        self.subscriptions = []
        self.add_log("INFO", f"清空所有订阅 ({count} 项)", "monitor")
        return count
    
    def check_availability_change(self, subscription):
        """
        检查单个订阅的可用性变化
        
        Args:
            subscription: 订阅配置
        """
        plan_code = subscription["planCode"]
        
        try:
            # 获取当前可用性
            current_availability = self.check_availability(plan_code)
            if not current_availability:
                self.add_log("WARNING", f"无法获取 {plan_code} 的可用性信息", "monitor")
                return
            
            last_status = subscription.get("lastStatus", {})
            monitored_dcs = subscription.get("datacenters", [])
            
            # 调试日志
            self.add_log("INFO", f"订阅 {plan_code} - 监控数据中心: {monitored_dcs if monitored_dcs else '全部'}", "monitor")
            self.add_log("INFO", f"订阅 {plan_code} - 当前可用性: {current_availability}", "monitor")
            self.add_log("INFO", f"订阅 {plan_code} - 上次状态: {last_status}", "monitor")
            
            # 检查每个数据中心的变化
            for dc, status in current_availability.items():
                # 如果指定了数据中心列表，只监控列表中的
                if monitored_dcs and dc not in monitored_dcs:
                    self.add_log("INFO", f"跳过数据中心 {dc}（不在监控列表中）", "monitor")
                    continue
                
                old_status = last_status.get(dc)
                
                # 状态变化检测
                status_changed = False
                change_type = None
                
                # 首次检查（old_status为None）且服务器可用
                if old_status is None and status != "unavailable":
                    if subscription.get("notifyAvailable", True):
                        status_changed = True
                        change_type = "available"
                        self.add_log("INFO", f"首次检查发现 {plan_code}@{dc} 有货", "monitor")
                
                # 从无货变有货
                elif old_status == "unavailable" and status != "unavailable":
                    if subscription.get("notifyAvailable", True):
                        status_changed = True
                        change_type = "available"
                        self.add_log("INFO", f"{plan_code}@{dc} 从无货变有货", "monitor")
                
                # 从有货变无货
                elif old_status not in ["unavailable", None] and status == "unavailable":
                    if subscription.get("notifyUnavailable", False):
                        status_changed = True
                        change_type = "unavailable"
                        self.add_log("INFO", f"{plan_code}@{dc} 从有货变无货", "monitor")
                
                # 发送通知并记录历史
                if status_changed:
                    self.add_log("INFO", f"准备发送提醒: {plan_code}@{dc} - {change_type}", "monitor")
                    self.send_availability_alert(plan_code, dc, status, change_type)
                    
                    # 添加到历史记录
                    if "history" not in subscription:
                        subscription["history"] = []
                    
                    history_entry = {
                        "timestamp": datetime.now().isoformat(),
                        "datacenter": dc,
                        "status": status,
                        "changeType": change_type,
                        "oldStatus": old_status
                    }
                    subscription["history"].append(history_entry)
                    
                    # 限制历史记录数量，保留最近100条
                    if len(subscription["history"]) > 100:
                        subscription["history"] = subscription["history"][-100:]
            
            # 更新状态
            subscription["lastStatus"] = current_availability
            
        except Exception as e:
            self.add_log("ERROR", f"检查 {plan_code} 可用性时出错: {str(e)}", "monitor")
            self.add_log("ERROR", f"错误详情: {traceback.format_exc()}", "monitor")
    
    def send_availability_alert(self, plan_code, datacenter, status, change_type):
        """发送可用性变化提醒"""
        try:
            if change_type == "available":
                message = (
                    f"🎉 服务器上架通知！\n\n"
                    f"型号: {plan_code}\n"
                    f"数据中心: {datacenter}\n"
                    f"状态: {status}\n"
                    f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                    f"💡 快去抢购吧！"
                )
            else:
                message = (
                    f"📦 服务器下架通知\n\n"
                    f"型号: {plan_code}\n"
                    f"数据中心: {datacenter}\n"
                    f"状态: 已无货\n"
                    f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                )
            
            self.add_log("INFO", f"正在发送Telegram通知: {plan_code}@{datacenter}", "monitor")
            result = self.send_notification(message)
            
            if result:
                self.add_log("INFO", f"✅ Telegram通知发送成功: {plan_code}@{datacenter} - {change_type}", "monitor")
            else:
                self.add_log("WARNING", f"⚠️ Telegram通知发送失败: {plan_code}@{datacenter}", "monitor")
            
        except Exception as e:
            self.add_log("ERROR", f"发送提醒时发生异常: {str(e)}", "monitor")
            self.add_log("ERROR", f"错误详情: {traceback.format_exc()}", "monitor")
    
    def check_new_servers(self, current_server_list):
        """
        检查新服务器上架
        
        Args:
            current_server_list: 当前服务器列表
        """
        try:
            current_codes = {s.get("planCode") for s in current_server_list if s.get("planCode")}
            
            # 首次运行，初始化已知服务器
            if not self.known_servers:
                self.known_servers = current_codes
                self.add_log("INFO", f"初始化已知服务器列表: {len(current_codes)} 台", "monitor")
                return
            
            # 找出新服务器
            new_servers = current_codes - self.known_servers
            
            if new_servers:
                for server_code in new_servers:
                    server = next((s for s in current_server_list if s.get("planCode") == server_code), None)
                    if server:
                        self.send_new_server_alert(server)
                
                # 更新已知服务器列表
                self.known_servers = current_codes
                self.add_log("INFO", f"检测到 {len(new_servers)} 台新服务器上架", "monitor")
        
        except Exception as e:
            self.add_log("ERROR", f"检查新服务器时出错: {str(e)}", "monitor")
    
    def send_new_server_alert(self, server):
        """发送新服务器上架提醒"""
        try:
            message = (
                f"🆕 新服务器上架通知！\n\n"
                f"型号: {server.get('planCode', 'N/A')}\n"
                f"名称: {server.get('name', 'N/A')}\n"
                f"CPU: {server.get('cpu', 'N/A')}\n"
                f"内存: {server.get('memory', 'N/A')}\n"
                f"存储: {server.get('storage', 'N/A')}\n"
                f"带宽: {server.get('bandwidth', 'N/A')}\n"
                f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                f"💡 快去查看详情！"
            )
            
            self.send_notification(message)
            self.add_log("INFO", f"发送新服务器提醒: {server.get('planCode')}", "monitor")
            
        except Exception as e:
            self.add_log("ERROR", f"发送新服务器提醒失败: {str(e)}", "monitor")
    
    def monitor_loop(self):
        """监控主循环"""
        self.add_log("INFO", "监控循环已启动", "monitor")
        
        while self.running:
            try:
                # 检查订阅的服务器
                if self.subscriptions:
                    self.add_log("INFO", f"开始检查 {len(self.subscriptions)} 个订阅...", "monitor")
                    
                    for subscription in self.subscriptions:
                        if not self.running:  # 检查是否被停止
                            break
                        self.check_availability_change(subscription)
                        time.sleep(1)  # 避免请求过快
                else:
                    self.add_log("INFO", "当前无订阅，跳过检查", "monitor")
                
                # 注意：新服务器检查需要在外部调用时传入服务器列表
                
            except Exception as e:
                self.add_log("ERROR", f"监控循环出错: {str(e)}", "monitor")
                self.add_log("ERROR", f"错误详情: {traceback.format_exc()}", "monitor")
            
            # 等待下次检查（使用可中断的sleep）
            if self.running:
                self.add_log("INFO", f"等待 {self.check_interval} 秒后进行下次检查...", "monitor")
                # 分段sleep，每秒检查一次running状态，实现快速停止
                for _ in range(self.check_interval):
                    if not self.running:
                        break
                    time.sleep(1)
        
        self.add_log("INFO", "监控循环已停止", "monitor")
    
    def start(self):
        """启动监控"""
        if self.running:
            self.add_log("WARNING", "监控已在运行中", "monitor")
            return False
        
        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        
        self.add_log("INFO", f"服务器监控已启动 (检查间隔: {self.check_interval}秒)", "monitor")
        return True
    
    def stop(self):
        """停止监控"""
        if not self.running:
            self.add_log("WARNING", "监控未运行", "monitor")
            return False
        
        self.running = False
        self.add_log("INFO", "正在停止服务器监控...", "monitor")
        
        # 等待线程结束（最多等待3秒，因为已优化为1秒检查一次）
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=3)
        
        self.add_log("INFO", "服务器监控已停止", "monitor")
        return True
    
    def get_status(self):
        """获取监控状态"""
        return {
            "running": self.running,
            "subscriptions_count": len(self.subscriptions),
            "known_servers_count": len(self.known_servers),
            "check_interval": self.check_interval,
            "subscriptions": self.subscriptions
        }
    
    def set_check_interval(self, interval):
        """设置检查间隔（秒）"""
        if interval < 60:
            self.add_log("WARNING", "检查间隔不能小于60秒", "monitor")
            return False
        
        self.check_interval = interval
        self.add_log("INFO", f"检查间隔已设置为 {interval} 秒", "monitor")
        return True
