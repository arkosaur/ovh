import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FRONTEND_PASSWORD, ENABLE_FRONTEND_PASSWORD } from '@/config/constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, ShieldCheck, Zap, Target, Crosshair } from 'lucide-react';
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
      toast.error('请输入密码');
      return;
    }

    if (password === FRONTEND_PASSWORD) {
      localStorage.setItem(PASSWORD_KEY, password);
      setIsUnlocked(true);
      toast.success('欢迎回来！');
    } else {
      toast.error('密码错误');
      setPassword('');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 relative overflow-hidden">
      {/* 动态网格背景 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, rgb(59, 130, 246, 0.1) 1px, transparent 1px),
                           linear-gradient(to bottom, rgb(59, 130, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* 多层背景光晕动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-[600px] h-[600px] bg-gradient-radial from-blue-500 to-transparent rounded-full blur-3xl -top-48 -left-48"
        ></motion.div>
        
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute w-[600px] h-[600px] bg-gradient-radial from-cyan-500 to-transparent rounded-full blur-3xl -bottom-48 -right-48"
        ></motion.div>

        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute w-[500px] h-[500px] bg-gradient-radial from-purple-500 to-transparent rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        ></motion.div>

        {/* 浮动粒子 */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
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
          className="relative bg-slate-900/60 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 p-8 overflow-hidden"
        >
          {/* 卡片内部光效 */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5"></div>
          
          {/* 顶部装饰线 */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            animate={{
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          ></motion.div>

          {/* 狙击手图标组 */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative mx-auto w-20 h-20 mb-6"
          >
            {/* 外圈旋转光环 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-t-cyan-400"
            ></motion.div>
            
            {/* 中心图标 */}
            <div className="absolute inset-2 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Crosshair className="w-8 h-8 text-white" strokeWidth={2.5} />
              </motion.div>
            </div>
            
            {/* 脉冲环 */}
            <motion.div
              animate={{
                scale: [1, 1.5],
                opacity: [0.5, 0],
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
            
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-6">
              <Target className="w-4 h-4" />
              <span>极速抢购 · 精准命中</span>
              <Zap className="w-4 h-4" />
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
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 z-10" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入访问密钥"
                className="pl-10 pr-10 bg-slate-800/60 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 h-12 transition-all"
                autoFocus
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
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm"></div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-600 hover:via-blue-700 hover:to-purple-700 text-white font-bold text-base shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all relative overflow-hidden group"
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
              
              <span className="relative flex items-center justify-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                启动狙击系统
                <Zap className="w-4 h-4" />
              </span>
            </Button>
          </motion.form>

          {/* 提示信息 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 space-y-2"
          >
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
              <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></div>
              <span>默认密钥：admin123</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
              <div className="w-1 h-1 rounded-full bg-slate-600"></div>
              <span>配置文件：src/config/constants.ts</span>
            </div>
          </motion.div>
        </motion.div>

        {/* 底部状态指示器 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 flex items-center justify-center gap-3 text-slate-400 text-sm"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-2 h-2 rounded-full bg-green-400"
            ></motion.div>
            <span>系统在线</span>
          </div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3" />
            <span>加密保护</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PasswordGate;
