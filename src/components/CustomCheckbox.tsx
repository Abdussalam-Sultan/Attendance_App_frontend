import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function CustomCheckbox({ checked, onChange, className, disabled }: CustomCheckboxProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      className={cn(
        "group relative flex h-5 w-5 items-center justify-center rounded-lg border-2 transition-all duration-200 focus:outline-none",
        checked 
          ? "border-orange-600 bg-orange-600 shadow-lg shadow-orange-600/20" 
          : "border-[#e5e0d5] dark:border-white/10 bg-white dark:bg-[#1a1a1a] hover:border-orange-600/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <AnimatePresence initial={false}>
        {checked && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check className="h-3.5 w-3.5 text-white stroke-[3.5px]" />
          </motion.div>
        )}
      </AnimatePresence>
      <div className={cn(
        "absolute inset-0 rounded-lg ring-2 ring-orange-600/20 transition-all duration-300 scale-110 opacity-0 group-active:scale-95 group-active:opacity-100",
        checked ? "hidden" : ""
      )} />
    </button>
  );
}
