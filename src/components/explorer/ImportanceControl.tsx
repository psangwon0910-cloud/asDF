import React from 'react';

interface ImportanceControlProps {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (level: 1 | 2 | 3 | 4 | 5) => void;
  disabled?: boolean;
}

const LEVELS: Array<{ level: 1 | 2 | 3 | 4 | 5; label: string }> = [
  { level: 1, label: '1' },
  { level: 2, label: '2' },
  { level: 3, label: '3' },
  { level: 4, label: '4' },
  { level: 5, label: '5' },
];

export const ImportanceControl: React.FC<ImportanceControlProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="물성 중요도 1~5단계">
      <span className="text-[11px] text-slate-400 mr-1 whitespace-nowrap">중요도</span>
      {LEVELS.map((item) => {
        const active = item.level <= value;
        return (
          <button
            key={item.level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.level)}
            className={`w-6 h-6 text-[11px] font-mono-tabular rounded border transition-colors ${
              active
                ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-200 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
            } disabled:opacity-40`}
            title={`중요도 ${item.level}단계`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
