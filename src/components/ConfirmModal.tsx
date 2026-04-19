import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden border border-[#e5e0d5] dark:border-white/10"
          >
            <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  variant === 'danger' ? "bg-red-50 text-red-600 dark:bg-red-900/20" :
                  variant === 'warning' ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20" :
                  "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                )}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-syne dark:text-white">{title}</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
              >
                <X className="w-5 h-5 dark:text-white" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-[#8a8070] dark:text-white/60 leading-relaxed">
                {message}
              </p>
            </div>
            
            <div className="p-6 bg-[#f7f5f0] dark:bg-white/5 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 dark:text-white transition-all"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50",
                  variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20" :
                  variant === 'warning' ? "bg-yellow-600 hover:bg-yellow-700 shadow-lg shadow-yellow-600/20" :
                  "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                )}
              >
                {isLoading ? 'Processing...' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
