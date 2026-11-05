import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Zap, Check } from 'lucide-react';
import { ModelOption } from '../types.ts';

interface ModelSelectorProps {
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  models: ModelOption[];
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  onSelectModel,
  models,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = models.find((m) => m.id === currentModel) || models[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700/80 rounded-lg transition-colors border border-neutral-200/80 dark:border-neutral-700/60 focus:outline-none"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        <span className="font-semibold">{selected?.name || 'Gemini 2.5 Flash'}</span>
        {selected?.badge && (
          <span className="px-1.5 py-0.5 text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded font-normal">
            {selected.badge}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800/80 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Select Language Model
          </div>
          <div className="p-1 space-y-1">
            {models.map((model) => {
              const isSelected = model.id === currentModel;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>{model.name}</span>
                      {model.badge && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-neutral-200/70 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                      {model.description}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5 text-[10px] text-neutral-400">
                      <span className="flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 text-amber-500" />
                        {model.speed}
                      </span>
                      <span>•</span>
                      <span>Artifacts & Multimodal</span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-neutral-900 dark:text-neutral-100 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
