import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, title, message, duration = 3000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="text-green-400" size={20} />,
    error: <XCircle className="text-red-400" size={20} />,
    warning: <AlertCircle className="text-yellow-400" size={20} />,
    info: <AlertCircle className="text-blue-400" size={20} />,
  };

  const colors = {
    success: 'border-green-400/30 bg-green-400/10',
    error: 'border-red-400/30 bg-red-400/10',
    warning: 'border-yellow-400/30 bg-yellow-400/10',
    info: 'border-blue-400/30 bg-blue-400/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`mb-2 min-w-[300px] max-w-[400px] p-4 rounded-lg border ${colors[type]} backdrop-blur-sm shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-cyber-text text-sm">{title}</p>
          {message && (
            <p className="text-cyber-muted text-xs mt-1">{message}</p>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 text-cyber-muted hover:text-cyber-text transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default Toast;
