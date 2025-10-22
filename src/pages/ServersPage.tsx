import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAPI } from "@/context/APIContext";
import { api } from "@/utils/apiClient";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, Database, Wifi, HardDrive, CheckSquare, Square, Settings, ArrowRightLeft, Clock, Bell, Grid, List, Maximize2, Minimize2 } from "lucide-react";
import { apiEvents } from "@/context/APIContext";
import { OVH_DATACENTERS, DatacenterInfo } from "@/config/ovhConstants"; // Import from new location
import { API_URL } from "@/config/constants";

// 定义缓存相关的常量
const CACHE_KEY = 'ovh-servers-cache';
const CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 缓存2小时过期（与后端保持一致）

// 全局CSS样式
const globalStyles = `
.datacenter-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.datacenter-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.datacenter-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 255, 218, 0.2);
  border-radius: 10px;
}
.datacenter-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 255, 218, 0.4);
}
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
.animate-pulse-slow {
  animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;

interface ServerOption {
  label: string;
  value: string;
  family?: string;
  isDefault?: boolean;
}

interface ServerPlan {
  planCode: string;
  name: string;
  description?: string;
  cpu: string;
  memory: string;
  storage: string;
  bandwidth: string;
  vrackBandwidth: string;
  defaultOptions: ServerOption[];
  availableOptions: ServerOption[];
  datacenters: {
    datacenter: string;
    dcName: string;
    region: string;
    availability: string;
    countryCode: string;
  }[];
}

const ServersPage = () => {
  const { isAuthenticated } = useAPI();
  const [servers, setServers] = useState<ServerPlan[]>([]);
  const [filteredServers, setFilteredServers] = useState<ServerPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDatacenter, setSelectedDatacenter] = useState<string>("all");
  const [datacenters, setDatacenters] = useState<string[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<Record<string, Record<string, string>>>({});
  // 为每个服务器的数据中心选择状态设置映射
  const [selectedDatacenters, setSelectedDatacenters] = useState<Record<string, Record<string, boolean>>>({});
  // 用于跟踪当前选中的服务器
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  // 保存每个服务器的选中选项
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  // 上次更新时间
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // 标记是否已从缓存加载
  const hasLoadedFromCache = useRef(false);
  // 新增：标记是否真正在从API获取数据，防止并发
  const [isActuallyFetching, setIsActuallyFetching] = useState(false);
  // 视图模式：grid 或 list
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // 显示模式：compact 或 detailed
  const [displayMode, setDisplayMode] = useState<'compact' | 'detailed'>('detailed');
  // 已订阅的服务器列表（planCode）
  const [subscribedServers, setSubscribedServers] = useState<Set<string>>(new Set());

  // 检查缓存是否过期
  const isCacheExpired = (): boolean => {
    const cacheData = localStorage.getItem(CACHE_KEY);
    if (!cacheData) return true;
    
    try {
      const { timestamp } = JSON.parse(cacheData);
      const now = new Date().getTime();
      return now - timestamp > CACHE_EXPIRY;
    } catch (error) {
      console.error("解析缓存数据出错:", error);
      return true;
    }
  };

  // 从缓存加载数据
  const loadFromCache = (): boolean => {
    try {
      const cacheData = localStorage.getItem(CACHE_KEY);
      if (!cacheData) return false;
      
      const { data, timestamp } = JSON.parse(cacheData);
      if (!data || !Array.isArray(data)) return false;
      
      console.log(`💾 从缓存加载服务器数据... (${data.length} 台服务器)`);
      
      // 初始化数据中心选择状态
      const dcSelections: Record<string, Record<string, boolean>> = {};
      data.forEach(server => {
        dcSelections[server.planCode] = {};
        // 对所有固定的数据中心进行初始化
        OVH_DATACENTERS.forEach(dc => {
          dcSelections[server.planCode][dc.code.toUpperCase()] = false;
        });
      });
      
      setSelectedDatacenters(dcSelections);
      setServers(data);
      
      // 立即设置filteredServers，避免等待useEffect
      if (!searchTerm && selectedDatacenter === "all") {
        setFilteredServers(data);
      }
      
      setLastUpdated(new Date(timestamp));
      setIsLoading(false);
      
      console.log(`✅ 缓存数据加载完成: ${data.length} 台服务器`);
      return true;
    } catch (error) {
      console.error("加载缓存数据出错:", error);
      return false;
    }
  };

  // 保存数据到缓存
  const saveToCache = (data: ServerPlan[]) => {
    try {
      const cacheData = {
        data,
        timestamp: new Date().getTime()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log("服务器数据已保存到缓存");
    } catch (error) {
      console.error("保存数据到缓存出错:", error);
    }
  };

  // Fetch servers from the backend
  const fetchServers = async (forceRefresh = false, overrideAuth?: boolean) => {
    // 如果不是强制刷新，并且已从缓存加载过数据，并且缓存未过期，则跳过
    if (!forceRefresh && hasLoadedFromCache.current && !isCacheExpired()) {
      console.log("使用现有数据，缓存未过期，跳过API请求");
      return;
    }

    // 如果当前已经在从API获取数据，则跳过此次请求
    if (isActuallyFetching) {
      console.log("已在从API获取服务器数据，跳过此次冗余请求");
      return;
    }
    
    // 使用传入的认证状态或当前状态
    const authState = overrideAuth !== undefined ? overrideAuth : isAuthenticated;
    console.log(`📊 认证状态检查 - overrideAuth: ${overrideAuth}, isAuthenticated: ${isAuthenticated}, 最终使用: ${authState}`);
    
    setIsLoading(true);
    setIsActuallyFetching(true); // 标记开始从API获取
    try {
      console.log(`开始从API获取服务器数据... (forceRefresh: ${forceRefresh}, showApiServers: ${authState})`);
      
      // 首次加载提示用户需要等待
      if (forceRefresh && !hasLoadedFromCache.current) {
        toast.info('正在从OVH获取服务器列表，首次加载可能需要1-2分钟，请耐心等待...', {
          duration: 5000
        });
      }
      
      const response = await api.get(`/servers`, {
        params: { 
          showApiServers: authState,
          forceRefresh: forceRefresh 
        }
      });
      
      // 调试输出查看原始服务器数据
      console.log("原始服务器数据:", response.data);
      
      // 确保我们从正确的数据结构中获取服务器列表
      let serversList = [];
      
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data)) {
          serversList = response.data;
        } else if (response.data.servers && Array.isArray(response.data.servers)) {
          serversList = response.data.servers;
        }
      }
      
      // 进一步校验服务器列表的有效性
      if (!Array.isArray(serversList)) {
        console.error("无效的服务器列表格式:", serversList);
        toast.error("获取服务器列表失败: 数据格式错误");
        setIsLoading(false);
        return;
      }
      
      console.log("解析后的服务器列表:", serversList);
      console.log(`获取到 ${serversList.length} 台服务器`);
      
      // 确保每个服务器都有正确的数据结构
      const formattedServers = serversList.map((server: ServerPlan) => {
        // 验证必要字段是否存在
        const formattedServer = {
          ...server,
          planCode: server.planCode || "未知",
          name: server.name || "未命名服务器",
          description: server.description || "",
          cpu: server.cpu || "N/A",
          memory: server.memory || "N/A", 
          storage: server.storage || "N/A",
          bandwidth: server.bandwidth || "N/A",
          vrackBandwidth: server.vrackBandwidth || "N/A",
          defaultOptions: Array.isArray(server.defaultOptions) ? server.defaultOptions : [],
          availableOptions: Array.isArray(server.availableOptions) ? server.availableOptions : [],
          datacenters: Array.isArray(server.datacenters) ? server.datacenters : []
        };
        
        // 显示额外调试信息
        console.log(`服务器 ${formattedServer.planCode} 硬件信息:`, {
          cpu: formattedServer.cpu,
          memory: formattedServer.memory,
          storage: formattedServer.storage,
          bandwidth: formattedServer.bandwidth
        });
        
        return formattedServer;
      });
      
      console.log("格式化后的服务器列表:", formattedServers);
      
      // 设置使用固定的数据中心列表
      const allDatacenters = OVH_DATACENTERS.map(dc => dc.code.toUpperCase());
      setDatacenters(allDatacenters);
      
      // 初始化数据中心选择状态
      const dcSelections: Record<string, Record<string, boolean>> = {};
      formattedServers.forEach(server => {
        dcSelections[server.planCode] = {};
        // 对所有固定的数据中心进行初始化
        OVH_DATACENTERS.forEach(dc => {
          dcSelections[server.planCode][dc.code.toUpperCase()] = false;
        });
      });
      
      setSelectedDatacenters(dcSelections);
      
      // 先设置服务器数据，让useEffect来处理过滤
      setServers(formattedServers);
      
      // 如果没有搜索词和数据中心过滤，直接设置filteredServers
      // 这样可以立即显示数据，避免等待useEffect执行
      if (!searchTerm && selectedDatacenter === "all") {
        setFilteredServers(formattedServers);
      }
      
      setIsLoading(false); // isLoading 在这里可以先置为false，因为数据已获取并设置
      // 更新最后刷新时间
      setLastUpdated(new Date());
      
      // 保存到缓存
      saveToCache(formattedServers);
      
      console.log(`✅ 服务器数据已设置: ${formattedServers.length} 台服务器`);
      
      // 检查是否有服务器缺少硬件信息
      const missingInfoServers = formattedServers.filter(
        server => server.cpu === "N/A" || server.memory === "N/A" || server.storage === "N/A"
      );
      
      if (missingInfoServers.length > 0) {
        console.warn("以下服务器缺少硬件信息:", missingInfoServers.map(s => s.planCode).join(", "));
      }
      
    } catch (error: any) {
      console.error("获取服务器列表时出错:", error);
      
      // 更详细的错误提示
      let errorMessage = "获取服务器列表失败";
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = '请求超时，OVH服务器响应较慢，请点击"刷新"按钮重试';
      } else if (error.response?.status === 401) {
        errorMessage = "认证失败，请检查API配置";
      } else if (error.response?.status === 403) {
        errorMessage = "API密钥无效或权限不足";
      } else if (!isAuthenticated) {
        errorMessage = "请先配置OVH API密钥";
      } else if (error.message) {
        errorMessage = `获取服务器列表失败: ${error.message}`;
      }
      
      toast.error(errorMessage, {
        duration: 6000
      });
      setIsLoading(false); // 确保isLoading在出错时也更新
      
      // 如果API请求失败但有缓存数据，尝试从缓存加载
      if (!hasLoadedFromCache.current) {
        const loaded = loadFromCache();
        if (loaded) {
          toast.info("使用缓存数据显示服务器列表");
          hasLoadedFromCache.current = true;
        }
      }
    } finally {
      setIsActuallyFetching(false); // 确保无论成功或失败都重置状态
    }
  };

  // 格式化日期时间的辅助函数
  const formatDateTime = (date: Date | null): string => {
    if (!date) return "未知";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return "刚刚";
    } else if (diffMins < 60) {
      return `${diffMins} 分钟前`;
    } else {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `今天 ${hours}:${minutes}`;
    }
  };

  // Format server specifications for better display
  const formatServerSpec = (value: string, type: string): string => {
    if (!value || value === "N/A") return "暂无数据";
    
    // 清理值
    value = value.trim();
    
    // 对于CPU，尝试格式化
    if (type === "CPU") {
      // 已经有完整描述的情况
      if (value.toLowerCase().includes("intel") || 
          value.toLowerCase().includes("amd") || 
          value.toLowerCase().includes("ryzen") || 
          value.toLowerCase().includes("xeon") || 
          value.toLowerCase().includes("epyc")) {
        return value;
      }
      
      // 处理OVH API返回的CPU值格式 (通常是planCode)
      const cpuNameMatch = value.match(/cpu-([a-z0-9-]+)/i);
      if (cpuNameMatch) {
        // 尝试从planCode中提取CPU型号
        const cpuName = cpuNameMatch[1]
          .replace(/-/g, ' ')
          .replace(/(\d+)c(\d+)t/i, '$1核$2线程')
          .replace(/(\d+)c/i, '$1核')
          .replace(/i(\d+)/i, 'Intel Core i$1');
        
        return cpuName.charAt(0).toUpperCase() + cpuName.slice(1);
      }
      
      // 尝试从不同格式中提取信息
      if (value.includes("x")) {
        // 已经是格式 "4 x Intel Xeon"
        return value;
      } else if (!isNaN(Number(value))) {
        return `${value} 核心`;
      }
      
      // 专门处理core关键词
      if (value.toLowerCase().includes("core")) {
        return value;
      }
      
      return value;
    }
    
    // 对于内存，转换为GB表示
    if (type === "内存") {
      // 已经包含单位
      if (value.toLowerCase().includes("gb") || 
          value.toLowerCase().includes("mb") || 
          value.toLowerCase().includes("tb")) {
        return value;
      } 
      
      // 处理OVH API返回的内存值格式
      const ramMatch = value.match(/ram-(\d+)g/i);
      if (ramMatch) {
        return `${ramMatch[1]} GB`;
      }
      
      // 尝试处理纯数字
      if (!isNaN(Number(value))) {
        const num = Number(value);
        // 大于1000的可能是MB为单位
        if (num > 1000) {
          return `${(num/1024).toFixed(0)} GB`;
        }
        return `${num} GB`;
      }
      
      // 尝试提取数字部分
      const numMatch = value.match(/(\d+)/);
      if (numMatch && numMatch[1]) {
        const num = parseInt(numMatch[1]);
        if (num > 0) {
          if (num > 1000) {
            return `${(num/1024).toFixed(0)} GB`;
          }
          return `${num} GB`;
        }
      }
      
      return value;
    }
    
    // 对于存储
    if (type === "存储") {
      // 已经包含单位
      if (value.toLowerCase().includes("gb") || 
          value.toLowerCase().includes("tb") || 
          value.toLowerCase().includes("ssd") || 
          value.toLowerCase().includes("hdd") || 
          value.toLowerCase().includes("nvme")) {
        return value;
      }
      
      // 处理OVH API返回的存储值格式
      const storageMatch = value.match(/(raid|softraid)-(\d+)x(\d+)(ssd|hdd|nvme)/i);
      if (storageMatch) {
        const raidType = storageMatch[1].toUpperCase();
        const count = storageMatch[2];
        const size = storageMatch[3];
        const diskType = storageMatch[4].toUpperCase();
        return `${raidType} ${count}x ${size}GB ${diskType}`;
      }
      
      // 尝试处理纯数字
      if (!isNaN(Number(value))) {
        const num = Number(value);
        if (num >= 1000) {
          return `${(num/1000).toFixed(1)} TB`;
        }
        return `${num} GB`;
      }
      
      // 尝试匹配常见的存储格式，如 "2x500GB SSD"
      const simpleStorageMatch = value.match(/(\d+)x(\d+)(GB|TB|G|T)?/i);
      if (simpleStorageMatch) {
        const count = parseInt(simpleStorageMatch[1]);
        const size = parseInt(simpleStorageMatch[2]);
        const unit = simpleStorageMatch[3]?.toUpperCase() || "GB";
        const sizeStr = unit.includes("T") ? `${size}TB` : `${size}GB`;
        return `${count}x ${sizeStr}`;
      }
      
      return value;
    }
    
    // 对于带宽
    if (type.includes("带宽") && !type.includes("内网")) {
      // 已经包含单位或特殊格式
      if (value.toLowerCase().includes("gbps") || 
          value.toLowerCase().includes("mbps") || 
          value.toLowerCase().includes("gbit") || 
          value.toLowerCase().includes("mbit") ||
          value.toLowerCase().includes("流量") ||
          value.toLowerCase().includes("无限") ||
          value.toLowerCase().includes("保证")) {
        return value;
      }
      
      // 处理带宽和流量组合格式 "traffic-5tb-100-24sk-apac"
      const combinedTrafficMatch = value.match(/traffic-(\d+)(tb|gb|mb)-(\d+)/i);
      if (combinedTrafficMatch) {
        const trafficSize = combinedTrafficMatch[1];
        const trafficUnit = combinedTrafficMatch[2].toUpperCase();
        const bandwidth = combinedTrafficMatch[3];
        return `${bandwidth} Mbps / ${trafficSize} ${trafficUnit}流量`;
      }
      
      // 处理无限流量
      if (value.toLowerCase().includes("unlimited")) {
        return "无限流量";
      }
      
      // 处理保证带宽
      if (value.toLowerCase().includes("guarantee")) {
        const bwMatch = value.match(/(\d+)/);
        if (bwMatch) {
          return `${bwMatch[1]} Mbps (保证带宽)`;
        }
        return "保证带宽";
      }
      
      // 处理OVH API返回的带宽值格式
      const trafficMatch = value.match(/traffic-(\d+)(tb|gb|mb|m|g)/i);
      if (trafficMatch) {
        const size = trafficMatch[1];
        const unit = trafficMatch[2].toLowerCase();
        if (unit === 'tb' || unit === 't') {
          return `${size} TB流量`;
        } else if (unit === 'gb' || unit === 'g') {
          return `${size} GB流量`;
        } else {
          return `${size} MB流量`;
        }
      }
      
      // 处理bandwidth格式
      const bandwidthMatch = value.match(/bandwidth-(\d+)/i);
      if (bandwidthMatch) {
        const bwValue = parseInt(bandwidthMatch[1]);
        if (bwValue >= 1000) {
          return `${bwValue/1000} Gbps`.replace(".0 ", " ");
        }
        return `${bwValue} Mbps`;
      }
      
      // 尝试处理纯数字
      if (!isNaN(Number(value))) {
        const num = Number(value);
        if (num >= 1000) {
          return `${(num/1000).toFixed(1)} Gbps`;
        }
        return `${num} Mbps`;
      }
      
      // 尝试匹配带宽格式
      const bwMatch = value.match(/(\d+)([mg])/i);
      if (bwMatch) {
        const size = parseInt(bwMatch[1]);
        const unit = bwMatch[2].toLowerCase();
        if (unit === 'g') {
          return `${size} Gbps`;
        } else if (unit === 'm') {
          return `${size} Mbps`;
        }
      }
      
      return value;
    }
    
    // 对于内网带宽
    if (type.includes("内网带宽")) {
      // 已经包含单位或描述的情况
      if (value.toLowerCase().includes("gbps") || 
          value.toLowerCase().includes("mbps") || 
          value.toLowerCase().includes("gbit") || 
          value.toLowerCase().includes("内网") || 
          value.toLowerCase().includes("vrack")) {
        return value;
      }
      
      // 处理vrack-bandwidth格式
      const vrackBwMatch = value.match(/vrack-bandwidth-(\d+)/i);
      if (vrackBwMatch) {
        const bwValue = parseInt(vrackBwMatch[1]);
        if (bwValue >= 1000) {
          return `${bwValue/1000} Gbps 内网`.replace(".0 ", " ");
        }
        return `${bwValue} Mbps 内网`;
      }
      
      // 尝试处理纯数字
      if (!isNaN(Number(value))) {
        const num = Number(value);
        if (num >= 1000) {
          return `${(num/1000).toFixed(1)} Gbps 内网`;
        }
        return `${num} Mbps 内网`;
      }
      
      // 尝试匹配带宽格式
      const bwMatch = value.match(/(\d+)([mg])/i);
      if (bwMatch) {
        const size = parseInt(bwMatch[1]);
        const unit = bwMatch[2].toLowerCase();
        if (unit === 'g') {
          return `${size} Gbps 内网`;
        } else if (unit === 'm') {
          return `${size} Mbps 内网`;
        }
      }
      
      return value;
    }
    
    return value;
  };

  // Check availability for a specific server plan
  const checkAvailability = async (planCode: string) => {
    if (!isAuthenticated) {
      toast.error("请先配置 API 设置");
      return;
    }
    
    setIsCheckingAvailability(true);
    setSelectedServer(planCode);
    
    // 提示用户正在检测
    toast.info(`正在检测 ${planCode} 的可用性...`, { duration: 2000 });
    
    try {
      // 获取用户选择的配置选项
      const selectedOpts = selectedOptions[planCode] || [];
      
      // 直接使用完整的planCode查询（包括数据中心后缀）
      // 如果用户选择了自定义配置，传递这些选项
      const params: any = {};
      if (selectedOpts.length > 0) {
        // 将选项数组转换为逗号分隔的字符串
        params.options = selectedOpts.join(',');
      }
      
      const response = await api.get(`/availability/${planCode}`, { 
        params,
        timeout: 120000 // 2分钟超时
      });
      console.log(`获取到 ${planCode} 的可用性数据 (配置: ${selectedOpts.join(', ') || '默认'}):`, response.data);
      
      // OVH API返回的数据中心代码可能与前端不一致，需要映射
      // 例如：API返回 "ynm" (孟买)，但前端使用 "mum"
      const normalizedData: Record<string, string> = {};
      Object.entries(response.data).forEach(([dc, status]) => {
        // 将ynm映射为mum（孟买的API代码是ynm，前端使用mum）
        const normalizedDc = dc === 'ynm' ? 'mum' : dc;
        normalizedData[normalizedDc] = status as string;
      });
      
      console.log(`标准化后的可用性数据:`, normalizedData);
      
      // 使用完整的 planCode 作为键存储
      setAvailability(prev => ({
        ...prev,
        [planCode]: normalizedData
      }));
      
      toast.success(`已更新 ${planCode} 可用性信息`);
    } catch (error: any) {
      console.error(`Error checking availability for ${planCode}:`, error);
      
      let errorMessage = `获取 ${planCode} 可用性失败`;
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = `${planCode} 可用性检测超时，OVH响应较慢，请稍后重试`;
      } else if (error.response?.status === 404) {
        errorMessage = `${planCode} 不存在或已下架`;
      } else if (error.message) {
        errorMessage = `获取 ${planCode} 可用性失败: ${error.message}`;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsCheckingAvailability(false);
      setSelectedServer(null);
    }
  };

  // 切换特定服务器的数据中心选择状态
  const toggleDatacenterSelection = (serverPlanCode: string, datacenter: string) => {
    setSelectedDatacenters(prev => ({
      ...prev,
      [serverPlanCode]: {
        ...prev[serverPlanCode],
        [datacenter]: !prev[serverPlanCode]?.[datacenter]
      }
    }));
  };

  // 全选或取消全选特定服务器的所有数据中心
  const toggleAllDatacenters = (serverPlanCode: string, selected: boolean) => {
    setSelectedDatacenters(prev => {
      const newServerState = { ...prev };
      if (newServerState[serverPlanCode]) {
        Object.keys(newServerState[serverPlanCode]).forEach(dc => {
          newServerState[serverPlanCode][dc] = selected;
        });
      }
      return newServerState;
    });
  };

  // 获取特定服务器已选中的数据中心列表
  const getSelectedDatacentersList = (serverPlanCode: string): string[] => {
    if (!selectedDatacenters[serverPlanCode]) return [];
    
    return Object.entries(selectedDatacenters[serverPlanCode])
      .filter(([_, selected]) => selected)
      .map(([dc]) => dc.toLowerCase());
  };

  // 切换选项，支持单选逻辑
  const toggleOption = (serverPlanCode: string, optionValue: string, groupName?: string) => {
    setSelectedOptions(prev => {
      let currentOptions = [...(prev[serverPlanCode] || [])];
      const index = currentOptions.indexOf(optionValue);
      
      if (index >= 0) {
        // 如果选项已经选中，则移除它
        currentOptions.splice(index, 1);
      } else {
        // 如果选项未选中，并且提供了组名，则实现单选逻辑
        if (groupName) {
          // 获取服务器的所有可用选项
          const serverOptions = servers.find(s => s.planCode === serverPlanCode)?.availableOptions || [];
          
          // 找出同组中的其他选项，并从当前选中列表中移除
          serverOptions.forEach(option => {
            const optionFamily = option.family?.toLowerCase() || "";
            const optionLabel = option.label.toLowerCase();
            
            // 检查此选项是否属于同一组
            let isInSameGroup = false;
            
            if (groupName === "CPU/处理器" && 
                (optionFamily.includes("cpu") || optionFamily.includes("processor") || 
                 optionLabel.includes("cpu") || optionLabel.includes("processor"))) {
              isInSameGroup = true;
            } else if (groupName === "内存" && 
                      (optionFamily.includes("memory") || optionFamily.includes("ram") || 
                       optionLabel.includes("ram") || optionLabel.includes("memory"))) {
              isInSameGroup = true;
            } else if (groupName === "存储" && 
                      (optionFamily.includes("storage") || optionFamily.includes("disk") || 
                       optionLabel.includes("ssd") || optionLabel.includes("hdd"))) {
              isInSameGroup = true;
            } else if (groupName === "带宽/网络" && 
                      (optionFamily.includes("bandwidth") || optionFamily.includes("traffic") || 
                       optionLabel.includes("bandwidth") || optionLabel.includes("network"))) {
              isInSameGroup = true;
            } else if (groupName === "vRack内网" && 
                      (option.value.toLowerCase().includes("vrack") || 
                       optionLabel.includes("vrack") || optionLabel.includes("内网"))) {
              isInSameGroup = true;
            }
            
            // 如果是同组选项且不是当前选择的选项，则从选中列表中移除
            if (isInSameGroup && option.value !== optionValue) {
              const idx = currentOptions.indexOf(option.value);
              if (idx >= 0) {
                currentOptions.splice(idx, 1);
              }
            }
          });
        }
        
        // 添加当前选择的选项
        currentOptions.push(optionValue);
      }
      
      return {
        ...prev,
        [serverPlanCode]: currentOptions
      };
    });
  };

  // 判断选项是否已选中
  const isOptionSelected = (serverPlanCode: string, optionValue: string): boolean => {
    return selectedOptions[serverPlanCode]?.includes(optionValue) || false;
  };

  // 添加到抢购队列的函数，支持多数据中心
  const addToQueue = async (server: ServerPlan, datacenters: string[]) => {
    if (!isAuthenticated) {
      toast.error("请先配置 API 设置");
      return;
    }

    if (datacenters.length === 0) {
      toast.error("请至少选择一个数据中心");
      return;
    }
    
    try {
      // 获取用户选择的配置选项
      const userSelectedOptions = selectedOptions[server.planCode]?.length > 0 
        ? selectedOptions[server.planCode] 
        : server.defaultOptions.map(opt => opt.value);

      // 将用户选择的配置分类整理为可读的格式
      const formattedOptions: Record<string, string[]> = {};
      const categorizeOption = (optionValue: string) => {
        const option = server.availableOptions.find(opt => opt.value === optionValue);
        if (!option) return null;
        
        // 尝试确定选项类别
        let category = "其他";
        const value = option.value.toLowerCase();
        const label = option.label.toLowerCase();
        
        if (value.includes("ram-") || label.includes("内存") || label.includes("memory")) {
          category = "内存";
        } else if (value.includes("softraid") || value.includes("raid") || 
                  label.includes("存储") || label.includes("storage") || 
                  label.includes("ssd") || label.includes("hdd") || label.includes("nvme")) {
          category = "存储";
        } else if (value.includes("bandwidth") || value.includes("traffic") || 
                  label.includes("带宽") || label.includes("bandwidth")) {
          category = "网络";
          }
          
        if (!formattedOptions[category]) {
          formattedOptions[category] = [];
        }
        formattedOptions[category].push(option.label);
        
        return option;
      };
      
      // 处理所有选中的选项
      const selectedOptionDetails = userSelectedOptions.map(categorizeOption).filter(Boolean);
      
      console.log("用户选择的配置详情:", formattedOptions);
      console.log("提交的配置选项:", userSelectedOptions);

      // 为每个选中的数据中心创建一个抢购请求
      const promises = datacenters.map(datacenter => 
        api.post(`/queue`, {
          planCode: server.planCode,
          datacenter,
          options: userSelectedOptions,
        })
      );
      
      await Promise.all(promises);
      
      // 构建成功消息，包含用户选择的配置详情
      let successMessage = `已将 ${server.planCode} 添加到 ${datacenters.length} 个数据中心的抢购队列`;
      
      // 如果有自定义配置，添加到成功消息中
      if (userSelectedOptions.length > 0 && userSelectedOptions.some(opt => !server.defaultOptions.map(o => o.value).includes(opt))) {
        successMessage += `\n已选配置: `;
        Object.entries(formattedOptions).forEach(([category, options]) => {
          successMessage += `${category}(${options.join(', ')}) `;
        });
      }
      
      toast.success(successMessage);
    } catch (error) {
      console.error("Error adding to queue:", error);
      toast.error("添加到抢购队列失败");
    }
  };

  // 添加到服务器监控
  const addToMonitor = async (server: ServerPlan, datacenters: string[]) => {
    if (!isAuthenticated) {
      toast.error("请先配置 API 设置");
      return;
    }

    try {
      await api.post('/monitor/subscriptions', {
        planCode: server.planCode,
        datacenters: datacenters,
        notifyAvailable: true,
        notifyUnavailable: true
      });
      
      const dcText = datacenters.length > 0 
        ? `监控数据中心: ${datacenters.join(', ')}` 
        : '监控所有数据中心';
      
      toast.success(`已添加 ${server.planCode} 到监控\n${dcText}\n✅ 有货提醒 + 无货提醒`);
      
      // 更新订阅列表
      loadSubscribedServers();
    } catch (error: any) {
      console.error("Error adding to monitor:", error);
      const errorMsg = error.response?.data?.message || "添加到监控失败";
      toast.error(errorMsg);
    }
  };

  // 获取已订阅的服务器列表
  const loadSubscribedServers = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await api.get('/monitor/subscriptions');
      const subscriptions = response.data;
      const planCodes = new Set<string>(subscriptions.map((sub: any) => sub.planCode as string));
      setSubscribedServers(planCodes);
    } catch (error) {
      console.error("Error loading subscribed servers:", error);
    }
  };

  // Subscribe to API auth changes to reload servers when auth status changes
  useEffect(() => {
    // 首次加载时，先尝试从缓存加载
    const loadInitialData = async () => {
      // 尝试从缓存加载
      const loadedFromCache = loadFromCache();
      hasLoadedFromCache.current = loadedFromCache;
      
      if (loadedFromCache) {
        console.log("成功从缓存加载数据");
        
        // 如果缓存过期，则在后台刷新数据
        if (isCacheExpired()) {
          console.log("缓存已过期，在后台刷新数据 (通过 loadInitialData)");
          fetchServers(true);
        }
      } else {
        // 如果缓存加载失败，则直接从API获取
        console.log("缓存加载失败或无缓存，从API获取数据 (通过 loadInitialData)");
        fetchServers(true);
      }
    };
    
    loadInitialData();
    
    // 加载已订阅的服务器列表
    if (isAuthenticated) {
      loadSubscribedServers();
    }
    
    // 移除自动定时刷新，改为用户手动刷新
    // 后端缓存2小时，避免频繁API调用
    
    // Subscribe to auth change events
    const unsubscribe = apiEvents.onAuthChanged((newAuthState) => {
      console.log("认证状态改变事件触发，新状态:", newAuthState);
      console.log("强制刷新服务器列表，使用事件传来的认证状态...");
      // 使用事件传来的状态，而不是等待组件状态更新
      fetchServers(true, newAuthState); // 传入认证状态，避免使用过期的组件状态
      
      // 同时加载订阅列表
      if (newAuthState) {
        loadSubscribedServers();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Apply filters when search term or datacenter changes
  useEffect(() => {
    if (servers.length === 0) {
      console.log("⏳ 服务器列表为空，跳过过滤");
      return;
    }
    
    console.log(`🔍 应用过滤条件 - 搜索词: "${searchTerm}", 数据中心: "${selectedDatacenter}"`);
    
    let filtered = [...servers];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        server => 
          server.planCode.toLowerCase().includes(term) ||
          server.name.toLowerCase().includes(term) ||
          server.cpu.toLowerCase().includes(term) ||
          server.memory.toLowerCase().includes(term)
      );
      console.log(`   搜索后剩余: ${filtered.length} 台服务器`);
    }
    
    // Apply datacenter filter - 现在所有服务器都支持所有数据中心
    if (selectedDatacenter !== "all") {
      // 所有服务器都保留，因为我们假设每个服务器都可以在所有数据中心部署
      // 实际应用中可能需要根据API返回的真实可用性进行过滤
      console.log(`   数据中心过滤: ${selectedDatacenter} (暂不实际过滤)`);
    }
    
    // 排序：已订阅的服务器排在前面
    filtered.sort((a, b) => {
      const aSubscribed = subscribedServers.has(a.planCode);
      const bSubscribed = subscribedServers.has(b.planCode);
      
      if (aSubscribed && !bSubscribed) return -1;
      if (!aSubscribed && bSubscribed) return 1;
      return 0; // 保持原有顺序
    });
    
    console.log(`✅ 过滤完成，显示 ${filtered.length} 台服务器（已订阅: ${Array.from(subscribedServers).length} 台）`);
    setFilteredServers(filtered);
  }, [searchTerm, selectedDatacenter, servers, subscribedServers]);

  // 初始化选项
  useEffect(() => {
    // 如果服务器数据加载完成，初始化默认选项
    if (servers.length > 0) {
      const defaultServerOptions: Record<string, string[]> = {};
      servers.forEach(server => {
        defaultServerOptions[server.planCode] = server.defaultOptions.map(opt => opt.value);
      });
      setSelectedOptions(defaultServerOptions);
    }
  }, [servers]);

  // 分类并显示服务器配置选项
  const renderServerOptions = (server: ServerPlan) => {
    // 过滤掉许可证相关的选项，只保留硬件相关选项
    const filteredOptions = server.availableOptions ? server.availableOptions.filter(option => {
      const optionValue = option.value.toLowerCase();
      const optionLabel = option.label.toLowerCase();
      
      // 排除许可证相关选项
      if (
        // Windows许可证
        optionValue.includes("windows-server") ||
        // SQL Server许可证
        optionValue.includes("sql-server") ||
        // cPanel许可证
        optionValue.includes("cpanel-license") ||
        // Plesk许可证
        optionValue.includes("plesk-") ||
        // 其他常见许可证
        optionValue.includes("-license-") ||
        // 操作系统选项
        optionValue.startsWith("os-") ||
        // 控制面板
        optionValue.includes("control-panel") ||
        optionValue.includes("panel") ||
        // 安全产品
        optionLabel.includes("license") ||
        optionLabel.includes("许可证") ||
        optionLabel.includes("许可") ||
        // 安全产品
        optionValue.includes("security") ||
        optionValue.includes("antivirus") ||
        optionValue.includes("firewall")
      ) {
        return false;
      }
      
      return true;
    }) : [];
    
    const filteredDefaultOptions = server.defaultOptions ? server.defaultOptions.filter(option => {
      const optionValue = option.value.toLowerCase();
      const optionLabel = option.label.toLowerCase();
      
      // 排除许可证相关选项
      if (
        // Windows许可证
        optionValue.includes("windows-server") ||
        // SQL Server许可证
        optionValue.includes("sql-server") ||
        // cPanel许可证
        optionValue.includes("cpanel-license") ||
        // Plesk许可证
        optionValue.includes("plesk-") ||
        // 其他常见许可证
        optionValue.includes("-license-") ||
        // 操作系统选项
        optionValue.startsWith("os-") ||
        // 控制面板
        optionValue.includes("control-panel") ||
        optionValue.includes("panel") ||
        // 其他软件许可
        optionLabel.includes("license") ||
        optionLabel.includes("许可证") ||
        optionLabel.includes("许可") ||
        // 安全产品
        optionValue.includes("security") ||
        optionValue.includes("antivirus") ||
        optionValue.includes("firewall")
      ) {
        return false;
      }
      
      return true;
    }) : [];
    
    // 如果没有任何硬件相关的可选和默认配置，则不显示任何内容
    if (filteredOptions.length === 0 && filteredDefaultOptions.length === 0) {
      return null;
    }
    
    // 判断可选配置和默认配置内容是否完全一致
    const defaultSet = new Set(filteredDefaultOptions.map(opt => opt.value));
    const optionSet = new Set(filteredOptions.map(opt => opt.value));
    let optionsIdentical = false;
    if (defaultSet.size === optionSet.size && [...defaultSet].every(v => optionSet.has(v))) {
      optionsIdentical = true;
    }

    // 尝试根据选项分类将选项分组
    const optionGroups: Record<string, ServerOption[]> = {
      "CPU/处理器": [],
      "内存": [],
      "存储": [],
      "带宽/网络": [],
      "vRack内网": [],
      "其他": []
    };
    
    // 根据family或描述关键字分配选项到不同分组
    filteredOptions.forEach(option => {
      const family = option.family?.toLowerCase() || "";
      const desc = option.label.toLowerCase();
      const value = option.value.toLowerCase();
      
      if (family.includes("cpu") || family.includes("processor") || 
          desc.includes("cpu") || desc.includes("processor") || 
          desc.includes("intel") || desc.includes("amd") || 
          desc.includes("xeon") || desc.includes("epyc") || 
          desc.includes("ryzen") || desc.includes("core")) {
        optionGroups["CPU/处理器"].push(option);
      }
      else if (family.includes("memory") || family.includes("ram") || 
               desc.includes("ram") || desc.includes("memory") || 
               desc.includes("gb") || desc.includes("ddr")) {
        optionGroups["内存"].push(option);
      }
      else if (family.includes("storage") || family.includes("disk") || 
               desc.includes("ssd") || desc.includes("hdd") || 
               desc.includes("nvme") || desc.includes("storage") || 
               desc.includes("disk") || desc.includes("raid")) {
        optionGroups["存储"].push(option);
      }
      else if (value.includes("vrack") || desc.includes("vrack") || 
               desc.includes("内网") || family.includes("vrack")) {
        optionGroups["vRack内网"].push(option);
      }
      else if (family.includes("bandwidth") || family.includes("traffic") || 
               desc.includes("bandwidth") || desc.includes("network") || 
               desc.includes("ip") || desc.includes("带宽") || 
               desc.includes("mbps") || desc.includes("gbps")) {
        optionGroups["带宽/网络"].push(option);
      }
      else {
        optionGroups["其他"].push(option);
      }
    });
    
    // 检查是否有任何选项被分组（确保至少有一个组有内容）
    const hasGroupedOptions = Object.values(optionGroups).some(group => group.length > 0);
    
    // 格式化选项显示值的函数
    const formatOptionDisplay = (option: ServerOption, groupName: string) => {
      let displayLabel = option.label;
      let detailLabel = option.value;
      
      // 对于RAM，尝试提取内存大小
      if (groupName === "内存" && option.value.includes("ram-")) {
        const ramMatch = option.value.match(/ram-(\d+)g/i);
        if (ramMatch) {
          displayLabel = `${ramMatch[1]} GB`;
        }
      }
      
      // 对于存储，尝试提取容量和类型
      if (groupName === "存储" && (option.value.includes("raid") || option.value.includes("ssd") || option.value.includes("hdd") || option.value.includes("nvme"))) {
        // 匹配 hybridsoftraid-2x6000sa-2x512nvme-24rise 这样的格式
        const hybridRaidMatch = option.value.match(/hybridsoftraid-(\d+)x(\d+)(sa|ssd|hdd)-(\d+)x(\d+)(nvme|ssd|hdd)/i);
        if (hybridRaidMatch) {
          const count1 = hybridRaidMatch[1];
          const size1 = hybridRaidMatch[2];
          const type1 = hybridRaidMatch[3].toUpperCase();
          const count2 = hybridRaidMatch[4];
          const size2 = hybridRaidMatch[5];
          const type2 = hybridRaidMatch[6].toUpperCase();
          displayLabel = `混合RAID ${count1}x ${size1}GB ${type1} + ${count2}x ${size2}GB ${type2}`;
        } else {
          // 标准RAID格式
          const storageMatch = option.value.match(/(raid|softraid)-(\d+)x(\d+)(sa|ssd|hdd|nvme)/i);
          if (storageMatch) {
            const raidType = storageMatch[1].toUpperCase();
            const count = storageMatch[2];
            const size = storageMatch[3];
            const diskType = storageMatch[4].toUpperCase();
            displayLabel = `${raidType} ${count}x ${size}GB ${diskType}`;
          }
        }
      }
      
      // 对于带宽，尝试提取速率
      if (groupName === "带宽/网络" && (option.value.includes("bandwidth") || option.value.includes("traffic"))) {
        const bwMatch = option.value.match(/bandwidth-(\d+)/i);
        if (bwMatch) {
          const speed = parseInt(bwMatch[1]);
          displayLabel = speed >= 1000 
            ? `${speed/1000} Gbps` 
            : `${speed} Mbps`;
        }
        
        // 匹配格式如 traffic-25tb-1000-24rise-apac
        const combinedTrafficMatch = option.value.match(/traffic-(\d+)(tb|gb|mb)-(\d+)/i);
        if (combinedTrafficMatch) {
          const trafficSize = combinedTrafficMatch[1];
          const trafficUnit = combinedTrafficMatch[2].toUpperCase();
          const bandwidth = combinedTrafficMatch[3];
          displayLabel = `${bandwidth} Mbps / ${trafficSize} ${trafficUnit}流量`;
        } else {
          // 匹配仅有流量限制的格式 traffic-25tb
          const trafficMatch = option.value.match(/traffic-(\d+)(tb|gb)/i);
          if (trafficMatch) {
            displayLabel = `${trafficMatch[1]} ${trafficMatch[2].toUpperCase()} 流量`;
          }
        }

        // 匹配无限流量
        if (option.value.toLowerCase().includes("unlimited")) {
          displayLabel = `无限流量`;
        }
      }
      
      // 对于vRack内网带宽，单独处理
      if (groupName === "vRack内网") {
        const vrackBwMatch = option.value.match(/vrack-bandwidth-(\d+)/i);
        if (vrackBwMatch) {
          const speed = parseInt(vrackBwMatch[1]);
          displayLabel = speed >= 1000 
            ? `${speed/1000} Gbps 内网带宽` 
            : `${speed} Mbps 内网带宽`;
        }
        
        // 匹配其他vRack相关选项
        if (option.value.toLowerCase().includes("vrack") && !option.value.toLowerCase().includes("bandwidth")) {
          displayLabel = `vRack ${option.label}`;
        }
      }
      
      return { displayLabel, detailLabel };
    };
    
    // 渲染分组选项
    return (
      <div className="space-y-3 mt-3">
        {filteredDefaultOptions.length > 0 && (
          <div className="rounded-md overflow-hidden border border-cyber-accent/20">
            <div className="px-2.5 py-1.5 bg-cyber-grid/20 border-b border-cyber-accent/20 flex items-center">
              <ArrowRightLeft size={13} className="mr-1.5 text-cyber-accent" />
              <span className="text-xs font-medium">默认配置</span>
            </div>
            <div className="bg-cyber-grid/5 p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {filteredDefaultOptions.map(option => {
                  // 确定此选项属于哪个组
                  let groupName = "其他";
                  for (const [name, group] of Object.entries(optionGroups)) {
                    if (group.some(o => o.value === option.value)) {
                      groupName = name;
                      break;
                    }
                  }
                  
                  const { displayLabel, detailLabel } = formatOptionDisplay(option, groupName);
                  
                  return (
                    <div
                      key={option.value}
                      className="flex flex-col bg-cyber-accent/10 px-2 py-1.5 rounded text-xs border border-cyber-accent/20 min-h-[2.5rem]"
                    >
                      <span className="font-medium text-xs leading-tight">{displayLabel}</span>
                      <span className="text-cyber-muted font-mono text-[9px] mt-0.5 leading-tight truncate">{detailLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* 只有当可选配置和默认配置不一致时才显示可选配置区域 */}
        {!optionsIdentical && hasGroupedOptions && (
          <div className="rounded-md overflow-hidden border border-cyber-accent/20">
            <div className="px-2.5 py-1.5 bg-cyber-grid/20 border-b border-cyber-accent/20 flex items-center">
              <Settings size={13} className="mr-1.5 text-cyber-accent" />
              <span className="text-xs font-medium">自定义配置</span>
            </div>
            <div className="divide-y divide-cyber-accent/10">
              {Object.entries(optionGroups).map(([groupName, options]) => {
                if (options.length === 0) return null;
                
                // 获取对应的图标
                let GroupIcon = Settings;
                if (groupName === "CPU/处理器") GroupIcon = Cpu;
                else if (groupName === "内存") GroupIcon = Database;
                else if (groupName === "存储") GroupIcon = HardDrive;
                else if (groupName === "带宽/网络") GroupIcon = Wifi;
                else if (groupName === "vRack内网") GroupIcon = ArrowRightLeft;
                
                return (
                  <div key={groupName} className="p-2">
                    <div className="font-medium text-[11px] mb-1.5 flex items-center text-cyber-accent">
                      <GroupIcon size={12} className="mr-1" />
                      {groupName}
                    </div>
                    <div className="space-y-1 pl-0.5">
                      {options.map(option => {
                        const { displayLabel, detailLabel } = formatOptionDisplay(option, groupName);
                        const isSelected = isOptionSelected(server.planCode, option.value);
                        
                        return (
                          <div key={option.value} className="flex items-center">
                            <label 
                              className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors w-full
                                ${isSelected 
                                  ? 'bg-cyber-accent/15 border border-cyber-accent/30' 
                                  : 'hover:bg-cyber-grid/10 border border-transparent'}`}
                            >
                              <div className="flex items-center min-w-0">
                                <div className="relative mr-1.5 flex items-center justify-center w-4 h-4 flex-shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleOption(server.planCode, option.value, groupName)}
                                    className="opacity-0 absolute w-full h-full cursor-pointer"
                                  />
                                  <div className={`w-4 h-4 border rounded-sm flex items-center justify-center ${isSelected ? 'border-cyber-accent bg-cyber-accent/30' : 'border-slate-500'}`}>
                                    {isSelected && (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-accent">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-medium truncate">{displayLabel}</span>
                                  <span className="text-[10px] text-cyber-muted font-mono truncate">{detailLabel}</span>
                                </div>
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* 显示已选配置的摘要 */}
        {selectedOptions[server.planCode]?.length > 0 && 
         !selectedOptions[server.planCode].every(opt => server.defaultOptions.map(o => o.value).includes(opt)) && (
          <div className="mt-2 p-1.5 bg-cyber-accent/10 border border-cyber-accent/30 rounded-md">
            <div className="text-[10px] font-medium text-cyber-accent mb-1 flex items-center">
              <CheckSquare size={12} className="mr-1" />
              已选自定义配置
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedOptions[server.planCode].map(optValue => {
                const option = server.availableOptions.find(o => o.value === optValue);
                if (!option || server.defaultOptions.map(o => o.value).includes(optValue)) return null;
                
                let groupName = "其他";
                for (const [name, group] of Object.entries(optionGroups)) {
                  if (group.some(o => o.value === optValue)) {
                    groupName = name;
                    break;
                  }
                }
                
                const { displayLabel } = formatOptionDisplay(option, groupName);
                
                return (
                  <div key={optValue} className="px-1.5 py-0.5 bg-cyber-accent/20 rounded text-[10px] flex items-center">
                    {displayLabel}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleOption(server.planCode, optValue);
                      }} 
                      className="ml-1.5 text-cyber-muted hover:text-cyber-accent"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold mb-1 cyber-glow-text">服务器列表</h1>
        <p className="text-cyber-muted mb-6">浏览可用服务器与实时可用性检测</p>
      </motion.div>
      
      {/* 添加全局样式 */}
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* 添加可用性检测说明 */}
      <div className="bg-cyber-accent/15 border border-cyber-accent/50 rounded-md p-3 mb-4 shadow-md shadow-cyber-accent/10">
        <div className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-accent mt-0.5 mr-2 flex-shrink-0">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <p className="text-sm text-slate-100">
            <span className="text-cyber-accent font-medium">可用性检测说明：</span> 
            可用性检测仅针对服务器默认配置，若设置了自定义配置，实际库存状态将以进入抢购队列时为准。建议选择多个数据中心以提高抢购成功率。
          </p>
        </div>
      </div>

      {/* Filters and controls */}
      <div className="cyber-panel p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-muted">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input
              type="text"
              placeholder="搜索服务器..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cyber-input pl-10 w-full"
            />
          </div>
          
          <div className="flex items-center justify-end space-x-4">
            <div className="flex items-center">
              <Clock size={16} className="text-cyber-muted mr-1.5" />
              <span className="text-xs text-cyber-muted mr-3">
                更新于: {formatDateTime(lastUpdated)}
              </span>
            </div>
            
            {/* 视图切换按钮组 */}
            <div className="flex items-center gap-2 border border-cyber-accent/30 rounded-md p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-cyber-accent/20 text-cyber-accent' 
                    : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-grid/10'
                }`}
                title="网格视图"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'list' 
                    ? 'bg-cyber-accent/20 text-cyber-accent' 
                    : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-grid/10'
                }`}
                title="列表视图"
              >
                <List size={16} />
              </button>
            </div>

            {/* 紧凑模式切换 */}
            <button
              onClick={() => setDisplayMode(displayMode === 'compact' ? 'detailed' : 'compact')}
              className="p-2 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 hover:border-cyber-accent/50 rounded-md transition-all"
              title={displayMode === 'compact' ? '切换到详细模式' : '切换到紧凑模式'}
            >
              {displayMode === 'compact' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            
            <button
              onClick={() => fetchServers(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 hover:border-cyber-accent/50 rounded-md transition-all text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? 'animate-spin' : ''}>
                <polyline points="1 4 1 10 7 10"></polyline>
                <polyline points="23 20 23 14 17 14"></polyline>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse border-cyber-accent/30">
              <CardHeader className="bg-cyber-grid/10">
                <div className="h-6 bg-cyber-grid/30 rounded w-1/3"></div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-5 bg-cyber-grid/20 rounded"></div>
                  <div className="h-5 bg-cyber-grid/20 rounded w-5/6"></div>
                  <div className="h-5 bg-cyber-grid/20 rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredServers.length === 0 ? (
        <Card className="border-cyber-accent/30 py-10">
          <CardContent className="flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-muted mx-auto mb-4">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            <p className="text-cyber-muted mb-4">没有找到匹配的服务器</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedDatacenter("all");
              }}
              className="px-4 py-2 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 hover:border-cyber-accent/50 rounded-md transition-all text-sm font-medium shadow-sm hover:shadow-md"
            >
              清除筛选
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
        {/* 网格视图 */}
        {viewMode === 'grid' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`grid gap-6 ${
              displayMode === 'compact'
                ? 'grid-cols-1 md:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }`}
          >
            {filteredServers.map((server) => (
            <motion.div 
              key={server.planCode}
              variants={itemVariants}
            >
              <Card className="border-cyber-accent/30 overflow-hidden h-full">
                {/* Header with server code and name */}
                <CardHeader className="px-3 py-2 bg-cyber-grid/20 border-b border-cyber-accent/20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">{server.planCode}</CardTitle>
                      {subscribedServers.has(server.planCode) && (
                        <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px] border border-blue-500/40" title="已订阅监控">
                          <Bell size={10} />
                          已订阅
                        </span>
                      )}
                    </div>
                    <div className="bg-cyber-accent/10 px-1.5 py-0.5 rounded text-[10px] border border-cyber-accent/20 text-cyber-accent">
                      {server.name}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-3">
                  {/* Server specs in a grid */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    <div className="flex items-center space-x-1.5 p-1.5 bg-cyber-grid/10 rounded border border-cyber-accent/10">
                      <Cpu size={14} className="text-cyber-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-cyber-muted">CPU</div>
                        <div className="font-medium text-xs truncate">{formatServerSpec(server.cpu, "CPU")}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 p-1.5 bg-cyber-grid/10 rounded border border-cyber-accent/10">
                      <Database size={14} className="text-cyber-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-cyber-muted">内存</div>
                        <div className="font-medium text-xs truncate">{formatServerSpec(server.memory, "内存")}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 p-1.5 bg-cyber-grid/10 rounded border border-cyber-accent/10">
                      <HardDrive size={14} className="text-cyber-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-cyber-muted">存储</div>
                        <div className="font-medium text-xs truncate">{formatServerSpec(server.storage, "存储")}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 p-1.5 bg-cyber-grid/10 rounded border border-cyber-accent/10">
                      <Wifi size={14} className="text-cyber-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-cyber-muted">带宽</div>
                        <div className="font-medium text-xs truncate">{formatServerSpec(server.bandwidth, "带宽")}</div>
                      </div>
                    </div>
                    {server.vrackBandwidth && server.vrackBandwidth !== "N/A" && (
                      <div className="flex items-center space-x-1.5 p-1.5 bg-cyber-grid/10 rounded border border-cyber-accent/10 col-span-2">
                        <ArrowRightLeft size={14} className="text-cyber-accent flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-cyber-muted">内网带宽</div>
                          <div className="font-medium text-xs truncate">{formatServerSpec(server.vrackBandwidth, "内网带宽")}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 服务器配置选项 */}
                  {renderServerOptions(server)}
                  
                  {/* Datacenters availability section - REINSTATED */}
                  <div className="mt-4 rounded-md overflow-hidden border border-cyber-accent/30">
                    <div className="flex justify-between items-center bg-cyber-grid/30 px-3 py-2 border-b border-cyber-accent/30">
                      <span className="text-xs font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-accent mr-2">
                          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                          <line x1="6" y1="6" x2="6.01" y2="6"></line>
                          <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        数据中心选择
                      </span>
                      <div className="flex gap-2 items-center">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => checkAvailability(server.planCode)}
                            disabled={isCheckingAvailability || !isAuthenticated}
                            className="px-2 py-1 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 hover:border-cyber-accent/50 rounded-md transition-all text-[10px] font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {isCheckingAvailability && selectedServer === server.planCode ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                </svg>
                                查询中
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="16" x2="12" y2="12"></line>
                                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                检查
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              const selectedDcs = getSelectedDatacentersList(server.planCode);
                              addToMonitor(server, selectedDcs);
                            }}
                            disabled={!isAuthenticated}
                            className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 hover:border-blue-500/60 rounded-md transition-all text-[10px] font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            title="添加到服务器监控"
                          >
                            <Bell size={10} />
                            监控
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            const selectedDcs = getSelectedDatacentersList(server.planCode);
                            if (selectedDcs.length > 0) {
                              addToQueue(server, selectedDcs);
                            } else {
                              toast.error("请至少选择一个数据中心");
                            }
                          }}
                          disabled={!isAuthenticated || getSelectedDatacentersList(server.planCode).length === 0}
                          className="relative px-5 py-2 bg-gradient-to-r from-cyber-primary to-cyber-primary-dark hover:from-cyber-primary-dark hover:to-cyber-primary text-white border-2 border-cyber-primary/40 hover:border-cyber-primary rounded-md transition-all text-xs font-bold shadow-lg hover:shadow-xl hover:shadow-cyber-primary/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-1.5 animate-pulse-slow"
                          style={{ animationDuration: '2s' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                          </svg>
                          <span className="tracking-wide">一键抢购</span>
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-primary"></span>
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-2 bg-cyber-grid/10 border-b border-cyber-accent/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-cyber-muted flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 8v4l3 3"></path>
                          </svg>
                          选择部署位置:
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => toggleAllDatacenters(server.planCode, true)}
                            className="px-2 py-1 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 hover:border-cyber-accent/50 rounded text-[10px] font-medium transition-all shadow-sm hover:shadow-md"
                          >
                            全选
                          </button>
                          <button
                            onClick={() => toggleAllDatacenters(server.planCode, false)}
                            className="px-2 py-1 bg-cyber-grid/10 hover:bg-cyber-grid/20 text-cyber-muted hover:text-cyber-text border border-cyber-accent/20 hover:border-cyber-accent/40 rounded text-[10px] font-medium transition-all shadow-sm hover:shadow-md"
                          >
                            取消全选
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* 数据中心列表 - 采用用户截图样式，一行1-2列 */}
                    <div className="bg-slate-900/10 p-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {OVH_DATACENTERS
                          .filter(dc => {
                            // 如果服务器代码包含特定数据中心后缀，只显示对应的数据中心
                            const planCodeLower = server.planCode.toLowerCase();
                            
                            // 检查是否为特定区域的服务器（通过后缀判断）
                            if (planCodeLower.includes('-sgp')) {
                              return dc.code === 'sgp';
                            }
                            if (planCodeLower.includes('-syd')) {
                              return dc.code === 'syd';
                            }
                            if (planCodeLower.includes('-mum')) {
                              return dc.code === 'mum'; // 孟买（前端用mum，API返回ynm）
                            }
                            
                            // 默认显示所有数据中心
                            return true;
                          })
                          .map(dc => {
                              const dcCode = dc.code.toUpperCase();
                          // Ensure availability and selectedDatacenters are correctly scoped to the current server
                              const availStatus = availability[server.planCode]?.[dcCode.toLowerCase()] || "unknown";
                              const isSelected = selectedDatacenters[server.planCode]?.[dcCode];
                              
                          let statusText = "查询中";
                          let statusColorClass = "text-yellow-400";
                              
                              if (availStatus === "unavailable") {
                            statusText = "不可用";
                            statusColorClass = "text-red-500";
                              } else if (availStatus && availStatus !== "unknown") {
                            statusText = availStatus.includes("H") ? availStatus : "可用";
                            statusColorClass = "text-green-400";
                              }
                              
                              return (
                                <div 
                                  key={dcCode}
                              className={`relative flex items-center justify-between p-1.5 rounded cursor-pointer transition-all duration-150 ease-in-out 
                                          border 
                                    ${isSelected 
                                            ? 'bg-cyber-accent/20 border-cyber-accent shadow-md'
                                            : 'bg-slate-800/60 border-slate-700 hover:bg-slate-700/60 hover:border-slate-500'}
                                         `}
                                  onClick={() => toggleDatacenterSelection(server.planCode, dcCode)}
                              title={`${dc.name} (${dc.region}) - ${statusText}`}
                            >
                              <div className="flex items-center overflow-hidden mr-1.5 min-w-0">
                                <span className={`fi fi-${dc.countryCode.toLowerCase()} mr-1.5 text-sm flex-shrink-0`}></span>
                                <div className="flex flex-col overflow-hidden min-w-0">
                                  <span className={`text-xs font-semibold ${isSelected ? 'text-cyber-accent' : 'text-slate-100'} truncate`}>{dcCode}</span>
                                  <span className={`text-[9px] ${isSelected ? 'text-slate-300' : 'text-slate-400'} mt-0.5 truncate`}>{dc.name}</span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-medium ${statusColorClass} flex items-center flex-shrink-0`}>
                                {availStatus === "unknown" ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                  </svg>
                                ) : (
                                  statusText
                                    )}
                              </span>
                                  
                                  {isSelected && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-cyber-accent rounded-full flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
        )}
        
        {/* 列表视图 */}
        {viewMode === 'list' && (
          <div className="space-y-3">
            {filteredServers.map((server) => (
              <motion.div
                key={server.planCode}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-cyber-grid/10 border border-cyber-accent/30 rounded-md overflow-hidden hover:border-cyber-accent/50 transition-colors"
              >
                <div className={`flex items-center gap-4 ${displayMode === 'compact' ? 'p-3' : 'p-4'}`}>
                  {/* 服务器型号 */}
                  <div className="flex-shrink-0 w-32">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-cyber-accent">{server.planCode}</div>
                      {subscribedServers.has(server.planCode) && (
                        <span title="已订阅监控">
                          <Bell size={12} className="text-blue-400" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-cyber-muted mt-0.5">{server.name}</div>
                  </div>

                  {/* 服务器规格 */}
                  <div className={`flex-1 grid gap-3 ${displayMode === 'compact' ? 'grid-cols-4' : 'grid-cols-4 lg:grid-cols-5'}`}>
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-cyber-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-cyber-muted">CPU</div>
                        <div className="text-xs font-medium truncate">{formatServerSpec(server.cpu, "CPU")}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-cyber-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-cyber-muted">内存</div>
                        <div className="text-xs font-medium truncate">{formatServerSpec(server.memory, "内存")}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive size={14} className="text-cyber-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-cyber-muted">存储</div>
                        <div className="text-xs font-medium truncate">{formatServerSpec(server.storage, "存储")}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi size={14} className="text-cyber-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-cyber-muted">带宽</div>
                        <div className="text-xs font-medium truncate">{formatServerSpec(server.bandwidth, "带宽")}</div>
                      </div>
                    </div>
                    {displayMode === 'detailed' && server.vrackBandwidth && server.vrackBandwidth !== "N/A" && (
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft size={14} className="text-cyber-accent flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-cyber-muted">内网</div>
                          <div className="text-xs font-medium truncate">{formatServerSpec(server.vrackBandwidth, "内网带宽")}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex-shrink-0 flex gap-2">
                    <button
                      onClick={() => checkAvailability(server.planCode)}
                      disabled={isCheckingAvailability || !isAuthenticated}
                      className="px-3 py-1.5 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 rounded text-xs disabled:opacity-50"
                      title="检查可用性"
                    >
                      检查
                    </button>
                    <button
                      onClick={() => {
                        const selectedDcs = getSelectedDatacentersList(server.planCode);
                        addToMonitor(server, selectedDcs);
                      }}
                      disabled={!isAuthenticated}
                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 rounded text-xs disabled:opacity-50"
                      title="添加到监控"
                    >
                      <Bell size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const selectedDcs = getSelectedDatacentersList(server.planCode);
                        if (selectedDcs.length > 0) {
                          addToQueue(server, selectedDcs);
                        } else {
                          toast.error("请至少选择一个数据中心");
                        }
                      }}
                      disabled={!isAuthenticated || getSelectedDatacentersList(server.planCode).length === 0}
                      className="px-4 py-1.5 bg-gradient-to-r from-cyber-primary to-cyber-primary-dark text-white rounded text-xs font-bold disabled:opacity-50"
                      title="一键抢购"
                    >
                      抢购
                    </button>
                  </div>
                </div>

                {/* 数据中心选择（紧凑模式下隐藏） */}
                {displayMode === 'detailed' && (
                  <div className="border-t border-cyber-accent/20 p-3 bg-cyber-grid/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-cyber-muted">数据中心选择：</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => toggleAllDatacenters(server.planCode, true)}
                          className="px-2 py-0.5 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 rounded text-[10px]"
                        >
                          全选
                        </button>
                        <button
                          onClick={() => toggleAllDatacenters(server.planCode, false)}
                          className="px-2 py-0.5 bg-cyber-grid/10 hover:bg-cyber-grid/20 text-cyber-muted border border-cyber-accent/20 rounded text-[10px]"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {OVH_DATACENTERS
                        .filter(dc => {
                          const planCodeLower = server.planCode.toLowerCase();
                          if (planCodeLower.includes('-sgp')) return dc.code === 'sgp';
                          if (planCodeLower.includes('-syd')) return dc.code === 'syd';
                          if (planCodeLower.includes('-mum')) return dc.code === 'mum';
                          return true;
                        })
                        .map(dc => {
                          const dcCode = dc.code.toUpperCase();
                          const availStatus = availability[server.planCode]?.[dcCode.toLowerCase()] || "unknown";
                          const isSelected = selectedDatacenters[server.planCode]?.[dcCode];
                          
                          return (
                            <div
                              key={dcCode}
                              onClick={() => toggleDatacenterSelection(server.planCode, dcCode)}
                              className={`px-2 py-1 rounded cursor-pointer text-xs flex items-center justify-between ${
                                isSelected
                                  ? 'bg-cyber-accent/20 border-cyber-accent text-cyber-accent'
                                  : 'bg-slate-800/60 border-slate-700 hover:bg-slate-700/60 text-slate-300'
                              } border`}
                            >
                              <span className="font-medium">{dcCode}</span>
                              {availStatus !== "unknown" && (
                                <span className={`text-[10px] ${
                                  availStatus === "unavailable" ? 'text-red-500' : 'text-green-400'
                                }`}>
                                  {availStatus === "unavailable" ? '无' : '有'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default ServersPage;