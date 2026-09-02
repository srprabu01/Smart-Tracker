import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Task, Status, Priority, Frequency, FitnessCategory } from '../types';
import { TAG_STYLES, formatDate, getLocalToday, calculateNextDue, getTaskCompletionUpdates } from './TaskTable';
import { IconPlus, IconTrash, IconX, IconDumbbell, IconCircle, IconCheckCircle } from './Icons';

const IconPlay = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}><path d="M8 5v14l11-7z"/></svg>
);

const IconExternalLink = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
);

const IconHome = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);

const getYoutubeEmbedId = (url: string | undefined) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

interface FitnessBoardProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (category: string) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (tasks: Task[]) => void;
}

interface FitnessColumnProps {
  title: string;
  category: string;
  tasks: Task[];
  onAddTask: () => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onPlayVideo: (url: string, title: string) => void;
  onToggleStatus: (task: Task) => void;
  onReorderTasks: (draggedId: string, targetId: string | 'END', targetCategory: string) => void;
}

const VideoPlayerModal = ({ 
    url, 
    title, 
    onClose 
}: { 
    url: string; 
    title: string; 
    onClose: () => void; 
}) => {
    const embedId = getYoutubeEmbedId(url);
    return (
        <div className="fixed inset-0 bg-app-ink/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-app-ink w-full max-w-5xl aspect-video rounded-3xl shadow-2xl overflow-hidden relative flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start pointer-events-none z-10">
                    <h3 className="text-white font-black text-xl drop-shadow-md tracking-tight font-display">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-2xl p-3 pointer-events-auto transition-all backdrop-blur-md border border-white/10"
                    >
                        <IconX className="w-6 h-6" />
                    </button>
                </div>
                {embedId ? (
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src={`https://www.youtube.com/embed/${embedId}?autoplay=1`} 
                        title={title}
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        className="flex-1"
                    ></iframe>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <p className="font-bold">Video format not optimized for embedded view.</p>
                        <a href={url} target="_blank" rel="noreferrer" className="text-app-purple-400 hover:underline mt-4 font-black uppercase tracking-widest text-[10px]">Open Original Stream</a>
                    </div>
                )}
            </div>
        </div>
    );
};

const WorkoutModal = ({ 
    task, 
    onClose, 
    onSave 
}: { 
    task: Task; 
    onClose: () => void; 
    onSave: (updated: Task) => void 
}) => {
    const [title, setTitle] = useState(task.title);
    const [reps, setReps] = useState(task.reps || '');
    const [videoUrl, setVideoUrl] = useState(task.videoUrl || '');
    const [isHome, setIsHome] = useState(task.isHomeWorkout || false);
    const [priority, setPriority] = useState(task.priority);

    const handleSave = () => {
        onSave({
            ...task,
            title,
            reps,
            videoUrl,
            isHomeWorkout: isHome,
            priority
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-app-ink/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white border border-app-border rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between p-6 border-b border-app-border bg-app-surface/50">
                    <h3 className="font-black text-app-ink flex items-center gap-3 font-display">
                        <IconDumbbell className="w-6 h-6 text-app-purple-500" />
                        Edit Biometrics
                    </h3>
                    <button onClick={onClose} className="text-app-muted hover:text-app-ink p-2 hover:bg-white rounded-xl transition-all"><IconX className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-[10px] text-app-muted mb-2 uppercase font-black tracking-widest leading-none">Exercise Protocol</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-app-surface border border-app-border rounded-2xl p-3.5 text-app-ink font-bold focus:border-app-purple-400 focus:ring-4 focus:ring-app-purple-50 outline-none transition-all placeholder-app-muted" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] text-app-muted mb-2 uppercase font-black tracking-widest leading-none">Rep Scheme</label>
                            <input type="text" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="e.g. 3x12 / 60s" className="w-full bg-app-surface border border-app-border rounded-2xl p-3.5 text-app-ink font-bold focus:border-app-purple-400 outline-none transition-all placeholder-app-muted" />
                        </div>
                        <div className="flex items-end pb-3.5">
                             <label className="flex items-center gap-3 cursor-pointer group select-none">
                                <div className={`w-6 h-6 border-2 rounded-xl flex items-center justify-center transition-all ${isHome ? 'bg-app-purple-600 border-app-purple-600 shadow-sm' : 'border-app-border bg-app-surface group-hover:border-app-purple-300'}`}>{isHome && <span className="text-white text-[10px] font-black">✓</span>}</div>
                                <input type="checkbox" checked={isHome} onChange={(e) => setIsHome(e.target.checked)} className="hidden" />
                                <span className="text-xs text-app-muted font-black uppercase tracking-tight group-hover:text-app-ink transition-colors">Home Base</span>
                             </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] text-app-muted mb-3 uppercase font-black tracking-widest leading-none">Neural Load</label>
                        <div className="flex gap-2.5">
                            {Object.values(Priority).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`flex-1 text-[10px] py-3 rounded-2xl font-black uppercase tracking-widest transition-all border-2 ${
                                        priority === p
                                            ? p === Priority.HIGH ? 'bg-rose-50 border-rose-200 text-rose-600' :
                                              p === Priority.MEDIUM ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                              'bg-app-purple-50 border-app-purple-200 text-app-purple-600'
                                            : 'bg-app-surface border-app-border text-app-muted hover:border-app-purple-200 hover:text-app-purple-400'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] text-app-muted mb-2 uppercase font-black tracking-widest leading-none">Intelligence Ref (URL)</label>
                        <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-app-surface border border-app-border rounded-2xl p-3.5 text-app-ink font-bold focus:border-app-purple-400 outline-none transition-all placeholder-app-muted text-sm" />
                    </div>
                </div>
                <div className="p-6 border-t border-app-border flex justify-end gap-3 bg-app-surface/50">
                    <button onClick={onClose} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-app-muted hover:text-app-ink transition-colors">Abort</button>
                    <button onClick={handleSave} className="px-8 py-3 text-xs bg-app-purple-600 hover:bg-app-purple-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-app-purple-200 transition-all active:scale-95">Commit Protocol</button>
                </div>
            </div>
        </div>
    );
};

const FitnessCard = ({ 
    task, 
    onEditTask, 
    onToggleStatus, 
    onPlayVideo, 
    onDeleteTask,
    onDropReorder
}: { 
    task: Task, 
    onEditTask: (t: Task) => void, 
    onToggleStatus: (t: Task) => void, 
    onPlayVideo: (url: string, title: string) => void, 
    onDeleteTask: (id: string) => void,
    onDropReorder?: (draggedId: string, targetId: string, targetCategory: string) => void
}) => {
   const [dragCounter, setDragCounter] = useState(0);
   const embedId = getYoutubeEmbedId(task.videoUrl);
   const isDone = task.status === Status.DONE;
   return (
    <div 
        draggable
        onDragStart={(e) => { 
            e.dataTransfer.setData('text/plain', task.id); 
            e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnter={(e) => { 
            if (onDropReorder) {
                e.preventDefault(); 
                setDragCounter(prev => prev + 1);
            }
        }}
        onDragOver={(e) => { 
            if (onDropReorder) {
                e.preventDefault();
            }
        }}
        onDragLeave={() => {
            if (onDropReorder) setDragCounter(prev => prev - 1);
        }}
        onDrop={(e) => {
            if (onDropReorder) {
                e.preventDefault();
                e.stopPropagation();
                setDragCounter(0);
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId && draggedId !== task.id) {
                    onDropReorder(draggedId, task.id, task.category || FitnessCategory.DAILY);
                }
            }
        }}
        className={`group relative rounded-3xl p-4 shadow-sm border transition-all flex items-start gap-4 cursor-grab active:cursor-grabbing ${dragCounter > 0 ? 'border-app-purple-500 bg-app-purple-50 -translate-y-1' : 'border-app-border'} ${isDone ? 'bg-app-surface opacity-75 grayscale' : 'bg-white hover:border-app-purple-300 hover:shadow-lg'}`}
        onClick={() => onEditTask(task)}
    >
        <button 
            onClick={(e) => { e.stopPropagation(); onToggleStatus(task); }} 
            className={`mt-1 flex-shrink-0 transition-all z-10 ${isDone ? 'text-emerald-500' : 'text-app-muted hover:text-app-purple-500'}`}
        >
           {isDone ? <IconCheckCircle className="w-6 h-6" /> : <IconCircle className="w-6 h-6" />}
        </button>
        <div className="flex-1 min-w-0">
            <div className={`text-sm font-black tracking-tight break-words leading-tight mb-2 ${isDone ? 'text-app-muted line-through' : 'text-app-ink'}`}>{task.title}</div>
            <div className="flex items-center gap-2">
                {task.reps && <div className="bg-app-surface text-app-muted text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-widest border border-app-border">{task.reps}</div>}
                {task.isHomeWorkout && <div className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"><IconHome className="w-3.5 h-3.5" /></div>}
            </div>
        </div>
        <div className="flex items-center gap-1 self-center z-10">
            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if (embedId) onPlayVideo(task.videoUrl!, task.title); 
                    else window.open(task.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(task.title)}`, '_blank'); 
                }} 
                className="p-2 rounded-2xl text-app-purple-600 hover:bg-app-purple-50 transition-all border border-transparent hover:border-app-purple-100"
            >
                {embedId ? <IconPlay className="w-5 h-5" /> : <IconExternalLink className="w-5 h-5" />}
            </button>
            <button 
                onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    onDeleteTask(task.id); 
                }} 
                className="text-app-muted hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 rounded-2xl"
            >
                <IconTrash className="w-5 h-5" />
            </button>
        </div>
    </div>
   );
};

const FitnessColumn: React.FC<FitnessColumnProps> = ({ 
  title, category, tasks, onAddTask, onDeleteTask, onEditTask, onPlayVideo, onToggleStatus, onReorderTasks
}) => {
  const [dragCounter, setDragCounter] = useState(0);
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); setDragCounter(prev => prev + 1); };
  const handleDragLeave = () => setDragCounter(prev => prev - 1);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); 
    setDragCounter(0);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onReorderTasks(taskId, 'END', category);
  };
  return (
    <div 
      className={`flex flex-col w-full rounded-3xl transition-all p-2 ${dragCounter > 0 ? 'bg-app-purple-50/50' : 'bg-transparent'}`}
      onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      <div className="flex items-center gap-3 mb-5 px-3 pt-3 border-b border-app-border pb-4">
        <span className="text-[11px] font-black text-app-ink uppercase tracking-[0.2em]">{title}</span>
        <span className="text-[10px] font-black text-app-purple-700 bg-app-purple-50 px-2.5 py-1 rounded-full border border-app-purple-100">{tasks.length}</span>
        <div className="ml-auto flex gap-2">
            <button onClick={onAddTask} className="text-app-muted hover:text-app-purple-600 p-2 rounded-2xl hover:bg-white transition-all shadow-sm border border-transparent hover:border-app-border"><IconPlus className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="flex flex-col gap-3 pb-6 h-full min-h-[300px]">
        {tasks.map(task => (
            <FitnessCard 
                key={task.id} 
                task={task} 
                onEditTask={onEditTask} 
                onToggleStatus={onToggleStatus} 
                onPlayVideo={onPlayVideo} 
                onDeleteTask={onDeleteTask} 
                onDropReorder={onReorderTasks}
            />
        ))}
        <button onClick={onAddTask} className="flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest text-app-muted hover:text-app-purple-600 hover:bg-white p-4 rounded-3xl border-2 border-dashed border-app-border hover:border-app-purple-200 transition-all group active:scale-95">
          <IconPlus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          Append Protocol
        </button>
      </div>
    </div>
  );
};

const FitnessBoard: React.FC<FitnessBoardProps> = ({ tasks, onUpdateTask, onAddTask, onDeleteTask, onReorderTasks }) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [playingVideo, setPlayingVideo] = useState<{url: string, title: string} | null>(null);
  
  // Use display-friendly names for categories in columns
  const categories = [FitnessCategory.DAILY, FitnessCategory.ABS, FitnessCategory.GLUTES, FitnessCategory.SNOWBOARD, FitnessCategory.OTHERS];
  
  const completedTasks = tasks.filter(t => t.status === Status.DONE).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const handleLocalReorder = (draggedId: string, targetId: string | 'END', targetCategory: string) => {
      const draggedTask = tasks.find(t => t.id === draggedId);
      if (!draggedTask) return;

      const newTasks = [...tasks];
      const draggedIndex = newTasks.findIndex(t => t.id === draggedId);
      
      // Update being dragged with target category
      const updatedDraggedTask = { ...draggedTask, category: targetCategory };
      newTasks.splice(draggedIndex, 1);
      
      if (targetId === 'END') {
          // Push to the end of the specified category
          // First, find the index of the last task in that category
          let lastIdx = -1;
          for (let i = newTasks.length - 1; i >= 0; i--) {
            if (newTasks[i].category === targetCategory || (!newTasks[i].category && targetCategory === FitnessCategory.DAILY)) {
              lastIdx = i;
              break;
            }
          }
          
          if (lastIdx !== -1) {
            newTasks.splice(lastIdx + 1, 0, updatedDraggedTask);
          } else {
            // Category might be empty, just append
            newTasks.push(updatedDraggedTask);
          }
      } else {
          // Insert before targetId
          const newTargetIndex = newTasks.findIndex(t => t.id === targetId);
          newTasks.splice(newTargetIndex, 0, updatedDraggedTask);
      }

      onReorderTasks(newTasks);
  };
  
  const handleToggleStatus = (task: Task) => {
      const newStatus = task.status === Status.DONE ? Status.TODO : Status.DONE;
      let updates: Partial<Task> = { status: newStatus };
      const today = getLocalToday();
      if (newStatus === Status.DONE) {
        updates = getTaskCompletionUpdates(task, today);
      }
      onUpdateTask({ ...task, ...updates });
  };
  
  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto px-4 lg:px-0 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-12 bg-white rounded-[2.5rem] p-10 border border-app-border shadow-xl relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-app-purple-500/5 blur-[100px] rounded-full group-hover:bg-app-purple-500/10 transition-all duration-1000"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 relative z-10 gap-6">
                <div>
                  <h2 className="text-5xl font-black text-app-ink tracking-tight font-display mb-2">Physiology</h2>
                  <p className="text-app-muted font-black uppercase text-xs tracking-[0.3em]">Neural & musculoskeletal synchronization</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-app-muted mb-2">Active Completion</div>
                  <span className="text-5xl font-black text-app-ink font-display">{completedTasks}</span>
                  <span className="text-app-muted text-2xl font-black ml-2 opacity-30">/ {tasks.length}</span>
                </div>
            </div>
            <div className="w-full bg-app-surface rounded-full h-5 overflow-hidden p-1 border border-app-border shadow-inner relative z-10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="bg-app-purple-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(139,92,246,0.3)]" 
              />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-16">
            {categories.map(cat => (
                <FitnessColumn 
                    key={cat} 
                    title={cat === FitnessCategory.DAILY ? 'Daily Prime' : cat} 
                    category={cat} 
                    tasks={tasks.filter(t => t.category === cat || (!t.category && cat === FitnessCategory.DAILY))} 
                    onAddTask={() => onAddTask(cat)} 
                    onDeleteTask={onDeleteTask} 
                    onEditTask={setEditingTask} 
                    onPlayVideo={(url, title) => setPlayingVideo({ url, title })} 
                    onToggleStatus={handleToggleStatus} 
                    onReorderTasks={handleLocalReorder}
                />
            ))}
        </div>

        {/* 3-Day Workout Split Bar */}
        <div className="pb-32">
            <div className="bg-app-ink text-white rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-48 bg-app-purple-500/20 rounded-full blur-[120px] -mr-16 -mt-16 pointer-events-none group-hover:bg-app-purple-500/30 transition-all duration-1000"></div>
                <div className="flex justify-between items-center mb-12 relative z-10">
                  <h3 className="text-3xl font-black tracking-tight font-display flex items-center gap-4">
                      <IconDumbbell className="w-8 h-8 text-app-purple-400" />
                      Dynamic 3-Day Split
                  </h3>
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] text-app-purple-400/60 items-center gap-2 hidden md:flex">
                    <div className="w-2 h-2 rounded-full bg-app-purple-400 animate-pulse"></div>
                    Live Adaptive Training
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
                    {/* Day 1 */}
                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const taskId = e.dataTransfer.getData("text/plain");
                            if (taskId) handleLocalReorder(taskId, 'END', "Day 1");
                        }}
                        className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:border-app-purple-500/50 transition-all duration-500 group flex flex-col hover:shadow-2xl backdrop-blur-md"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-app-purple-400 transition-colors">Phase I</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-white/20 group-hover:bg-app-purple-500 shadow-[0_0_10px_rgba(139,92,246,0)] group-hover:shadow-[0_0_15px_rgba(139,92,246,0.6)] transition-all"></div>
                        </div>
                        <h4 className="text-2xl font-black text-white font-display mb-3">Post-Chain</h4>
                        <p className="text-xs text-white/50 leading-relaxed font-bold mb-8">Specialized glute development and musculoskeletal strengthening.</p>
                        <div className="space-y-4 flex flex-col flex-grow">
                            {tasks.filter(t => t.category === 'Day 1').map(task => (
                                <FitnessCard key={task.id} task={task} onEditTask={setEditingTask} onToggleStatus={handleToggleStatus} onPlayVideo={(url, title) => setPlayingVideo({ url, title })} onDeleteTask={onDeleteTask} onDropReorder={handleLocalReorder} />
                            ))}
                        </div>
                        <button onClick={() => onAddTask('Day 1')} className="mt-8 w-full py-4 border-2 border-dashed border-white/10 hover:border-app-purple-500/50 hover:bg-app-purple-500/10 text-white/40 hover:text-app-purple-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95">
                            <IconPlus className="w-5 h-5" /> Append Protocol
                        </button>
                    </div>
                    
                    {/* Day 2 */}
                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const taskId = e.dataTransfer.getData("text/plain");
                            if (taskId) handleLocalReorder(taskId, 'END', "Day 2");
                        }}
                        className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:border-cyan-500/50 transition-all duration-500 group flex flex-col hover:shadow-2xl backdrop-blur-md"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-cyan-400 transition-colors">Phase II</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-white/20 group-hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0)] group-hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all"></div>
                        </div>
                        <h4 className="text-2xl font-black text-white font-display mb-3">Core Load</h4>
                        <p className="text-xs text-white/50 leading-relaxed font-bold mb-8">High-intensity upper body and central nervous system stability.</p>
                        <div className="space-y-4 flex flex-col flex-grow">
                            {tasks.filter(t => t.category === 'Day 2').map(task => (
                                <FitnessCard key={task.id} task={task} onEditTask={setEditingTask} onToggleStatus={handleToggleStatus} onPlayVideo={(url, title) => setPlayingVideo({ url, title })} onDeleteTask={onDeleteTask} onDropReorder={handleLocalReorder} />
                            ))}
                        </div>
                        <button onClick={() => onAddTask('Day 2')} className="mt-8 w-full py-4 border-2 border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-white/40 hover:text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95">
                            <IconPlus className="w-5 h-5" /> Append Protocol
                        </button>
                    </div>

                    {/* Day 3 */}
                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const taskId = e.dataTransfer.getData("text/plain");
                            if (taskId) handleLocalReorder(taskId, 'END', "Day 3");
                        }}
                        className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:border-emerald-500/50 transition-all duration-500 group flex flex-col hover:shadow-2xl backdrop-blur-md"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-emerald-400 transition-colors">Phase III</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-white/20 group-hover:bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.6)] transition-all"></div>
                        </div>
                        <h4 className="text-2xl font-black text-white font-display mb-3">Ant-Prime</h4>
                        <p className="text-xs text-white/50 leading-relaxed font-bold mb-8">Anterior focus for quad explosive power and total metabolic drain.</p>
                        <div className="space-y-4 flex flex-col flex-grow">
                            {tasks.filter(t => t.category === 'Day 3').map(task => (
                                <FitnessCard key={task.id} task={task} onEditTask={setEditingTask} onToggleStatus={handleToggleStatus} onPlayVideo={(url, title) => setPlayingVideo({ url, title })} onDeleteTask={onDeleteTask} onDropReorder={handleLocalReorder} />
                            ))}
                        </div>
                        <button onClick={() => onAddTask('Day 3')} className="mt-8 w-full py-4 border-2 border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95">
                            <IconPlus className="w-5 h-5" /> Append Protocol
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {editingTask && <WorkoutModal task={editingTask} onClose={() => setEditingTask(null)} onSave={onUpdateTask} />}
        {playingVideo && <VideoPlayerModal url={playingVideo.url} title={playingVideo.title} onClose={() => setPlayingVideo(null)} />}
    </div>
  );
};
export default FitnessBoard;