import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/utils/apiClient";
import { useToast } from "../components/ToastContainer";
import { Server, RefreshCw, Power, HardDrive, X, AlertCircle, Activity, Cpu, Wifi, Calendar, Monitor, Mail } from "lucide-react";

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

interface ServiceInfo {
  status: string;
  creation: string;
  expiration: string;
  renewalType: boolean;
}

interface BootMode {
  id: number;
  bootType: string;
  description: string;
  kernel: string;
  active: boolean;
}

interface InstallStep {
  comment: string;
  commentOriginal?: string;  // 原文（用于调试）
  status: 'doing' | 'done' | 'error' | 'todo' | 'init';
  error: string;
}

interface InstallProgress {
  elapsedTime: number;
  progressPercentage: number;
  totalSteps: number;
  completedSteps: number;
  hasError: boolean;
  allDone: boolean;
  steps: InstallStep[];
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
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [loadingService, setLoadingService] = useState(false);
  
  // Task 10: 启动模式
  const [showBootModeDialog, setShowBootModeDialog] = useState(false);
  const [bootModes, setBootModes] = useState<BootMode[]>([]);
  const [loadingBootModes, setLoadingBootModes] = useState(false);

  // IPMI链接模态框
  const [showIpmiLinkDialog, setShowIpmiLinkDialog] = useState(false);
  const [ipmiLink, setIpmiLink] = useState<string>('');
  const [ipmiLoading, setIpmiLoading] = useState(false);
  const [ipmiCountdown, setIpmiCountdown] = useState(20);

  // 安装进度监控
  const [showInstallProgress, setShowInstallProgress] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [installCompleted, setInstallCompleted] = useState(false); // 标记安装是否已完成
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(8); // 自动关闭倒计时
  const [installPollingInterval, setInstallPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const installProgressRef = useRef<InstallProgress | null>(null); // 用于在定时器回调中访问最新状态
  const completionToastShownRef = useRef<boolean>(false); // 防止重复显示完成提示

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

  // Task 3: 打开重装对话框（先检查是否有正在进行的安装）
  const openReinstallDialog = async (server: ServerInfo) => {
    setSelectedServer(server);
    
    // 先检查是否有正在进行的安装
    try {
      const response = await api.get(`/server-control/${server.serviceName}/install/status`);
      
      if (response.data.success) {
        // 检查是否有安装进度
        if (response.data.hasInstallation === false) {
          // 没有正在进行的安装，继续打开重装对话框
          // 静默处理，不显示任何提示
        } else if (response.data.status) {
          const progress = response.data.status;
          
          // 如果有正在进行的安装（未完成且无错误）
          if (!progress.allDone && !progress.hasError && progress.totalSteps > 0) {
            // 设置初始进度数据
            setInstallProgress(progress);
            
            // 启动轮询（会自动显示进度窗口）
            startInstallProgressMonitoring();
            
            showToast({ 
              type: 'info', 
              title: `检测到正在进行的安装 (${progress.progressPercentage}%)` 
            });
            
            return; // 不打开重装对话框
          }
        }
      }
    } catch (error: any) {
      // 真实错误（如网络错误），静默处理
      console.log('检查安装进度时出错，继续打开重装对话框');
    }
    
    // 没有正在进行的安装，正常打开重装对话框
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
        
        // 启动安装进度监控
        startInstallProgressMonitoring();
      }
    } catch (error: any) {
      console.error('重装失败:', error);
      showToast({ type: 'error', title: '重装系统失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 安装进度：获取安装进度
  const fetchInstallProgress = async () => {
    if (!selectedServer) return;
    
    try {
      const response = await api.get(`/server-control/${selectedServer.serviceName}/install/status`);
      
      console.log('[fetchInstallProgress] 响应数据:', response.data);
      
      if (response.data.success) {
        // 检查是否有安装进度
        if (response.data.hasInstallation === false) {
          console.log('[fetchInstallProgress] 检测到安装完成, installProgress:', installProgress);
          
          // 没有安装任务了，说明安装完成
          stopInstallProgressMonitoring();
          
          // 判断：如果之前有进度数据，说明安装刚完成
          // 使用ref获取最新状态，而不是闭包中的旧状态
          const latestProgress = installProgressRef.current;
          console.log('[fetchInstallProgress] 最新进度状态:', latestProgress);
          
          // 检查是否已经显示过Toast（防止重复显示）
          if (!completionToastShownRef.current && latestProgress && latestProgress.progressPercentage > 0) {
            console.log('[fetchInstallProgress] 显示安装完成提示（仅一次）');
            completionToastShownRef.current = true; // 标记已显示
            installProgressRef.current = null; // 立即清空ref，防止其他请求重复触发
            
            showToast({ 
              type: 'success', 
              title: '✅ 系统安装完成！',
              message: '服务器已成功安装系统'
            });
            
            // 设置完成状态，显示完成页面
            setInstallCompleted(true);
            setAutoCloseCountdown(8); // 重置倒计时
            
            // 启动倒计时（每秒减1）
            let countdown = 8;
            const countdownInterval = setInterval(() => {
              countdown--;
              setAutoCloseCountdown(countdown);
              
              if (countdown <= 0) {
                clearInterval(countdownInterval);
                console.log('[fetchInstallProgress] 倒计时结束，自动关闭进度模态框');
                setShowInstallProgress(false);
                setInstallProgress(null);
                setInstallCompleted(false);
              }
            }, 1000);
          } else if (completionToastShownRef.current) {
            console.log('[fetchInstallProgress] Toast已显示过，跳过');
          } else {
            console.log('[fetchInstallProgress] 没有之前的进度数据，不显示提示');
          }
          
          return;
        }
        
        // 有安装进度数据
        if (response.data.status) {
          const progress = response.data.status;
          setInstallProgress(progress);
          installProgressRef.current = progress; // 同步更新ref
          
          // 如果安装完成或出错，停止轮询
          if (progress.allDone || progress.hasError) {
            stopInstallProgressMonitoring();
            
            if (progress.allDone) {
              showToast({ type: 'success', title: '系统安装完成！' });
            } else if (progress.hasError) {
              showToast({ type: 'error', title: '系统安装出错' });
            }
          } else {
            // 根据进度动态调整轮询间隔
            adjustPollingInterval(progress.progressPercentage);
          }
        }
      }
    } catch (error: any) {
      // 网络错误或500错误
      if (error.response?.status === 500) {
        stopInstallProgressMonitoring();
      }
      
      // 记录错误日志
      console.error('获取安装进度失败:', error);
    }
  };

  // 动态调整轮询间隔
  const adjustPollingInterval = (progressPercentage: number) => {
    if (!installPollingInterval) return;
    
    let newInterval = 5000; // 默认5秒
    
    if (progressPercentage >= 90) {
      newInterval = 1000; // 90%以上：1秒（最快）
      console.log('[轮询] 进度>=90%，切换到1秒轮询');
    } else if (progressPercentage >= 80) {
      newInterval = 2000; // 80-89%：2秒（加快）
      console.log('[轮询] 进度>=80%，切换到2秒轮询');
    } else if (progressPercentage >= 70) {
      newInterval = 3000; // 70-79%：3秒
    }
    
    // 如果间隔需要改变，重新设置定时器
    const currentInterval = installPollingInterval as any;
    if (currentInterval._idleTimeout !== newInterval) {
      clearInterval(installPollingInterval!);
      const interval = setInterval(() => {
        fetchInstallProgress();
      }, newInterval);
      setInstallPollingInterval(interval);
    }
  };

  // 安装进度：启动轮询
  const startInstallProgressMonitoring = () => {
    // 先清除之前的轮询
    if (installPollingInterval) {
      clearInterval(installPollingInterval);
    }
    
    // 显示进度模态框
    setShowInstallProgress(true);
    
    // 重置完成提示标志（开始新的安装）
    completionToastShownRef.current = false;
    setInstallCompleted(false);
    setAutoCloseCountdown(8);
    
    // 如果没有现有进度数据，清空（避免闪烁）
    // 如果有现有数据，保留它（用于恢复进度显示）
    if (!installProgress) {
      setInstallProgress(null);
      installProgressRef.current = null;
    } else {
      installProgressRef.current = installProgress;
    }
    
    // 立即获取一次进度
    fetchInstallProgress();
    
    // 初始轮询间隔：5秒（会根据进度动态调整）
    const interval = setInterval(() => {
      fetchInstallProgress();
    }, 5000);
    
    setInstallPollingInterval(interval);
  };

  // 安装进度：停止轮询
  const stopInstallProgressMonitoring = () => {
    if (installPollingInterval) {
      clearInterval(installPollingInterval);
      setInstallPollingInterval(null);
    }
    // 清空ref状态（下次安装时重新开始）
    // 注意：不清空installProgress state，让窗口保持显示最后的进度
  };

  // 安装进度：手动关闭进度模态框
  const closeInstallProgress = () => {
    stopInstallProgressMonitoring();
    setShowInstallProgress(false);
    setInstallProgress(null);
    setInstallCompleted(false);
    setAutoCloseCountdown(8);
    installProgressRef.current = null; // 清空ref
    completionToastShownRef.current = false; // 重置标志
  };

  // 清理：组件卸载时停止轮询
  useEffect(() => {
    return () => {
      stopInstallProgressMonitoring();
    };
  }, [installPollingInterval]);

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

  // IPMI控制台
  const openIPMIConsole = async () => {
    if (!selectedServer) return;
    try {
      console.log('=== 开始获取IPMI ===');
      console.log('服务器:', selectedServer.serviceName);
      
      // 启动倒计时
      setIpmiLoading(true);
      setIpmiCountdown(20);
      
      // 倒计时计时器
      const countdownInterval = setInterval(() => {
        setIpmiCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      const response = await api.get(`/server-control/${selectedServer.serviceName}/console`);
      
      // 清除倒计时
      clearInterval(countdownInterval);
      setIpmiLoading(false);
      console.log('收到响应:', response);
      console.log('响应数据:', response.data);
      
      if (response.data.success && response.data.console) {
        console.log('✅ 响应成功');
        const value = response.data.console.value;
        const accessType = response.data.accessType;
        
        console.log('accessType:', accessType);
        console.log('value length:', value?.length);
        
        if (!value) {
          console.error('❌ value为空');
          showToast({ type: 'error', title: '无法获取控制台访问' });
          return;
        }

        // 判断访问类型
        console.log('IPMI访问类型:', accessType);
        console.log('IPMI访问值前100字符:', value.substring(0, 100));
        
        if (accessType === 'kvmipJnlp') {
          // JNLP文件 - 下载并提示用户
          const blob = new Blob([value], { type: 'application/x-java-jnlp-file' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ipmi-${selectedServer.serviceName}.jnlp`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          showToast({ 
            type: 'success', 
            title: 'JNLP文件已下载，请用Java打开'
          });
        } else if (accessType === 'kvmipHtml5URL' || accessType === 'serialOverLanURL') {
          // HTML5或Serial URL - 显示链接模态框让用户点击
          console.log('显示IPMI链接:', value);
          setIpmiLink(value);
          setShowIpmiLinkDialog(true);
          showToast({ type: 'success', title: 'IPMI访问已就绪' });
        } else {
          console.error('❌ 未知的访问类型:', accessType);
          setIpmiLoading(false);
          showToast({ type: 'error', title: '不支持的访问类型: ' + accessType });
        }
      } else {
        console.error('❌ 响应失败或无console数据');
        console.log('success:', response.data.success);
        console.log('console:', response.data.console);
        setIpmiLoading(false);
        showToast({ type: 'error', title: '无效的响应数据' });
      }
    } catch (error: any) {
      console.error('❌ 打开IPMI控制台失败:', error);
      console.error('错误详情:', error.response?.data);
      setIpmiLoading(false);
      showToast({ type: 'error', title: '打开IPMI控制台失败' });
    }
  };

  // Task 10: 获取启动模式列表
  const fetchBootModes = async () => {
    if (!selectedServer) return;
    setLoadingBootModes(true);
    try {
      const response = await api.get(`/server-control/${selectedServer.serviceName}/boot-mode`);
      if (response.data.success) {
        setBootModes(response.data.bootModes);
        setShowBootModeDialog(true);
      }
    } catch (error: any) {
      console.error('获取启动模式失败:', error);
      showToast({ type: 'error', title: '获取启动模式失败' });
    } finally {
      setLoadingBootModes(false);
    }
  };

  // Task 10: 切换启动模式
  const changeBootMode = async (bootId: number) => {
    if (!selectedServer) return;
    
    const confirmed = await showConfirm({
      title: '确定切换启动模式？',
      message: '切换后将自动重启服务器',
      confirmText: '确认切换并重启',
      cancelText: '取消'
    });

    if (!confirmed) return;

    try {
      // 1. 切换启动模式
      const response = await api.put(`/server-control/${selectedServer.serviceName}/boot-mode`, {
        bootId
      });
      
      if (response.data.success) {
        showToast({ type: 'success', title: '启动模式已切换' });
        setShowBootModeDialog(false);
        
        // 2. 自动重启服务器
        showToast({ type: 'info', title: '正在重启服务器...' });
        const rebootResponse = await api.post(`/server-control/${selectedServer.serviceName}/reboot`);
        
        if (rebootResponse.data.success) {
          showToast({ type: 'success', title: '服务器已重启，启动模式生效' });
        } else {
          showToast({ type: 'warning', title: '启动模式已切换，但重启失败，请手动重启' });
        }
      }
    } catch (error: any) {
      console.error('切换启动模式失败:', error);
      showToast({ type: 'error', title: '切换启动模式失败' });
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
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <button
                    onClick={() => openTasksDialog(selectedServer)}
                    className="px-4 py-2 bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg text-cyber-text hover:bg-cyber-accent/10 transition-all flex items-center gap-2 justify-center">
                    <Activity className="w-4 h-4" />
                    查看任务
                  </button>
                  <button
                    onClick={() => handleReboot(selectedServer)}
                    className="px-4 py-2 bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg text-cyber-text hover:bg-cyber-accent/10 transition-all flex items-center gap-2 justify-center">
                    <Power className="w-4 h-4" />
                    重启服务器
                  </button>
                  <button
                    onClick={openIPMIConsole}
                    className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-2 justify-center">
                    <Monitor className="w-4 h-4" />
                    IPMI控制台
                  </button>
                  <button
                    onClick={() => openReinstallDialog(selectedServer)}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2 justify-center">
                    <HardDrive className="w-4 h-4" />
                    重装系统
                  </button>
                  <button
                    onClick={fetchBootModes}
                    disabled={loadingBootModes}
                    className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/20 transition-all flex items-center gap-2 justify-center disabled:opacity-50">
                    <HardDrive className="w-4 h-4" />
                    {loadingBootModes ? '加载中...' : '启动模式'}
                  </button>
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 左列：基础信息 */}
                    <div className="space-y-3">
                      {/* 处理器 */}
                      <div className="flex items-baseline">
                        <span className="text-cyber-muted text-sm w-16">处理器:</span>
                        <div className="flex-1">
                          <span className="text-cyber-text font-semibold">{hardware.processorName}</span>
                          {hardware.coresPerProcessor > 0 && hardware.threadsPerProcessor > 0 && (
                            <span className="text-cyber-muted text-sm ml-2">
                              ({hardware.coresPerProcessor}核/{hardware.threadsPerProcessor}线程)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 架构 */}
                      <div className="flex items-baseline">
                        <span className="text-cyber-muted text-sm w-16">架构:</span>
                        <span className="text-cyber-text">{hardware.processorArchitecture}</span>
                      </div>

                      {/* 内存 */}
                      <div className="flex items-baseline">
                        <span className="text-cyber-muted text-sm w-16">内存:</span>
                        <span className="text-cyber-text font-semibold">{hardware.memorySize?.value} {hardware.memorySize?.unit}</span>
                      </div>
                    </div>

                    {/* 右列：存储配置 */}
                    {hardware.diskGroups && hardware.diskGroups.length > 0 && (
                      <div>
                        <div className="text-cyber-muted text-sm mb-3">存储配置</div>
                        <div className="space-y-2">
                          {hardware.diskGroups.map((group: any, idx: number) => (
                            <div key={idx} className="pl-3 border-l-2 border-cyber-accent/30">
                              <div className="text-sm text-cyber-text font-semibold">
                                {group.numberOfDisks}x {group.diskSize?.value}{group.diskSize?.unit} {group.diskType}
                                {group.defaultHardwareRaidType && group.defaultHardwareRaidType !== 'N/A' && (
                                  <span className="text-cyber-muted font-normal ml-2">
                                    (RAID {group.defaultHardwareRaidType.replace('raid', '')})
                                  </span>
                                )}
                              </div>
                              {group.description && (
                                <div className="text-xs text-cyber-muted mt-1">
                                  {group.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 扩展卡（如果有，横跨两列） */}
                    {hardware.expansionCards && hardware.expansionCards.length > 0 && (
                      <div className="lg:col-span-2">
                        <div className="text-cyber-muted text-sm mb-2 border-t border-cyber-accent/10 pt-3">扩展设备</div>
                        <div className="space-y-1 text-sm pl-3">
                          {hardware.expansionCards.map((card: any, idx: number) => (
                            <div key={idx} className="text-cyber-text">
                              <span className="text-cyber-muted uppercase">{card.type}:</span> {card.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
      {createPortal(
        <AnimatePresence>
          {showReinstallDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="cyber-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    onChange={(e) => {
                      const template = e.target.value;
                      setSelectedTemplate(template);
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
      </AnimatePresence>,
      document.body
      )}

      {/* Task 4: 任务列表对话框 */}
      {createPortal(
        <AnimatePresence>
          {showTasksDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="cyber-card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
      </AnimatePresence>,
      document.body
      )}

      {/* Task 10: 启动模式对话框 */}
      {createPortal(
        <AnimatePresence>
          {showBootModeDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="cyber-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-orange-400" />
                  <h3 className="text-xl font-semibold text-cyber-text">
                    启动模式 - {selectedServer?.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowBootModeDialog(false)}
                  className="text-cyber-muted hover:text-cyber-text transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-cyber-muted text-sm mb-4">
                选择服务器的启动模式。切换后需要重启服务器才能生效。
              </p>

              <div className="space-y-3">
                {bootModes.map((mode) => (
                  <div
                    key={mode.id}
                    className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                      mode.active
                        ? 'border-cyber-accent bg-cyber-accent/10'
                        : 'border-cyber-accent/20 hover:border-cyber-accent/40 hover:bg-cyber-grid/30'
                    }`}
                    onClick={() => !mode.active && changeBootMode(mode.id)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-cyber-text">{mode.bootType}</h4>
                          {mode.active && (
                            <span className="px-2 py-1 bg-cyber-accent text-white text-xs rounded">当前</span>
                          )}
                        </div>
                        <p className="text-sm text-cyber-muted mt-1">{mode.description}</p>
                        {mode.kernel && (
                          <p className="text-xs text-cyber-muted/70 mt-1 font-mono">{mode.kernel}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowBootModeDialog(false)}
                  className="px-4 py-2 bg-cyber-accent text-white rounded-lg hover:bg-cyber-accent/80 transition-all">
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* IPMI倒计时加载模态框 */}
      {createPortal(
        <AnimatePresence>
          {ipmiLoading && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-cyber-dark border border-cyber-accent rounded-lg p-8 max-w-md w-full text-center">
                
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-cyber-accent/30"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-cyber-accent">{ipmiCountdown}</span>
                  </div>
                  <svg className="absolute inset-0 w-24 h-24 -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="44"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-cyber-accent"
                      strokeDasharray={`${(ipmiCountdown / 20) * 276.46} 276.46`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <h3 className="text-xl font-bold text-cyber-text mb-2">
                正在生成IPMI访问
              </h3>
              <p className="text-cyber-muted text-sm mb-4">
                请耐心等待，预计需要 20 秒
              </p>
              <div className="flex items-center justify-center gap-2 text-cyber-accent">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">连接中...</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* IPMI链接模态框 */}
      {createPortal(
        <AnimatePresence>
          {showIpmiLinkDialog && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-cyber-dark border border-cyber-accent rounded-lg p-6 max-w-2xl w-full">
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-6 h-6 text-cyber-accent" />
                    <h2 className="text-xl font-bold text-cyber-text">IPMI控制台</h2>
                </div>
                <button
                  onClick={() => setShowIpmiLinkDialog(false)}
                  className="p-2 hover:bg-cyber-grid/50 rounded-lg transition-all text-cyber-muted hover:text-cyber-text">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-cyber-muted mb-6">
                IPMI控制台访问链接已生成，点击下方按钮打开控制台。
              </p>

              <div className="flex items-center gap-3 text-xs text-cyber-muted mb-6">
                <AlertCircle className="w-4 h-4" />
                <span>会话有效期: 15分钟 | 访问可能需要允许弹窗</span>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowIpmiLinkDialog(false)}
                  className="px-4 py-2 border border-cyber-accent/30 rounded-lg text-cyber-text hover:bg-cyber-grid/50 transition-all">
                  关闭
                </button>
                <a
                  href={ipmiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowIpmiLinkDialog(false)}
                  className="px-6 py-2 bg-cyber-accent text-white rounded-lg hover:bg-cyber-accent/80 transition-all flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  打开IPMI控制台
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* 安装进度模态框 */}
      {createPortal(
        <AnimatePresence>
          {showInstallProgress && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-cyber-dark border border-cyber-accent rounded-lg max-w-3xl w-full ${
                  installCompleted ? 'p-6 overflow-hidden' : 'p-6 max-h-[90vh] overflow-y-auto'
                }`}>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-6 h-6 text-cyber-accent" />
                    <h2 className="text-2xl font-bold text-cyber-text">系统安装进度</h2>
                </div>
                {!installCompleted && (
                  <button
                    onClick={closeInstallProgress}
                    className="p-2 hover:bg-cyber-grid/50 rounded-lg transition-all text-cyber-muted hover:text-cyber-text">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {installCompleted ? (
                // 安装完成页面 - 在同一模态框内显示
                <div className="flex flex-col items-center justify-center py-6 px-8">
                  {/* 成功图标 - 带脉冲动画 */}
                  <motion.div 
                    className="mb-4 relative"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}>
                    {/* 外圈脉冲效果 */}
                    <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/50">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </motion.div>

                  {/* 标题 */}
                  <h3 className="text-3xl font-bold text-cyber-text mb-2">
                    安装完成
                  </h3>
                  <p className="text-cyber-muted text-sm">系统已成功部署，请查收邮件获取登录信息</p>
                </div>
              ) : !installProgress ? (
                // 加载中
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-12 h-12 text-cyber-accent animate-spin mb-4" />
                  <p className="text-cyber-muted">正在获取安装进度...</p>
                </div>
              ) : (
                <>
                  {/* 进度条 */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-cyber-text font-semibold">总体进度</span>
                      <span className="text-cyber-accent font-bold text-xl">{installProgress.progressPercentage}%</span>
                    </div>
                    <div className="w-full h-4 bg-cyber-grid/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyber-accent to-blue-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${installProgress.progressPercentage}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <div className="mt-2 text-sm text-cyber-muted text-center">
                      <span>{installProgress.completedSteps} / {installProgress.totalSteps} 步骤完成</span>
                    </div>
                  </div>

                  {/* 状态提示 */}
                  {installProgress.allDone && (
                    <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
                      <Activity className="w-5 h-5 text-green-500" />
                      <span className="text-green-500 font-semibold">✅ 系统安装已完成！</span>
                    </div>
                  )}

                  {installProgress.hasError && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-500 font-semibold">❌ 安装过程中出现错误</span>
                    </div>
                  )}

                  {/* 当前步骤 - 只显示正在执行的步骤 */}
                  <div>
                    <h3 className="text-lg font-semibold text-cyber-text mb-3">当前步骤</h3>
                    {(() => {
                      // 查找正在执行的步骤
                      const currentStep = installProgress.steps.find(s => s.status === 'doing');
                      // 如果没有正在执行的，显示最后完成的步骤
                      const lastDoneStep = [...installProgress.steps].reverse().find(s => s.status === 'done');
                      const stepToShow = currentStep || lastDoneStep;
                      
                      if (!stepToShow) return (
                        <div className="p-4 bg-cyber-grid/20 border border-cyber-accent/20 rounded-lg text-center text-cyber-muted">
                          准备中...
                        </div>
                      );
                      
                      return (
                        <div className={`p-4 rounded-lg border ${
                          stepToShow.status === 'done'
                            ? 'bg-green-500/10 border-green-500/30'
                            : stepToShow.status === 'doing'
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : stepToShow.status === 'error'
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-cyber-grid/20 border-cyber-accent/20'
                        }`}>
                          <div className="flex items-center gap-3">
                            {stepToShow.status === 'done' && (
                              <span className="text-green-500 text-xl">✓</span>
                            )}
                            {stepToShow.status === 'doing' && (
                              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                            )}
                            {stepToShow.status === 'error' && (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                            
                            <div className="flex-1">
                              <p className={`font-medium text-base ${
                                stepToShow.status === 'done'
                                  ? 'text-green-400'
                                  : stepToShow.status === 'doing'
                                  ? 'text-blue-400'
                                  : stepToShow.status === 'error'
                                  ? 'text-red-400'
                                  : 'text-cyber-muted'
                              }`}>
                                {stepToShow.comment || '处理中'}
                              </p>
                              {stepToShow.error && (
                                <p className="text-sm text-red-400 mt-1">错误: {stepToShow.error}</p>
                              )}
                            </div>

                            <span className={`text-xs px-3 py-1 rounded ${
                              stepToShow.status === 'done'
                                ? 'bg-green-500/20 text-green-400'
                                : stepToShow.status === 'doing'
                                ? 'bg-blue-500/20 text-blue-400'
                                : stepToShow.status === 'error'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-cyber-grid/30 text-cyber-muted'
                            }`}>
                              {stepToShow.status === 'done' ? '完成' : 
                               stepToShow.status === 'doing' ? '进行中' : 
                               stepToShow.status === 'error' ? '错误' : '待处理'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 底部按钮 */}
                  <div className="flex justify-end mt-6">
                    {installProgress.allDone || installProgress.hasError ? (
                      <button
                        onClick={closeInstallProgress}
                        className="px-6 py-2 bg-cyber-accent text-white rounded-lg hover:bg-cyber-accent/80 transition-all">
                        关闭
                      </button>
                    ) : (
                      <button
                        onClick={closeInstallProgress}
                        className="px-6 py-2 border border-cyber-accent/30 rounded-lg text-cyber-text hover:bg-cyber-grid/50 transition-all">
                        后台运行
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

    </div>
  );
};

export default ServerControlPage;
