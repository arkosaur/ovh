import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FRONTEND_PASSWORD, ENABLE_FRONTEND_PASSWORD } from '@/config/constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* 背景动画 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg shadow-2xl p-8">
          {/* 图标 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mx-auto w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 mb-6"
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </motion.div>

          {/* 标题 */}
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            OVH 抢购面板
          </h1>
          <p className="text-center text-slate-400 text-sm mb-6">
            请输入访问密码
          </p>

          {/* 密码输入表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
            >
              <Lock className="w-4 h-4 mr-2" />
              进入
            </Button>
          </form>

          {/* 提示 */}
          <p className="text-center text-slate-500 text-xs mt-4">
            默认密码：admin123
          </p>
          <p className="text-center text-slate-500 text-xs mt-1">
            修改密码请编辑 src/config/constants.ts
          </p>
        </div>

        {/* 底部安全提示 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-slate-400 text-sm mt-6"
        >
          🔒 您的数据安全受到保护
        </motion.p>
      </motion.div>
    </div>
  );
};

export default PasswordGate;
