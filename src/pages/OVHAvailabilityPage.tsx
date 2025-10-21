import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, Database, Filter, Download, TrendingUp } from 'lucide-react';
import axios from 'axios';

/**
 * OVH 数据中心可用性查询页面
 * 直接调用 OVH 公开 API（无需认证）
 * https://eu.api.ovh.com/v1/dedicated/server/datacenter/availabilities
 */

interface DatacenterInfo {
  datacenter: string;
  availability: string;
}

interface AvailabilityItem {
  fqn: string;
  memory: string;
  planCode: string;
  server: string;
  storage: string;
  systemStorage?: string;
  datacenters: DatacenterInfo[];
}

const OVHAvailabilityPage = () => {
  const [availabilities, setAvailabilities] = useState<AvailabilityItem[]>([]);
  const [filteredData, setFilteredData] = useState<AvailabilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 搜索和过滤
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDatacenter, setFilterDatacenter] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [filterMemory, setFilterMemory] = useState('all');
  
  // 排序
  const [sortBy, setSortBy] = useState<'planCode' | 'memory' | 'availability'>('planCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // OVH API 端点
  const OVH_API_URL = 'https://eu.api.ovh.com/v1/dedicated/server/datacenter/availabilities';

  // 获取所有可用性数据
  const fetchAvailabilities = async () => {
    setIsLoading(true);
    try {
      toast.info('正在从 OVH 公开 API 获取数据...', { duration: 2000 });
      
      // 直接调用 OVH 公开 API（无需认证）
      const response = await axios.get(OVH_API_URL, {
        timeout: 30000
      });
      
      console.log('OVH API 返回数据:', response.data);
      setAvailabilities(response.data);
      setFilteredData(response.data);
      toast.success(`成功获取 ${response.data.length} 条可用性记录`);
    } catch (error: any) {
      console.error('获取 OVH 数据失败:', error);
      
      let errorMessage = '获取数据失败';
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = '请求超时，请重试';
      } else if (error.message) {
        errorMessage = `获取数据失败: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchAvailabilities();
  }, []);

  // 应用过滤和搜索
  useEffect(() => {
    let filtered = [...availabilities];
    
    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.planCode.toLowerCase().includes(term) ||
        item.server.toLowerCase().includes(term) ||
        item.fqn.toLowerCase().includes(term) ||
        item.memory.toLowerCase().includes(term) ||
        item.storage.toLowerCase().includes(term)
      );
    }
    
    // 数据中心过滤
    if (filterDatacenter !== 'all') {
      filtered = filtered.filter(item =>
        item.datacenters.some(dc => dc.datacenter.toLowerCase() === filterDatacenter.toLowerCase())
      );
    }
    
    // 可用性状态过滤
    if (filterAvailability !== 'all') {
      filtered = filtered.filter(item => {
        if (filterAvailability === 'available') {
          return item.datacenters.some(dc => 
            dc.availability !== 'unavailable' && dc.availability !== 'unknown'
          );
        } else if (filterAvailability === 'unavailable') {
          return item.datacenters.every(dc => 
            dc.availability === 'unavailable' || dc.availability === 'unknown'
          );
        } else if (filterAvailability === '1h') {
          return item.datacenters.some(dc => 
            dc.availability === '1H-low' || dc.availability === '1H-high'
          );
        }
        return true;
      });
    }
    
    // 内存过滤
    if (filterMemory !== 'all') {
      filtered = filtered.filter(item => {
        const memMatch = item.memory.match(/(\d+)g/i);
        if (memMatch) {
          const memSize = parseInt(memMatch[1]);
          switch (filterMemory) {
            case '<=128': return memSize <= 128;
            case '256': return memSize >= 128 && memSize <= 256;
            case '512': return memSize >= 256 && memSize <= 512;
            case '>=1024': return memSize >= 1024;
            default: return true;
          }
        }
        return true;
      });
    }
    
    // 排序
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'planCode':
          compareValue = a.planCode.localeCompare(b.planCode);
          break;
        case 'memory':
          const aMemMatch = a.memory.match(/(\d+)g/i);
          const bMemMatch = b.memory.match(/(\d+)g/i);
          const aMem = aMemMatch ? parseInt(aMemMatch[1]) : 0;
          const bMem = bMemMatch ? parseInt(bMemMatch[1]) : 0;
          compareValue = aMem - bMem;
          break;
        case 'availability':
          const aAvail = a.datacenters.filter(dc => 
            dc.availability !== 'unavailable' && dc.availability !== 'unknown'
          ).length;
          const bAvail = b.datacenters.filter(dc => 
            dc.availability !== 'unavailable' && dc.availability !== 'unknown'
          ).length;
          compareValue = aAvail - bAvail;
          break;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    setFilteredData(filtered);
  }, [availabilities, searchTerm, filterDatacenter, filterAvailability, filterMemory, sortBy, sortOrder]);

  // 导出数据为 JSON
  const exportData = () => {
    const dataStr = JSON.stringify(filteredData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ovh-availability-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('数据已导出');
  };

  // 统计信息
  const stats = {
    total: filteredData.length,
    available: filteredData.filter(item => 
      item.datacenters.some(dc => 
        dc.availability !== 'unavailable' && dc.availability !== 'unknown'
      )
    ).length,
    oneHour: filteredData.filter(item => 
      item.datacenters.some(dc => 
        dc.availability === '1H-low' || dc.availability === '1H-high'
      )
    ).length,
  };

  // 获取可用性状态的显示信息
  const getAvailabilityInfo = (availability: string) => {
    switch (availability) {
      case '1H-low':
        return { text: '1小时-低库存', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
      case '1H-high':
        return { text: '1小时-高库存', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
      case '72H':
        return { text: '72小时', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
      case '480H':
        return { text: '480小时', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
      case 'unavailable':
        return { text: '不可用', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
      case 'unknown':
        return { text: '未知', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' };
      default:
        return { text: availability, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1 cyber-glow-text">OVH 实时可用性</h1>
            <p className="text-cyber-muted">直接查询 OVH 公开 API（无需认证）</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={exportData}
              disabled={filteredData.length === 0}
              variant="cyber"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出JSON
            </Button>
            <Button
              onClick={fetchAvailabilities}
              disabled={isLoading}
              variant="cyber"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? '加载中...' : '刷新数据'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* API 信息 */}
      <div className="cyber-panel p-4 border-cyan-500/50">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-cyan-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-cyan-400 mb-2">OVH 公开 API</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-cyber-muted min-w-[60px]">端点：</span>
                <code className="text-cyan-400 bg-cyber-grid/50 px-2 py-0.5 rounded text-xs break-all">
                  {OVH_API_URL}
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyber-muted min-w-[60px]">说明：</span>
                <span className="text-slate-300">
                  此 API 无需认证，实时返回所有 OVH 专用服务器在各数据中心的库存状态
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      {availabilities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="cyber-panel p-4">
            <div className="flex items-center gap-2 text-cyber-muted text-sm mb-1">
              <Database className="w-4 h-4" />
              总记录数
            </div>
            <div className="text-2xl font-bold text-cyber-accent">{stats.total}</div>
          </div>
          <div className="cyber-panel p-4">
            <div className="flex items-center gap-2 text-cyber-muted text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              有货服务器
            </div>
            <div className="text-2xl font-bold text-green-400">{stats.available}</div>
          </div>
          <div className="cyber-panel p-4">
            <div className="flex items-center gap-2 text-cyber-muted text-sm mb-1">
              <Filter className="w-4 h-4" />
              1小时内
            </div>
            <div className="text-2xl font-bold text-yellow-400">{stats.oneHour}</div>
          </div>
        </div>
      )}

      {/* 搜索和过滤器 */}
      {availabilities.length > 0 && (
        <div className="cyber-panel p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted" />
              <input
                type="text"
                placeholder="搜索服务器、内存、存储..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="cyber-input pl-10 w-full"
              />
            </div>
            
            {/* 数据中心过滤 */}
            <select
              value={filterDatacenter}
              onChange={(e) => setFilterDatacenter(e.target.value)}
              className="cyber-input w-full"
            >
              <option value="all">所有数据中心</option>
              <option value="rbx">RBX - 法国鲁贝</option>
              <option value="sbg">SBG - 法国斯特拉斯堡</option>
              <option value="gra">GRA - 法国格拉沃利纳</option>
              <option value="bhs">BHS - 加拿大蒙特利尔</option>
              <option value="sgp">SGP - 新加坡</option>
              <option value="syd">SYD - 澳大利亚悉尼</option>
              <option value="ynm">YNM - 印度孟买</option>
              <option value="waw">WAW - 波兰华沙</option>
              <option value="fra">FRA - 德国法兰克福</option>
              <option value="lon">LON - 英国伦敦</option>
            </select>
            
            {/* 可用性过滤 */}
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="cyber-input w-full"
            >
              <option value="all">所有状态</option>
              <option value="available">有货</option>
              <option value="1h">1小时内</option>
              <option value="unavailable">无货</option>
            </select>
            
            {/* 内存过滤 */}
            <select
              value={filterMemory}
              onChange={(e) => setFilterMemory(e.target.value)}
              className="cyber-input w-full"
            >
              <option value="all">所有内存</option>
              <option value="<=128">≤ 128GB</option>
              <option value="256">128GB - 256GB</option>
              <option value="512">256GB - 512GB</option>
              <option value=">=1024">≥ 1TB</option>
            </select>
          </div>
          
          {/* 排序选项 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-cyber-muted">排序：</span>
            <Button
              onClick={() => {
                if (sortBy === 'planCode') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('planCode');
                  setSortOrder('asc');
                }
              }}
              variant="cyber"
              size="sm"
              className={`text-xs ${sortBy === 'planCode' ? 'bg-cyber-accent/20' : ''}`}
            >
              型号 {sortBy === 'planCode' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              onClick={() => {
                if (sortBy === 'memory') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('memory');
                  setSortOrder('asc');
                }
              }}
              variant="cyber"
              size="sm"
              className={`text-xs ${sortBy === 'memory' ? 'bg-cyber-accent/20' : ''}`}
            >
              内存 {sortBy === 'memory' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              onClick={() => {
                if (sortBy === 'availability') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('availability');
                  setSortOrder('desc');
                }
              }}
              variant="cyber"
              size="sm"
              className={`text-xs ${sortBy === 'availability' ? 'bg-cyber-accent/20' : ''}`}
            >
              可用性 {sortBy === 'availability' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>
      )}

      {/* 数据列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin w-10 h-10 border-4 border-cyber-accent border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-cyber-muted">正在获取 OVH 实时数据...</p>
          </div>
        </div>
      ) : filteredData.length === 0 && availabilities.length === 0 ? (
        <div className="cyber-panel p-8 text-center">
          <Database className="w-16 h-16 text-cyber-muted mx-auto mb-4 opacity-50" />
          <p className="text-cyber-muted mb-4">暂无数据</p>
          <p className="text-sm text-slate-500">点击"刷新数据"按钮获取 OVH 最新库存信息</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="cyber-panel p-8 text-center">
          <Filter className="w-16 h-16 text-cyber-muted mx-auto mb-4 opacity-50" />
          <p className="text-cyber-muted mb-2">没有匹配的结果</p>
          <p className="text-sm text-slate-500">尝试修改搜索或过滤条件</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map((item, index) => (
            <motion.div
              key={item.fqn || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.5) }}
              className="cyber-panel p-4 hover:border-cyber-accent/50 transition-colors"
            >
              <div className="mb-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-cyber-accent">{item.planCode}</h3>
                    <p className="text-sm text-cyber-muted">{item.server}</p>
                  </div>
                  <div className="text-right text-xs text-cyber-muted">
                    <div className="font-mono">{item.fqn}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-cyber-muted">内存：</span>
                    <span className="text-slate-300 ml-2">{item.memory}</span>
                  </div>
                  <div>
                    <span className="text-cyber-muted">存储：</span>
                    <span className="text-slate-300 ml-2">{item.storage}</span>
                  </div>
                  {item.systemStorage && (
                    <div>
                      <span className="text-cyber-muted">系统盘：</span>
                      <span className="text-slate-300 ml-2">{item.systemStorage}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="cyber-grid-line pt-3">
                <h4 className="text-xs font-semibold text-cyber-muted mb-2">
                  数据中心可用性 ({item.datacenters.length} 个)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {item.datacenters.map((dc) => {
                    const availInfo = getAvailabilityInfo(dc.availability);
                    
                    return (
                      <div
                        key={dc.datacenter}
                        className={`${availInfo.bg} ${availInfo.border} border rounded px-2 py-1.5 text-xs`}
                      >
                        <div className="font-semibold text-slate-200">{dc.datacenter.toUpperCase()}</div>
                        <div className={`${availInfo.color} text-[10px] font-medium`}>
                          {availInfo.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OVHAvailabilityPage;
