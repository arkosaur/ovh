import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/utils/apiClient";
import { useToast } from "../components/ToastContainer";
import { 
  Server, 
  RefreshCw, 
  Power, 
  HardDrive, 
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Activity,
  X
} from "lucide-react";

interface ServerInfo {
  serviceName: string;
  name: string;
  commercialRange: string;
  datacenter: string;
  state: string;
  monitoring: boolean;
  reverse: string;
  ip: string;
  os: string;
  bootId: number | null;
  professionalUse: boolean;
  status: string;
  renewalType: boolean;
  error?: string;
}

interface OSTemplate {
  templateName: string;
  distribution: string;
  family: string;
  description: string;
  bitFormat: number;
}

interface ServerTask {
  taskId: number;
  function: string;
  status: string;
  comment: string;
  startDate: string;
  doneDate: string;
}

const ServerControlPage: React.FC = () => {
  const { showToast, showConfirm } = useToast();
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);
  const [osTemplates, setOsTemplates] = useState<OSTemplate[]>([]);
  const [serverTasks, setServerTasks] = useState<ServerTask[]>([]);
  const [showReinstallDialog, setShowReinstallDialog] = useState(false);
  const [showTasksDialog, setShowTasksDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customHostname, setCustomHostname] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 获取服务器列表
  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/server-control/list');
      if (response.data.success) {
        setServers(response.data.servers);
        showToast({ type: 'success', title: `已加载 ${response.data.total} 台服务器` });
      } else {
        showToast({ type: 'error', title: response.data.error || '获取服务器列表失败' });
      }
    } catch (error: any) {
      console.error('获取服务器列表失败:', error);
      showToast({ type: 'error', title: error.response?.data?.error || '获取服务器列表失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // 重启服务器
  const handleReboot = async (server: ServerInfo) => {
    const confirmed = await showConfirm({
      title: '确定要重启服务器吗？',
      message: `${server.name} (${server.serviceName})`,
      confirmText: '重启',
      cancelText: '取消'
    });

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const response = await api.post(`/server-control/${server.serviceName}/reboot`);
      if (response.data.success) {
        showToast({ type: 'success', title: response.data.message });
        await fetchServers();
      } else {
        showToast({ type: 'error', title: response.data.error || '重启失败' });
      }
    } catch (error: any) {
      console.error('重启服务器失败:', error);
      showToast({ type: 'error', title: error.response?.data?.error || '重启服务器失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 获取系统模板
  const fetchOSTemplates = async (serviceName: string) => {
    try {
      const response = await api.get(`/server-control/${serviceName}/templates`);
      if (response.data.success) {
        setOsTemplates(response.data.templates);
      } else {
        showToast({ type: 'error', title: response.data.error || '获取系统模板失败' });
      }
    } catch (error: any) {
      console.error('获取系统模板失败:', error);
      showToast({ type: 'error', title: error.response?.data?.error || '获取系统模板失败' });
    }
  };

  // 获取服务器任务
  const fetchServerTasks = async (serviceName: string) => {
    try {
      const response = await api.get(`/server-control/${serviceName}/tasks`);
      if (response.data.success) {
        setServerTasks(response.data.tasks);
      } else {
        showToast({ type: 'error', title: response.data.error || '获取任务列表失败' });
      }
    } catch (error: any) {
      console.error('获取任务列表失败:', error);
      showToast({ type: 'error', title: error.response?.data?.error || '获取任务列表失败' });
    }
  };

  // 打开重装系统对话框
  const openReinstallDialog = async (server: ServerInfo) => {
    setSelectedServer(server);
    setSelectedTemplate("");
    setCustomHostname("");
    setShowReinstallDialog(true);
    await fetchOSTemplates(server.serviceName);
  };

  // 打开任务对话框
  const openTasksDialog = async (server: ServerInfo) => {
    setSelectedServer(server);
    setShowTasksDialog(true);
    await fetchServerTasks(server.serviceName);
  };

  // 重装系统
  const handleReinstall = async () => {
    if (!selectedServer || !selectedTemplate) {
      showToast({ type: 'error', title: '请选择系统模板' });
      return;
    }

    const confirmed = await showConfirm({
      title: '确定要重装服务器系统吗？',
      message: `服务器: ${selectedServer.name}\n此操作将清空所有数据！`,
      confirmText: '确认重装',
      cancelText: '取消'
    });

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const response = await api.post(`/server-control/${selectedServer.serviceName}/install`, {
        templateName: selectedTemplate,
        customHostname: customHostname || undefined
      });

      if (response.data.success) {
        showToast({ type: 'success', title: response.data.message });
        setShowReinstallDialog(false);
        await fetchServers();
      } else {
        showToast({ type: 'error', title: response.data.error || '重装系统失败' });
      }
    } catch (error: any) {
      console.error('重装系统失败:', error);
      showToast({ type: 'error', title: error.response?.data?.error || '重装系统失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // 状态颜色映射
  const getStatusColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'ok':
      case 'active':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'suspended':
        return 'text-yellow-400';
      default:
        return 'text-cyber-muted';
    }
  };

  // 状态图标
  const getStatusIcon = (state: string) => {
    switch (state.toLowerCase()) {
      case 'ok':
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyber-accent/10 rounded-lg border border-cyber-accent/30">
              <Server className="text-cyber-accent" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold cyber-glow-text">服务器控制中心</h1>
              <p className="text-cyber-muted text-sm">管理您的 OVH 独立服务器</p>
            </div>
          </div>

          <button
            onClick={fetchServers}
            disabled={isLoading}
            className="px-4 py-2 bg-cyber-accent text-white rounded-lg hover:bg-cyber-accent/80 disabled:bg-cyber-grid disabled:text-cyber-muted disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-neon-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </motion.div>

      {/* 服务器列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="cyber-card"
      >
        <div className="mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-cyber-accent" />
          <h2 className="text-xl font-semibold text-cyber-text">
            服务器列表 ({servers.length})
          </h2>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-cyber-accent" />
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-12 text-cyber-muted">
            暂无服务器
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyber-accent/30">
                  <th className="text-left py-3 px-4 text-cyber-text font-semibold">服务名称</th>
                  <th className="text-left py-3 px-4 text-cyber-text font-semibold">型号</th>
                  <th className="text-left py-3 px-4 text-cyber-text font-semibold">数据中心</th>
                  <th className="text-left py-3 px-4 text-cyber-text font-semibold">IP</th>
                  <th className="text-left py-3 px-4 text-cyber-text font-semibold">系统</th>
                  <th className="text-left py-3 px-4 text-cyber-text font-semibold">状态</th>
                  <th className="text-right py-3 px-4 text-cyber-text font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((server) => (
                  <tr key={server.serviceName} className="border-b border-cyber-accent/10 hover:bg-cyber-accent/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-cyber-text font-medium">{server.name}</span>
                        <span className="text-xs text-cyber-muted">{server.serviceName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono bg-cyber-accent/10 border border-cyber-accent/30 px-2 py-1 rounded text-cyber-text">
                        {server.commercialRange}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyber-muted" />
                        <span className="text-sm text-cyber-text">{server.datacenter}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono text-cyber-text">{server.ip}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-cyber-text">{server.os}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`flex items-center gap-1 ${getStatusColor(server.state)}`}>
                        {getStatusIcon(server.state)}
                        <span className="text-sm capitalize">{server.state}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openTasksDialog(server)}
                          className="px-3 py-1.5 text-xs bg-cyber-grid/50 border border-cyber-accent/30 rounded text-cyber-text hover:bg-cyber-accent/10 hover:border-cyber-accent/50 transition-all flex items-center gap-1"
                        >
                          <Activity className="w-3 h-3" />
                          任务
                        </button>
                        <button
                          onClick={() => handleReboot(server)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 text-xs bg-cyber-grid/50 border border-cyber-accent/30 rounded text-cyber-text hover:bg-cyber-accent/10 hover:border-cyber-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <Power className="w-3 h-3" />
                          重启
                        </button>
                        <button
                          onClick={() => openReinstallDialog(server)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 text-xs bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <HardDrive className="w-3 h-3" />
                          重装
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* 重装系统对话框 */}
      <AnimatePresence>
        {showReinstallDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="cyber-card max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-orange-400" />
                  <h3 className="text-xl font-semibold text-cyber-text">
                    重装系统 - {selectedServer?.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowReinstallDialog(false)}
                  className="text-cyber-muted hover:text-cyber-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-cyber-muted text-sm mb-4">
                选择要安装的操作系统模板。此操作将清空服务器所有数据，请谨慎操作。
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-cyber-text font-medium mb-2">操作系统模板</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-4 py-3 bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg focus:ring-2 focus:ring-cyber-accent focus:border-cyber-accent text-cyber-text"
                  >
                    <option value="">选择系统模板</option>
                    {osTemplates.map((template) => (
                      <option key={template.templateName} value={template.templateName}>
                        {template.distribution} - {template.family} - {template.bitFormat}位
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-cyber-text font-medium mb-2">自定义主机名（可选）</label>
                  <input
                    type="text"
                    placeholder="例如: server1.example.com"
                    value={customHostname}
                    onChange={(e) => setCustomHostname(e.target.value)}
                    className="w-full px-4 py-3 bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg focus:ring-2 focus:ring-cyber-accent focus:border-cyber-accent text-cyber-text placeholder-cyber-muted"
                  />
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-300">
                      <p className="font-semibold mb-1">警告：</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>此操作将删除服务器上的所有数据</li>
                        <li>重装过程中服务器将无法访问</li>
                        <li>请确保已备份重要数据</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowReinstallDialog(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg text-cyber-text hover:bg-cyber-accent/10 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleReinstall}
                  disabled={!selectedTemplate || isProcessing}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
                  确认重装
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 任务列表对话框 */}
      <AnimatePresence>
        {showTasksDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="cyber-card max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyber-accent" />
                  <h3 className="text-xl font-semibold text-cyber-text">
                    任务列表 - {selectedServer?.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowTasksDialog(false)}
                  className="text-cyber-muted hover:text-cyber-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-cyber-muted text-sm mb-4">
                查看服务器最近的操作任务
              </p>

              {serverTasks.length === 0 ? (
                <div className="text-center py-8 text-cyber-muted">
                  暂无任务记录
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-cyber-accent/30">
                        <th className="text-left py-3 px-4 text-cyber-text font-semibold">任务ID</th>
                        <th className="text-left py-3 px-4 text-cyber-text font-semibold">操作</th>
                        <th className="text-left py-3 px-4 text-cyber-text font-semibold">状态</th>
                        <th className="text-left py-3 px-4 text-cyber-text font-semibold">开始时间</th>
                        <th className="text-left py-3 px-4 text-cyber-text font-semibold">完成时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serverTasks.map((task) => (
                        <tr key={task.taskId} className="border-b border-cyber-accent/10">
                          <td className="py-3 px-4 font-mono text-sm text-cyber-text">
                            {task.taskId}
                          </td>
                          <td className="py-3 px-4 text-cyber-text">{task.function}</td>
                          <td className="py-3 px-4">
                            <span className={`text-sm capitalize ${
                              task.status === 'done' ? 'text-green-400' : 
                              task.status === 'error' ? 'text-red-400' : 
                              'text-yellow-400'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-cyber-muted">
                            {task.startDate ? new Date(task.startDate).toLocaleString('zh-CN') : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-cyber-muted">
                            {task.doneDate ? new Date(task.doneDate).toLocaleString('zh-CN') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowTasksDialog(false)}
                  className="px-4 py-2 bg-cyber-accent text-white rounded-lg hover:bg-cyber-accent/80 transition-all"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServerControlPage;
