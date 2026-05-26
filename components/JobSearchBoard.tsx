import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Task, Status, Priority, Frequency } from '../types';
import { IconPlus, IconTrash, IconBriefcase, IconCalendar, IconCheckCircle } from './Icons';
import { getLocalToday } from './TaskTable';

interface JobSearchBoardProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const JobSearchBoard: React.FC<JobSearchBoardProps> = ({ tasks, onUpdateTask, onAddTask, onDeleteTask }) => {
  const today = getLocalToday();
  const [newCount, setNewCount] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Filter and sort job search tasks by date (descending)
  const jobSearchTasks = [...tasks]
    .filter(t => t.isJobSearch)
    .sort((a, b) => (b.nextDue || '').localeCompare(a.nextDue || ''));

  const handleAddLog = () => {
    const count = parseInt(newCount);
    if (isNaN(count)) return;

    // Check if we already have a log for this date
    const existing = jobSearchTasks.find(t => t.nextDue === selectedDate);
    if (existing) {
      onUpdateTask({ ...existing, jobCount: (existing.jobCount || 0) + count });
    } else {
      onAddTask({
        title: `Applied to ${count} jobs`,
        jobCount: count,
        nextDue: selectedDate,
        status: Status.DONE,
        priority: Priority.MEDIUM,
        frequency: Frequency.ONCE,
        isJobSearch: true,
      });
    }
    setNewCount('');
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-2 pb-40">
      <div className="bg-white rounded-[3rem] p-10 border border-app-border mb-12 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-app-purple-50 rounded-[1.5rem] border border-app-purple-100 shadow-sm">
              <IconBriefcase className="w-8 h-8 text-app-purple-600" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-app-ink tracking-tight font-display">Carrier Terminal</h2>
              <p className="text-app-muted text-[11px] font-black uppercase tracking-[0.2em] mt-1">Application velocity & consistency mapping</p>
            </div>
          </div>
          <div className="flex bg-app-surface p-1 rounded-2xl border border-app-border">
             <div className="px-6 py-2.5 text-[10px] font-black text-app-purple-700 uppercase tracking-widest bg-white rounded-xl shadow-sm border border-app-purple-100">Active Pipeline</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-app-surface p-8 rounded-[2.5rem] border border-app-border shadow-inner">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-app-muted uppercase tracking-[0.3em] ml-2">Temporal Marker</label>
            <div className="relative group">
              <IconCalendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-app-muted group-focus-within:text-app-purple-500 transition-colors" />
              <input 
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-app-border rounded-2xl py-3.5 pl-12 pr-4 text-sm text-app-ink font-black focus:border-app-purple-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-app-muted uppercase tracking-[0.3em] ml-2">Node Quantity</label>
            <input 
              type="number"
              placeholder="0"
              value={newCount}
              onChange={e => setNewCount(e.target.value)}
              className="w-full bg-white border border-app-border rounded-2xl py-3.5 px-6 text-sm text-app-ink font-black focus:border-app-purple-500 outline-none transition-all shadow-sm placeholder:text-app-muted/30"
            />
          </div>
          <button 
            onClick={handleAddLog}
            disabled={!newCount}
            className="w-full bg-app-ink hover:bg-app-purple-600 disabled:opacity-30 disabled:grayscale text-white font-black py-4 px-8 rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-app-purple-200"
          >
            <IconPlus className="w-5 h-5" /> Execute Log
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between px-6">
           <h3 className="text-[11px] font-black text-app-ink uppercase tracking-[0.4em]">Protocol History</h3>
           <div className="h-px bg-app-border flex-1 mx-8 opacity-50"></div>
           <span className="text-[10px] font-black text-app-muted uppercase tracking-widest">{jobSearchTasks.length} Iterations</span>
        </div>

        {jobSearchTasks.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-app-border">
            <div className="w-20 h-20 bg-app-surface rounded-3xl flex items-center justify-center mx-auto mb-6">
               <IconBriefcase className="w-8 h-8 text-app-muted" />
            </div>
            <p className="text-app-muted text-sm font-black uppercase tracking-[0.2em]">No Carrier Data Visualized</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {jobSearchTasks.map(task => (
              <motion.div 
                layoutId={task.id}
                key={task.id} 
                className="bg-white rounded-[2.5rem] p-8 border border-app-border hover:border-app-purple-300 transition-all group shadow-sm hover:shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-6"
              >
                <div className="flex items-center gap-6 w-full">
                  <div className="p-4 bg-app-surface rounded-2xl border border-app-border group-hover:bg-app-purple-50 group-hover:border-app-purple-100 transition-colors">
                     <IconCheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                       <span className="text-lg font-black text-app-ink font-display tracking-tight leading-tight">
                         {new Date(task.nextDue + 'T00:00:00').toLocaleDateString('en-US', { 
                           weekday: 'long', 
                           month: 'long', 
                           day: 'numeric'
                         })}
                       </span>
                       {task.nextDue === today && (
                         <span className="text-[9px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg font-black uppercase tracking-widest border border-emerald-100">Live</span>
                       )}
                    </div>
                    <div className="text-[10px] font-black text-app-muted uppercase tracking-widest flex items-center gap-2">
                       Temporal Node <span className="text-app-purple-600">#{task.id.slice(0, 4)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-app-surface pt-6 sm:pt-0">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-app-ink tabular-nums tracking-tighter">{task.jobCount || 0}</span>
                      <div className="text-[10px] font-black text-app-muted uppercase tracking-widest leading-none text-right">Applied<br/>Protocols</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDeleteTask(task.id)}
                    className="p-3 text-app-muted hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                  >
                    <IconTrash className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobSearchBoard;
