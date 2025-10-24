import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/utils/apiClient";
import { useToast } from "../components/ToastContainer";
import { Server, RefreshCw, Power, HardDrive, X, AlertCircle, Activity, Cpu, Wifi, Info, Calendar } from "lucide-react";

interface ServerInfo {
  serviceName: string;
  name: string;
  commercialRange: string;
  datacenter: string;
  state: string;
  ip: string;
  os: string;
}

interface OSTemplate {
  templateName: string;
  distribution: string;
  family: string;
  bitFormat: number;
}

interface ServerTask {
  taskId: number;
  function: string;
  status: string;
  startDate: string;
  doneDate: string;
}

interface PartitionScheme {
  name: string;
  priority: number;
  partitions: {
    mountpoint: string;
    filesystem: string;
    size: number;
    order: number;
    raid: string | null;
    type: string;
  }[];
}

const ServerControlPage: React.FC = () => {
  const { showToast, showConfirm } = useToast();
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Task 3: 重装系统状态
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);
  const [showReinstallDialog, setShowReinstallDialog] = useState(false);
  const [osTemplates, setOsTemplates] = useState<OSTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customHostname, setCustomHostname] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [partitionSchemes, setPartitionSchemes] = useState<PartitionScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState("");
  const [showPartitionDetails, setShowPartitionDetails] = useState(false);
  const [loadingPartitions, setLoadingPartitions] = useState(false);
  
  // Task 4: 任务查看状态
  const [showTasksDialog, setShowTasksDialog] = useState(false);
  const [serverTasks, setServerTasks] = useState<ServerTask[]>([]);
  
  // Task 5: 监控功能
  const [monitoring, setMonitoring] = useState(false);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);
  
  // Task 6: 硬件信息
  const [hardware, setHardware] = useState<any>(null);
  const [loadingHardware, setLoadingHardware] = useState(false);
  
  // Task 7: IP管理
  const [ips, setIps] = useState<any[]>([]);
  const [loadingIPs, setLoadingIPs] = useState(false);
  
  // Task 8: 服务信息
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [loadingService, setLoadingService] = useState(false);

  // Task 1: 获取服务器列表（只显示活跃服务器）
  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/server-control/list');
      if (response.data.success) {
        // 过滤：只显示未过期、未暂停的服务器
        const activeServers = response.data.servers.filter((s: any) => {
          const state = s.state?.toLowerCase();
          const status = s.status?.toLowerCase();
          
          // 排除已过期、已暂停的服务器
          if (status === 'expired' || status === 'suspended') return false;
          if (state === 'error' || state === 'suspended') return false;
          
          // 只显示正常状态
          return state === 'ok' || state === 'active';
        });
        
        setServers(activeServers);
        
        // 自动选择第一台服务器
        if (activeServers.length > 0 && !selectedServer) {
          setSelectedServer(activeServers[0]);
        }
        
        const filteredCount = response.data.total - activeServers.length;
        showToast({ 
          type: 'success', 
          title: `已加载 ${activeServers.length} 台活跃服务器` + 
                 (filteredCount > 0 ? ` (已过滤 ${filteredCount} 台)` : '')
        });
      }
    } catch (error: any) {
      console.error('获取服务器列表失败:', error);
      showToast({ type: 'error', title: '获取服务器列表失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // Task 2: 重启服务器
  const handleReboot = async (server: ServerInfo) => {
    const confirmed = await showConfirm({
      title: '确定要重启服务器吗？',
      message: `${server.name} (${server.serviceName})`,
      confirmText: '重启',
      cancelText: '取消'
    });

    if (!confirmed) return;

    try {
      const response = await api.post(`/server-control/${server.serviceName}/reboot`);
      if (response.data.success) {
        showToast({ type: 'success', title: '重启请求已发送' });
      }
    } catch (error: any) {
      console.error('重启失败:', error);
      showToast({ type: 'error', title: '重启失败' });
    }
  };

  // Task 3: 获取系统模板
  const fetchOSTemplates = async (serviceName: string) => {
    try {
      const response = await api.get(`/server-control/${serviceName}/templates`);
      if (response.data.success) {
        setOsTemplates(response.data.templates);
      }
    } catch (error: any) {
      console.error('获取模板失败:', error);
      showToast({ type: 'error', title: '获取系统模板失败' });
    }
  };

  // Task 3.1: 获取分区方案
  const fetchPartitionSchemes = async (serviceName: string, templateName: string) => {
    console.log('[Partition] 开始加载分区方案:', { serviceName, templateName });
    setLoadingPartitions(true);
    try {
      const response = await api.get(`/server-control/${serviceName}/partition-schemes?templateName=${templateName}`);
      console.log('[Partition] API响应:', response.data);
      
      if (response.data.success) {
        setPartitionSchemes(response.data.schemes);
        // 不自动选择，让用户决定是否使用自定义分区
        setSelectedScheme('');
        
        if (response.data.schemes.length > 0) {
          console.log('[Partition] 加载到方案:', response.data.schemes);
          showToast({ 
            type: 'info', 
            title: `已加载 ${response.data.schemes.length} 个分区方案（可选）` 
          });
        } else {
          console.log('[Partition] 模板无分区方案');
          showToast({ 
            type: 'warning', 
            title: '该模板无可用分区方案' 
          });
        }
      }
    } catch (error: any) {
      console.error('[Partition] 获取失败:', error);
      console.error('[Partition] 错误详情:', error.response?.data);
      setPartitionSchemes([]);
      setSelectedScheme('');
      showToast({ 
        type: 'error', 
        title: '获取分区方案失败，请重启后端服务器' 
      });
    } finally {
      setLoadingPartitions(false);
    }
  };

  // Task 3: 打开重装对话框
  const openReinstallDialog = async (server: ServerInfo) => {
    setSelectedServer(server);
    setSelectedTemplate("");
    setCustomHostname("");
    setPartitionSchemes([]);
    setSelectedScheme("");
    setShowPartitionDetails(false);
    setShowReinstallDialog(true);
    await fetchOSTemplates(server.serviceName);
  };

  // Task 3: 重装系统
  const handleReinstall = async () => {
    if (!selectedServer || !selectedTemplate) {
      showToast({ type: 'error', title: '请选择系统模板' });
      return;
    }

    const confirmed = await showConfirm({
      title: '确定要重装系统吗？',
      message: `服务器: ${selectedServer.name}\n此操作将清空所有数据！`,
      confirmText: '确认重装',
      cancelText: '取消'
    });

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const installData: any = {
        templateName: selectedTemplate,
        customHostname: customHostname || undefined
      };
      
      // 如果用户选择了分区方案，传递给后端
      if (selectedScheme) {
        installData.partitionSchemeName = selectedScheme;
        console.log('[Install] 使用自定义分区方案:', selectedScheme);
      } else {
        console.log('[Install] 未选择分区方案，将使用默认分区');
      }
      
      console.log('[Install] 安装数据:', installData);
      const response = await api.post(`/server-control/${selectedServer.serviceName}/install`, installData);

      if (response.data.success) {
        showToast({ type: 'success', title: '系统重装请求已发送' });
        setShowReinstallDialog(false);
      }
    } catch (error: any) {
      console.error('重装失败:', error);
      showToast({ type: 'error', title: '重装系统失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Task 4: 获取服务器任务
  const fetchServerTasks = async (serviceName: string) => {
    try {
      const response = await api.get(`/server-control/${serviceName}/tasks`);
      if (response.data.success) {
        setServerTasks(response.data.tasks);
      }
    } catch (error: any) {
      console.error('获取任务失败:', error);
      showToast({ type: 'error', title: '获取任务列表失败' });
    }
  };

  // Task 4: 打开任务对话框
  const openTasksDialog = async (server: ServerInfo) => {
    setSelectedServer(server);
    setShowTasksDialog(true);
    await fetchServerTasks(server.serviceName);
  };

  // Task 5: 获取监控状态
  const fetchMonitoring = async (serviceName: string) => {
    try {
      const response = await api.get(`/server-control/${serviceName}/monitoring`);
      if (response.data.success) {
        setMonitoring(response.data.monitoring);
      }
    } catch (error: any) {
      console.error('获取监控状态失败:', error);
    }
  };

  // Task 5: 切换监控
  const toggleMonitoring = async () => {
    if (!selectedServer) return;
    setLoadingMonitoring(true);
    try {
      await api.put(`/server-control/${selectedServer.serviceName}/monitoring`, { 
        enabled: !monitoring 
      });
      setMonitoring(!monitoring);
      showToast({ 
        type: 'success', 
        title: `监控已${!monitoring ? '开启' : '关闭'}` 
      });
    } catch (error) {
      showToast({ type: 'error', title: '操作失败' });
    } finally {
      setLoadingMonitoring(false);
    }
  };

  // Task 6: 获取硬件信息
  const fetchHardware = async (serviceName: string) => {
    setLoadingHardware(true);
    try {
      const response = await api.get(`/server-control/${serviceName}/hardware`);
      if (response.data.success) {
        setHardware(response.data.hardware);
      }
    } catch (error: any) {
      console.error('获取硬件信息失败:', error);
    } finally {
      setLoadingHardware(false);
    }
  };

  // Task 7: 获取IP列表
  const fetchIPs = async (serviceName: string) => {
    setLoadingIPs(true);
    try {
      const response = await api.get(`/server-control/${serviceName}/ips`);
      if (response.data.success) {
        setIps(response.data.ips || []);
      }
    } catch (error: any) {
      console.error('获取IP列表失败:', error);
    } finally {
      setLoadingIPs(false);
    }
  };

  // Task 8: 获取服务信息
  const fetchServiceInfo = async (serviceName: string) => {
    setLoadingService(true);
    try {
      const response = await api.get(`/server-control/${serviceName}/serviceinfo`);
      if (response.data.success) {
        setServiceInfo(response.data.serviceInfo);
      }
    } catch (error: any) {
      console.error('获取服务信息失败:', error);
    } finally {
      setLoadingService(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // Task 5-8: 当选择服务器时加载数据
  useEffect(() => {
    if (selectedServer) {
      fetchMonitoring(selectedServer.serviceName);
      fetchHardware(selectedServer.serviceName);
      fetchIPs(selectedServer.serviceName);
      fetchServiceInfo(selectedServer.serviceName);
    }
  }, [selectedServer]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        {/* 页面标题 */}
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
            className="px-4 py-2 bg-cyber-accent text-white rounded-lg hover:bg-cyber-accent/80 disabled:opacity-50 flex items-center gap-2 transition-all shadow-neon-sm">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* 服务器选择器 */}
        {isLoading ? (
          <div className="cyber-card">
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-cyber-accent" />
            </div>
          </div>
        ) : servers.length === 0 ? (
          <div className="cyber-card text-center py-12 text-cyber-muted">
            暂无活跃服务器
          </div>
        ) : (
          <>
            <div className="cyber-card">
              <label className="block text-cyber-text font-medium mb-2">选择服务器</label>
              <select
                value={selectedServer?.serviceName || ''}
                onChange={(e) => {
                  const server = servers.find(s => s.serviceName === e.target.value);
                  setSelectedServer(server || null);
                }}
                className="w-full px-4 py-3 bg-cyber-bg border-2 border-cyber-accent/40 rounded-lg text-cyber-text focus:border-cyber-accent focus:ring-2 focus:ring-cyber-accent/30 hover:border-cyber-accent/60 transition-all cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
                }}>
                <option value="" className="bg-cyber-bg text-cyber-muted">请选择服务器</option>
                {servers.map(s => (
                  <option 
                    key={s.serviceName} 
                    value={s.serviceName}
                    className="bg-cyber-bg text-cyber-text py-2"
                    style={{
                      background: 'rgba(15, 23, 42, 0.98)',
                      padding: '8px 12px'
                    }}>
                    {s.name} ({s.commercialRange}) - {s.datacenter}
                  </option>
                ))}
              </select>
            </div>

            {/* 选中服务器的详细信息 */}
            {selectedServer && (
              <>
              <div className="cyber-card">
                <h3 className="text-lg font-semibold text-cyber-text mb-4">服务器信息</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div>
                    <span className="text-cyber-muted">服务名称:</span>
                    <span className="text-cyber-text ml-2">{selectedServer.serviceName}</span>
                  </div>
                  <div>
                    <span className="text-cyber-muted">显示名称:</span>
                    <span className="text-cyber-text ml-2">{selectedServer.name}</span>
                  </div>
                  <div>
                    <span className="text-cyber-muted">型号:</span>
                    <span className="text-cyber-text ml-2 font-mono">{selectedServer.commercialRange}</span>
                  </div>
                  <div>
                    <span className="text-cyber-muted">数据中心:</span>
                    <span className="text-cyber-text ml-2">{selectedServer.datacenter}</span>
                  </div>
                  <div>
                    <span className="text-cyber-muted">IP地址:</span>
                    <span className="text-cyber-text ml-2 font-mono">{selectedServer.ip}</span>
                  </div>
                  <div>
                    <span className="text-cyber-muted">操作系统:</span>
                    <span className="text-cyber-text ml-2">{selectedServer.os}</span>
                  </div>
                  <div>
                    <span className="text-cyber-muted">状态:</span>
                    <span className="text-green-400 ml-2 capitalize">{selectedServer.state}</span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => openTasksDialog(selectedServer)}
                    className="px-4 py-2 bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg text-cyber-text hover:bg-cyber-accent/10 transition-all flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    查看任务
                  </button>
                  <button
                    onClick={() => handleReboot(selectedServer)}
                    className="px-4 py-2 bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg text-cyber-text hover:bg-cyber-accent/10 transition-all flex items-center gap-2">
                    <Power className="w-4 h-4" />
                    重启服务器
                  </button>
                  {/* 重装系统功能已移除 - OVH API不可用 */}
                </div>
              </div>

              {/* Task 6: 硬件信息 */}
              <div className="cyber-card">
                <h3 className="text-lg font-semibold text-cyber-text mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyber-accent" />
                  硬件配置
                </h3>
                {loadingHardware ? (
                  <div className="flex items-center gap-2 text-cyber-muted">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    加载中...
                  </div>
                ) : hardware ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-cyber-muted">CPU:</span>
                      <span className="text-cyber-text ml-2">{hardware.processorName}</span>
                    </div>
                    <div>
                      <span className="text-cyber-muted">核心/线程:</span>
                      <span className="text-cyber-text ml-2">{hardware.processorCores}/{hardware.processorThreads}</span>
                    </div>
                    <div>
                      <span className="text-cyber-muted">内存:</span>
                      <span className="text-cyber-text ml-2">{hardware.memorySize?.value} {hardware.memorySize?.unit}</span>
                    </div>
                    <div>
                      <span className="text-cyber-muted">RAID:</span>
                      <span className="text-cyber-text ml-2">{hardware.defaultHardwareRaidType}</span>
                    </div>
                    <div>
                      <span className="text-cyber-muted">架构:</span>
                      <span className="text-cyber-text ml-2">{hardware.processorArchitecture}</span>
                    </div>
                    <div>
                      <span className="text-cyber-muted">磁盘容量:</span>
                      <span className="text-cyber-text ml-2">{hardware.defaultHardwareRaidSize?.value} {hardware.defaultHardwareRaidSize?.unit}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-cyber-muted text-sm">暂无硬件信息</p>
                )}
              </div>

              {/* Task 7: IP管理 */}
              <div className="cyber-card">
                <h3 className="text-lg font-semibold text-cyber-text mb-4 flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-cyber-accent" />
                  IP地址管理
                </h3>
                {loadingIPs ? (
                  <div className="flex items-center gap-2 text-cyber-muted">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    加载中...
                  </div>
                ) : ips.length > 0 ? (
                  <div className="space-y-2">
                    {ips.map((ip, idx) => (
                      <div key={idx} className="p-3 bg-cyber-grid/30 border border-cyber-accent/20 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-cyber-text font-mono font-semibold">{ip.ip}</div>
                            <div className="text-xs text-cyber-muted mt-1">类型: {ip.type}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-cyber-muted text-sm">暂无IP信息</p>
                )}
              </div>

              {/* Task 8: 服务信息 */}
              <div className="cyber-card">
                <h3 className="text-lg font-semibold text-cyber-text mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyber-accent" />
                  服务信息
                </h3>
                {loadingService ? (
                  <div className="flex items-center gap-2 text-cyber-muted">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    加载中...
                  </div>
                ) : serviceInfo ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-cyber-muted">状态:</span>
                      <span className="text-cyber-text ml-2 capitalize">{serviceInfo.status}</span>
                    </div>
                    <div>
                      <span className="text-cyber-muted">到期时间:</span>
                      <span className="text-cyber-text ml-2">{new Date(serviceInfo.expiration).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div>
                      <span className="text-cyber-muted">创建时间:</span>
                      <span className="text-cyber-text ml-2">{new Date(serviceInfo.creation).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div>
                      <span className="text-cyber-muted">自动续费:</span>
                      <span className={`ml-2 ${serviceInfo.renewalType ? 'text-green-400' : 'text-orange-400'}`}>
                        {serviceInfo.renewalType ? '已开启' : '已关闭'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-cyber-muted text-sm">暂无服务信息</p>
                )}
              </div>

              {/* Task 5: 监控控制 */}
              <div className="cyber-card">
                <h3 className="text-lg font-semibold text-cyber-text mb-4">服务器监控</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyber-text">OVH监控服务</p>
                    <p className="text-sm text-cyber-muted mt-1">自动监控服务器可用性并发送告警</p>
                  </div>
                  <button
                    onClick={toggleMonitoring}
                    disabled={loadingMonitoring}
                    className={`px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                      monitoring 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}>
                    {loadingMonitoring ? '处理中...' : (monitoring ? '已开启' : '已关闭')}
                  </button>
                </div>
              </div>
              </>
            )}
          </>
        )}
      </motion.div>

      {/* Task 3: 重装系统对话框 */}
      <AnimatePresence>
        {showReinstallDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="cyber-card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-orange-400" />
                  <h3 className="text-xl font-semibold text-cyber-text">
                    重装系统 - {selectedServer?.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowReinstallDialog(false)}
                  className="text-cyber-muted hover:text-cyber-text transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-cyber-muted text-sm mb-4">
                选择要安装的操作系统模板。此操作将清空服务器所有数据。
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-cyber-text font-medium mb-2">操作系统模板</label>
                  <select
                    value={selectedTemplate}
                    onChange={async (e) => {
                      const template = e.target.value;
                      setSelectedTemplate(template);
                      if (template && selectedServer) {
                        await fetchPartitionSchemes(selectedServer.serviceName, template);
                      } else {
                        setPartitionSchemes([]);
                        setSelectedScheme("");
                      }
                    }}
                    className="w-full px-4 py-3 bg-cyber-bg border-2 border-cyber-accent/40 rounded-lg text-cyber-text focus:border-cyber-accent focus:ring-2 focus:ring-cyber-accent/30 hover:border-cyber-accent/60 transition-all cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
                    }}>
                    <option value="" className="bg-cyber-bg text-cyber-muted">选择系统模板</option>
                    {osTemplates.map((template) => (
                      <option 
                        key={template.templateName} 
                        value={template.templateName}
                        className="bg-cyber-bg text-cyber-text hover:bg-cyber-accent/20 py-2"
                        style={{
                          background: 'rgba(15, 23, 42, 0.98)',
                          padding: '8px 12px'
                        }}>
                        {template.distribution} - {template.family} - {template.bitFormat}位
                      </option>
                    ))}
                  </select>
                </div>

                {/* 分区方案加载状态 */}
                {loadingPartitions && (
                  <div className="p-3 bg-cyber-grid/30 border border-cyber-accent/20 rounded-lg">
                    <div className="flex items-center gap-2 text-cyber-text text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyber-accent" />
                      正在加载分区方案...
                    </div>
                  </div>
                )}

                {/* 分区方案选择 */}
                {!loadingPartitions && partitionSchemes.length > 0 && (
                  <div>
                    <label className="block text-cyber-text font-medium mb-2">分区方案（可选）</label>
                    <select
                      value={selectedScheme}
                      onChange={(e) => setSelectedScheme(e.target.value)}
                      className="w-full px-4 py-3 bg-cyber-bg border-2 border-cyber-accent/40 rounded-lg text-cyber-text focus:border-cyber-accent focus:ring-2 focus:ring-cyber-accent/30 hover:border-cyber-accent/60 transition-all cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
                      }}>
                      <option value="" className="bg-cyber-bg text-cyber-muted">使用默认分区（推荐）</option>
                      {partitionSchemes.map((scheme) => (
                        <option 
                          key={scheme.name} 
                          value={scheme.name}
                          className="bg-cyber-bg text-cyber-text py-2"
                          style={{
                            background: 'rgba(15, 23, 42, 0.98)',
                            padding: '8px 12px'
                          }}>
                          {scheme.name} ({scheme.partitions.length} 个分区)
                        </option>
                      ))}
                    </select>
                    
                    {/* 查看分区详情按钮 */}
                    <button
                      type="button"
                      onClick={() => setShowPartitionDetails(!showPartitionDetails)}
                      className="mt-2 text-sm text-cyber-accent hover:text-cyber-accent/80 underline">
                      {showPartitionDetails ? '隐藏' : '查看'}分区详情
                    </button>

                    {/* 分区详情 */}
                    {showPartitionDetails && selectedScheme && (
                      <div className="mt-3 p-3 bg-cyber-grid/30 border border-cyber-accent/20 rounded-lg">
                        <div className="text-sm text-cyber-text">
                          {partitionSchemes.find(s => s.name === selectedScheme)?.partitions.map((partition, idx) => (
                            <div key={idx} className="mb-2 pb-2 border-b border-cyber-accent/10 last:border-0">
                              <div className="flex justify-between">
                                <span className="font-mono text-cyber-accent">{partition.mountpoint}</span>
                                <span className="text-cyber-muted">
                                  {typeof partition.size === 'object' && partition.size?.value 
                                    ? `${partition.size.value} ${partition.size.unit || 'MB'}`
                                    : `${partition.size || 0} MB`
                                  }
                                </span>
                              </div>
                              <div className="text-xs text-cyber-muted mt-1">
                                {partition.filesystem} | {partition.type} | RAID: {
                                  typeof partition.raid === 'object' && partition.raid !== null && 'value' in partition.raid
                                    ? (partition.raid as any).value 
                                    : (partition.raid || 'N/A')
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-cyber-text font-medium mb-2">自定义主机名（可选）</label>
                  <input
                    type="text"
                    placeholder="例如: server1.example.com"
                    value={customHostname}
                    onChange={(e) => setCustomHostname(e.target.value)}
                    className="w-full px-4 py-3 bg-cyber-bg border-2 border-cyber-accent/40 rounded-lg text-cyber-text placeholder-cyber-muted focus:border-cyber-accent focus:ring-2 focus:ring-cyber-accent/30 hover:border-cyber-accent/60 transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
                    }}
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
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowReinstallDialog(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg text-cyber-text hover:bg-cyber-accent/10">
                  取消
                </button>
                <button
                  onClick={handleReinstall}
                  disabled={!selectedTemplate || isProcessing}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
                  {isProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
                  确认重装
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task 4: 任务列表对话框 */}
      <AnimatePresence>
        {showTasksDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="cyber-card max-w-3xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyber-accent" />
                  <h3 className="text-xl font-semibold text-cyber-text">
                    任务列表 - {selectedServer?.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowTasksDialog(false)}
                  className="text-cyber-muted hover:text-cyber-text transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                  className="px-4 py-2 bg-cyber-accent text-white rounded-lg hover:bg-cyber-accent/80 transition-all">
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
