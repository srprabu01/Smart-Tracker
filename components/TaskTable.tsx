import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, Status, Priority, Frequency, SortOption, FitnessCategory } from '../types';
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
  [Frequency.DAILY]: 'bg-[#1c3829] text-[#6dd39b]',
  [Frequency.WEEKDAYS]: 'bg-[#281e36] text-[#b395d6]',
  [Frequency.WEEKLY]: 'bg-[#2e231e] text-[#d6bba7]',
  [Frequency.BIWEEKLY]: 'bg-[#2a2a2a] text-[#9b9b9b]',
  [Frequency.MONTHLY]: 'bg-[#38281e] text-[#dcb696]',
  [Frequency.ONCE]: 'bg-[#1d282e] text-[#71aadc]',
  
  [Priority.HIGH]: 'bg-[#3e2c2c] text-[#ff7d7d]',
  [Priority.MEDIUM]: 'bg-[#3c3623] text-[#e0c675]',
  [Priority.LOW]: 'bg-[#2a2a2a] text-[#9b9b9b]',
  
  [Status.TODO]: 'bg-[#373737] text-gray-300',
  [Status.IN_PROGRESS]: 'bg-[#1d3d66] text-[#6cbbf7]',
  [Status.DONE]: 'bg-[#1c3829] text-[#6dd39b]',

  [FitnessCategory.ABS]: 'bg-[#4c1d1d] text-[#ffada4]',
  [FitnessCategory.GLUTES]: 'bg-[#2e1d36] text-[#d695d0]',
  [FitnessCategory.SNOWBOARD]: 'bg-[#1d2b3a] text-[#90cdf4]',
  [FitnessCategory.DAILY]: 'bg-[#1c3829] text-[#6dd39b]',
  [FitnessCategory.OTHERS]: 'bg-[#2a2a2a] text-[#9b9b9b]',
  'None': 'text-notion-muted bg-transparent border border-notion-border',
};

interface TaskTableProps {
  tasks: Task[];
  onUpdateTask: (updatedTask: Task) => void;
  onReorderTasks: (reorderedTasks: Task[]) => void;
  sortConfig: SortOption[];
  onSortChange: (sorts: SortOption[]) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (status: Status, title: string) => void;
}

const SelectDropdown = ({ value, options, onChange, onClose }: { value: string; options: string[]; onChange: (val: string) => void; onClose: () => void; }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="absolute top-full left-0 mt-1 w-64 bg-[#202020] border border-[#373737] rounded-lg shadow-2xl z-[100] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
       <div className="p-3 border-b border-[#373737] flex gap-2 items-center bg-[#252525]/80">
          <span className={`text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-tight ${TAG_STYLES[value] || 'bg-gray-700 text-gray-300'}`}>{value}</span>
          <input ref={inputRef} type="text" placeholder="Search options..." className="bg-transparent border-none outline-none text-sm text-gray-300 w-full placeholder-gray-600" />
          <button className="text-gray-500 text-lg leading-none hover:text-white transition-colors" onClick={onClose}>&times;</button>
       </div>
       <div className="flex-1 overflow-y-auto max-h-60 p-1 bg-[#202020]">
          {options.map((opt) => (
             <button key={opt} onClick={() => { onChange(opt); onClose(); }} className={`w-full flex items-center gap-2 px-2 py-2 rounded transition-all text-left group ${value === opt ? 'bg-[#2c2c2c]' : 'hover:bg-[#2c2c2c]/60'}`}>
                <div className="w-6 flex justify-center text-gray-700 transition-colors"><div className="text-xs">⋮⋮</div></div>
                <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${TAG_STYLES[opt] || 'bg-[#2a2a2a] text-gray-400'}`}>{opt}</span>
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
      <button onClick={() => editable && setIsOpen(!isOpen)} className={`${TAG_STYLES[value] || 'bg-[#2a2a2a] text-gray-400'} px-2 py-0.5 rounded-sm text-xs font-medium whitespace-nowrap hover:opacity-80 transition-all`}>{value}</button>
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
      <button onClick={() => setIsOpen(!isOpen)} className={`${TAG_STYLES[task.status]} px-2 py-0.5 rounded-sm text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap`}>
        <div className={`w-1.5 h-1.5 rounded-full ${task.status === Status.TODO ? 'bg-gray-400' : task.status === Status.IN_PROGRESS ? 'bg-[#3d9af5]' : 'bg-[#4ea879]'}`}></div>
        {task.status}
      </button>
      {isOpen && <SelectDropdown value={task.status} options={Object.values(Status)} onChange={(v) => onChange(v as Status)} onClose={() => setIsOpen(false)} />}
    </div>
  );
};

const TaskTable: React.FC<TaskTableProps> = ({ tasks, onUpdateTask, onReorderTasks, sortConfig, onSortChange, onDeleteTask, onAddTask }) => {
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const sortedTasks = useMemo(() => {
    // If we have an active sort configuration, we prioritize it
    if (sortConfig.length > 0) {
      return [...tasks].sort((a, b) => {
        for (const sort of sortConfig) {
          const { key, direction } = sort;
          const valA = a[key]; const valB = b[key];
          if (valA === valB) continue;
          let comp = 0;
          if (key === 'priority') comp = PRIORITY_WEIGHT[valA as Priority] - PRIORITY_WEIGHT[valB as Priority];
          else if (key === 'status') comp = STATUS_WEIGHT[valA as Status] - STATUS_WEIGHT[valB as Status];
          else if (typeof valA === 'number') comp = (valA as number) - (valB as number);
          else comp = String(valA || '').localeCompare(String(valB || ''));
          if (comp !== 0) return direction === 'asc' ? comp : -comp;
        }
        return 0;
      });
    }
    // Otherwise, use manual order
    return [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
      if (task.lastCompleted !== today) {
        updates.streak = (task.streak || 0) + 1;
        updates.lastCompleted = today;
      }
      if (task.frequency !== Frequency.ONCE) {
        updates.nextDue = calculateNextDue(task.frequency, today);
      }
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
    <div className="overflow-x-auto pb-96 min-h-[600px]">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="border-b border-notion-border text-notion-muted">
            <th className="py-2 px-2 w-[40px] font-bold uppercase text-[11px]"></th>
            <th onClick={() => handleHeaderClick('title')} className="py-2 px-2 w-[220px] font-bold uppercase text-[11px] cursor-pointer hover:bg-notion-hover transition-colors group">
              <div className="flex items-center gap-2">Aa Task <IconSort className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>
            </th>
            <th onClick={() => handleHeaderClick('status')} className="py-2 px-4 w-[140px] font-bold uppercase text-[11px] border-l border-notion-border cursor-pointer hover:bg-notion-hover transition-colors group">
              <div className="flex items-center gap-2">Status <IconSort className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>
            </th>
            <th onClick={() => handleHeaderClick('frequency')} className="py-2 px-4 w-[150px] font-bold uppercase text-[11px] border-l border-notion-border cursor-pointer hover:bg-notion-hover transition-colors group">
              <div className="flex items-center gap-2">Frequency <IconSort className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>
            </th>
            <th onClick={() => handleHeaderClick('priority')} className="py-2 px-4 w-[120px] font-bold uppercase text-[11px] border-l border-notion-border cursor-pointer hover:bg-notion-hover transition-colors group">
              <div className="flex items-center gap-2">Priority <IconSort className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>
            </th>
            <th onClick={() => handleHeaderClick('nextDue')} className="py-2 px-4 w-[160px] font-bold uppercase text-[11px] border-l border-notion-border cursor-pointer hover:bg-notion-hover transition-colors group">
              <div className="flex items-center gap-2">Next Due <IconSort className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>
            </th>
            <th onClick={() => handleHeaderClick('lastCompleted')} className="py-2 px-4 w-[160px] font-bold uppercase text-[11px] border-l border-notion-border cursor-pointer hover:bg-notion-hover transition-colors group">
              <div className="flex items-center gap-2">Last Completed <IconSort className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>
            </th>
            <th onClick={() => handleHeaderClick('streak')} className="py-2 px-4 w-[80px] font-bold uppercase text-[11px] border-l border-notion-border cursor-pointer hover:bg-notion-hover transition-colors group">
              <div className="flex items-center gap-2">Streak <IconSort className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>
            </th>
            <th className="py-2 px-4 w-[50px] border-l border-notion-border text-center"><IconTrash className="w-3.5 h-3.5 mx-auto opacity-40" /></th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {sortedTasks.map((task, index) => (
            <tr 
              key={task.id} 
              draggable={sortConfig.length === 0}
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={(e) => onDrop(e, index)}
              className={`group hover:bg-notion-hover border-b border-notion-border/50 ${draggedIndex === index ? 'opacity-30' : ''}`}
            >
              <td className="py-2 px-2 cursor-grab active:cursor-grabbing">
                <IconGripVertical className="w-4 h-4 text-gray-700 group-hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </td>
              <td className="py-2 px-2 flex items-center gap-2"><IconFileText className="w-4 h-4 text-notion-muted" /> {task.title}</td>
              <td className="py-2 px-4 border-l border-notion-border/50"><StatusCell task={task} onChange={(s) => handleStatusChange(task, s)} /></td>
              <td className="py-2 px-4 border-l border-notion-border/50"><TagCell value={task.frequency} options={Object.values(Frequency)} onChange={(v) => onUpdateTask({ ...task, frequency: v as Frequency })} /></td>
              <td className="py-2 px-4 border-l border-notion-border/50"><TagCell value={task.priority} options={Object.values(Priority)} onChange={(v) => onUpdateTask({ ...task, priority: v as Priority })} /></td>
              <td className="py-2 px-4 border-l border-notion-border/50">
                <input 
                  type="date" 
                  value={task.nextDue} 
                  onChange={(e) => onUpdateTask({ ...task, nextDue: e.target.value })} 
                  className="bg-transparent text-gray-300 font-mono text-[13px] outline-none border border-transparent hover:border-[#373737] px-1 rounded transition-colors"
                />
              </td>
              <td className="py-2 px-4 border-l border-notion-border/50">
                <input 
                  type="date" 
                  value={task.lastCompleted || ''} 
                  onChange={(e) => onUpdateTask({ ...task, lastCompleted: e.target.value || null })} 
                  className="bg-transparent text-gray-500 font-mono text-[13px] outline-none border border-transparent hover:border-[#373737] px-1 rounded transition-colors"
                />
              </td>
              <td className="py-2 px-4 border-l border-notion-border/50">{task.streak > 0 ? <span className="text-orange-400 font-bold">🔥 {task.streak}</span> : '0'}</td>
              <td className="py-2 px-4 border-l border-notion-border/50 text-center"><button onClick={() => onDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"><IconTrash className="w-4 h-4" /></button></td>
            </tr>
          ))}
          <tr className="border-b border-notion-border/50 group">
             <td colSpan={9} className="p-0">
                <div className="flex items-center px-4 py-2 gap-2 text-notion-muted group-hover:text-notion-text transition-colors">
                   <IconPlus className="w-4 h-4" />
                   <input 
                      type="text" 
                      placeholder="New Task" 
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={handleQuickAddSubmit}
                      className="bg-transparent border-none outline-none text-sm w-full placeholder-notion-muted focus:placeholder-gray-600"
                   />
                </div>
             </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;