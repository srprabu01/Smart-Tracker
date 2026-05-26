import React from 'react';
import { Task, Status, Priority, Frequency } from '../types';
import { IconPlus, IconTrash, IconLightbulb, IconRotateCcw, IconCheckCircle, IconGripVertical } from './Icons';

interface ProjectsBoardProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const ProjectsBoard: React.FC<ProjectsBoardProps> = ({ tasks, onUpdateTask, onAddTask, onDeleteTask }) => {
  const columns = [
    { title: 'Protocols', status: Status.TODO, icon: <IconLightbulb className="w-5 h-5 text-app-purple-500" /> },
    { title: 'In Execution', status: Status.IN_PROGRESS, icon: <IconRotateCcw className="w-5 h-5 text-amber-500" /> },
    { title: 'Archive', status: Status.DONE, icon: <IconCheckCircle className="w-5 h-5 text-emerald-500" /> },
  ];

  const getColumnTasks = (status: Status) => {
    return tasks.filter(t => t.isProject && t.status === status);
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-32 px-2 scroll-smooth">
      {columns.map(col => (
        <div 
          key={col.title}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, col.status)}
          className="flex flex-col w-full bg-transparent"
        >
          <div className="flex items-center justify-between mb-8 px-6 py-5 bg-white border border-app-border rounded-3xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-app-surface rounded-2xl border border-app-border shadow-inner">
                {col.icon}
              </div>
              <h3 className="text-[11px] font-black text-app-ink uppercase tracking-[0.25em]">{col.title}</h3>
              <span className="text-[10px] font-black text-app-purple-700 bg-app-purple-50 px-3 py-1 rounded-full border border-app-purple-100 shadow-sm">
                {getColumnTasks(col.status).length}
              </span>
            </div>
            <button 
              onClick={() => onAddTask({ status: col.status, isProject: true, title: '', priority: Priority.MEDIUM, frequency: Frequency.ONCE, nextDue: new Date().toISOString().split('T')[0] })}
              className="text-app-muted hover:text-app-purple-600 hover:bg-app-purple-50 p-2.5 rounded-2xl transition-all border border-transparent hover:border-app-purple-100"
            >
              <IconPlus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-6 min-h-[600px] h-full">
            {getColumnTasks(col.status).map(task => (
              <ProjectCard 
                key={task.id} 
                task={task} 
                onUpdate={onUpdateTask} 
                onDelete={() => onDeleteTask(task.id)}
                onDragStart={(e) => handleDragStart(e, task.id)}
              />
            ))}
            <button 
              onClick={() => onAddTask({ status: col.status, isProject: true, title: '', priority: Priority.MEDIUM, frequency: Frequency.ONCE, nextDue: new Date().toISOString().split('T')[0] })}
              className="group flex flex-col items-center justify-center gap-4 p-10 rounded-[2.5rem] border-2 border-dashed border-app-border text-app-muted hover:text-app-purple-600 hover:border-app-purple-200 hover:bg-white transition-all shadow-sm hover:shadow-xl font-black uppercase text-[10px] tracking-[0.3em]"
            >
              <div className="w-12 h-12 rounded-2xl bg-app-surface flex items-center justify-center group-hover:scale-110 transition-transform">
                <IconPlus className="w-6 h-6" /> 
              </div>
              Initialize Node
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProjectCard = ({ task, onUpdate, onDelete, onDragStart }: { key?: string | number, task: Task, onUpdate: (t: Task) => void, onDelete: () => void, onDragStart: (e: React.DragEvent) => void }) => {
  const [isEditing, setIsEditing] = React.useState(task.title === '');

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-app-purple-500 rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 z-10">
        <input 
          autoFocus
          className="bg-transparent text-app-ink font-black text-xl w-full mb-6 outline-none border-b-2 border-app-surface pb-3 focus:border-app-purple-500 transition-all font-display tracking-tight"
          value={task.title}
          onChange={e => onUpdate({ ...task, title: e.target.value })}
          placeholder="NODE IDENTIFIER"
          onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
          onClick={e => e.stopPropagation()}
        />
        <div className="flex flex-wrap gap-2.5 mb-6" onClick={e => e.stopPropagation()}>
          {Object.values(Priority).map((p) => (
            <button
              key={p}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ ...task, priority: p });
              }}
              className={`text-[10px] px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-sm ${
                task.priority === p
                  ? 'bg-app-purple-600 text-white border border-app-purple-700'
                  : 'bg-app-surface text-app-muted border border-app-border hover:bg-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <textarea 
          className="bg-app-surface text-app-ink text-sm w-full h-32 p-4 rounded-3xl outline-none border border-app-border focus:border-app-purple-500 transition-all resize-none mb-6 font-medium leading-relaxed"
          value={task.notes || ''}
          onChange={e => onUpdate({ ...task, notes: e.target.value })}
          placeholder="System logs and detailed project nodes..."
          onClick={e => e.stopPropagation()}
        />
        <div className="flex justify-between items-center gap-4" onClick={e => e.stopPropagation()}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }} 
            className="text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 px-6 py-3 rounded-2xl transition-all border border-transparent hover:border-rose-100"
          >
            Purge
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(false);
            }} 
            className="bg-app-ink hover:bg-app-purple-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl hover:shadow-app-purple-200"
          >
            Synchronize
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
      className="bg-white border border-app-border rounded-[2.5rem] p-8 hover:border-app-purple-300 transition-all cursor-pointer group shadow-sm hover:shadow-2xl relative overflow-hidden active:scale-95"
    >
      <div className="absolute left-0 top-0 w-2 h-full bg-app-purple-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all p-2 bg-app-surface rounded-xl hover:bg-rose-50 hover:text-rose-500" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        <IconTrash className="w-4 h-4" />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 pr-6">
            <h4 className="text-[17px] font-black text-app-ink group-hover:text-app-purple-600 transition-colors line-clamp-2 font-display tracking-tight leading-tight">{task.title || 'UNINITIALIZED NODE'}</h4>
            <div className="text-[9px] font-black text-app-muted uppercase tracking-[0.2em]">Execution Cluster</div>
          </div>
          <div className={`text-[9px] px-3 py-1.5 rounded-xl font-black uppercase tracking-widest border ${
            task.priority === Priority.HIGH ? 'bg-rose-50 text-rose-600 border-rose-100' :
            task.priority === Priority.MEDIUM ? 'bg-amber-50 text-amber-600 border-amber-100' :
            'bg-app-purple-50 text-app-purple-600 border-app-purple-100'
          }`}>
            {task.priority}
          </div>
        </div>
        
        {task.notes ? (
          <p className="text-sm text-app-muted line-clamp-3 leading-relaxed font-medium pt-2 border-t border-app-surface">
            {task.notes}
          </p>
        ) : (
          <p className="text-xs text-app-muted italic opacity-40 font-medium">No auxiliary data logged...</p>
        )}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-app-surface">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-app-purple-500 shadow-sm shadow-app-purple-200" />
            <span className="text-[10px] text-app-ink font-black uppercase tracking-widest">
              {task.status === Status.TODO ? 'Staging' : task.status === Status.IN_PROGRESS ? 'Active' : 'Archived'}
            </span>
          </div>
          <span className="text-[10px] text-app-muted font-black uppercase tracking-widest tabular-nums bg-app-surface px-2.5 py-1 rounded-lg">
            {new Date(task.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectsBoard;
