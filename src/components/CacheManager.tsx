import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Database, Trash2, RefreshCw, HardDrive, Clock } from "lucide-react";
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
      fetchCacheInfo();
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

  const frontendCache = getFrontendCacheInfo();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            缓存管理
          </CardTitle>
          <CardDescription>
            管理前端和后端的服务器列表缓存
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={fetchCacheInfo} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新信息
            </Button>
            <Button 
              onClick={clearAllCache} 
              variant="destructive"
              disabled={isClearingCache}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              清除所有缓存
            </Button>
          </div>

          {/* 前端缓存信息 */}
          <Card className="border-cyan-500/20 bg-cyan-500/5">
            <CardHeader>
              <CardTitle className="text-sm">前端缓存 (LocalStorage)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {frontendCache ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">服务器数量:</span>
                    <span className="font-mono">{frontendCache.serverCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">缓存时间:</span>
                    <span className="font-mono">{formatCacheAge(frontendCache.age)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">更新时间:</span>
                    <span className="font-mono text-xs">{frontendCache.timestamp}</span>
                  </div>
                  <Button 
                    onClick={clearFrontendCache} 
                    variant="outline" 
                    size="sm"
                    className="w-full mt-2"
                  >
                    清除前端缓存
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">无缓存数据</p>
              )}
            </CardContent>
          </Card>

          {/* 后端缓存信息 */}
          {cacheInfo && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>后端缓存 (内存 + 文件)</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    cacheInfo.backend.cacheValid 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {cacheInfo.backend.cacheValid ? '有效' : '已过期'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">内存缓存:</span>
                    <span className="font-mono">
                      {cacheInfo.backend.hasCachedData ? 
                        `${cacheInfo.backend.serverCount} 台服务器` : 
                        '无数据'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">缓存时间:</span>
                    <span className="font-mono">
                      {formatCacheAge(cacheInfo.backend.cacheAge)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">有效期:</span>
                    <span className="font-mono">
                      {Math.floor(cacheInfo.backend.cacheDuration / 3600)} 小时
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-sm font-medium">存储位置</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground font-mono">
                    <div>数据: {cacheInfo.storage.dataDir}/</div>
                    <div>缓存: {cacheInfo.storage.cacheDir}/</div>
                    <div>日志: {cacheInfo.storage.logsDir}/</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => clearBackendCache('memory')} 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    disabled={isClearingCache}
                  >
                    清除内存
                  </Button>
                  <Button 
                    onClick={() => clearBackendCache('files')} 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    disabled={isClearingCache}
                  >
                    清除文件
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!cacheInfo && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              点击"刷新信息"获取缓存状态
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
