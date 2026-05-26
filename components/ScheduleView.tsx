import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Clock, GripVertical, Plus, Activity, Trash2, CheckCircle2, ChevronRight, ChevronLeft, X, Home } from 'lucide-react';
import { Task, Status } from '../types';

interface ScheduleViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => Promise<void>;
  onAddTask: (task: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onReorderTasks: (tasks: Task[]) => Promise<void>;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getDayStr = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offset);
  return local.toISOString().split('T')[0];
};

const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  tasks, 
  onUpdateTask, 
  onAddTask, 
  onDeleteTask,
  onReorderTasks
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ id: string, edge: 'left' | 'right', initialX: number, initialTime: number, initialDuration: number } | null>(null);
  const [moving, setMoving] = useState<{ id: string, initialX: number, initialTime: number } | null>(null);
  const [localTaskOverrides, setLocalTaskOverrides] = useState<Record<string, Partial<Task>>>({});
  const [selectedDate, setSelectedDate] = useState(getDayStr());
  const [fitnessWeekOffset, setFitnessWeekOffset] = useState(0);

  // Handle resizing and moving
  React.useEffect(() => {
    if (!resizing && !moving) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizing) {
        const task = tasks.find(t => t.id === resizing.id);
        if (!task || !task.scheduledTime) return;

        const deltaX = e.clientX - resizing.initialX;
        const deltaMinutes = Math.round((deltaX / 150) * 60 / 5) * 5;

        if (resizing.edge === 'right') {
          const newDuration = Math.max(15, resizing.initialDuration + deltaMinutes);
          setLocalTaskOverrides(prev => ({
            ...prev,
            [resizing.id]: { ...prev[resizing.id], scheduledDuration: newDuration }
          }));
        } else {
          const newStartMinutes = Math.max(0, resizing.initialTime + deltaMinutes);
          const newDuration = Math.max(15, resizing.initialDuration - (newStartMinutes - resizing.initialTime));
          
          const h = Math.floor(newStartMinutes / 60);
          const m = newStartMinutes % 60;
          const newTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

          setLocalTaskOverrides(prev => ({
            ...prev,
            [resizing.id]: { ...prev[resizing.id], scheduledTime: newTimeStr, scheduledDuration: newDuration }
          }));
        }
      } else if (moving) {
        const task = tasks.find(t => t.id === moving.id);
        if (!task || !task.scheduledTime) return;

        const deltaX = e.clientX - moving.initialX;
        const deltaMinutes = Math.round((deltaX / 150) * 60 / 5) * 5;
        const newStartMinutes = Math.max(0, moving.initialTime + deltaMinutes);

        const h = Math.floor(newStartMinutes / 60);
        const m = newStartMinutes % 60;
        const newTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        setLocalTaskOverrides(prev => ({
          ...prev,
          [moving.id]: { ...prev[moving.id], scheduledTime: newTimeStr }
        }));
      }
    };

    const handleMouseUp = async () => {
      const activeId = resizing?.id || moving?.id;
      if (activeId && localTaskOverrides[activeId]) {
        const task = tasks.find(t => t.id === activeId);
        if (task) {
          const updates = localTaskOverrides[activeId];
          await onUpdateTask({ ...task, ...updates });
          // Clear override after sync
          setLocalTaskOverrides(prev => {
            const next = { ...prev };
            delete next[activeId];
            return next;
          });
        }
      }
      setResizing(null);
      setMoving(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, moving, tasks, onUpdateTask, localTaskOverrides]);

  // Generate a list of dates for the horizontal bar (e.g., 7 days starting from today or centered)
  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    // Show 14 days start from 3 days ago
    for (let i = -3; i < 11; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const { scheduledTasks, maxTracks } = useMemo(() => {
    const items = tasks
      .filter(t => t.scheduledTime && t.nextDue === selectedDate && !t.isFitness && !t.isWeeklyTracker && !t.isGrocery && !t.isJobSearch && !t.isProject && !t.isBucketlist)
      .map(t => ({ ...t, ...localTaskOverrides[t.id] }));

    // Calculate tracks for overlapping tasks
    const sorted = [...items].sort((a, b) => {
      const [hA, mA] = a.scheduledTime!.split(':').map(Number);
      const [hB, mB] = b.scheduledTime!.split(':').map(Number);
      return (hA * 60 + mA) - (hB * 60 + mB);
    });

    const tracks: number[] = [];
    const scheduled = sorted.map(task => {
      const [h, m] = task.scheduledTime!.split(':').map(Number);
      const start = h * 60 + m;
      const end = start + (task.scheduledDuration || 60);

      let trackIndex = tracks.findIndex(trackEnd => trackEnd <= start);
      if (trackIndex === -1) {
        trackIndex = tracks.length;
        tracks.push(end);
      } else {
        tracks[trackIndex] = end;
      }
      return { ...task, trackIndex };
    });

    return { scheduledTasks: scheduled, maxTracks: tracks.length };
  }, [tasks, selectedDate, localTaskOverrides]);

  const unscheduledTasks = useMemo(() => {
    return tasks.filter(t => !t.scheduledTime && t.status !== Status.DONE && !t.isFitness && !t.isWeeklyTracker && !t.isGrocery && !t.isJobSearch && !t.isProject && !t.isBucketlist);
  }, [tasks]);

  const handleDragStart = (task: Task) => {
    setDraggedTaskId(task.id);
  };

  const handleDropOnTime = async (hour: number) => {
    if (!draggedTaskId) return;
    const task = tasks.find(t => t.id === draggedTaskId);
    if (task) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      await onUpdateTask({
        ...task,
        scheduledTime: timeString,
        scheduledDuration: task.scheduledDuration || 60,
        nextDue: selectedDate
      });
    }
    setDraggedTaskId(null);
  };

  const isToday = selectedDate === getDayStr();
  const [nowPosition, setNowPosition] = useState<number | null>(null);

  React.useEffect(() => {
    if (!isToday) {
      setNowPosition(null);
      return;
    }

    const updateNow = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      setNowPosition((minutes / 60) * 100);
    };

    updateNow();
    const interval = setInterval(updateNow, 60000);
    return () => clearInterval(interval);
  }, [isToday]);

  const getEndTime = (startTime: string, durationMinutes: number) => {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col lg:flex-row gap-10 lg:h-[calc(100vh-280px)] mb-20">
        {/* Main Column */}
        <div className="flex-[3] flex flex-col gap-8 min-h-0 overflow-hidden">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-1 bg-white border border-app-border rounded-[2.5rem] flex flex-col overflow-hidden shadow-xl"
          >
          <div className="p-8 border-b border-app-border flex items-center justify-between bg-white relative z-50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-app-purple-50 rounded-2xl text-app-purple-600 shadow-sm border border-app-purple-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-app-ink">Chronos Timeline</h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-app-muted font-bold">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <button 
                    onClick={() => setSelectedDate(getDayStr())}
                    className="text-[9px] font-black uppercase bg-app-purple-600 text-white px-2 py-1 rounded-lg hover:bg-app-purple-700 transition-all shadow-md shadow-app-purple-100"
                  >
                    Current
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
               {selectedDate === getDayStr() && (
                 <button 
                   onClick={() => {
                     const container = document.getElementById('schedule-grid-container');
                     if (container && nowPosition !== null) {
                       container.scrollTo({ left: (nowPosition / 100) * 150 - 200, behavior: 'smooth' });
                     }
                   }}
                   className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 hover:text-rose-600 transition-colors"
                 >
                   <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                   Real-time
                 </button>
               )}
               <div className="text-[10px] text-app-muted font-black uppercase tracking-widest hidden md:block opacity-40">
                 {scheduledTasks.length} NODES ACTIVE
               </div>
            </div>
          </div>

          <div className="bg-app-surface border-b border-app-border px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
            {dateOptions.map(date => {
              const dateStr = getDayStr(date);
              const isSelected = dateStr === selectedDate;
              const isTodayDate = dateStr === getDayStr();
              
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center min-w-[70px] py-3 rounded-2xl transition-all border ${
                    isSelected 
                    ? 'bg-app-purple-600 text-white shadow-xl shadow-app-purple-200 border-app-purple-500 scale-105 z-10' 
                    : isTodayDate
                      ? 'bg-white text-app-purple-600 border-app-purple-200 shadow-sm'
                      : 'bg-white hover:bg-app-surface text-app-muted border-app-border'
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'opacity-70' : 'opacity-40'}`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-base font-black tabular-nums font-display">
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <div id="schedule-grid-container" className="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar bg-app-surface scroll-smooth p-4">
            <div className="relative inline-flex flex-col min-h-full w-[3600px] bg-white rounded-[2rem] border border-app-border shadow-inner">
               <div className="flex h-16 border-b border-app-border bg-white sticky top-0 z-20 rounded-t-[2rem]">
                 {HOURS.map(hour => (
                   <div key={hour} className="w-[150px] shrink-0 flex items-center justify-center border-r border-app-border last:border-r-0">
                     <span className="text-[10px] font-black text-app-muted uppercase tracking-[0.2em] tabular-nums opacity-60">
                       {formatTime(hour)}
                     </span>
                   </div>
                 ))}
               </div>

               <div className="flex-1 relative" style={{ minHeight: `${Math.max(400, (maxTracks || 0) * 140 + 60)}px` }}>
                 {nowPosition !== null && (
                   <div 
                     className="absolute top-0 bottom-0 z-40 flex flex-col items-center pointer-events-none"
                     style={{ left: `${(nowPosition / 100) * 150}px` }}
                   >
                     <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                     <div className="flex-1 w-[2px] bg-rose-500/40" />
                   </div>
                 )}

                  <div className="absolute inset-0 flex h-full">
                    {HOURS.map(hour => (
                      <div 
                        key={hour} 
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={() => handleDropOnTime(hour)}
                        className="w-[150px] shrink-0 border-r border-app-border/30 relative group transition-colors hover:bg-app-purple-50/30"
                      >
                        <button 
                          onClick={() => {
                            if (resizing || moving || draggedTaskId) return;
                            onAddTask({ title: 'New Protocol', scheduledTime: formatTime(hour), scheduledDuration: 60, nextDue: selectedDate });
                          }}
                          className="absolute inset-0 h-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all bg-app-purple-500/5 group-hover:backdrop-blur-[2px]"
                        >
                          <div className="flex flex-col items-center gap-3 text-app-purple-400 group-hover:scale-110 transition-transform">
                             <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center"><Plus className="w-5 h-5" /></div>
                             <span className="text-[9px] font-black uppercase tracking-[0.3em]">SYNCHRONIZE</span>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 pointer-events-none">
                    <AnimatePresence>
                      {scheduledTasks.map(task => {
                        const [h, m] = task.scheduledTime!.split(':').map(Number);
                        const startMinutes = h * 60 + m;
                        const duration = task.scheduledDuration || 60;
                        const leftPos = (startMinutes / 60) * 150;
                        const widthVal = (duration / 60) * 150;
                        const trackIndex = (task as any).trackIndex || 0;
                        const trackHeight = 110;
                        const topPos = 30 + (trackIndex * (trackHeight + 15));

                        return (
                          <motion.div
                            layoutId={task.id}
                            key={task.id}
                            style={{ 
                              left: `${leftPos}px`, 
                              width: `${widthVal - 12}px`,
                              top: `${topPos}px`,
                              height: `${trackHeight}px`,
                              zIndex: (moving?.id === task.id || resizing?.id === task.id) ? 50 : 20,
                              pointerEvents: 'auto'
                            }}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ 
                              scale: (moving?.id === task.id || resizing?.id === task.id) ? 1.05 : 1, 
                              opacity: task.status === Status.DONE ? 0.4 : (draggedTaskId === task.id ? 0.3 : 1),
                              y: (moving?.id === task.id || resizing?.id === task.id) ? -4 : 0,
                              boxShadow: (moving?.id === task.id || resizing?.id === task.id) 
                                ? '0 30px 60px -12px rgba(139, 92, 246, 0.3)' 
                                : '0 10px 20px -5px rgba(0, 0, 0, 0.05)'
                            }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            whileHover={{ scale: 1.01, zIndex: 60 }}
                            onMouseDown={(e) => {
                              const [h, m] = task.scheduledTime!.split(':').map(Number);
                              setMoving({ id: task.id, initialX: e.clientX, initialTime: h * 60 + m });
                            }}
                            className={`absolute rounded-3xl overflow-hidden border-2 flex flex-col group transition-all select-none cursor-grab active:cursor-grabbing ${
                              task.status === Status.DONE ? 'bg-app-surface border-app-border' :
                              task.priority === 'High' ? 'bg-rose-50 border-rose-200 shadow-sm' :
                              task.priority === 'Medium' ? 'bg-amber-50 border-amber-200 shadow-sm' :
                              'bg-white border-app-purple-100 shadow-sm'
                            } ${ (moving?.id === task.id || resizing?.id === task.id) ? 'border-app-purple-400 border-2' : ''}`}
                          >
                          <div 
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const [h, m] = task.scheduledTime!.split(':').map(Number);
                              setResizing({ id: task.id, edge: 'left', initialX: e.clientX, initialTime: h * 60 + m, initialDuration: task.scheduledDuration || 60 });
                            }}
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-app-purple-500/10 z-10" 
                          />
                          <div 
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const [h, m] = task.scheduledTime!.split(':').map(Number);
                              setResizing({ id: task.id, edge: 'right', initialX: e.clientX, initialTime: h * 60 + m, initialDuration: task.scheduledDuration || 60 });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-app-purple-500/10 z-10" 
                          />

                          <div className="p-5 flex-1 flex flex-col justify-between pointer-events-none">
                              <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      task.status === Status.DONE ? 'bg-emerald-500' :
                                      task.priority === 'High' ? 'bg-rose-500' :
                                      task.priority === 'Medium' ? 'bg-amber-500' :
                                      'bg-app-purple-500'
                                    } shadow-[0_0_8px_currentColor]`} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-app-muted tabular-nums flex items-center gap-2">
                                      <span className="text-app-purple-600">{task.scheduledTime}</span>
                                      <span className="opacity-20">—</span>
                                      <span className="text-app-purple-600">{getEndTime(task.scheduledTime!, task.scheduledDuration || 60)}</span>
                                      <span className="ml-2 font-display">{task.scheduledDuration || 60}m</span>
                                    </p>
                                  </div>
                                  <h3 className={`text-sm font-black truncate font-display tracking-tight leading-none ${
                                    task.status === Status.DONE ? 'text-app-muted line-through' : 'text-app-ink'
                                  }`}>{task.title}</h3>
                              </div>
                              
                              <div 
                                className="flex items-center justify-between pointer-events-auto"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <div className="flex gap-2">
                                  <button onClick={() => onUpdateTask({ ...task, scheduledTime: null })} className="p-2 hover:bg-app-surface rounded-xl text-app-muted hover:text-app-ink transition-colors border border-transparent hover:border-app-border" title="Detach"><X className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => onDeleteTask(task.id)} className="p-2 hover:bg-rose-50 rounded-xl text-app-muted hover:text-rose-500 transition-colors border border-transparent hover:border-rose-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                                <button 
                                  onClick={() => onUpdateTask({ ...task, status: task.status === Status.DONE ? Status.TODO : Status.DONE })}
                                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                                    task.status === Status.DONE ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-white text-app-muted hover:text-app-purple-600 border border-app-border hover:shadow-lg'
                                  }`}
                                >
                                  {task.status === Status.DONE ? <CheckCircle2 className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                </button>
                              </div>
                          </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
               </div>
            </div>
          </div>
          </motion.div>
        </div>

        {/* Sidebar: Activity Feed */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full lg:w-1/4 bg-white border border-app-border rounded-[2.5rem] flex flex-col h-[450px] lg:h-full overflow-hidden shadow-xl shrink-0"
        >
          <div className="p-8 border-b border-app-border flex items-center justify-between bg-app-surface/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-app-purple-600 rounded-2xl text-white shadow-lg shadow-app-purple-100">
                <Activity className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-app-ink">Queue</h2>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onAddTask({ title: 'New Action', scheduledDuration: 60 })}
              className="p-3 bg-white border border-app-border rounded-xl shadow-sm text-app-purple-600 hover:text-app-purple-700 transition-all hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white">
            <Reorder.Group axis="y" values={unscheduledTasks} onReorder={(newOrder) => {
               // We need a stable way to reorder these in the global state
               onReorderTasks(newOrder);
            }} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {unscheduledTasks.length === 0 ? (
                   <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center px-10 gap-6">
                      <div className="w-20 h-20 rounded-[2rem] bg-app-surface border-2 border-dashed border-app-border flex items-center justify-center text-app-muted/30"><Activity className="w-8 h-8" /></div>
                      <p className="text-[10px] text-app-muted font-black uppercase tracking-[0.3em] leading-relaxed">System clear. No pending protocols required.</p>
                   </motion.div>
                ) : (
                  unscheduledTasks.map(task => (
                    <Reorder.Item
                      key={task.id}
                      value={task}
                      dragListener={!draggedTaskId}
                      onDragStart={() => handleDragStart(task)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      className="bg-white border border-app-border p-5 rounded-3xl cursor-grab active:cursor-grabbing hover:border-app-purple-400 hover:shadow-xl transition-all group relative active:scale-98 shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-app-surface rounded-xl text-app-muted group-hover:text-app-purple-600 group-hover:bg-app-purple-50 transition-all"><GripVertical className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-app-ink font-display line-clamp-1">{task.title}</p>
                          <div className="mt-2 flex items-center gap-2">
                             <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${
                               task.priority === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                               task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                               'bg-blue-50 text-blue-600 border-blue-100'
                             }`}>{task.priority}</span>
                          </div>
                        </div>
                      </div>
                    </Reorder.Item>
                  ))
                )}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        </motion.div>
      </div>

    {/* Weekly Gym Tracker at the bottom */}
    <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-app-ink text-white rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group mb-32"
    >
        <div className="absolute top-0 right-0 p-48 bg-app-purple-500/20 rounded-full blur-[120px] -mr-16 -mt-16 pointer-events-none group-hover:bg-app-purple-500/30 transition-all duration-1000"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 relative z-10 gap-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-app-purple-500/20 rounded-[1.5rem] text-app-purple-400 border border-app-purple-500/30 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                  <Activity className="w-8 h-8" />
              </div>
              <div>
                  <h2 className="text-3xl font-black tracking-tight font-display">Biometric Sync</h2>
                  <p className="text-[10px] text-app-purple-400 font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-app-purple-400 animate-pulse"></div>
                    Dynamic Weekly Training
                  </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-[1.5rem] border border-white/10 backdrop-blur-md">
              <button 
                onClick={() => setFitnessWeekOffset(prev => prev - 1)}
                className="p-3 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                title="Previous Week"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setFitnessWeekOffset(0)} className="text-[10px] font-black uppercase tracking-[0.3em] px-4 text-white/40 hover:text-white transition-all">Current Grid</button>
              <button 
                onClick={() => setFitnessWeekOffset(prev => prev + 1)}
                className="p-3 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                title="Next Week"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 relative z-10">
        {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            const first = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1); 
            const dayDate = new Date(d.getFullYear(), d.getMonth(), first + i + (fitnessWeekOffset * 7));
            const dayStr = getDayStr(dayDate);
            const isTodayDay = dayStr === getDayStr();

            const gymTask = tasks.find(t => t.isWeeklyTracker && t.nextDue === dayStr && t.title.toLowerCase().includes('gym'));
            const homeTask = tasks.find(t => t.isWeeklyTracker && t.nextDue === dayStr && t.title.toLowerCase().includes('home'));

            return (
            <div 
                key={dayStr}
                className={`p-6 rounded-[2rem] border transition-all flex flex-col gap-4 min-h-[160px] group/card ${
                isTodayDay ? 'bg-white/10 border-app-purple-500/50 shadow-2xl shadow-app-purple-500/20' : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
            >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isTodayDay ? 'text-app-purple-400' : 'text-white/30'}`}>
                      {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`text-base font-black tabular-nums font-display ${isTodayDay ? 'text-app-purple-400' : 'text-white/20 group-hover/card:text-white/60'} transition-colors`}>
                      {dayDate.getDate()}
                  </span>
                </div>
                
                <div className="relative flex-1">
                <textarea 
                    placeholder="Log Session..."
                    defaultValue={gymTask?.title?.replace(/gym/i, '').replace(/:/g, '').trim() || ''}
                    onBlur={async (e) => {
                      const val = e.target.value.trim();
                      if (val) {
                          if (gymTask) {
                            await onUpdateTask({ ...gymTask, title: `Gym: ${val}` });
                          } else {
                            await onAddTask({ title: `Gym: ${val}`, isWeeklyTracker: true, nextDue: dayStr });
                          }
                      }
                    }}
                    className="w-full bg-transparent border-none text-xs font-black text-white placeholder:text-white/10 outline-none focus:placeholder:opacity-0 transition-opacity resize-none leading-relaxed font-display"
                    rows={2}
                />
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex gap-2">
                        {gymTask && (
                            <button 
                                onClick={() => onUpdateTask({ ...gymTask, status: gymTask.status === Status.DONE ? Status.TODO : Status.DONE })}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                    gymTask.status === Status.DONE 
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                                    : 'bg-white/10 text-white/40 hover:text-white hover:bg-white/20'
                                }`}
                                title="Sync Complete"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={async () => {
                                const title = `Home Workout: ${dayDate.toLocaleDateString('en-US', { weekday: 'short' })}`;
                                if (homeTask) {
                                    await onDeleteTask(homeTask.id);
                                } else {
                                    await onAddTask({ title, isWeeklyTracker: true, nextDue: dayStr });
                                }
                            }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                homeTask
                                ? 'bg-app-purple-500 text-white shadow-lg shadow-app-purple-500/30' 
                                : 'bg-white/10 text-white/40 hover:text-white hover:bg-white/20'
                            }`}
                            title="Home Base Training"
                        >
                            <Home className="w-4 h-4" />
                        </button>
                    </div>
                    {isTodayDay && <div className="w-2 h-2 rounded-full bg-app-purple-400 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.6)]" />}
                </div>
            </div>
            );
        })}
        </div>
      </motion.div>
    </div>
  );
};

export default ScheduleView;
