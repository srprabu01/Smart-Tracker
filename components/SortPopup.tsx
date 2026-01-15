import React, { useRef, useEffect } from 'react';
import { SortOption, Task } from '../types';
import { IconX, IconGripVertical, IconPlus, IconChevronDown, IconCalendar, IconFileText, IconSort } from './Icons';

interface SortPopupProps {
  sorts: SortOption[];
  onChange: (sorts: SortOption[]) => void;
  onClose: () => void;
}

const COLUMN_LABELS: Record<string, string> = {
  title: 'Task',
  status: 'Status',
  frequency: 'Frequency',
  priority: 'Priority',
  nextDue: 'Next Due',
  lastCompleted: 'Last Completed',
  streak: 'Streak'
};

const COLUMN_ICONS: Record<string, React.ReactNode> = {
  title: <IconFileText className="w-3 h-3" />,
  status: <IconSort className="w-3 h-3" />, 
  frequency: <IconCalendar className="w-3 h-3" />,
  priority: <IconSort className="w-3 h-3" />,
  nextDue: <IconCalendar className="w-3 h-3" />,
  lastCompleted: <IconCalendar className="w-3 h-3" />,
  streak: <div className="text-[10px]">🔥</div>
};

const AVAILABLE_COLUMNS: (keyof Task)[] = [
  'nextDue', 'priority', 'status', 'frequency', 'title', 'streak', 'lastCompleted'
];

const SortPopup: React.FC<SortPopupProps> = ({ sorts, onChange, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleRemove = (id: string) => {
    onChange(sorts.filter(s => s.id !== id));
  };

  const handleAdd = () => {
    // Find first unused column or default to nextDue
    const usedKeys = new Set(sorts.map(s => s.key));
    const nextKey = AVAILABLE_COLUMNS.find(k => !usedKeys.has(k)) || 'nextDue';
    
    onChange([
      ...sorts,
      { id: Math.random().toString(36).substr(2, 9), key: nextKey, direction: 'asc' }
    ]);
  };

  const handleUpdate = (id: string, updates: Partial<SortOption>) => {
    onChange(sorts.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  return (
    <div 
      ref={containerRef}
      className="absolute top-full left-0 mt-2 w-[400px] bg-[#202020] border border-[#373737] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden"
    >
      <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
        <div className="text-xs text-gray-500 px-2 py-1 font-medium">Sorts</div>
        
        {sorts.length === 0 && (
            <div className="px-2 py-2 text-sm text-gray-500 italic">No active sorts</div>
        )}

        {sorts.map((sort) => (
          <div key={sort.id} className="flex items-center gap-2 px-2 py-1 group">
             {/* Grip */}
             <div className="text-gray-600 cursor-grab hover:text-gray-400">
                <IconGripVertical className="w-4 h-4" />
             </div>

             {/* Column Selector */}
             <div className="relative flex-1">
               <select 
                 className="w-full bg-[#2a2a2a] border border-[#373737] text-gray-300 text-sm rounded px-2 pl-8 py-1.5 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer hover:bg-[#333]"
                 value={sort.key}
                 onChange={(e) => handleUpdate(sort.id, { key: e.target.value as keyof Task })}
               >
                 {AVAILABLE_COLUMNS.map(col => (
                    <option key={col} value={col}>{COLUMN_LABELS[col]}</option>
                 ))}
               </select>
               <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  {COLUMN_ICONS[sort.key]}
               </div>
               <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  <IconChevronDown className="w-3 h-3" />
               </div>
             </div>

             {/* Direction Selector */}
             <div className="relative w-32">
                <select 
                    className="w-full bg-[#2a2a2a] border border-[#373737] text-gray-300 text-sm rounded px-2 py-1.5 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer hover:bg-[#333]"
                    value={sort.direction}
                    onChange={(e) => handleUpdate(sort.id, { direction: e.target.value as 'asc' | 'desc' })}
                >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  <IconChevronDown className="w-3 h-3" />
               </div>
             </div>

             {/* Remove */}
             <button 
                onClick={() => handleRemove(sort.id)}
                className="text-gray-500 hover:text-gray-300 p-1 rounded hover:bg-[#2a2a2a]"
             >
                <IconX className="w-4 h-4" />
             </button>
          </div>
        ))}

        <button 
            onClick={handleAdd}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-2 py-1.5 rounded hover:bg-[#2a2a2a] w-full text-left transition-colors mt-2"
        >
            <IconPlus className="w-4 h-4" />
            Add sort
        </button>
      </div>
    </div>
  );
};

export default SortPopup;