import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Trash2, RefreshCw, HardDrive, Clock, Server, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import axios from "axios";

const API_URL = 'http://localhost:5000/api';

interface CacheInfo {
  backend: {
    hasCachedData: boolean;
    timestamp: number | null;
    cacheAge: number | null;
    cacheDuration: number;
    serverCount: number;
    cacheValid: boolean;
  };
  storage: {
    dataDir: string;
    cacheDir: string;
    logsDir: string;
    files: {
      config: boolean;
      servers: boolean;
      logs: boolean;
      queue: boolean;
      history: boolean;
    };
  };
}

export const CacheManager = () => {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 格式化缓存时间
  const formatCacheAge = (ageInSeconds: number | null): string => {
    if (ageInSeconds === null) return "无缓存";
    
    const hours = Math.floor(ageInSeconds / 3600);
    const minutes = Math.floor((ageInSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return "刚刚";
    }
  };

  // 获取缓存信息
  const fetchCacheInfo = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/cache/info`);
      setCacheInfo(response.data);
    } catch (error) {
      console.error("获取缓存信息失败:", error);
      toast.error("获取缓存信息失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 清除前端缓存
  const clearFrontendCache = () => {
    try {
      localStorage.removeItem('ovh-servers-cache');
      toast.success("已清除前端缓存");
      // 触发重新渲染以更新UI
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("清除前端缓存失败:", error);
      toast.error("清除前端缓存失败");
    }
  };

  // 清除后端缓存
  const clearBackendCache = async (type: 'all' | 'memory' | 'files' = 'all') => {
    setIsClearingCache(true);
    try {
      const response = await axios.post(`${API_URL}/cache/clear`, { type });
      toast.success(response.data.message || "已清除后端缓存");
      fetchCacheInfo();
    } catch (error) {
      console.error("清除后端缓存失败:", error);
      toast.error("清除后端缓存失败");
    } finally {
      setIsClearingCache(false);
    }
  };

  // 清除所有缓存
  const clearAllCache = async () => {
    setIsClearingCache(true);
    try {
      clearFrontendCache();
      await clearBackendCache('all');
      toast.success("已清除所有缓存");
    } catch (error) {
      console.error("清除缓存失败:", error);
      toast.error("清除缓存失败");
    } finally {
      setIsClearingCache(false);
    }
  };

  // 获取前端缓存信息
  const getFrontendCacheInfo = () => {
    try {
      const cacheData = localStorage.getItem('ovh-servers-cache');
      if (!cacheData) return null;
      
      const { data, timestamp } = JSON.parse(cacheData);
      const now = new Date().getTime();
      const age = Math.floor((now - timestamp) / 1000);
      
      return {
        hasCache: true,
        serverCount: data?.length || 0,
        age: age,
        timestamp: new Date(timestamp).toLocaleString('zh-CN')
      };
    } catch (error) {
      return null;
    }
  };

  // refreshKey 变化时重新获取前端缓存信息
  const frontendCache = getFrontendCacheInfo();

  // 组件挂载时自动获取缓存信息
  useEffect(() => {
    fetchCacheInfo();
  }, []);

  return (
    <div className="space-y-4">
      <Card className="border-cyber-accent/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-cyber-accent">
                <Database className="w-5 h-5" />
                缓存管理
              </CardTitle>
              <CardDescription className="mt-1">
                管理前端和后端的服务器列表缓存
              </CardDescription>
            </div>
            {isLoading && (
              <RefreshCw className="w-5 h-5 animate-spin text-cyber-accent" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={fetchCacheInfo} 
              disabled={isLoading}
              variant="outline"
              className="flex-1 min-w-[140px]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新信息
            </Button>
            <Button 
              onClick={clearAllCache} 
              variant="destructive"
              disabled={isClearingCache}
              className="flex-1 min-w-[140px]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              清除所有缓存
            </Button>
          </div>

          {/* 前端缓存信息 */}
          <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  前端缓存
                </CardTitle>
                {frontendCache ? (
                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    有数据
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/30">
                    <XCircle className="w-3 h-3 mr-1" />
                    无数据
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">LocalStorage 浏览器缓存</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {frontendCache ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 bg-cyan-500/5 p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">服务器数量</p>
                      <p className="text-xl font-bold font-mono text-cyan-400">{frontendCache.serverCount}</p>
                    </div>
                    <div className="space-y-1 bg-cyan-500/5 p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">缓存时间</p>
                      <p className="text-sm font-mono text-cyan-300">{formatCacheAge(frontendCache.age)}</p>
                    </div>
                  </div>
                  <div className="space-y-1 bg-cyan-500/5 p-3 rounded-md">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      更新时间
                    </p>
                    <p className="text-xs font-mono text-cyan-300">{frontendCache.timestamp}</p>
                  </div>
                  <Button 
                    onClick={clearFrontendCache} 
                    variant="outline" 
                    size="sm"
                    className="w-full border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    清除前端缓存
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">暂无缓存数据</p>
                  <p className="text-xs text-muted-foreground mt-1">访问服务器列表后会自动创建缓存</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 后端缓存信息 */}
          {cacheInfo ? (
            <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    后端缓存
                  </CardTitle>
                  <Badge 
                    variant="outline" 
                    className={cacheInfo.backend.cacheValid 
                      ? 'bg-green-500/10 text-green-300 border-green-500/30' 
                      : 'bg-red-500/10 text-red-300 border-red-500/30'
                    }
                  >
                    {cacheInfo.backend.cacheValid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        有效
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        已过期
                      </>
                    )}
                  </Badge>
                </div>
                <CardDescription className="text-xs">内存缓存 + 文件存储</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 缓存统计 */}
                <div className="space-y-3 pb-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 bg-blue-500/5 p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">服务器数量</p>
                      <p className="text-xl font-bold font-mono text-blue-400">
                        {cacheInfo.backend.hasCachedData ? cacheInfo.backend.serverCount : 0}
                      </p>
                    </div>
                    <div className="space-y-1 bg-blue-500/5 p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">缓存时间</p>
                      <p className="text-sm font-mono text-blue-300">
                        {formatCacheAge(cacheInfo.backend.cacheAge)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 bg-blue-500/5 p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">缓存有效期</p>
                    <p className="text-sm font-mono text-blue-300">
                      {Math.floor(cacheInfo.backend.cacheDuration / 3600)} 小时
                      <span className="text-xs text-muted-foreground ml-2">
                        ({cacheInfo.backend.cacheDuration / 60} 分钟)
                      </span>
                    </p>
                  </div>
                </div>

                {/* 存储位置 */}
                <div className="border-t border-blue-500/20 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">存储位置</span>
                  </div>
                  <div className="space-y-2 bg-black/20 rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">数据:</span>
                      <code className="text-xs font-mono text-blue-300">{cacheInfo.storage.dataDir}/</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">缓存:</span>
                      <code className="text-xs font-mono text-blue-300">{cacheInfo.storage.cacheDir}/</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">日志:</span>
                      <code className="text-xs font-mono text-blue-300">{cacheInfo.storage.logsDir}/</code>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => clearBackendCache('memory')} 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-blue-500/30 hover:bg-blue-500/10"
                    disabled={isClearingCache}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    清除内存
                  </Button>
                  <Button 
                    onClick={() => clearBackendCache('files')} 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-blue-500/30 hover:bg-blue-500/10"
                    disabled={isClearingCache}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    清除文件
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            !isLoading && (
              <Card className="border-dashed border-muted-foreground/20">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <RefreshCw className="w-12 h-12 text-muted-foreground mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground mb-2">未加载后端缓存信息</p>
                  <p className="text-xs text-muted-foreground mb-4">点击上方"刷新信息"按钮获取缓存状态</p>
                  <Button 
                    onClick={fetchCacheInfo}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    立即获取
                  </Button>
                </CardContent>
              </Card>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};
