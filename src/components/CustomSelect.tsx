import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: Option[];
  label?: string;
  className?: string;
  bgClassName?: string;
  disabled?: boolean;
  variant?: 'compact' | 'standard'; // standard mimics text inputs
  showLabelInline?: boolean;
}

export function CustomSelect({ 
  value, 
  onChange, 
  options, 
  label, 
  className, 
  bgClassName,
  disabled,
  variant = 'compact',
  showLabelInline = true
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value.toString() === value.toString());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isStandard = variant === 'standard';

  return (
    <div className={cn("relative", className, disabled && "opacity-50 cursor-not-allowed")} ref={containerRef}>
      {isStandard && label && (
        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] dark:text-white/40 mb-1.5 ml-1">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 transition-all rounded-xl border",
          isStandard 
            ? cn("px-4 py-3 bg-[#f7f5f0] dark:bg-white/5 border-[#e5e0d5] dark:border-white/10", bgClassName) 
            : cn("px-3 py-2.5 bg-white dark:bg-[#1a1a1a] border-[#e5e0d5] dark:border-white/10 shadow-sm", bgClassName),
          !isStandard && "hover:border-orange-600/30",
          isOpen && "border-orange-600 ring-1 ring-orange-600/20",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
      >
        {!isStandard && label && showLabelInline && (
          <label className="text-[10px] font-bold uppercase text-[#8a8070] ml-2 flex-shrink-0">
            {label}
          </label>
        )}
        <div className="flex-1 flex items-center justify-between gap-2 min-w-[60px] px-1">
          <span className={cn(
            "dark:text-white truncate",
            isStandard ? "text-sm" : "text-xs font-bold"
          )}>
            {selectedOption?.label || 'Select...'}
          </span>
          <ChevronDown className={cn(
            "text-[#8a8070] transition-transform",
            isStandard ? "w-4 h-4" : "w-3.5 h-3.5",
            isOpen && "rotate-180"
          )} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            className={cn(
              "absolute left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-xl shadow-xl z-[100] p-1 overflow-hidden",
              isStandard && "bg-white dark:bg-[#222]" // Slightly darker for standard options list
            )}
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar font-bold">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value.toString());
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 transition-all rounded-lg",
                    option.value.toString() === value.toString()
                      ? "bg-orange-600 text-white"
                      : "text-[#8a8070] dark:text-white/60 hover:bg-orange-50 dark:hover:bg-white/5 hover:text-orange-600",
                    isStandard ? "text-sm" : "text-xs px-3 py-2"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
