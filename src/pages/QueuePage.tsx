import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAPI } from "@/context/APIContext";
import { api } from "@/utils/apiClient";
import { toast } from "sonner";
import { XIcon, RefreshCwIcon, PlusIcon, SearchIcon, PlayIcon, PauseIcon, Trash2Icon, ArrowUpDownIcon, HeartIcon } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  API_URL, 
  TASK_RETRY_INTERVAL, 
  MIN_RETRY_INTERVAL, 
  MAX_RETRY_INTERVAL,
  QUEUE_POLLING_INTERVAL,
  validateRetryInterval,
  formatInterval
} from "@/config/constants";
import { OVH_DATACENTERS, DatacenterInfo } from "@/config/ovhConstants";

interface QueueItem {
  id: string;
  planCode: string;
  datacenter: string;
  options: string[];
  status: "pending" | "running" | "paused" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  retryInterval: number;
  retryCount: number;
}

interface ServerOption {
  label: string;
  value: string;
}

interface ServerPlan {
  planCode: string;
  name: string;
  cpu: string;
  memory: string;
  storage: string;
  datacenters: {
    datacenter: string;
    dcName: string;
    region: string;
    availability: string;
  }[];
  defaultOptions: ServerOption[];
  availableOptions: ServerOption[];
}

const QueuePage = () => {
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAPI();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false); // 默认收起表单
  const [servers, setServers] = useState<ServerPlan[]>([]);
  const [planCodeInput, setPlanCodeInput] = useState<string>("");
  const [selectedServer, setSelectedServer] = useState<ServerPlan | null>(null);
  const [selectedDatacenters, setSelectedDatacenters] = useState<string[]>([]);
  const [retryInterval, setRetryInterval] = useState<number>(TASK_RETRY_INTERVAL);

  // Fetch queue items
  const fetchQueueItems = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/queue`);
      setQueueItems(response.data);
    } catch (error) {
      console.error("Error fetching queue items:", error);
      toast.error("获取队列失败");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch servers for the add form
  const fetchServers = async () => {
    try {
      const response = await api.get(`/servers`, {
        params: { showApiServers: isAuthenticated },
      });
      
      const serversList = response.data.servers || response.data || [];
      setServers(serversList);

    } catch (error) {
      console.error("Error fetching servers:", error);
      toast.error("获取服务器列表失败");
    }
  };

  // Add new queue item
  const addQueueItem = async () => {
    if (!planCodeInput.trim() || selectedDatacenters.length === 0) {
      toast.error("请输入服务器计划代码并至少选择一个数据中心");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const dc of selectedDatacenters) {
    try {
      await api.post(`/queue`, {
          planCode: planCodeInput.trim(),
          datacenter: dc,
        retryInterval: retryInterval,
      });
        successCount++;
      } catch (error) {
        console.error(`Error adding ${planCodeInput.trim()} in ${dc} to queue:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount}个任务已成功添加到抢购队列`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount}个任务添加到抢购队列失败`);
    }

    if (successCount > 0 || errorCount === 0) {
      fetchQueueItems();
      setShowAddForm(false);
      setPlanCodeInput("");
      setSelectedDatacenters([]);
      setRetryInterval(TASK_RETRY_INTERVAL);
    }
  };

  // Remove queue item
  const removeQueueItem = async (id: string) => {
    try {
      await api.delete(`/queue/${id}`);
      toast.success("已从队列中移除");
      fetchQueueItems();
    } catch (error) {
      console.error("Error removing queue item:", error);
      toast.error("从队列中移除失败");
    }
  };

  // Start/stop queue item
  const toggleQueueItemStatus = async (id: string, currentStatus: string) => {
    // 优化状态切换逻辑：
    // running → paused (暂停运行中的任务)
    // paused → running (恢复已暂停的任务)
    // pending/completed/failed → running (启动其他状态的任务)
    let newStatus: string;
    let actionText: string;
    
    if (currentStatus === "running") {
      newStatus = "paused";
      actionText = "暂停";
    } else if (currentStatus === "paused") {
      newStatus = "running";
      actionText = "恢复";
    } else {
      newStatus = "running";
      actionText = "启动";
    }
    
    try {
      await api.put(`/queue/${id}/status`, {
        status: newStatus,
      });
      
      toast.success(`已${actionText}队列项`);
      fetchQueueItems();
    } catch (error) {
      console.error("Error updating queue item status:", error);
      toast.error("更新队列项状态失败");
    }
  };

  // Clear all queue items
  const clearAllQueue = async () => {
    if (!window.confirm('确定要清空所有队列吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      const response = await api.delete(`/queue/clear`);
      toast.success(`已清空队列（共 ${response.data.count} 项）`);
      fetchQueueItems();
    } catch (error) {
      console.error("Error clearing queue:", error);
      toast.error("清空队列失败");
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchQueueItems();
    fetchServers();
    
    // Set up polling interval
    const interval = setInterval(fetchQueueItems, QUEUE_POLLING_INTERVAL);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Update selectedServer when planCodeInput or servers list changes
  useEffect(() => {
    if (planCodeInput.trim()) {
      const server = servers.find(s => s.planCode === planCodeInput.trim());
      setSelectedServer(server || null);
    } else {
      setSelectedServer(null);
    }
  }, [planCodeInput, servers]);

  // Reset selectedDatacenters when planCodeInput changes
  useEffect(() => {
    setSelectedDatacenters([]);
  }, [planCodeInput]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleDatacenterChange = (dcCode: string) => {
    setSelectedDatacenters(prev => 
      prev.includes(dcCode) ? prev.filter(d => d !== dcCode) : [...prev, dcCode]
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-1 cyber-glow-text`}>抢购队列</h1>
        <p className="text-cyber-muted text-sm mb-4 sm:mb-6">管理自动抢购服务器的队列</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => fetchQueueItems()}
            className="cyber-button text-xs flex items-center flex-1 sm:flex-initial justify-center"
            disabled={isLoading}
          >
            <RefreshCwIcon size={12} className="mr-1" />
            刷新
          </button>
          <button
            onClick={clearAllQueue}
            className="cyber-button text-xs flex items-center bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30 flex-1 sm:flex-initial justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || queueItems.length === 0}
          >
            <Trash2Icon size={12} className="mr-1" />
            {!isMobile && '清空队列'}
            {isMobile && '清空'}
          </button>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="cyber-button text-xs flex items-center bg-cyber-primary hover:bg-cyber-primary-dark text-white justify-center"
        >
          <PlusIcon size={14} className="mr-1" />
          添加新任务
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-cyber-surface-dark p-4 sm:p-6 rounded-lg shadow-xl border border-cyber-border relative">
          <button 
            onClick={() => setShowAddForm(false)} 
            className="absolute top-2 right-2 sm:top-3 sm:right-3 text-cyber-muted hover:text-cyber-text transition-colors"
          >
            <XIcon size={isMobile ? 18 : 20} />
          </button>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-4 sm:mb-6 text-cyber-primary-accent pr-8`}>添加抢购任务</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Left Column: Plan Code & Retry Interval */}
            <div className="md:col-span-1 space-y-6">
              <div>
                <label htmlFor="planCode" className="block text-sm font-medium text-cyber-secondary mb-1">服务器计划代码</label>
                <input
                  type="text"
                  id="planCode"
                  value={planCodeInput}
                  onChange={(e) => setPlanCodeInput(e.target.value)}
                  placeholder="例如: 24sk202"
                  className="w-full cyber-input bg-cyber-surface text-cyber-text border-cyber-border focus:ring-cyber-primary focus:border-cyber-primary"
                />
              </div>
              <div>
                <label htmlFor="retryInterval" className="block text-sm font-medium text-cyber-secondary mb-1">
                  抢购失败后重试间隔 (秒)
                  <span className="text-xs text-cyber-muted ml-2">
                    范围: {MIN_RETRY_INTERVAL}-{MAX_RETRY_INTERVAL}秒，推荐: {TASK_RETRY_INTERVAL}秒
                  </span>
                </label>
                <input
                  type="number"
                  id="retryInterval"
                  value={retryInterval}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= MIN_RETRY_INTERVAL && value <= MAX_RETRY_INTERVAL) {
                      setRetryInterval(value);
                    } else {
                      toast.warning(`重试间隔必须在 ${MIN_RETRY_INTERVAL}-${MAX_RETRY_INTERVAL} 秒之间`);
                    }
                  }}
                  min={MIN_RETRY_INTERVAL}
                  max={MAX_RETRY_INTERVAL}
                  className={`w-full cyber-input bg-cyber-surface text-cyber-text border-cyber-border focus:ring-cyber-primary focus:border-cyber-primary ${
                    !validateRetryInterval(retryInterval) ? 'border-red-500' : ''
                  }`}
                  placeholder={`推荐: ${TASK_RETRY_INTERVAL}秒`}
                />
                {!validateRetryInterval(retryInterval) && (
                  <p className="text-xs text-red-400 mt-1">
                    ⚠️ 间隔时间过短可能导致API过载，建议设置为 {TASK_RETRY_INTERVAL} 秒或更长
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Datacenter Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-cyber-secondary mb-2">选择数据中心 (可选)</label>
              <div className="h-48 p-3 bg-cyber-surface border border-cyber-border rounded-md overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 custom-scrollbar">
                {OVH_DATACENTERS.sort((a, b) => a.name.localeCompare(b.name)).map(dc => (
                  <div key={dc.code} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`dc-${dc.code}`}
                      checked={selectedDatacenters.includes(dc.code)}
                      onChange={() => handleDatacenterChange(dc.code)}
                      className="cyber-checkbox h-4 w-4 text-cyber-primary bg-cyber-surface border-cyber-border focus:ring-cyber-primary"
                    />
                    <label htmlFor={`dc-${dc.code}`} className="ml-2 text-sm text-cyber-text-dimmed truncate" title={`${dc.name} (${dc.code})`}>
                      {dc.name} ({dc.code})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={addQueueItem}
            className="w-full cyber-button bg-cyber-primary hover:bg-cyber-primary-dark text-white font-semibold py-2.5"
            disabled={!planCodeInput.trim()}
          >
            添加到队列
          </button>
        </div>
      )}

      {/* Queue List */}
      <div>
        {queueItems.length === 0 && (
          <div className="text-center py-10 border border-dashed border-cyber-border rounded-lg">
            <SearchIcon className="mx-auto text-cyber-secondary mb-2" size={32} />
            <p className="text-cyber-secondary font-medium">队列为空</p>
            <p className="text-xs text-cyber-muted">通过上方的表单添加新的抢购任务。</p>
          </div>
        )}

        {queueItems.length > 0 && (
          <div className="space-y-3">
            {queueItems.map(item => (
              <div 
                key={item.id}
                className="bg-cyber-surface p-4 rounded-lg shadow-md border border-cyber-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs bg-cyber-primary-accent/20 text-cyber-primary-accent rounded-full font-mono">
                      {item.planCode}
                    </span>
                    <span className="text-sm text-cyber-text-dimmed">DC: {item.datacenter.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-cyber-muted">
                    下次尝试: {item.retryCount > 0 ? `${item.retryInterval}秒后 (第${item.retryCount + 1}次)` : `即将开始` } | 创建于: {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
                  <span 
                    className={`text-xs px-2 py-1 rounded-full font-medium
                      ${item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        item.status === 'running' ? 'bg-green-500/20 text-green-400' :
                        item.status === 'paused' ? 'bg-orange-500/20 text-orange-400' :
                        item.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        item.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}
                    `}
                  >
                    {item.status === "pending" && "待命中"}
                    {item.status === "running" && "运行中"}
                    {item.status === "paused" && "已暂停"}
                    {item.status === "completed" && "已完成"}
                    {item.status === "failed" && "失败"}
                  </span>
                  <button 
                    onClick={() => toggleQueueItemStatus(item.id, item.status)}
                    className="p-1.5 hover:bg-cyber-hover rounded text-cyber-secondary hover:text-cyber-primary transition-colors"
                    title={item.status === 'running' ? "暂停" : item.status === 'paused' ? "恢复" : "启动"}
                  >
                    {item.status === 'running' ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                  </button>
                  <button 
                    onClick={() => removeQueueItem(item.id)}
                    className="p-1.5 hover:bg-cyber-hover rounded text-cyber-secondary hover:text-red-500 transition-colors"
                    title="移除"
                  >
                    <Trash2Icon size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueuePage;
