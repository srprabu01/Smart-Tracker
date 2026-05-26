import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Task, Status, Priority, Frequency } from '../types.ts';
import { TAG_STYLES, formatDate, getLocalToday, calculateNextDue } from './TaskTable.tsx';
import { IconTrash } from './Icons.tsx';
import { Activity } from 'lucide-react';

interface KanbanColumnProps {
  title: string; 
  status: Status; 
  tasks: Task[]; 
  colorClass: string;
  onAddTask: () => void;
  onDropTask: (taskId: string, status: Status) => void;
  onDeleteTask: (taskId: string) => void;
}

const KanbanColumn = ({ 
  title, 
  status, 
  tasks, 
  colorClass, 
  onDropTask,
  onDeleteTask
}: KanbanColumnProps) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDropTask(taskId, status);
    }
  };

  return (
    <div 
      className={`flex flex-col min-w-[320px] w-full rounded-3xl transition-all duration-300 p-2 ${isOver ? 'bg-app-purple-50/50 border-2 border-dashed border-app-purple-200 translate-y-[-4px]' : 'bg-transparent border-2 border-transparent'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-3 mb-6 px-4 pt-4 border-b border-app-border pb-6">
        <span className="text-[11px] font-black text-app-ink uppercase tracking-[0.2em]">{title}</span>
        <span className="text-[10px] font-black text-app-purple-700 bg-app-purple-50 px-2.5 py-1 rounded-full border border-app-purple-100 shadow-sm">{tasks.length}</span>
      </div>
      
      <div className="flex flex-col gap-4 pb-10 min-h-[600px] h-full">
        {tasks.map(task => (
          <motion.div 
            layoutId={task.id}
            key={task.id} 
            draggable
            onDragStart={(e: any) => {
              e.dataTransfer.setData('text/plain', task.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white border border-app-border rounded-[2rem] p-6 shadow-sm hover:border-app-purple-300 hover:shadow-xl transition-all cursor-grab active:cursor-grabbing hover:-translate-y-1 active:scale-[0.98]"
          >
             <button 
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  onDeleteTask(task.id); 
                }}
                className="absolute top-4 right-4 text-app-muted hover:text-rose-500 transition-all p-2 z-10 cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-2xl"
                title="Delete Node"
             >
                <IconTrash className="w-4 h-4" />
             </button>

             <div className={`text-sm font-black text-app-ink mb-4 break-words font-display tracking-tight leading-tight ${task.status === Status.DONE ? 'line-through text-app-muted opacity-50' : ''}`}>{task.title}</div>
             
             <div className="flex flex-wrap gap-2 mb-4">
                <span className={`${TAG_STYLES[task.frequency]} px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest`}>
                  {task.frequency}
                </span>
                <span className={`${TAG_STYLES[task.priority]} px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest`}>
                  {task.priority}
                </span>
             </div>

             {task.nextDue && (
               <div className="text-[10px] text-app-muted flex items-center gap-2 font-black uppercase tracking-widest border-t border-app-surface pt-4">
                 <div className="w-2 h-2 rounded-full bg-app-purple-500 shadow-sm shadow-app-purple-200"></div>
                 {formatDate(task.nextDue)}
               </div>
             )}
          </motion.div>
        ))}

        {tasks.length === 0 && !isOver && (
            <div className="flex-1 border-2 border-dashed border-app-border rounded-[2rem] flex flex-col items-center justify-center p-12 opacity-30 gap-4">
              <div className="w-16 h-16 rounded-[1.5rem] bg-app-surface border border-app-border flex items-center justify-center"><Activity className="w-6 h-6 text-app-muted" /></div>
              <div className="text-[10px] font-black text-app-muted uppercase tracking-[0.3em]">Queue Terminal Empty</div>
            </div>
        )}
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (status: Status) => void;
  onDeleteTask: (taskId: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onUpdateTask, onAddTask, onDeleteTask }) => {
  const tasksByStatus = {
    [Status.IN_PROGRESS]: tasks.filter(t => t.status === Status.IN_PROGRESS),
    [Status.TODO]: tasks.filter(t => t.status === Status.TODO),
    [Status.DONE]: tasks.filter(t => t.status === Status.DONE),
  };

  const handleDropTask = (taskId: string, newStatus: Status) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

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

  return (
    <div className="flex gap-8 overflow-x-auto pb-20 items-stretch min-h-[70vh]">
       <KanbanColumn 
          title="To-do" 
          status={Status.TODO} 
          tasks={tasksByStatus[Status.TODO]} 
          colorClass="text-gray-400"
          onAddTask={() => onAddTask(Status.TODO)}
          onDropTask={handleDropTask}
          onDeleteTask={onDeleteTask}
       />
       <KanbanColumn 
          title="In progress" 
          status={Status.IN_PROGRESS} 
          tasks={tasksByStatus[Status.IN_PROGRESS]} 
          colorClass="text-notion-blue"
          onAddTask={() => onAddTask(Status.IN_PROGRESS)}
          onDropTask={handleDropTask}
          onDeleteTask={onDeleteTask}
       />
       <KanbanColumn 
          title="Complete" 
          status={Status.DONE} 
          tasks={tasksByStatus[Status.DONE]} 
          colorClass="text-green-500"
          onAddTask={() => onAddTask(Status.DONE)}
          onDropTask={handleDropTask}
          onDeleteTask={onDeleteTask}
       />
    </div>
  );
};

export default KanbanBoard;