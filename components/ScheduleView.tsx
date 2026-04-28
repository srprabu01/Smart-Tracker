import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, GripVertical, Plus, Activity, Trash2, CheckCircle2, ChevronRight, ChevronLeft, X, Home } from 'lucide-react';
import { Task, Status } from '../types';

interface ScheduleViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => Promise<void>;
  onAddTask: (task: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getTodayStr = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().split('T')[0];
};

const ScheduleView: React.FC<ScheduleViewProps> = ({ tasks, onUpdateTask, onAddTask, onDeleteTask }) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ id: string, edge: 'left' | 'right', initialX: number, initialTime: number, initialDuration: number } | null>(null);
  const [moving, setMoving] = useState<{ id: string, initialX: number, initialTime: number } | null>(null);
  const [localTaskOverrides, setLocalTaskOverrides] = useState<Record<string, Partial<Task>>>({});
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
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
      .filter(t => t.scheduledTime && t.nextDue === selectedDate)
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
    return tasks.filter(t => !t.scheduledTime && t.status !== Status.DONE && !t.isWeeklyTracker);
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

  const isToday = selectedDate === getTodayStr();
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
    <>
      <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-220px)]">
        {/* Main Column */}
        <div className="flex-[3] flex flex-col gap-6 min-h-0 overflow-hidden">
          {/* Main Grid View: Horizontal Timeline */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-1 bg-[#1e1e1e] border border-[#333] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          >
          <div className="p-5 border-b border-[#333] flex items-center justify-between bg-[#252525]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-300">Daily Timeline</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-gray-500 font-bold">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <button 
                    onClick={() => setSelectedDate(getTodayStr())}
                    className="text-[8px] font-black uppercase bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               {isToday && (
                 <button 
                   onClick={() => {
                     const container = document.getElementById('schedule-grid-container');
                     if (container && nowPosition !== null) {
                       container.scrollTo({ left: (nowPosition / 100) * 150 - 100, behavior: 'smooth' });
                     }
                   }}
                   className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
                 >
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                   Now
                 </button>
               )}
               <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider hidden sm:block">
                 {scheduledTasks.length} Tasks Scheduled
               </div>
            </div>
          </div>

          {/* Date Selector Strip */}
          <div className="bg-[#202020] border-b border-[#333] px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth scroll-px-4">
            {dateOptions.map(date => {
              const dateStr = date.toISOString().split('T')[0];
              const isSelected = dateStr === selectedDate;
              const isTodayDate = dateStr === getTodayStr();
              
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center min-w-[56px] py-2.5 rounded-2xl transition-all border ${
                    isSelected 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border-blue-500' 
                    : isTodayDate
                      ? 'bg-white/5 text-blue-400 border-blue-500/30'
                      : 'hover:bg-white/5 text-gray-400 border-transparent'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <div id="schedule-grid-container" className="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar bg-[#151515] scroll-smooth">
            <div className="relative inline-flex flex-col min-h-full w-[3600px]">
               {/* Timeline Header */}
               <div className="flex h-12 border-b border-[#2a2a2a] bg-[#1a1a1a]/50 backdrop-blur-sm sticky top-0 z-20">
                 {HOURS.map(hour => (
                   <div key={hour} className="w-[150px] shrink-0 flex items-center justify-center border-r border-[#2a2a2a]/30">
                     <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest tabular-nums">
                       {formatTime(hour)}
                     </span>
                   </div>
                 ))}
               </div>

               {/* Drop Zone Strip */}
               <div 
                 className="flex-1 relative"
                 style={{ minHeight: `${Math.max(400, (maxTracks || 0) * 132 + 40)}px` }}
               >
                 {/* Now Indicator */}
                 {nowPosition !== null && (
                   <div 
                     className="absolute top-0 bottom-0 z-40 flex flex-col items-center pointer-events-none"
                     style={{ left: `${(nowPosition / 100) * 150}px` }}
                   >
                     <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                     <div className="flex-1 w-[2px] bg-red-500/50" />
                   </div>
                 )}

                  {/* Hour Slots Layer */}
                  <div className="absolute inset-0 flex h-full">
                    {HOURS.map(hour => (
                      <div 
                        key={hour} 
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={() => handleDropOnTime(hour)}
                        className="w-[150px] shrink-0 border-r border-[#2a2a2a]/50 relative group transition-colors hover:bg-white/[0.01]"
                      >
                        <button 
                          onClick={() => {
                            if (resizing || moving || draggedTaskId) return;
                            onAddTask({ title: 'New Event', scheduledTime: formatTime(hour), scheduledDuration: 60, nextDue: selectedDate });
                          }}
                          className="absolute inset-0 h-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex flex-col items-center justify-end pb-6 transition-all"
                        >
                          <div className="flex flex-col items-center gap-2 text-gray-600 hover:text-white group/btn">
                             <Plus className="w-3 h-3" />
                             <span className="text-[8px] font-black uppercase tracking-[0.2em] transition-transform">Schedule</span>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Tasks Layer */}
                  <div className="relative z-10 pointer-events-none">
                    <AnimatePresence>
                      {scheduledTasks.map(task => {
                        const [h, m] = task.scheduledTime!.split(':').map(Number);
                        const startMinutes = h * 60 + m;
                        const duration = task.scheduledDuration || 60;
                        const leftPos = (startMinutes / 60) * 150;
                        const widthVal = (duration / 60) * 150;

                        const trackIndex = (task as any).trackIndex || 0;
                        const trackHeight = 120; // Fixed height per track
                        const topPos = 20 + (trackIndex * (trackHeight + 12));

                        return (
                          <motion.div
                            layoutId={task.id}
                            key={task.id}
                            style={{ 
                              left: `${leftPos}px`, 
                              width: `${widthVal - 8}px`,
                              top: `${topPos}px`,
                              height: `${trackHeight}px`,
                              zIndex: (moving?.id === task.id || resizing?.id === task.id) ? 50 : 20,
                              pointerEvents: 'auto'
                            }}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ 
                              scale: (moving?.id === task.id || resizing?.id === task.id) ? 1.02 : 1, 
                              opacity: task.status === Status.DONE ? 0.6 : (draggedTaskId === task.id ? 0.4 : 1),
                              filter: task.status === Status.DONE ? 'grayscale(0.5)' : 'none',
                              boxShadow: (moving?.id === task.id || resizing?.id === task.id) 
                                ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
                                : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            whileHover={{ scale: 1.02, zIndex: 60 }}
                            onMouseDown={(e) => {
                              const [h, m] = task.scheduledTime!.split(':').map(Number);
                              setMoving({
                                id: task.id,
                                initialX: e.clientX,
                                initialTime: h * 60 + m
                              });
                            }}
                            className={`absolute rounded-2xl overflow-hidden border-2 flex flex-col group transition-all select-none cursor-move ${
                              task.status === Status.DONE ? 'bg-[#1a1a1a] border-[#333]' :
                              task.priority === 'High' ? 'bg-red-500/10 border-red-500/30' :
                              task.priority === 'Medium' ? 'bg-orange-500/10 border-orange-500/30' :
                              'bg-blue-500/10 border-blue-500/40'
                            } ${ (moving?.id === task.id || resizing?.id === task.id) ? 'ring-2 ring-blue-500/50' : ''}`}
                          >
                          {/* Resize Handles */}
                          <div 
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const [h, m] = task.scheduledTime!.split(':').map(Number);
                              setResizing({
                                id: task.id,
                                edge: 'left',
                                initialX: e.clientX,
                                initialTime: h * 60 + m,
                                initialDuration: task.scheduledDuration || 60
                              });
                            }}
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/10 z-10" 
                          />
                          <div 
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const [h, m] = task.scheduledTime!.split(':').map(Number);
                              setResizing({
                                id: task.id,
                                edge: 'right',
                                initialX: e.clientX,
                                initialTime: h * 60 + m,
                                initialDuration: task.scheduledDuration || 60
                              });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/10 z-10" 
                          />

                          <div className="p-4 flex-1 overflow-hidden">
                            <div className="flex flex-col justify-between h-full pointer-events-none">
                              <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      task.status === Status.DONE ? 'bg-green-500' :
                                      task.priority === 'High' ? 'bg-red-500' :
                                      task.priority === 'Medium' ? 'bg-orange-500' :
                                      'bg-blue-500'
                                    }`} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#999] tabular-nums flex items-center gap-1.5">
                                      <span className="text-blue-400/80">{task.scheduledTime}</span>
                                      <span className="opacity-30">→</span>
                                      <span className="text-blue-400/80">{getEndTime(task.scheduledTime!, task.scheduledDuration || 60)}</span>
                                      <span className="ml-1 text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400">
                                        {task.scheduledDuration || 60}M
                                      </span>
                                    </p>
                                  </div>
                                  <h3 className={`text-sm font-bold truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight ${
                                    task.status === Status.DONE ? 'text-gray-500 line-through' : 'text-white'
                                  }`}>{task.title}</h3>
                              </div>
                              
                              <div 
                                className="flex items-center justify-between mt-4 pointer-events-auto"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => onUpdateTask({ ...task, scheduledTime: null })}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-transform"
                                    title="Unschedule"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => onDeleteTask(task.id)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>

                                <button 
                                  onClick={() => onUpdateTask({ ...task, status: task.status === Status.DONE ? Status.TODO : Status.DONE })}
                                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                                    task.status === Status.DONE 
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                                    : 'bg-[#333] text-gray-400 hover:bg-blue-600 hover:text-white'
                                  }`}
                                >
                                  {task.status === Status.DONE ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              </div>
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
          className="w-full lg:w-1/4 bg-[#1e1e1e] border border-[#333] rounded-2xl flex flex-col h-[400px] lg:h-full overflow-hidden shadow-2xl shrink-0"
        >
          <div className="p-5 border-b border-[#333] flex items-center justify-between bg-[#252525]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-300">Activity</h2>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onAddTask({ title: 'New Task', scheduledDuration: 60 })}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white"
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#1a1a1a]">
            <AnimatePresence mode="popLayout">
              {unscheduledTasks.length === 0 ? (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="text-center py-20 flex flex-col items-center gap-3"
                 >
                    <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-[#333] flex items-center justify-center text-gray-600">
                      <Activity className="w-5 h-5 opacity-20" />
                    </div>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-loose max-w-[120px]">
                      No pending activities to schedule
                    </p>
                 </motion.div>
              ) : (
                unscheduledTasks.map(task => (
                  <motion.div
                    layout
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onDragEnd={() => setDraggedTaskId(null)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -2, borderColor: '#3b82f6' }}
                    className="bg-[#252525] border border-[#373737] p-4 rounded-xl cursor-grab active:cursor-grabbing transition-colors group shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                            task.priority === 'High' ? 'bg-red-500/20 text-red-500' :
                            task.priority === 'Medium' ? 'bg-orange-500/20 text-orange-500' :
                            'bg-blue-500/20 text-blue-500'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

    {/* Weekly Gym Tracker at the bottom */}
    <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mt-8 bg-[#1e1e1e] border border-[#333] rounded-2xl overflow-hidden shadow-2xl p-6"
    >
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                <Activity className="w-5 h-5" />
            </div>
            <div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-300">Weekly Fitness Tracker</h2>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-1">Plan your weekly workout routine</p>
            </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-[#333]">
                <button 
                  onClick={() => setFitnessWeekOffset(prev => prev - 1)}
                  className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setFitnessWeekOffset(0)}
                  className="text-[9px] font-black uppercase tracking-[0.2em] px-3 text-gray-500 hover:text-white transition-colors"
                >
                  Current
                </button>
                <button 
                  onClick={() => setFitnessWeekOffset(prev => prev + 1)}
                  className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] bg-white/5 px-3 py-1.5 rounded-lg border border-[#333]">
                7 Day Overview
              </div>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            const first = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1); 
            const dayDate = new Date(d.setDate(first + i + (fitnessWeekOffset * 7)));
            const dayStr = dayDate.toISOString().split('T')[0];
            const isTodayDay = dayStr === getTodayStr();

            const gymTask = tasks.find(t => t.isWeeklyTracker && t.nextDue === dayStr && t.title.toLowerCase().includes('gym'));

            return (
            <div 
                key={dayStr}
                className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 min-h-[120px] ${
                isTodayDay ? 'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/20' : 'bg-[#252525] border-[#333] hover:border-gray-500'
                }`}
            >
                <div className="flex items-center justify-between border-b border-[#333] pb-2">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isTodayDay ? 'text-blue-400' : 'text-gray-500'}`}>
                    {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`text-xs font-black tabular-nums ${isTodayDay ? 'text-blue-400' : 'text-gray-600'}`}>
                    {dayDate.getDate()}
                </span>
                </div>
                
                <div className="relative group/gym flex-1">
                <textarea 
                    placeholder="Workout Plan..."
                    defaultValue={gymTask?.title?.replace(/gym/i, '').trim() || ''}
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
                    className="w-full bg-transparent border-none text-xs font-bold text-white placeholder:text-gray-800 outline-none focus:placeholder:opacity-0 transition-opacity resize-none leading-relaxed"
                    rows={2}
                />
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#333]">
                    <div className="flex gap-2">
                        {gymTask && (
                            <button 
                                onClick={() => onUpdateTask({ ...gymTask, status: gymTask.status === Status.DONE ? Status.TODO : Status.DONE })}
                                className={`p-1.5 rounded-lg transition-all ${
                                    gymTask.status === Status.DONE 
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                                    : 'bg-gray-800 text-gray-500 hover:text-white'
                                }`}
                                title="Mark as Done"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={async () => {
                                const title = `Home Workout: ${dayDate.toLocaleDateString('en-US', { weekday: 'short' })}`;
                                const existing = tasks.find(t => t.isWeeklyTracker && t.nextDue === dayStr && t.title.toLowerCase().includes('home'));
                                if (!existing) {
                                    await onAddTask({ title, isWeeklyTracker: true, nextDue: dayStr });
                                }
                            }}
                            className={`p-1.5 rounded-lg transition-all ${
                                tasks.find(t => t.isWeeklyTracker && t.nextDue === dayStr && t.title.toLowerCase().includes('home'))
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                                : 'bg-gray-800 text-gray-500 hover:text-white'
                            }`}
                            title="Home Workout"
                        >
                            <Home className="w-4 h-4" />
                        </button>
                    </div>
                    {isTodayDay && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                </div>
            </div>
            );
        })}
        </div>
    </motion.div>
    </>
);
};

export default ScheduleView;
