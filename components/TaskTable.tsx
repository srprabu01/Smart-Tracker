import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Status, Priority, Frequency, SortOption, FitnessCategory, BuyListCategory } from '../types';
import { IconFileText, IconTrash, IconPlus, IconSort, IconGripVertical } from './Icons';

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const getLocalToday = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().split('T')[0];
};

export const getTaskCompletionUpdates = (task: Task, today: string): Partial<Task> => {
  let updates: Partial<Task> = { status: Status.DONE };
  if (task.lastCompleted !== today) {
    if (task.nextDue && task.nextDue < today) {
      updates.streak = 1;
    } else {
      updates.streak = (task.streak || 0) + 1;
    }
    updates.lastCompleted = today;
  }
  if (task.frequency !== Frequency.ONCE) {
    updates.nextDue = calculateNextDue(task.frequency, today);
  }
  return updates;
};

export const calculateNextDue = (frequency: Frequency, baseDateStr: string): string => {
  if (!baseDateStr) return '';
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const localDate = new Date(y, m - 1, d);

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  let nextDate = new Date(localDate);

  switch (frequency) {
    case Frequency.DAILY:
      nextDate = addDays(localDate, 1);
      break;
    case Frequency.WEEKDAYS:
      const day = localDate.getDay();
      if (day === 5) nextDate = addDays(localDate, 3);
      else if (day === 6) nextDate = addDays(localDate, 2);
      else nextDate = addDays(localDate, 1);
      break;
    case Frequency.WEEKLY:
      nextDate = addDays(localDate, 7);
      break;
    case Frequency.BIWEEKLY:
      nextDate = addDays(localDate, 14);
      break;
    case Frequency.MONTHLY:
      nextDate = new Date(localDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case Frequency.ONCE:
      return baseDateStr;
  }

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(nextDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
};

const PRIORITY_WEIGHT = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
const STATUS_WEIGHT = { [Status.TODO]: 1, [Status.IN_PROGRESS]: 2, [Status.DONE]: 3 };

export const TAG_STYLES: Record<string, string> = {
  [Frequency.DAILY]: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  [Frequency.WEEKDAYS]: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  [Frequency.WEEKLY]: 'bg-orange-50 text-orange-700 border border-orange-100',
  [Frequency.BIWEEKLY]: 'bg-slate-50 text-slate-600 border border-slate-200',
  [Frequency.MONTHLY]: 'bg-rose-50 text-rose-700 border border-rose-100',
  [Frequency.ONCE]: 'bg-blue-50 text-blue-700 border border-blue-100',
  
  [Priority.HIGH]: 'bg-rose-50 text-rose-600 border border-rose-100',
  [Priority.MEDIUM]: 'bg-amber-50 text-amber-600 border border-amber-100',
  [Priority.LOW]: 'bg-slate-50 text-slate-500 border border-slate-200',
  
  [Status.TODO]: 'bg-slate-50 text-slate-500 border border-slate-200',
  [Status.IN_PROGRESS]: 'bg-blue-50 text-blue-700 border border-blue-100',
  [Status.DONE]: 'bg-emerald-50 text-emerald-700 border border-emerald-100',

  [FitnessCategory.ABS]: 'bg-rose-50 text-rose-600',
  [FitnessCategory.GLUTES]: 'bg-purple-50 text-purple-600',
  [FitnessCategory.SNOWBOARD]: 'bg-cyan-50 text-cyan-600',
  [FitnessCategory.DAILY]: 'bg-emerald-50 text-emerald-600',
  [FitnessCategory.OTHERS]: 'bg-slate-50 text-slate-500',
  
  [BuyListCategory.GROCERY]: 'bg-emerald-50 text-emerald-600',
  [BuyListCategory.TRAVEL]: 'bg-blue-50 text-blue-600',
  [BuyListCategory.HOBBY]: 'bg-purple-50 text-purple-600',
  [BuyListCategory.ESSENTIALS]: 'bg-amber-50 text-amber-600',
  [BuyListCategory.FITNESS]: 'bg-rose-50 text-rose-600',
  [BuyListCategory.BEAUTY_CARE]: 'bg-pink-50 text-pink-600',
  
  'None': 'text-app-muted bg-transparent border border-app-border',
};

interface TaskTableProps {
  tasks: Task[];
  onUpdateTask: (updatedTask: Task) => void;
  onReorderTasks: (reorderedTasks: Task[]) => void;
  sortConfig: SortOption[];
  onSortChange: (sorts: SortOption[]) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (status: Status, title: string) => void;
  categories?: string[];
}

const SelectDropdown = ({ value, options, onChange, onClose }: { value: string; options: string[]; onChange: (val: string) => void; onClose: () => void; }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-app-border rounded-2xl shadow-2xl z-[100] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
       <div className="p-4 border-b border-app-border flex gap-3 items-center bg-app-surface/50">
          <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-widest ${TAG_STYLES[value] || 'bg-slate-100 text-slate-500'}`}>{value}</span>
          <input ref={inputRef} type="text" placeholder="Filter..." className="bg-transparent border-none outline-none text-sm text-app-ink w-full placeholder-app-muted font-bold" />
          <button className="text-app-muted text-xl leading-none hover:text-app-ink transition-colors" onClick={onClose}>&times;</button>
       </div>
       <div className="flex-1 overflow-y-auto max-h-64 p-1.5">
          {options.map((opt) => (
             <button key={opt} onClick={() => { onChange(opt); onClose(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${value === opt ? 'bg-app-purple-50' : 'hover:bg-app-hover'}`}>
                <div className="w-5 flex justify-center text-app-muted group-hover:text-app-purple-400 transition-colors"><div className="text-[10px] font-black tracking-tighter">::</div></div>
                <span className={`text-[11px] px-2.5 py-1 rounded-lg font-black uppercase tracking-tight ${TAG_STYLES[opt] || 'bg-slate-100 text-slate-400'}`}>{opt}</span>
             </button>
          ))}
       </div>
    </div>
  );
};

const TagCell = ({ value, options, onChange, editable = true }: { value: string; options: string[]; onChange: (val: string) => void; editable?: boolean; }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  return (
    <div className="relative" ref={containerRef}>
      <button onClick={() => editable && setIsOpen(!isOpen)} className={`${TAG_STYLES[value] || 'bg-slate-100 text-slate-400'} px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter whitespace-nowrap hover:ring-2 hover:ring-app-purple-200 transition-all`}>{value}</button>
      {isOpen && <SelectDropdown value={value} options={options} onChange={onChange} onClose={() => setIsOpen(false)} />}
    </div>
  );
};

const StatusCell = ({ task, onChange }: { task: Task, onChange: (s: Status) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  return (
    <div className="relative" ref={containerRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`${TAG_STYLES[task.status]} px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter inline-flex items-center gap-2 whitespace-nowrap hover:ring-2 hover:ring-app-purple-200 transition-all`}>
        <div className={`w-1.5 h-1.5 rounded-full ${task.status === Status.TODO ? 'bg-slate-400' : task.status === Status.IN_PROGRESS ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
        {task.status}
      </button>
      {isOpen && <SelectDropdown value={task.status} options={Object.values(Status)} onChange={(v) => onChange(v as Status)} onClose={() => setIsOpen(false)} />}
    </div>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  return (
    <span className={`${TAG_STYLES[priority]} px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter`}>
      {priority}
    </span>
  );
};

const TaskTable: React.FC<TaskTableProps> = ({ tasks, onUpdateTask, onReorderTasks, sortConfig, onSortChange, onDeleteTask, onAddTask, categories }) => {
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // 1. Primary Invariant: Push DONE to bottom unless status is explicitly sorted
      const isExplicitStatusSort = sortConfig.some(s => s.key === 'status');
      if (!isExplicitStatusSort) {
        const doneA = a.status === Status.DONE ? 1 : 0;
        const doneB = b.status === Status.DONE ? 1 : 0;
        if (doneA !== doneB) return doneA - doneB;
      }

      // 2. Apply Active Sorts
      for (const sort of sortConfig) {
        const { key, direction } = sort;
        const valA = a[key];
        const valB = b[key];
        if (valA === valB) continue;

        let comp = 0;
        if (key === 'priority') {
          comp = (PRIORITY_WEIGHT[valA as Priority] || 0) - (PRIORITY_WEIGHT[valB as Priority] || 0);
        } else if (key === 'status') {
          comp = (STATUS_WEIGHT[valA as Status] || 0) - (STATUS_WEIGHT[valB as Status] || 0);
        } else if (typeof valA === 'number') {
          comp = (valA as number) - (valB as number);
        } else {
          comp = String(valA || '').localeCompare(String(valB || ''));
        }
        
        if (comp !== 0) return direction === 'asc' ? comp : -comp;
      }

      // 3. Fallback: Stable manual order
      return (a.order ?? 0) - (b.order ?? 0) || (a.id > b.id ? 1 : -1);
    });
  }, [tasks, sortConfig]);

  const handleHeaderClick = (key: keyof Task) => {
    const existing = sortConfig.find(s => s.key === key);
    if (existing) {
      if (existing.direction === 'asc') {
        onSortChange([{ id: existing.id, key, direction: 'desc' }]);
      } else {
        onSortChange([]);
      }
    } else {
      onSortChange([{ id: Math.random().toString(36).substr(2, 9), key, direction: 'asc' }]);
    }
  };

  const handleStatusChange = (task: Task, newStatus: Status) => {
    const today = getLocalToday();
    let updates: Partial<Task> = { status: newStatus };
    if (newStatus === Status.DONE) {
      updates = getTaskCompletionUpdates(task, today);
    }
    onUpdateTask({ ...task, ...updates });
  };

  const handleQuickAddSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && quickAddTitle.trim()) {
      onAddTask(Status.TODO, quickAddTitle);
      setQuickAddTitle('');
    }
  };

  // Drag and Drop Logic
  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Clear any active programmatic sorts when manually reordering
    onSortChange([]);

    const newTasks = [...sortedTasks];
    const [draggedItem] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(index, 0, draggedItem);
    
    onReorderTasks(newTasks);
    setDraggedIndex(null);
  };

  return (
    <div className="overflow-x-auto scrollbar-hide pb-96 min-h-[600px] -mx-4 md:mx-0">
      <table className="w-full text-left border-collapse min-w-[800px] md:min-w-[1000px]">
        <thead>
          <tr className="border-b border-app-border text-app-muted bg-white sticky top-0 z-20">
            <th className="py-4 px-3 w-[50px] font-black uppercase text-[10px] tracking-[0.2em]"></th>
            <th onClick={() => handleHeaderClick('title')} className="py-4 px-3 w-[220px] md:w-[260px] font-black uppercase text-[10px] tracking-[0.2em] cursor-pointer hover:bg-app-surface transition-colors group">
              <div className="flex items-center gap-2">Aa Name <IconSort className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            </th>
            <th onClick={() => handleHeaderClick('status')} className="py-4 px-4 w-[130px] md:w-[150px] font-black uppercase text-[10px] tracking-[0.2em] border-l border-app-border cursor-pointer hover:bg-app-surface transition-colors group">
              <div className="flex items-center gap-2">Status <IconSort className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            </th>
            <th onClick={() => handleHeaderClick('frequency')} className="py-4 px-4 w-[140px] md:w-[160px] font-black uppercase text-[10px] tracking-[0.2em] border-l border-app-border cursor-pointer hover:bg-app-surface transition-colors group">
              <div className="flex items-center gap-2">Frequency <IconSort className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            </th>
            <th onClick={() => handleHeaderClick('priority')} className="py-4 px-4 w-[120px] md:w-[130px] font-black uppercase text-[10px] tracking-[0.2em] border-l border-app-border cursor-pointer hover:bg-app-surface transition-colors group">
              <div className="flex items-center gap-2">Priority <IconSort className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            </th>
            {categories && (
              <th onClick={() => handleHeaderClick('category')} className="py-4 px-4 w-[140px] md:w-[160px] font-black uppercase text-[10px] tracking-[0.2em] border-l border-app-border cursor-pointer hover:bg-app-surface transition-colors group">
                <div className="flex items-center gap-2">Category <IconSort className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
              </th>
            )}
            <th onClick={() => handleHeaderClick('nextDue')} className="py-4 px-4 w-[150px] md:w-[170px] font-black uppercase text-[10px] tracking-[0.2em] border-l border-app-border cursor-pointer hover:bg-app-surface transition-colors group">
              <div className="flex items-center gap-2">Due <IconSort className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            </th>
            <th onClick={() => handleHeaderClick('lastCompleted')} className="py-4 px-4 w-[150px] md:w-[170px] font-black uppercase text-[10px] tracking-[0.2em] border-l border-app-border cursor-pointer hover:bg-app-surface transition-colors group">
              <div className="flex items-center gap-2">Done <IconSort className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            </th>
            <th onClick={() => handleHeaderClick('streak')} className="py-4 px-4 w-[90px] font-black uppercase text-[10px] tracking-[0.2em] border-l border-app-border cursor-pointer hover:bg-app-surface transition-colors group">
              <div className="flex items-center gap-2">Streak <IconSort className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            </th>
            <th onClick={() => handleHeaderClick('showInCalendar')} className="py-4 px-4 w-[100px] md:w-[110px] font-black uppercase text-[10px] tracking-[0.2em] border-l border-app-border cursor-pointer hover:bg-app-surface transition-colors group">
              <div className="flex items-center gap-2">Sync <IconSort className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            </th>
            <th className="py-4 px-4 w-[60px] border-l border-app-border text-center"><IconTrash className="w-4 h-4 mx-auto text-app-muted opacity-40" /></th>
          </tr>
        </thead>
        <tbody className="text-[13px] font-bold">
          {sortedTasks.map((task, index) => (
            <tr 
              key={task.id} 
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={(e) => onDrop(e, index)}
              className={`group hover:bg-app-hover border-b border-app-border/40 transition-colors ${draggedIndex === index ? 'bg-app-purple-50 opacity-40' : ''}`}
            >
              <td className="py-3.5 px-3">
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, index)}
                  className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-white rounded-lg shadow-sm group-hover:opacity-100 opacity-0 transition-all"
                >
                  <IconGripVertical className="w-4 h-4 text-app-purple-300 group-hover:text-app-purple-500 transition-colors" />
                </div>
              </td>
              <td className="py-3.5 px-3 flex items-center gap-3 text-app-ink">
                <IconFileText className="w-4 h-4 text-app-muted group-hover:text-app-purple-500 transition-colors" /> 
                <span className="truncate max-w-[180px] md:max-w-none">{task.title}</span>
              </td>
              <td className="py-3.5 px-4 border-l border-app-border/40"><StatusCell task={task} onChange={(s) => handleStatusChange(task, s)} /></td>
              <td className="py-3.5 px-4 border-l border-app-border/40"><TagCell value={task.frequency} options={Object.values(Frequency)} onChange={(v) => onUpdateTask({ ...task, frequency: v as Frequency })} /></td>
              <td className="py-3.5 px-4 border-l border-app-border/40"><TagCell value={task.priority} options={Object.values(Priority)} onChange={(v) => onUpdateTask({ ...task, priority: v as Priority })} /></td>
              {categories && (
                <td className="py-3.5 px-4 border-l border-app-border/40"><TagCell value={task.category || 'None'} options={['None', ...categories]} onChange={(v) => onUpdateTask({ ...task, category: v === 'None' ? undefined : v })} /></td>
              )}
              <td className="py-3.5 px-4 border-l border-app-border/40">
                <input 
                  type="date" 
                  value={task.nextDue} 
                  onChange={(e) => onUpdateTask({ ...task, nextDue: e.target.value })} 
                  className="bg-transparent text-app-ink font-mono text-[11px] font-black uppercase outline-none border border-transparent hover:border-app-purple-200 px-2 py-1 rounded-lg transition-all"
                />
              </td>
              <td className="py-3.5 px-4 border-l border-app-border/40">
                <input 
                  type="date" 
                  value={task.lastCompleted || ''} 
                  onChange={(e) => onUpdateTask({ ...task, lastCompleted: e.target.value || null })} 
                  className="bg-transparent text-app-muted font-mono text-[11px] font-black uppercase outline-none border border-transparent hover:border-app-purple-200 px-2 py-1 rounded-lg transition-all"
                />
              </td>
              <td className="py-3.5 px-4 border-l border-app-border/40">
                {task.streak > 0 ? (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-xl text-[10px] font-black border border-amber-100">
                    <span className="text-sm">🔥</span> {task.streak}
                  </div>
                ) : (
                  <span className="text-app-muted/30 ml-2">0</span>
                )}
              </td>
              <td className="py-3.5 px-4 border-l border-app-border/40 text-center">
                <button 
                  onClick={() => onUpdateTask({ ...task, showInCalendar: !task.showInCalendar })}
                  className={`w-10 h-5 rounded-full transition-all relative ${task.showInCalendar ? 'bg-app-purple-500' : 'bg-slate-200'}`}
                >
                  <motion.div 
                    animate={{ x: task.showInCalendar ? 22 : 2 }}
                    className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" 
                  />
                </button>
              </td>
              <td className="py-3.5 px-4 border-l border-app-border/40 text-center">
                <button onClick={() => onDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-all">
                  <IconTrash className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          <tr className="border-b border-app-border/40 group">
             <td colSpan={categories ? 11 : 10} className="p-0">
                <div className="flex items-center px-4 py-4 gap-4 text-app-muted hover:bg-app-surface transition-colors cursor-text">
                   <IconPlus className="w-5 h-5 text-app-purple-400" />
                   <input 
                      type="text" 
                      placeholder="Add new high-impact task..." 
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={handleQuickAddSubmit}
                      className="bg-transparent border-none outline-none text-sm font-bold w-full placeholder-app-muted focus:placeholder-slate-400 text-app-ink"
                   />
                   <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-[9px] font-black uppercase tracking-tighter opacity-0 group-focus-within:opacity-100 transition-opacity">
                      Enter to save
                   </div>
                </div>
             </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;