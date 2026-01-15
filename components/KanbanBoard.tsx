import React, { useState } from 'react';
import { Task, Status, Priority, Frequency } from '../types.ts';
import { TAG_STYLES, formatDate, getLocalToday, calculateNextDue } from './TaskTable.tsx';
import { IconTrash } from './Icons.tsx';

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
      className={`flex flex-col min-w-[280px] w-[300px] rounded-lg transition-colors duration-200 border-2 border-transparent ${isOver ? 'bg-[#252525] border-dashed border-notion-border' : 'bg-transparent'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 mb-3 px-2 pt-2 select-none">
        <span className={`text-sm font-semibold uppercase tracking-wider ${colorClass}`}>{title}</span>
        <span className="text-xs text-notion-muted font-medium bg-notion-hover px-1.5 rounded-full">{tasks.length}</span>
      </div>
      
      <div className="flex flex-col gap-3 pb-4 min-h-[500px] h-full">
        {tasks.map(task => (
          <div 
            key={task.id} 
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', task.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="group relative bg-[#202020] hover:bg-[#2c2c2c] rounded-md p-4 shadow-md border border-notion-border/40 hover:border-notion-border transition-all cursor-grab active:cursor-grabbing transform active:scale-[0.98]"
          >
             <button 
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  onDeleteTask(task.id); 
                }}
                className="absolute top-3 right-3 text-notion-muted hover:text-red-400 transition-opacity p-1 z-10 cursor-pointer opacity-0 group-hover:opacity-100 bg-[#202020]/80 rounded hover:bg-[#2a2a2a]"
                title="Delete task"
             >
                <IconTrash className="w-3.5 h-3.5" />
             </button>

             <div className="text-sm font-medium text-notion-text mb-3 break-words pr-6 leading-relaxed">{task.title}</div>
             
             <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${TAG_STYLES[task.frequency]}`}>
                  {task.frequency}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${TAG_STYLES[task.priority]}`}>
                  {task.priority}
                </span>
             </div>

             {task.nextDue && (
               <div className="text-[11px] text-notion-muted flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-notion-muted/30"></div>
                 {formatDate(task.nextDue)}
               </div>
             )}
          </div>
        ))}

        {tasks.length === 0 && !isOver && (
            <div className="flex-1 border-2 border-dashed border-notion-border/20 rounded-md flex items-center justify-center p-8 opacity-40">
                <div className="text-xs text-notion-muted">Drop tasks here</div>
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