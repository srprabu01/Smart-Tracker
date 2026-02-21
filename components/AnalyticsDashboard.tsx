import React, { useState, useMemo } from 'react';
import { Task, Status, Priority, FitnessCategory } from '../types';
import { IconCheckSquare, IconDumbbell, IconCalendar, IconCheckCircle, IconBarChart, IconSparkles } from './Icons';
import { getLocalToday } from './TaskTable';

interface AnalyticsDashboardProps {
  tasks: Task[];
}

const StatCard = ({ title, value, subtitle, icon, color }: { title: string, value: string | number, subtitle?: string, icon: React.ReactNode, color: string }) => (
  <div className="bg-[#202020] border border-[#373737] rounded-lg p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-[#555] transition-all">
     <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${color}`}></div>
     <div className="flex justify-between items-start z-10">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-md bg-[#2a2a2a] text-gray-300 group-hover:scale-110 transition-transform`}>{icon}</div>
     </div>
     <div className="z-10">
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        {subtitle && <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">{subtitle}</div>}
     </div>
  </div>
);

const ConsistencyHeatmap = ({ tasks }: { tasks: Task[] }) => {
    const days = 30;
    const heatmapData = useMemo(() => {
        const result = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = tasks.filter(t => t.lastCompleted === dateStr).length;
            result.push({ dateStr, count });
        }
        return result;
    }, [tasks]);

    return (
        <div className="bg-[#202020] border border-[#373737] rounded-xl p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <IconCalendar className="w-4 h-4 text-notion-muted" />
                30-Day Consistency
            </h3>
            <div className="flex flex-wrap gap-2">
                {heatmapData.map((d, i) => {
                    let color = 'bg-[#2a2a2a]';
                    if (d.count > 0) color = 'bg-blue-900';
                    if (d.count > 2) color = 'bg-blue-700';
                    if (d.count > 4) color = 'bg-blue-500';
                    if (d.count > 6) color = 'bg-blue-400';

                    return (
                        <div 
                            key={i} 
                            className={`w-4 h-4 rounded-sm ${color} transition-all hover:scale-110 cursor-pointer`}
                            title={`${d.dateStr}: ${d.count} tasks`}
                        />
                    );
                })}
            </div>
            <div className="flex justify-between mt-4 text-[10px] text-gray-500 uppercase font-bold">
                <span>30 Days Ago</span>
                <span>Today</span>
            </div>
        </div>
    );
};

const ActivityTrendChart = ({ tasks }: { tasks: Task[] }) => {
    const [range, setRange] = useState<'7d' | '30d'>('7d');

    const chartData = useMemo(() => {
        const days = [];
        const now = new Date();
        const count = range === '7d' ? 7 : 30;
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            days.push(dateStr);
        }

        return days.map(day => {
            const dayTasks = tasks.filter(t => t.lastCompleted === day);
            const total = dayTasks.length;
            const fitness = dayTasks.filter(t => t.isFitness).length;
            const dateObj = new Date(day);
            const label = range === '7d' 
                ? dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return { day, total, fitness, label };
        });
    }, [tasks, range]);

    const maxCount = Math.max(...chartData.map(d => d.total), 5);
    const width = 1000;
    const height = 300;
    const px = 60;
    const py = 40;
    const cw = width - px * 2;
    const ch = height - py * 2;

    const generatePath = (type: 'total' | 'fitness', close = false) => {
        const pts = chartData.map((d, i) => ({
            x: px + (i * (cw / (chartData.length - 1))),
            y: height - py - ((type === 'total' ? d.total : d.fitness) / maxCount) * ch
        }));
        if (pts.length === 0) return '';
        let path = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        if (close) path += ` L ${pts[pts.length-1].x} ${height-py} L ${pts[0].x} ${height-py} Z`;
        return path;
    };

    return (
        <div className="bg-[#202020] border border-[#373737] rounded-xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-white font-bold text-lg">Growth Trends</h3>
                    <div className="flex gap-4 mt-1">
                        <span className="flex items-center gap-1.5 text-[10px] text-blue-400 uppercase font-bold"><div className="w-2 h-0.5 bg-blue-500"></div> Total</span>
                        <span className="flex items-center gap-1.5 text-[10px] text-purple-400 uppercase font-bold"><div className="w-2 h-0.5 bg-purple-500"></div> Fitness</span>
                    </div>
                </div>
                <div className="flex bg-[#191919] p-1 rounded-lg border border-[#373737]">
                    <button onClick={() => setRange('7d')} className={`px-3 py-1 text-[10px] font-bold rounded ${range === '7d' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>7D</button>
                    <button onClick={() => setRange('30d')} className={`px-3 py-1 text-[10px] font-bold rounded ${range === '30d' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>30D</button>
                </div>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                <path d={generatePath('total', true)} fill="rgba(35, 131, 226, 0.1)" />
                <path d={generatePath('total')} fill="none" stroke="#2383e2" strokeWidth="3" strokeLinecap="round" />
                <path d={generatePath('fitness')} fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="5,5" />
                {chartData.map((d, i) => (
                    <text key={i} x={px + (i * (cw / (chartData.length - 1)))} y={height - 10} textAnchor="middle" className="fill-gray-600 text-[12px] font-bold">{d.label}</text>
                ))}
            </svg>
        </div>
    );
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ tasks }) => {
  const today = getLocalToday();
  const completedToday = tasks.filter(t => t.lastCompleted === today).length;
  const fitnessTasks = tasks.filter(t => t.isFitness);
  const fitnessDoneToday = fitnessTasks.filter(t => t.lastCompleted === today).length;
  
  const totalTasks = tasks.length;
  const completedCount = tasks.filter(t => t.status === Status.DONE).length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const topStreaks = useMemo(() => {
    return [...tasks].filter(t => t.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 5);
  }, [tasks]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Effort" value={completedToday} subtitle="Tasks Done Today" icon={<IconCheckSquare />} color="bg-blue-500" />
        <StatCard title="Fitness Index" value={fitnessDoneToday} subtitle="Workouts Completed" icon={<IconDumbbell />} color="bg-purple-500" />
        <StatCard title="Completion Rate" value={`${completionRate}%`} subtitle="Overall Efficiency" icon={<IconCheckCircle />} color="bg-green-500" />
        <StatCard title="Active Streaks" value={topStreaks.length} subtitle="Recurring Wins" icon={<IconSparkles />} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ActivityTrendChart tasks={tasks} />
          <ConsistencyHeatmap tasks={tasks} />
        </div>
        <div className="space-y-6">
          <div className="bg-[#202020] border border-[#373737] rounded-xl p-6 shadow-xl">
             <h3 className="text-white font-bold mb-4 flex items-center gap-2">🔥 Streak Hall of Fame</h3>
             <div className="space-y-2">
                {topStreaks.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded border border-transparent hover:border-gray-700 transition-all">
                        <span className="text-sm font-medium text-gray-300">{t.title}</span>
                        <span className="bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded text-xs font-bold">{t.streak}d</span>
                    </div>
                ))}
             </div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl p-6">
             <h4 className="text-blue-300 font-bold text-xs uppercase tracking-widest mb-2">Pro Tip</h4>
             <p className="text-sm text-gray-400 leading-relaxed italic">"Regular fitness tasks have a 3x higher impact on mental focus compared to administrative tasks. Keep the purples moving!"</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;