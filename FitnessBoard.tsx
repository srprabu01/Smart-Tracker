import React, { useState } from 'react';
import { Task, Status, Priority, Frequency, FitnessCategory } from '../types.ts';
import { TAG_STYLES, formatDate, getLocalToday, calculateNextDue } from './TaskTable.tsx';
import { IconPlus, IconTrash, IconX, IconDumbbell, IconCircle, IconCheckCircle } from './Icons.tsx';

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
}

interface FitnessColumnProps {
  title: string;
  category: string;
  tasks: Task[];
  onAddTask: () => void;
  onDropTask: (taskId: string, category: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onPlayVideo: (url: string, title: string) => void;
  onToggleStatus: (task: Task) => void;
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
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-black w-full max-w-5xl aspect-video rounded-xl shadow-2xl overflow-hidden relative flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none z-10">
                    <h3 className="text-white font-medium text-lg drop-shadow-md">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 pointer-events-auto transition-colors backdrop-blur-sm"
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
                        <p>Video cannot be embedded.</p>
                        <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline mt-2">Open in new tab</a>
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

    const handleSave = () => {
        onSave({
            ...task,
            title,
            reps,
            videoUrl,
            isHomeWorkout: isHome
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-[#202020] border border-[#373737] rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[#373737]">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <IconDumbbell className="w-5 h-5 text-blue-400" />
                        Edit Workout
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><IconX className="w-5 h-5" /></button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Exercise Name</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#191919] border border-[#373737] rounded p-2 text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Reps / Duration</label>
                            <input type="text" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="e.g. 3x12" className="w-full bg-[#191919] border border-[#373737] rounded p-2 text-white focus:border-blue-500 outline-none" />
                        </div>
                        <div className="flex items-end pb-2">
                             <label className="flex items-center gap-2 cursor-pointer group select-none">
                                <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${isHome ? 'bg-green-600 border-green-600' : 'border-gray-500 group-hover:border-white'}`}>{isHome && <span className="text-white text-xs">✓</span>}</div>
                                <input type="checkbox" checked={isHome} onChange={(e) => setIsHome(e.target.checked)} className="hidden" />
                                <span className="text-sm text-gray-300 group-hover:text-white">Home Workout</span>
                             </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Video Tutorial URL</label>
                        <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-[#191919] border border-[#373737] rounded p-2 text-white focus:border-blue-500 outline-none text-sm" />
                    </div>
                </div>
                <div className="p-4 border-t border-[#373737] flex justify-end gap-2 bg-[#252525]">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded font-medium">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const FitnessColumn: React.FC<FitnessColumnProps> = ({ 
  title, category, tasks, onAddTask, onDropTask, onDeleteTask, onEditTask, onPlayVideo, onToggleStatus
}) => {
  const [isOver, setIsOver] = useState(false);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsOver(true); };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onDropTask(taskId, category);
  };
  return (
    <div 
      className={`flex flex-col min-w-[280px] w-full max-w-[400px] rounded-md transition-colors ${isOver ? 'bg-[#252525]' : ''}`}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 mb-3 px-1 pt-2 border-b border-[#373737] pb-2">
        <span className="text-sm font-semibold text-notion-text uppercase tracking-wide">{title}</span>
        <span className="text-xs text-gray-500 bg-[#2c2c2c] px-1.5 rounded-full">{tasks.length}</span>
        <div className="ml-auto flex gap-1">
            <button onClick={onAddTask} className="text-gray-500 hover:text-gray-300 p-1 rounded hover:bg-[#2c2c2c]"><IconPlus className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex flex-col gap-2 pb-4 h-full min-h-[200px]">
        {tasks.map(task => {
           const embedId = getYoutubeEmbedId(task.videoUrl);
           const isDone = task.status === Status.DONE;
           return (
            <div 
                key={task.id} draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', task.id); }}
                className={`group relative rounded-md p-3 shadow-sm border border-transparent hover:border-gray-600 transition-all flex items-start gap-3 ${isDone ? 'bg-[#1c2e24] opacity-75' : 'bg-[#202020] hover:bg-[#2c2c2c]'}`}
            >
                <button onClick={() => onToggleStatus(task)} className={`mt-1 flex-shrink-0 transition-all ${isDone ? 'text-green-500' : 'text-gray-500 hover:text-gray-300'}`}>
                   {isDone ? <IconCheckCircle className="w-5 h-5" /> : <IconCircle className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEditTask(task)}>
                    <div className={`text-sm font-medium break-words leading-tight mb-1.5 ${isDone ? 'text-gray-400 line-through' : 'text-notion-text'}`}>{task.title}</div>
                    <div className="flex items-center gap-2">
                        {task.reps && <div className="bg-[#333] text-gray-300 text-[10px] px-1.5 py-0.5 rounded font-mono border border-[#444]">{task.reps}</div>}
                        {task.isHomeWorkout && <div className="text-green-400 bg-green-900/30 px-1 rounded border border-green-900/50"><IconHome className="w-3 h-3" /></div>}
                    </div>
                </div>
                <div className="flex items-center gap-1 self-center">
                    <button onClick={(e) => { e.stopPropagation(); if (embedId) onPlayVideo(task.videoUrl!, task.title); else window.open(task.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(task.title)}`, '_blank'); }} className="p-1.5 rounded text-blue-400 hover:bg-blue-900/30">{embedId ? <IconPlay className="w-4 h-4" /> : <IconExternalLink className="w-4 h-4" />}</button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteTask(task.id); }} className="text-gray-600 hover:text-red-400 p-1.5 opacity-0 group-hover:opacity-100"><IconTrash className="w-4 h-4" /></button>
                </div>
            </div>
           );
        })}
        <button onClick={onAddTask} className="flex items-center gap-2 text-gray-500 hover:bg-[#2c2c2c] p-2 rounded text-sm mt-1 opacity-50 hover:opacity-100"><IconPlus className="w-4 h-4" />Add workout</button>
      </div>
    </div>
  );
};

const FitnessBoard: React.FC<FitnessBoardProps> = ({ tasks, onUpdateTask, onAddTask, onDeleteTask }) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [playingVideo, setPlayingVideo] = useState<{url: string, title: string} | null>(null);
  
  // Use display-friendly names for categories in columns
  const categories = [FitnessCategory.DAILY, FitnessCategory.ABS, FitnessCategory.GLUTES, FitnessCategory.SNOWBOARD];
  
  const completedTasks = tasks.filter(t => t.status === Status.DONE).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  
  const handleDropTask = (taskId: string, newCategory: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    onUpdateTask({ ...task, category: newCategory });
  };
  
  const handleToggleStatus = (task: Task) => {
      const newStatus = task.status === Status.DONE ? Status.TODO : Status.DONE;
      const updates: Partial<Task> = { status: newStatus };
      const today = getLocalToday();
      if (newStatus === Status.DONE) {
        if (task.lastCompleted !== today) { updates.streak = (task.streak || 0) + 1; updates.lastCompleted = today; }
        if (task.frequency !== Frequency.ONCE) updates.nextDue = calculateNextDue(task.frequency, today);
      }
      onUpdateTask({ ...task, ...updates });
  };
  
  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">
        <div className="mb-8 bg-[#202020] rounded-xl p-6 border border-[#333]">
            <div className="flex justify-between items-end mb-2">
                <div><h2 className="text-xl font-bold text-white">Fitness Progress</h2></div>
                <div><span className="text-3xl font-bold text-white">{completedTasks}</span><span className="text-gray-500 text-lg"> / {tasks.length}</span></div>
            </div>
            <div className="w-full bg-[#333] rounded-full h-3 overflow-hidden"><div className="bg-gradient-to-r from-blue-600 to-cyan-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
        </div>
        <div className="flex flex-col lg:flex-row gap-6 items-start pb-10 overflow-x-auto">
            {categories.map(cat => (
                <FitnessColumn key={cat} title={cat === FitnessCategory.DAILY ? 'Daily' : cat} category={cat} tasks={tasks.filter(t => t.category === cat)} onAddTask={() => onAddTask(cat)} onDropTask={handleDropTask} onDeleteTask={onDeleteTask} onEditTask={setEditingTask} onPlayVideo={(url, title) => setPlayingVideo({ url, title })} onToggleStatus={handleToggleStatus} />
            ))}
        </div>
        {editingTask && <WorkoutModal task={editingTask} onClose={() => setEditingTask(null)} onSave={onUpdateTask} />}
        {playingVideo && <VideoPlayerModal url={playingVideo.url} title={playingVideo.title} onClose={() => setPlayingVideo(null)} />}
    </div>
  );
};
export default FitnessBoard;