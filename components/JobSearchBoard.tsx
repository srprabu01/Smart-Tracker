import React, { useState } from 'react';
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
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-[#202020] rounded-xl p-8 border border-[#333] mb-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <IconBriefcase className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Daily Job Tracker</h2>
            <p className="text-sm text-notion-muted">Log your daily applications to stay consistent.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end bg-[#2a2a2a] p-6 rounded-lg border border-[#333]">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-notion-muted uppercase mb-2 tracking-wider">Date</label>
            <div className="relative">
              <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-notion-muted" />
              <input 
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#444] rounded-md py-2 pl-10 pr-3 text-sm text-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-[10px] font-bold text-notion-muted uppercase mb-2 tracking-wider">Jobs Applied</label>
            <input 
              type="number"
              placeholder="e.g. 5"
              value={newCount}
              onChange={e => setNewCount(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded-md py-2 px-3 text-sm text-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button 
            onClick={handleAddLog}
            disabled={!newCount}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-md text-sm transition-all flex items-center justify-center gap-2"
          >
            <IconPlus className="w-4 h-4" /> Log Applications
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-notion-muted uppercase tracking-widest px-1">Application History</h3>
        {jobSearchTasks.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-dashed border-[#333]">
            <p className="text-notion-muted text-sm italic">No applications logged yet. Start your journey today!</p>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#252525] border-b border-[#333]">
                    <th className="py-4 px-6 text-[10px] font-bold text-notion-muted uppercase tracking-wider">Date</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-notion-muted uppercase tracking-wider">Count</th>
                    <th className="py-4 px-6 text-right text-[10px] font-bold text-notion-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333]">
                  {jobSearchTasks.map(task => (
                    <tr key={task.id} className="hover:bg-[#202020] transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                          <span className="text-sm font-medium text-white">
                            {new Date(task.nextDue + 'T00:00:00').toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {task.nextDue === today && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Today</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{task.jobCount || 0}</span>
                          <span className="text-xs text-notion-muted">applications</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => onDeleteTask(task.id)}
                          className="text-notion-muted hover:text-red-400 p-2 rounded-md hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-[#333]">
              {jobSearchTasks.map(task => (
                <div key={task.id} className="p-4 flex justify-between items-center bg-[#1a1a1a]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <span className="text-sm font-medium text-white">
                        {new Date(task.nextDue + 'T00:00:00').toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </span>
                      {task.nextDue === today && (
                        <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Today</span>
                      )}
                    </div>
                    <div className="text-xs text-notion-muted">
                      <span className="font-bold text-white pr-1">{task.jobCount || 0}</span> applications
                    </div>
                  </div>
                  <button 
                    onClick={() => onDeleteTask(task.id)}
                    className="text-notion-muted hover:text-red-400 p-2 rounded-md"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobSearchBoard;
