import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Search, CheckCircle, Clock, Plus, AlertCircle, Play, Pause, Trash2, RefreshCw } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { useToast } from '../components/ToastContainer';

interface ConfigOption {
  memory: {
    code: string;
    display: string;
  };
  storage: {
    code: string;
    display: string;
  };
  matched_api2: Array<{
    planCode: string;
    datacenters: string[];
  }>;
  match_count: number;
}

interface ConfigSniperTask {
  id: string;
  api1_planCode: string;
  bound_config: {
    memory: string;
    storage: string;
  };
  match_status: 'matched' | 'pending_match';
  matched_api2: string[]; // API2 planCode 列表
  enabled: boolean;
  last_check: string | null;
  created_at: string;
}

const ConfigSniperPage: React.FC = () => {
  const { showToast, showConfirm } = useToast();
  const [step, setStep] = useState<'input' | 'select' | 'tasks'>('input');
  const [planCode, setPlanCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [configOptions, setConfigOptions] = useState<ConfigOption[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ConfigOption | null>(null);
  const [tasks, setTasks] = useState<ConfigSniperTask[]>([]);
  const [error, setError] = useState('');

  const loadTasks = async () => {
    try {
      const response = await apiClient.get('/config-sniper/tasks');
      setTasks(response.data.tasks || []);
    } catch (err: any) {
      console.error('加载任务失败:', err);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleQueryPlanCode = async () => {
    if (!planCode.trim()) {
      setError('请输入型号代码');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await apiClient.get(`/config-sniper/options/${planCode.trim()}`);
      
      if (response.data.success) {
        setConfigOptions(response.data.configs);
        setStep('select');
      } else {
        setError(response.data.error || '查询失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (mode: 'matched' | 'pending_match') => {
    if (!selectedConfig) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/config-sniper/tasks', {
        api1_planCode: planCode,
        bound_config: {
          memory: selectedConfig.memory.code,
          storage: selectedConfig.storage.code
        },
        mode: mode  // 添加模式参数
      });

      if (response.data.success) {
        showToast({ type: 'success', title: response.data.message });
        await loadTasks();
        setPlanCode('');
        setSelectedConfig(null);
        setConfigOptions([]);
        setStep('tasks');
      } else {
        showToast({ type: 'error', title: response.data.error || '创建失败' });
        setError(response.data.error || '创建失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await showConfirm({
      title: '确定要删除这个任务吗？',
      message: '删除后无法恢复',
      confirmText: '删除',
      cancelText: '取消'
    });
    
    if (!confirmed) return;

    try {
      await apiClient.delete(`/config-sniper/tasks/${taskId}`);
      showToast({
        type: 'success',
        title: '删除成功'
      });
      await loadTasks();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '删除失败',
        message: err.response?.data?.error || err.message
      });
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await apiClient.put(`/config-sniper/tasks/${taskId}/toggle`);
      await loadTasks();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '操作失败',
        message: err.response?.data?.error || err.message
      });
    }
  };

  const handleCheckTask = async (taskId: string) => {
    try {
      const response = await apiClient.post(`/config-sniper/tasks/${taskId}/check`);
      showToast({
        type: 'success',
        title: '检查完成',
        message: response.data.message
      });
      await loadTasks();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '检查失败',
        message: err.response?.data?.error || err.message
      });
    }
  };

  const handleQuickOrder = async (plancode: string, datacenter: string) => {
    const confirmed = await showConfirm({
      title: '确定立即下单？',
      message: `型号: ${plancode}\n机房: ${datacenter.toUpperCase()}`,
      confirmText: '立即下单',
      cancelText: '取消'
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await apiClient.post('/config-sniper/quick-order', {
        planCode: plancode,
        datacenter: datacenter
      });

      if (response.data.success) {
        showToast({
          type: 'success',
          title: '已加入队列',
          message: response.data.message
        });
      } else {
        showToast({
          type: 'error',
          title: '操作失败',
          message: response.data.error
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '立即下单失败',
        message: err.response?.data?.error || err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getMatchStatusBadge = (status: string) => {
    if (status === 'matched') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-400 bg-green-400/10 border border-green-400/30 rounded">
          <CheckCircle size={14} className="mr-1" />已匹配（监控新增）
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded">
        <Clock size={14} className="mr-1" />待匹配（等待新增）
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-cyber-accent/10 rounded-lg border border-cyber-accent/30">
            <Target className="text-cyber-accent" size={24} />
          </div>
          <h1 className="text-3xl font-bold cyber-glow-text">配置绑定狙击</h1>
        </div>
        <p className="text-cyber-muted">输入型号→选择配置→匹配 API2→监控可用性→自动下单</p>
      </motion.div>

      {/* 步骤 1: 输入型号 */}
      {step === 'input' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cyber-card"
        >
          <h2 className="text-xl font-semibold mb-4 text-cyber-text">步骤 1: 输入型号代码</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQueryPlanCode()}
              placeholder="输入 API1 型号（如 24ska01、26sklea01-v1）"
              className="flex-1 px-4 py-3 bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg focus:ring-2 focus:ring-cyber-accent focus:border-cyber-accent text-cyber-text placeholder-cyber-muted"
              disabled={loading}
            />
            <button
              onClick={handleQueryPlanCode}
              disabled={loading || !planCode.trim()}
              className="px-6 py-3 bg-cyber-accent text-white rounded-lg hover:bg-cyber-accent/80 disabled:bg-cyber-grid disabled:text-cyber-muted disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-neon-sm"
            >
              <Search size={18} />
              {loading ? '查询中...' : '查询配置'}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}
          <div className="mt-6">
            <button
              onClick={() => setStep('tasks')}
              className="text-cyber-accent hover:text-cyber-neon flex items-center gap-2 transition-colors"
            >
              查看已创建的任务 →
            </button>
          </div>
        </motion.div>
      )}

      {/* 步骤 2: 选择配置 */}
      {step === 'select' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cyber-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-cyber-text">步骤 2: 选择配置</h2>
            <button
              onClick={() => { setStep('input'); setConfigOptions([]); setSelectedConfig(null); }}
              className="text-cyber-muted hover:text-cyber-text transition-colors"
            >
              ← 返回
            </button>
          </div>
          
          <div className="mb-4 p-4 bg-cyber-accent/10 border border-cyber-accent/30 rounded-lg">
            <p className="text-cyber-text">
              <strong>型号:</strong> {planCode} | 
              <strong className="ml-4">找到 {configOptions.length} 种配置</strong>
            </p>
          </div>

          <div className="space-y-4">
            {configOptions.map((config, index) => (
              <div
                key={index}
                onClick={() => setSelectedConfig(config)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedConfig === config
                    ? 'border-cyber-accent bg-cyber-accent/5 shadow-neon'
                    : 'border-cyber-accent/30 hover:border-cyber-accent/50 bg-cyber-grid/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <input
                        type="radio"
                        checked={selectedConfig === config}
                        onChange={() => setSelectedConfig(config)}
                        className="w-5 h-5 accent-cyber-accent"
                      />
                      <div>
                        <p className="font-semibold text-lg text-cyber-text">{config.memory.display} + {config.storage.display}</p>
                        <p className="text-sm text-cyber-muted">
                          {config.memory.code} | {config.storage.code}
                        </p>
                      </div>
                    </div>
                    
                    {config.matched_api2.length > 0 && (
                      <div className="ml-9 mt-3">
                        <p className="text-sm text-cyber-muted mb-2">
                          匹配的 API2 型号 ({config.match_count} 个) - 点击立即下单:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {config.matched_api2.map((item, idx) => (
                            item.datacenters.map((dc, dcIdx) => (
                              <button
                                key={`${idx}-${dcIdx}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickOrder(item.planCode, dc);
                                }}
                                className="px-3 py-2 text-xs rounded bg-gradient-to-br from-cyber-grid to-cyber-grid/30 border-2 border-cyber-accent/40 hover:border-cyber-accent hover:shadow-neon-md hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-0.5 min-w-[90px] group"
                              >
                                <span className="font-bold text-cyber-accent group-hover:text-white transition-colors">{item.planCode}</span>
                                <span className="text-xs text-cyber-muted group-hover:text-cyan-200 transition-colors">@{dc.toUpperCase()}</span>
                              </button>
                            ))
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    {config.match_count > 0 ? (
                      <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-400 bg-green-400/10 border border-green-400/30 rounded">
                        <CheckCircle size={16} className="mr-1" />
                        {config.match_count} 个可下单
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded">
                        <AlertCircle size={16} className="mr-1" />
                        暂无匹配
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="p-4 bg-cyber-grid/30 border border-cyber-accent/30 rounded-lg">
              <p className="text-cyber-text font-semibold mb-3">选择监控模式：</p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleCreateTask('matched')}
                  disabled={!selectedConfig || loading || selectedConfig.match_count === 0}
                  className="flex-1 px-6 py-4 bg-green-500/20 border-2 border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 hover:border-green-500 disabled:bg-cyber-grid disabled:text-cyber-muted disabled:border-cyber-grid disabled:cursor-not-allowed flex flex-col items-center gap-2 transition-all shadow-neon-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} />
                    <span className="font-bold">{loading ? '创建中...' : '已匹配模式'}</span>
                  </div>
                  <span className="text-xs text-center">
                    监控 {selectedConfig?.match_count || 0} 个已知型号，有货立即下单
                  </span>
                </button>
                
                <button
                  onClick={() => handleCreateTask('pending_match')}
                  disabled={!selectedConfig || loading}
                  className="flex-1 px-6 py-4 bg-yellow-500/20 border-2 border-yellow-500/50 text-yellow-400 rounded-lg hover:bg-yellow-500/30 hover:border-yellow-500 disabled:bg-cyber-grid disabled:text-cyber-muted disabled:border-cyber-grid disabled:cursor-not-allowed flex flex-col items-center gap-2 transition-all shadow-neon-sm"
                >
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    <span className="font-bold">{loading ? '创建中...' : '未匹配模式'}</span>
                  </div>
                  <span className="text-xs text-center">
                    排除 {selectedConfig?.match_count || 0} 个已知型号，等待新增型号
                  </span>
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setStep('input')}
              className="px-6 py-3 border border-cyber-accent/50 text-cyber-text rounded-lg hover:bg-cyber-accent/10 transition-all"
            >
              ← 返回上一步
            </button>
          </div>
        </motion.div>
      )}

      {/* 步骤 3: 任务列表 */}
      {step === 'tasks' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cyber-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-cyber-text">监控任务列表</h2>
            <div className="flex gap-4">
              <button
                onClick={loadTasks}
                className="px-4 py-2 border border-cyber-accent/30 text-cyber-text rounded-lg hover:bg-cyber-grid/50 flex items-center gap-2 transition-all"
              >
                <RefreshCw size={18} />
                刷新
              </button>
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 bg-cyber-accent text-white rounded-lg hover:bg-cyber-accent/80 flex items-center gap-2 transition-all shadow-neon-sm"
              >
                <Plus size={18} />
                新建任务
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12 text-cyber-muted">
              <Target size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">还没有任务</p>
              <p className="text-sm">点击"新建任务"开始创建配置绑定狙击任务</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border border-cyber-accent/30 rounded-lg p-4 bg-cyber-grid/30 hover:bg-cyber-grid/50 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-cyber-text">{task.api1_planCode}</h3>
                        {getMatchStatusBadge(task.match_status)}
                        <span className={`px-2 py-1 text-xs rounded border ${
                          task.enabled 
                            ? 'bg-green-400/10 text-green-400 border-green-400/30' 
                            : 'bg-cyber-grid text-cyber-muted border-cyber-accent/20'
                        }`}>
                          {task.enabled ? '● 监控中' : '○ 已暂停'}
                        </span>
                      </div>

                      <div className="text-sm text-cyber-muted space-y-1">
                        <p>
                          <strong className="text-cyber-text">绑定配置:</strong> {task.bound_config.memory} + {task.bound_config.storage}
                        </p>
                        
                        {task.match_status === 'matched' && task.matched_api2.length > 0 && (
                          <p>
                            <strong className="text-cyber-text">匹配结果:</strong> 找到 {task.matched_api2.length} 个 API2 planCode
                            <span className="ml-2 text-xs text-cyber-muted">
                              (配置匹配，监控可用性)
                            </span>
                          </p>
                        )}
                        
                        <p>
                          <strong className="text-cyber-text">创建时间:</strong> {new Date(task.created_at).toLocaleString('zh-CN')}
                        </p>
                        
                        {task.last_check && (
                          <p>
                            <strong className="text-cyber-text">最后检查:</strong> {new Date(task.last_check).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className={`px-3 py-1 rounded flex items-center gap-1 text-sm transition-all ${
                          task.enabled
                            ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/20'
                            : 'bg-green-400/10 text-green-400 border border-green-400/30 hover:bg-green-400/20'
                        }`}
                      >
                        {task.enabled ? <Pause size={14} /> : <Play size={14} />}
                        {task.enabled ? '暂停' : '启动'}
                      </button>
                      
                      <button
                        onClick={() => handleCheckTask(task.id)}
                        className="px-3 py-1 bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/30 rounded hover:bg-cyber-accent/20 flex items-center gap-1 text-sm transition-all"
                      >
                        <RefreshCw size={14} />
                        立即检查
                      </button>
                      
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20 flex items-center gap-1 text-sm transition-all"
                      >
                        <Trash2 size={14} />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default ConfigSniperPage;
