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
    { title: 'Ideas', status: Status.TODO, icon: <IconLightbulb className="w-4 h-4 text-yellow-400" /> },
    { title: 'In Progress', status: Status.IN_PROGRESS, icon: <IconRotateCcw className="w-4 h-4 text-blue-400" /> },
    { title: 'Completed', status: Status.DONE, icon: <IconCheckCircle className="w-4 h-4 text-green-400" /> },
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 px-4 lg:px-0">
      {columns.map(col => (
        <div 
          key={col.title}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, col.status)}
          className="flex flex-col w-full bg-[#1a1a1a]/50 rounded-xl p-4 border border-[#333]"
        >
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#252525] rounded-lg border border-[#333]">
                {col.icon}
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{col.title}</h3>
              <span className="text-xs text-notion-muted bg-[#252525] px-2 py-0.5 rounded-full border border-[#333]">
                {getColumnTasks(col.status).length}
              </span>
            </div>
            <button 
              onClick={() => onAddTask({ status: col.status, isProject: true, title: '', priority: Priority.MEDIUM, frequency: Frequency.ONCE, nextDue: new Date().toISOString().split('T')[0] })}
              className="text-notion-muted hover:text-white hover:bg-[#333] p-1.5 rounded-lg transition-all"
            >
              <IconPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4 min-h-[600px]">
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
              className="flex items-center gap-2 text-notion-muted hover:text-notion-text hover:bg-[#252525] p-3 rounded-xl text-sm transition-all border border-dashed border-[#333] group"
            >
              <IconPlus className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
              <span className="font-medium">Add a project</span>
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
      <div className="bg-[#252525] border-2 border-blue-500/50 rounded-xl p-4 shadow-2xl animate-in fade-in zoom-in duration-200">
        <input 
          autoFocus
          className="bg-transparent text-white font-bold text-base w-full mb-4 outline-none border-b border-[#444] pb-2 focus:border-blue-500 transition-colors"
          value={task.title}
          onChange={e => onUpdate({ ...task, title: e.target.value })}
          placeholder="Project Title"
          onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
        />
        <div className="flex gap-2 mb-4">
          {Object.values(Priority).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onUpdate({ ...task, priority: p })}
              className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-tighter transition-all ${
                task.priority === p
                  ? p === Priority.HIGH ? 'bg-red-500 text-white' :
                    p === Priority.MEDIUM ? 'bg-orange-500 text-white' :
                    'bg-blue-500 text-white'
                  : 'bg-[#1a1a1a] text-notion-muted border border-[#444] hover:border-[#666]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <textarea 
          className="bg-[#1a1a1a] text-notion-muted text-sm w-full h-24 p-3 rounded-lg outline-none border border-[#444] focus:border-blue-500 transition-colors resize-none mb-4"
          value={task.notes || ''}
          onChange={e => onUpdate({ ...task, notes: e.target.value })}
          placeholder="Project description and notes..."
        />
        <div className="flex justify-between items-center">
          <button 
            onClick={onDelete} 
            className="text-red-500/70 hover:text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
          >
            Delete
          </button>
          <button 
            onClick={() => setIsEditing(false)} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20"
          >
            Save
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
      className="bg-[#252525] border border-[#333] rounded-xl p-4 hover:border-[#555] transition-all cursor-pointer group shadow-sm hover:shadow-md relative"
    >
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <IconGripVertical className="w-4 h-4 text-notion-muted" />
      </div>
      <div className="pl-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">{task.title || 'Untitled Project'}</h4>
          <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
            task.priority === Priority.HIGH ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
            task.priority === Priority.MEDIUM ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
            'bg-blue-500/10 text-blue-500 border border-blue-500/20'
          }`}>
            {task.priority}
          </div>
        </div>
        
        {task.notes ? (
          <p className="text-xs text-notion-muted line-clamp-3 mb-3 leading-relaxed">
            {task.notes}
          </p>
        ) : (
          <p className="text-xs text-notion-muted italic mb-3 opacity-50">No description added yet...</p>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#333]">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] text-notion-muted font-medium uppercase tracking-widest">
              {task.status === Status.TODO ? 'Idea' : task.status === Status.IN_PROGRESS ? 'In Progress' : 'Done'}
            </span>
          </div>
          <span className="text-[10px] text-notion-muted opacity-50">
            {new Date(task.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectsBoard;
