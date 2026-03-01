import React, { useState } from 'react';
import { Task, Status, Priority } from '../types';
import { IconPlus, IconTrash, IconBriefcase, IconLink, IconMapPin, IconDollarSign, IconFileText } from './Icons';
import { getLocalToday } from './TaskTable';

interface JobSearchBoardProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (status: Status) => void;
  onDeleteTask: (taskId: string) => void;
}

const JobSearchBoard: React.FC<JobSearchBoardProps> = ({ tasks, onUpdateTask, onAddTask, onDeleteTask }) => {
  const columns = [
    { title: 'Wishlist', status: Status.TODO },
    { title: 'Applied', status: Status.IN_PROGRESS },
    { title: 'Interviewing', status: Status.IN_PROGRESS }, // We'll use status + category or just status for simplicity
    { title: 'Offer/Done', status: Status.DONE },
  ];

  // For a more specialized job board, we might want custom statuses, 
  // but for now we'll map them to the existing Status enum to keep it compatible with the rest of the app.
  // We'll use the 'category' field to distinguish between 'Applied' and 'Interviewing' if they both use IN_PROGRESS.

  const getColumnTasks = (status: Status, title: string) => {
    return tasks.filter(t => {
      if (title === 'Interviewing') return t.status === Status.IN_PROGRESS && t.category === 'Interviewing';
      if (title === 'Applied') return t.status === Status.IN_PROGRESS && t.category !== 'Interviewing';
      return t.status === status;
    });
  };

  const handleDrop = (e: React.DragEvent, status: Status, title: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updates: Partial<Task> = { status };
      if (title === 'Interviewing') updates.category = 'Interviewing';
      else if (title === 'Applied') updates.category = 'Applied';
      else updates.category = undefined;
      onUpdateTask({ ...task, ...updates });
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide">
      {columns.map(col => (
        <div 
          key={col.title}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, col.status, col.title)}
          className="flex flex-col min-w-[300px] w-full max-w-[350px]"
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{col.title}</h3>
              <span className="text-xs text-notion-muted bg-notion-border/30 px-2 py-0.5 rounded-full">
                {getColumnTasks(col.status, col.title).length}
              </span>
            </div>
            <button 
              onClick={() => onAddTask(col.status)}
              className="text-notion-muted hover:text-white hover:bg-notion-hover p-1 rounded transition-colors"
            >
              <IconPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3 min-h-[500px]">
            {getColumnTasks(col.status, col.title).map(task => (
              <JobCard 
                key={task.id} 
                task={task} 
                onUpdate={onUpdateTask} 
                onDelete={() => onDeleteTask(task.id)} 
              />
            ))}
            <button 
              onClick={() => onAddTask(col.status)}
              className="flex items-center gap-2 text-notion-muted hover:text-notion-text hover:bg-notion-hover p-2 rounded text-sm transition-colors opacity-60 hover:opacity-100"
            >
              <IconPlus className="w-4 h-4" /> New
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

interface JobCardProps {
  key?: string | number;
  task: Task;
  onUpdate: (t: Task) => void;
  onDelete: () => void;
}

const JobCard = ({ task, onUpdate, onDelete }: JobCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="bg-notion-sidebar border border-blue-500/50 rounded-lg p-4 shadow-xl animate-in fade-in zoom-in duration-200">
        <input 
          autoFocus
          className="bg-transparent text-white font-bold text-sm w-full mb-2 outline-none border-b border-notion-border pb-1"
          value={task.title}
          onChange={e => onUpdate({ ...task, title: e.target.value })}
          placeholder="Job Title"
        />
        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-2 text-xs text-notion-muted">
            <IconBriefcase className="w-3 h-3" />
            <input 
              className="bg-transparent w-full outline-none hover:bg-notion-hover rounded px-1"
              value={task.company || ''}
              onChange={e => onUpdate({ ...task, company: e.target.value })}
              placeholder="Company"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-notion-muted">
            <IconMapPin className="w-3 h-3" />
            <input 
              className="bg-transparent w-full outline-none hover:bg-notion-hover rounded px-1"
              value={task.location || ''}
              onChange={e => onUpdate({ ...task, location: e.target.value })}
              placeholder="Location"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-notion-muted">
            <IconDollarSign className="w-3 h-3" />
            <input 
              className="bg-transparent w-full outline-none hover:bg-notion-hover rounded px-1"
              value={task.salary || ''}
              onChange={e => onUpdate({ ...task, salary: e.target.value })}
              placeholder="Salary/Range"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-notion-muted">
            <IconLink className="w-3 h-3" />
            <input 
              className="bg-transparent w-full outline-none hover:bg-notion-hover rounded px-1"
              value={task.link || ''}
              onChange={e => onUpdate({ ...task, link: e.target.value })}
              placeholder="Job Link"
            />
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <button onClick={onDelete} className="text-red-500/70 hover:text-red-500 text-[10px] font-bold uppercase">Delete</button>
          <button onClick={() => setIsEditing(false)} className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-bold uppercase">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', task.id)}
      onClick={() => setIsEditing(true)}
      className="bg-notion-sidebar border border-notion-border rounded-lg p-3 hover:border-notion-muted transition-all cursor-pointer group shadow-sm"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{task.title}</h4>
        <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
          task.priority === Priority.HIGH ? 'bg-red-500/10 text-red-500' :
          task.priority === Priority.MEDIUM ? 'bg-orange-500/10 text-orange-500' :
          'bg-blue-500/10 text-blue-500'
        }`}>
          {task.priority}
        </div>
      </div>

      {task.company && (
        <div className="flex items-center gap-2 text-xs text-notion-muted mb-1">
          <IconBriefcase className="w-3 h-3" />
          <span>{task.company}</span>
        </div>
      )}

      {(task.location || task.salary) && (
        <div className="flex gap-3 mt-2">
          {task.location && (
            <div className="flex items-center gap-1 text-[10px] text-notion-muted">
              <IconMapPin className="w-3 h-3" />
              <span>{task.location}</span>
            </div>
          )}
          {task.salary && (
            <div className="flex items-center gap-1 text-[10px] text-notion-muted">
              <IconDollarSign className="w-3 h-3" />
              <span>{task.salary}</span>
            </div>
          )}
        </div>
      )}

      {task.link && (
        <a 
          href={task.link} 
          target="_blank" 
          rel="noreferrer" 
          onClick={e => e.stopPropagation()}
          className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-400 hover:underline"
        >
          <IconLink className="w-3 h-3" /> View Listing
        </a>
      )}
    </div>
  );
};

export default JobSearchBoard;
