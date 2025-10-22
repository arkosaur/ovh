import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/utils/apiClient';
import { toast } from 'sonner';
import { Bell, BellOff, Plus, Trash2, Play, Square, Settings, Clock, RefreshCw } from 'lucide-react';
import { useAPI } from '@/context/APIContext';

interface Subscription {
  planCode: string;
  datacenters: string[];
  notifyAvailable: boolean;
  notifyUnavailable: boolean;
  lastStatus: Record<string, string>;
  createdAt: string;
}

interface MonitorStatus {
  running: boolean;
  subscriptions_count: number;
  known_servers_count: number;
  check_interval: number;
}

const MonitorPage = () => {
  const { isAuthenticated } = useAPI();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus>({
    running: false,
    subscriptions_count: 0,
    known_servers_count: 0,
    check_interval: 300
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // 添加订阅表单
  const [formData, setFormData] = useState({
    planCode: '',
    datacenters: '',
    notifyAvailable: true,
    notifyUnavailable: false
  });

  // 加载订阅列表
  const loadSubscriptions = async () => {
    try {
      const response = await api.get('/monitor/subscriptions');
      setSubscriptions(response.data);
    } catch (error) {
      console.error('加载订阅失败:', error);
      toast.error('加载订阅失败');
    }
  };

  // 加载监控状态
  const loadMonitorStatus = async () => {
    try {
      const response = await api.get('/monitor/status');
      setMonitorStatus(response.data);
    } catch (error) {
      console.error('加载监控状态失败:', error);
    }
  };

  // 添加订阅
  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.planCode.trim()) {
      toast.error('请输入服务器型号');
      return;
    }
    
    try {
      const datacenters = formData.datacenters
        .split(',')
        .map(dc => dc.trim())
        .filter(dc => dc);
      
      await api.post('/monitor/subscriptions', {
        planCode: formData.planCode.trim(),
        datacenters: datacenters.length > 0 ? datacenters : [],
        notifyAvailable: formData.notifyAvailable,
        notifyUnavailable: formData.notifyUnavailable
      });
      
      toast.success(`已订阅 ${formData.planCode}`);
      setFormData({
        planCode: '',
        datacenters: '',
        notifyAvailable: true,
        notifyUnavailable: false
      });
      setShowAddForm(false);
      loadSubscriptions();
      loadMonitorStatus();
    } catch (error) {
      toast.error('订阅失败');
    }
  };

  // 删除订阅
  const handleRemoveSubscription = async (planCode: string) => {
    if (!window.confirm(`确定要取消订阅 ${planCode} 吗？`)) {
      return;
    }
    
    try {
      await api.delete(`/monitor/subscriptions/${planCode}`);
      toast.success(`已取消订阅 ${planCode}`);
      loadSubscriptions();
      loadMonitorStatus();
    } catch (error) {
      toast.error('取消订阅失败');
    }
  };

  // 清空所有订阅
  const handleClearAll = async () => {
    if (!window.confirm('确定要清空所有订阅吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      const response = await api.delete('/monitor/subscriptions/clear');
      toast.success(`已清空 ${response.data.count} 个订阅`);
      loadSubscriptions();
      loadMonitorStatus();
    } catch (error) {
      toast.error('清空订阅失败');
    }
  };

  // 启动/停止监控
  const toggleMonitor = async () => {
    setIsLoading(true);
    try {
      const endpoint = monitorStatus.running ? '/monitor/stop' : '/monitor/start';
      const response = await api.post(endpoint);
      toast.success(response.data.message);
      loadMonitorStatus();
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 测试Telegram通知
  const testNotification = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/monitor/test-notification');
      toast.success(response.data.message);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '测试失败';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscriptions();
      loadMonitorStatus();
      
      // 定时刷新状态
      const interval = setInterval(() => {
        loadMonitorStatus();
      }, 30000); // 30秒刷新一次
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  return (
    <div className="space-y-6 p-4 md:p-6 bg-cyber-background text-cyber-text min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold mb-1 cyber-glow-text">服务器监控</h1>
        <p className="text-cyber-muted mb-6">自动监控服务器可用性变化并推送通知</p>
      </motion.div>

      {/* 监控状态卡片 */}
      <div className="cyber-panel p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {monitorStatus.running ? (
              <div className="p-2 bg-green-500/20 rounded">
                <Bell className="text-green-400" size={24} />
              </div>
            ) : (
              <div className="p-2 bg-gray-500/20 rounded">
                <BellOff className="text-gray-400" size={24} />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold">监控状态</h3>
              <p className="text-sm text-cyber-muted">
                {monitorStatus.running ? (
                  <span className="text-green-400">● 运行中</span>
                ) : (
                  <span className="text-gray-400">● 已停止</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                loadSubscriptions();
                loadMonitorStatus();
              }}
              className="px-4 py-2 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 rounded-md transition-all flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
            >
              <RefreshCw size={16} />
              刷新
            </button>
            <button
              onClick={toggleMonitor}
              disabled={isLoading}
              className={`px-5 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                monitorStatus.running 
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 hover:border-red-500/60' 
                  : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40 hover:border-green-500/60'
              }`}
            >
              {monitorStatus.running ? (
                <><Square size={16} /> 停止监控</>
              ) : (
                <><Play size={16} /> 启动监控</>
              )}
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-cyber-grid/10 p-3 rounded border border-cyber-accent/20">
            <p className="text-xs text-cyber-muted mb-1">订阅数</p>
            <p className="text-2xl font-bold text-cyber-accent">{monitorStatus.subscriptions_count}</p>
          </div>
          <div className="bg-cyber-grid/10 p-3 rounded border border-cyber-accent/20">
            <p className="text-xs text-cyber-muted mb-1">检查间隔</p>
            <p className="text-2xl font-bold text-cyber-accent">{monitorStatus.check_interval}s</p>
          </div>
          <div className="bg-cyber-grid/10 p-3 rounded border border-cyber-accent/20">
            <p className="text-xs text-cyber-muted mb-1">已知服务器</p>
            <p className="text-2xl font-bold text-cyber-accent">{monitorStatus.known_servers_count}</p>
          </div>
        </div>
      </div>

      {/* 提醒说明 */}
      <div className="bg-cyber-accent/10 border border-cyber-accent/30 rounded p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-cyber-accent font-medium flex items-center gap-2">
            <Clock size={18} />
            监控说明
          </h4>
          <button
            onClick={testNotification}
            disabled={isLoading}
            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 hover:border-blue-500/60 rounded-md transition-all flex items-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Bell size={14} />
            测试通知
          </button>
        </div>
        <ul className="text-sm text-cyber-muted space-y-1">
          <li>• 监控器每 {monitorStatus.check_interval} 秒检查一次订阅的服务器可用性</li>
          <li>• 当服务器从无货变有货时，会发送 Telegram 通知</li>
          <li>• 确保已在设置页面配置 Telegram Token 和 Chat ID</li>
          <li>• 可以指定监控特定数据中心，或留空监控所有数据中心</li>
          <li>• 点击右上角"测试通知"按钮可以立即测试 Telegram 配置</li>
        </ul>
      </div>

      {/* 订阅列表 */}
      <div className="cyber-panel p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Settings size={18} />
            订阅列表
          </h4>
          <div className="flex gap-2">
            {subscriptions.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 hover:border-red-500/60 rounded-md transition-all flex items-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md"
              >
                <Trash2 size={14} />
                清空全部
              </button>
            )}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-cyber-primary hover:bg-cyber-primary-dark text-white border border-cyber-primary/40 hover:border-cyber-primary rounded-md transition-all flex items-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md"
            >
              <Plus size={14} />
              添加订阅
            </button>
          </div>
        </div>

        {/* 添加订阅表单 */}
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-4 bg-cyber-grid/10 rounded border border-cyber-accent/20"
          >
            <form onSubmit={handleAddSubscription} className="space-y-3">
              <div>
                <label className="block text-sm text-cyber-muted mb-1">服务器型号 *</label>
                <input
                  type="text"
                  value={formData.planCode}
                  onChange={(e) => setFormData({...formData, planCode: e.target.value})}
                  placeholder="例如: 24ska01"
                  className="cyber-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-cyber-muted mb-1">
                  数据中心（可选，多个用逗号分隔）
                </label>
                <input
                  type="text"
                  value={formData.datacenters}
                  onChange={(e) => setFormData({...formData, datacenters: e.target.value})}
                  placeholder="例如: gra,rbx,sbg 或留空监控所有"
                  className="cyber-input w-full"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyAvailable}
                    onChange={(e) => setFormData({...formData, notifyAvailable: e.target.checked})}
                    className="cyber-checkbox"
                  />
                  <span className="text-sm">有货时提醒</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyUnavailable}
                    onChange={(e) => setFormData({...formData, notifyUnavailable: e.target.checked})}
                    className="cyber-checkbox"
                  />
                  <span className="text-sm">无货时提醒</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-cyber-primary hover:bg-cyber-primary-dark text-white border border-cyber-primary/40 hover:border-cyber-primary rounded-md transition-all font-medium shadow-sm hover:shadow-md"
                >
                  确认添加
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2.5 bg-cyber-grid/10 hover:bg-cyber-grid/20 text-cyber-text border border-cyber-accent/30 hover:border-cyber-accent/50 rounded-md transition-all font-medium shadow-sm hover:shadow-md"
                >
                  取消
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* 订阅列表 */}
        {subscriptions.length === 0 ? (
          <div className="text-center text-cyber-muted py-12">
            <Bell size={48} className="mx-auto mb-4 opacity-30" />
            <p>暂无订阅</p>
            <p className="text-sm mt-2">点击"添加订阅"按钮开始监控服务器</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <motion.div
                key={sub.planCode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-start p-3 bg-cyber-grid/10 rounded border border-cyber-accent/20 hover:border-cyber-accent/40 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-cyber-accent">{sub.planCode}</p>
                  <p className="text-xs text-cyber-muted mt-1">
                    {sub.datacenters.length > 0 
                      ? `监控数据中心: ${sub.datacenters.join(', ')}`
                      : '监控所有数据中心'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {sub.notifyAvailable && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                        有货提醒
                      </span>
                    )}
                    {sub.notifyUnavailable && (
                      <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                        无货提醒
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleRemoveSubscription(sub.planCode)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title="删除订阅"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitorPage;
