/**
 * API客户端 - 统一的HTTP请求工具
 * 自动添加API密钥验证，防止后端被直接调用
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { API_URL, API_SECRET_KEY, API_TIMEOUT } from '@/config/constants';
import { toast } from 'sonner';

/**
 * 创建axios实例
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器 - 自动添加API密钥
 */
apiClient.interceptors.request.use(
  (config) => {
    // 添加API密钥到请求头
    config.headers['X-API-Key'] = API_SECRET_KEY;
    
    // 添加时间戳（可选，用于防重放攻击）
    config.headers['X-Request-Time'] = Date.now().toString();
    
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器 - 统一错误处理
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 统一错误处理
    if (error.response) {
      const status = error.response.status;
      const message = (error.response.data as any)?.error || error.message;
      
      switch (status) {
        case 401:
          toast.error('认证失败：API密钥无效');
          break;
        case 403:
          toast.error('访问被拒绝：权限不足');
          break;
        case 404:
          // 404完全静默，让各组件自行处理
          // 因为404可能是正常情况（如：检查安装进度时没有进行中的安装）
          break;
        case 500:
          toast.error('服务器错误');
          break;
        default:
          console.error(`API错误 [${status}]:`, message);
      }
    } else if (error.request) {
      console.error('网络错误:', error.request);
      toast.error('网络连接失败，请检查网络');
    } else {
      console.error('请求配置错误:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * 导出API客户端实例
 */
export default apiClient;

/**
 * 便捷方法
 */
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => 
    apiClient.get<T>(url, config),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.post<T>(url, data, config),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.put<T>(url, data, config),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => 
    apiClient.delete<T>(url, config),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.patch<T>(url, data, config),
};
