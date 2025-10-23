import React, { useState, useCallback, createContext, useContext } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast, { ToastProps } from './Toast';

interface ToastContextType {
  showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id, onClose: removeToast }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ options, resolve });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}
      
      {/* Toast 容器 - 右下角 */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
          ))}
        </AnimatePresence>
      </div>

      {/* 确认对话框 - 居中 */}
      <AnimatePresence>
        {confirmDialog && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => handleConfirm(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-cyber-dark border-2 border-cyber-accent/50 rounded-lg p-6 max-w-md w-full shadow-neon-lg">
                <h3 className="text-xl font-bold text-cyber-text mb-2">
                  {confirmDialog.options.title}
                </h3>
                {confirmDialog.options.message && (
                  <p className="text-cyber-muted mb-6 whitespace-pre-line">
                    {confirmDialog.options.message}
                  </p>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => handleConfirm(false)}
                    className="px-4 py-2 rounded border border-cyber-accent/30 text-cyber-muted hover:text-cyber-text hover:bg-cyber-grid/50 transition-all"
                  >
                    {confirmDialog.options.cancelText || '取消'}
                  </button>
                  <button
                    onClick={() => handleConfirm(true)}
                    className="px-4 py-2 rounded bg-cyber-accent text-white hover:bg-cyber-accent/80 shadow-neon-sm hover:shadow-neon-md transition-all"
                  >
                    {confirmDialog.options.confirmText || '确定'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};
