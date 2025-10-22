import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FRONTEND_PASSWORD, ENABLE_FRONTEND_PASSWORD } from '@/config/constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, ShieldCheck, Zap, Target, Crosshair, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';

const PASSWORD_KEY = 'ovh-frontend-access';

interface PasswordGateProps {
  children: React.ReactNode;
}

/**
 * 简单的前端密码保护组件
 * 输入正确密码后才能访问应用
 */
const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // 检查是否已解锁
  useEffect(() => {
    if (!ENABLE_FRONTEND_PASSWORD) {
      setIsUnlocked(true);
      setIsChecking(false);
      return;
    }

    const stored = localStorage.getItem(PASSWORD_KEY);
    if (stored === FRONTEND_PASSWORD) {
      setIsUnlocked(true);
    }
    setIsChecking(false);
  }, []);

  // 验证密码
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('请输入访问密钥');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error('请输入密码');
      return;
    }

    if (password === FRONTEND_PASSWORD) {
      localStorage.setItem(PASSWORD_KEY, password);
      setIsUnlocked(true);
      setError('');
      toast.success('✨ 狙击系统已启动！');
    } else {
      setError('访问密钥错误，请重新输入');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPassword('');
        setError('');
      }, 2000);
      toast.error('❌ 密钥验证失败');
    }
  };

  // 加载中
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-cyan-400"
        >
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm">加载中...</p>
        </motion.div>
      </div>
    );
  }

  // 已解锁，显示应用
  if (isUnlocked) {
    return <>{children}</>;
  }

  // 未解锁，显示密码输入框
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* 暗色渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
      
      {/* 精密网格背景 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}></div>
        {/* 强调线 */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px'
        }}></div>
      </div>

      {/* 扫描线效果 */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(6, 182, 212, 0.03) 50%, transparent 100%)',
          height: '100px'
        }}
        animate={{
          y: ['-100px', 'calc(100vh + 100px)']
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* HUD 角落标记 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 左上角 */}
        <div className="absolute top-4 left-4">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-16 h-16 border-l-2 border-t-2 border-cyan-500/50"></div>
            <div className="absolute -bottom-6 left-0 text-cyan-500/50 text-xs font-mono">[ 00:00 ]</div>
          </motion.div>
        </div>
        
        {/* 右上角 */}
        <div className="absolute top-4 right-4">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-16 h-16 border-r-2 border-t-2 border-cyan-500/50"></div>
            <div className="absolute -bottom-6 right-0 text-cyan-500/50 text-xs font-mono flex items-center gap-1">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-green-400"
              />
              ONLINE
            </div>
          </motion.div>
        </div>
        
        {/* 左下角 */}
        <div className="absolute bottom-4 left-4">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="w-16 h-16 border-l-2 border-b-2 border-cyan-500/50"></div>
            <div className="absolute -top-6 left-0 text-cyan-500/50 text-xs font-mono">SYS_v2.5</div>
          </motion.div>
        </div>
        
        {/* 右下角 */}
        <div className="absolute bottom-4 right-4">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="w-16 h-16 border-r-2 border-b-2 border-cyan-500/50"></div>
            <div className="absolute -top-6 right-0 text-cyan-500/50 text-xs font-mono">SECURE</div>
          </motion.div>
        </div>
      </div>

      {/* 雷达扫描圈 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <motion.div
          className="w-[800px] h-[800px] rounded-full border border-cyan-500/10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute inset-0 w-[800px] h-[800px] rounded-full border border-cyan-500/10"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.05, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      {/* 定位准星 - 背景装饰 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 2 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative w-96 h-96"
        >
          {/* 水平线 */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          {/* 垂直线 */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />
          
          {/* 中心圆环 */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/20"
              style={{ width: `${(i + 1) * 60}px`, height: `${(i + 1) * 60}px` }}
              animate={{
                rotate: i % 2 === 0 ? 360 : -360,
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                rotate: { duration: 20 + i * 5, repeat: Infinity, ease: "linear" },
                opacity: { duration: 3, repeat: Infinity }
              }}
            />
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* 主卡片 */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative bg-black/80 backdrop-blur-2xl border-2 border-cyan-500/40 rounded-sm shadow-2xl shadow-cyan-500/30 p-8 overflow-hidden"
        >
          {/* 卡片内部暗色背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-slate-900/90"></div>
          
          {/* 顶部 HUD 状态栏 */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-cyan-500/10 to-transparent border-b border-cyan-500/20">
            <div className="flex items-center justify-between px-4 h-full">
              <motion.div 
                className="flex items-center gap-2 text-xs font-mono text-cyan-400/70"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                <span>AUTH_REQUIRED</span>
              </motion.div>
              <div className="text-xs font-mono text-cyan-400/50">ID: #OVH-2025</div>
            </div>
          </div>
          
          {/* 左侧距离标尺 */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-8 border-r border-cyan-500/20">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="relative h-1/5">
                <div className="absolute right-0 top-0 w-2 h-px bg-cyan-500/30"></div>
                <div className="absolute right-2 top-0 text-[8px] font-mono text-cyan-500/40">{(i + 1) * 20}</div>
              </div>
            ))}
          </div>
          
          {/* 右侧参数显示 */}
          <div className="absolute right-2 top-20 space-y-2 text-[10px] font-mono text-cyan-400/50">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div>WIND: 0.0</div>
              <div>DIST: 100m</div>
              <div>ELEV: +2.5</div>
            </motion.div>
          </div>
          
          {/* 顶部装饰线 - 扫描效果 */}
          <motion.div
            className="absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
            animate={{
              scaleX: [0, 1, 1, 0],
              x: ['-100%', '0%', '0%', '100%']
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.3, 0.7, 1]
            }}
          ></motion.div>

          {/* 狙击镜瞄准系统 */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative mx-auto w-32 h-32 mb-6 mt-4"
          >
            {/* 外层瞄准圈 - 带刻度 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-cyan-500/30"
            >
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-2 bg-cyan-400/40 top-0 left-1/2 -translate-x-1/2 origin-bottom"
                  style={{ transform: `rotate(${i * 30}deg) translateY(-100%)` }}
                />
              ))}
            </motion.div>
            
            {/* 十字准线层 */}
            <div className="absolute inset-4">
              {/* 水平线 */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              <div className="absolute top-1/2 left-1/4 w-2 h-px bg-cyan-400" />
              <div className="absolute top-1/2 right-1/4 w-2 h-px bg-cyan-400" />
              {/* 垂直线 */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-400 to-transparent" />
              <div className="absolute left-1/2 top-1/4 h-2 w-px bg-cyan-400" />
              <div className="absolute left-1/2 bottom-1/4 h-2 w-px bg-cyan-400" />
            </div>
            
            {/* 中心瞄准点 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative w-12 h-12 rounded-full border-2 border-cyan-400/60 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Crosshair className="w-6 h-6 text-cyan-400" strokeWidth={3} />
                </motion.div>
                {/* 中心点 */}
                <motion.div
                  className="absolute w-1 h-1 rounded-full bg-red-500"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [1, 0.5, 1]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity
                  }}
                />
              </div>
            </div>
            
            {/* 外层数据环 */}
            <motion.div
              className="absolute inset-[-8px] rounded-full border border-cyan-500/20"
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            >
              {/* 方位标记 */}
              {['N', 'E', 'S', 'W'].map((dir, i) => (
                <div
                  key={dir}
                  className="absolute text-[10px] font-mono text-cyan-400/60 font-bold"
                  style={{
                    top: i === 0 ? '-16px' : i === 2 ? 'calc(100% + 4px)' : '50%',
                    left: i === 1 ? 'calc(100% + 4px)' : i === 3 ? '-16px' : '50%',
                    transform: i === 0 || i === 2 ? 'translateX(-50%)' : i === 1 || i === 3 ? 'translateY(-50%)' : 'none'
                  }}
                >
                  {dir}
                </div>
              ))}
            </motion.div>
            
            {/* 扫描脉冲 */}
            <motion.div
              animate={{
                scale: [1, 1.8],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
              className="absolute inset-0 rounded-full border-2 border-cyan-400"
            ></motion.div>
          </motion.div>

          {/* 标题 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-3xl font-black text-center mb-2 relative">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
                OVH幻影狙击手
              </span>
              {/* 发光效果 */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent blur-xl opacity-50"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                OVH幻影狙击手
              </motion.div>
            </h1>
            
            {/* 任务代号 */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-cyan-500/50"></div>
              <div className="text-xs font-mono text-cyan-400/60 tracking-wider">[ OPERATION CODE ]</div>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-cyan-500/50"></div>
            </div>
            
            <div className="flex items-center justify-center gap-3 text-slate-300 text-base mb-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Target className="w-5 h-5 text-cyan-400" />
              </motion.div>
              <span className="font-bold tracking-wide text-cyan-100">
                极速抢购 · 精准命中
              </span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="w-5 h-5 text-yellow-400" />
              </motion.div>
            </div>
            
            {/* 状态指示 */}
            <div className="flex items-center justify-center gap-4 text-xs font-mono mb-6">
              <div className="flex items-center gap-1.5 text-green-400/80">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-green-400"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span>READY</span>
              </div>
              <div className="w-px h-3 bg-cyan-500/30"></div>
              <div className="flex items-center gap-1.5 text-cyan-400/80">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                <span>STANDBY</span>
              </div>
            </div>
          </motion.div>

          {/* 分隔线 */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4 }}
            className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-6"
          ></motion.div>

          {/* 密码输入表单 */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <motion.div
              className="relative group"
              animate={isShaking ? {
                x: [0, -10, 10, -10, 10, 0],
              } : {}}
              transition={{ duration: 0.5 }}
            >
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10 transition-colors ${
                error ? 'text-red-400' : 'text-cyan-400'
              }`} />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="输入访问密钥"
                className={`pl-10 pr-10 bg-slate-800/60 text-white placeholder:text-slate-500 h-12 transition-all ${
                  error 
                    ? 'border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-400/20' 
                    : 'border-slate-700/50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                }`}
                autoFocus
                disabled={isShaking}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors z-10"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              
              {/* 输入框光效 */}
              <div className={`absolute inset-0 rounded-md transition-opacity blur-sm pointer-events-none ${
                error
                  ? 'bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0 opacity-100'
                  : 'bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 group-focus-within:opacity-100'
              }`}></div>
            </motion.div>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="relative overflow-hidden"
                >
                  {/* 背景脉冲效果 */}
                  <motion.div
                    className="absolute inset-0 bg-red-500/20 rounded-lg"
                    animate={{
                      opacity: [0.2, 0.4, 0.2],
                      scale: [1, 1.02, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  <div className="relative flex items-center gap-3 bg-gradient-to-r from-red-500/20 via-red-500/10 to-red-500/20 border-2 border-red-500/40 rounded-lg px-4 py-3 shadow-lg shadow-red-500/20">
                    {/* 警告图标 */}
                    <motion.div
                      animate={{ 
                        rotate: [0, -10, 10, -10, 10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 0.6, 
                        repeat: Infinity,
                        repeatDelay: 1.5
                      }}
                      className="flex-shrink-0"
                    >
                      <div className="relative">
                        <AlertTriangle className="w-6 h-6 text-red-400" strokeWidth={2.5} />
                        {/* 图标光晕 */}
                        <motion.div
                          className="absolute inset-0 bg-red-400 rounded-full blur-md"
                          animate={{
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                          }}
                        />
                      </div>
                    </motion.div>
                    
                    {/* 错误文字 */}
                    <div className="flex-1">
                      <motion.p
                        initial={{ x: -5 }}
                        animate={{ x: 0 }}
                        className="text-red-300 font-bold text-base leading-tight"
                      >
                        {error}
                      </motion.p>
                    </div>
                    
                    {/* 右侧装饰 */}
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="flex-shrink-0 w-2 h-2 bg-red-400 rounded-full"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={isShaking}
              className="w-full h-14 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-600 hover:via-blue-700 hover:to-purple-700 text-white font-black text-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:shadow-xl transition-all relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ['-200%', '200%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              ></motion.div>
              
              <span className="relative flex items-center justify-center gap-3">
                <ShieldCheck className="w-6 h-6" />
                <span className="tracking-wider">启动狙击系统</span>
                <Zap className="w-5 h-5" />
              </span>
            </Button>
          </motion.form>

          {/* 底部系统信息栏 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="relative mt-6 pt-4 border-t border-cyan-500/20"
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/50">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>CONFIG: constants.ts</span>
              </div>
              <div className="flex items-center gap-1">
                <span>BUILD: 2025.01</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* 底部 HUD 状态指示器 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 relative"
        >
          {/* 主状态面板 */}
          <div className="bg-black/60 backdrop-blur-sm border border-cyan-500/30 rounded-sm px-6 py-3">
            <div className="flex items-center justify-between gap-6">
              {/* 系统状态 */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-2 h-2 rounded-full bg-green-400 mb-1"
                  />
                  <div className="text-[9px] font-mono text-green-400/60">SYS</div>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  <div className="text-green-400">ONLINE</div>
                </div>
              </div>
              
              <div className="h-8 w-px bg-cyan-500/20"></div>
              
              {/* 安全状态 */}
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <div className="text-xs font-mono text-slate-300">
                  <div className="text-cyan-400">ENCRYPTED</div>
                </div>
              </div>
              
              <div className="h-8 w-px bg-cyan-500/20"></div>
              
              {/* 连接状态 */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="flex gap-0.5 mb-1"
                  >
                    <div className="w-0.5 h-2 bg-cyan-400"></div>
                    <div className="w-0.5 h-3 bg-cyan-400"></div>
                    <div className="w-0.5 h-2.5 bg-cyan-400"></div>
                  </motion.div>
                  <div className="text-[9px] font-mono text-cyan-400/60">CONN</div>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  <div className="text-cyan-400">ACTIVE</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 底部装饰线 */}
          <motion.div
            className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
            animate={{
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PasswordGate;
