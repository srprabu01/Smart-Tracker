import React from 'react';
import { Task, Status, Priority, Frequency } from '../types';
import { IconPlus, IconTrash, IconHeart, IconRotateCcw, IconCheckCircle, IconLink } from './Icons';

interface BucketlistBoardProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const BucketlistBoard: React.FC<BucketlistBoardProps> = ({ tasks, onUpdateTask, onAddTask, onDeleteTask }) => {
  const columns = [
    { title: 'Dreaming', status: Status.TODO, icon: <IconHeart className="w-5 h-5 text-rose-500" /> },
    { title: 'In Pursuit', status: Status.IN_PROGRESS, icon: <IconRotateCcw className="w-5 h-5 text-amber-500" /> },
    { title: 'Conquered', status: Status.DONE, icon: <IconCheckCircle className="w-5 h-5 text-emerald-500" /> },
  ];

  const getColumnTasks = (status: Status) => {
    return tasks.filter(t => t.isBucketlist && t.status === status);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== status) {
      onUpdateTask({ ...task, status });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-32 px-2">
      {columns.map(col => (
        <div 
          key={col.title}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, col.status)}
          className="flex flex-col w-full"
        >
          <div className="flex items-center justify-between mb-8 px-6 py-5 bg-white border border-app-border rounded-3xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-100">
                {col.icon}
              </div>
              <h3 className="text-[11px] font-black text-app-ink uppercase tracking-[0.25em]">{col.title}</h3>
              <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                {getColumnTasks(col.status).length}
              </span>
            </div>
            <button 
              onClick={() => onAddTask({ status: col.status, isBucketlist: true, title: '', priority: Priority.MEDIUM, frequency: Frequency.ONCE, nextDue: new Date().toISOString().split('T')[0] })}
              className="text-app-muted hover:text-rose-600 hover:bg-rose-50 p-2.5 rounded-2xl transition-all border border-transparent hover:border-rose-100"
            >
              <IconPlus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-6 min-h-[600px]">
            {getColumnTasks(col.status).map(task => (
              <BucketItemCard 
                key={task.id} 
                task={task} 
                onUpdate={onUpdateTask} 
                onDelete={() => onDeleteTask(task.id)}
                onDragStart={(e) => handleDragStart(e, task.id)}
              />
            ))}
            <button 
              onClick={() => onAddTask({ status: col.status, isBucketlist: true, title: '', priority: Priority.MEDIUM, frequency: Frequency.ONCE, nextDue: new Date().toISOString().split('T')[0] })}
              className="group flex flex-col items-center justify-center gap-4 p-10 rounded-[2.5rem] border-2 border-dashed border-app-border text-app-muted hover:text-rose-600 hover:border-rose-200 hover:bg-white transition-all shadow-sm font-black uppercase text-[10px] tracking-[0.3em]"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <IconPlus className="w-6 h-6 text-rose-500" /> 
              </div>
              Add Life Goal
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const BucketItemCard = ({ task, onUpdate, onDelete, onDragStart }: { task: Task, onUpdate: (t: Task) => void, onDelete: () => void, onDragStart: (e: React.DragEvent) => void }) => {
  const [isEditing, setIsEditing] = React.useState(task.title === '');

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-rose-500 rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <input 
          autoFocus
          className="bg-transparent text-app-ink font-black text-xl w-full mb-6 outline-none border-b-2 border-app-surface pb-3 focus:border-rose-500 transition-all font-display tracking-tight"
          value={task.title}
          onChange={e => onUpdate({ ...task, title: e.target.value })}
          placeholder="What's the dream?"
          onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
        />
        <textarea 
          className="bg-app-surface text-app-ink text-sm w-full h-32 p-4 rounded-3xl outline-none border border-app-border focus:border-rose-500 transition-all resize-none mb-4 font-medium"
          value={task.notes || ''}
          onChange={e => onUpdate({ ...task, notes: e.target.value })}
          placeholder="Add some details about this life goal..."
        />
        <div className="flex items-center gap-3 bg-app-surface p-3 rounded-2xl border border-app-border mb-6">
          <IconLink className="w-4 h-4 text-app-muted" />
          <input 
            className="bg-transparent text-xs text-app-ink w-full outline-none font-medium"
            value={task.link || ''}
            onChange={e => onUpdate({ ...task, link: e.target.value })}
            placeholder="Reference URL (e.g. flight booking, blog post...)"
          />
        </div>
        <div className="flex justify-between items-center gap-4">
          <button 
            onClick={onDelete} 
            className="text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 px-6 py-3 rounded-2xl transition-all border border-transparent hover:border-rose-100"
          >
            Remove
          </button>
          <button 
            onClick={() => setIsEditing(false)} 
            className="bg-app-ink hover:bg-rose-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl hover:shadow-rose-200"
          >
            Save Goal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onClick={() => setIsEditing(true)}
      className="bg-white border border-app-border rounded-[2.5rem] p-8 hover:border-rose-300 transition-all cursor-pointer group shadow-sm hover:shadow-2xl relative overflow-hidden active:scale-95"
    >
      <div className="absolute left-0 top-0 w-2 h-full bg-rose-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
        {task.link && (
          <a 
            href={task.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={(e) => e.stopPropagation()}
            className="p-2 bg-app-surface rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100"
            title="Open Reference URL"
          >
            <IconLink className="w-4 h-4" />
          </a>
        )}
        <button 
          className="p-2 bg-app-surface rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100" 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <IconTrash className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="text-[17px] font-black text-app-ink group-hover:text-rose-600 transition-colors line-clamp-2 font-display tracking-tight leading-tight">{task.title || 'NEW DREAM'}</h4>
        
        {task.notes && (
          <p className="text-sm text-app-muted line-clamp-3 leading-relaxed font-medium pt-2 border-t border-app-surface">
            {task.notes}
          </p>
        )}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-app-surface">
          <div className="flex items-center gap-3">
            <IconHeart className={`w-4 h-4 ${task.status === Status.DONE ? 'text-emerald-500 fill-emerald-500' : 'text-rose-500'}`} />
            <span className="text-[10px] text-app-ink font-black uppercase tracking-widest">
              {task.status === Status.TODO ? 'Staged' : task.status === Status.IN_PROGRESS ? 'Pursuing' : 'Conquered'}
            </span>
          </div>
          {task.link && (
            <div className="flex items-center gap-1.5 text-app-muted">
              <IconLink className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Link Added</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BucketlistBoard;
