import React, { useState, useMemo } from 'react';
import { Task, Status, Priority, Frequency, FitnessCategory } from '../types';
import { 
  IconCheckSquare, 
  IconDumbbell, 
  IconCalendar, 
  IconCheckCircle, 
  IconBarChart, 
  IconSparkles,
  IconTrendingUp,
  IconActivity,
  IconBriefcase,
  IconLightbulb,
  IconDollarSign,
  IconFolder
} from './Icons';
import { getLocalToday } from './TaskTable';

interface AnalyticsDashboardProps {
  tasks: Task[];
}

const StatCard = ({ title, value, subtitle, icon, color, trend }: { title: string, value: string | number, subtitle?: string, icon: React.ReactNode, color: string, trend?: string }) => (
  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group hover:border-[#444] transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
     <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-[0.03] ${color} blur-2xl group-hover:opacity-[0.08] transition-opacity`}></div>
     <div className="flex justify-between items-start z-10">
        <div className="space-y-1">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest">{title}</h3>
          <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        </div>
        <div className={`p-3 rounded-xl bg-[#222] text-gray-400 group-hover:text-white transition-colors shadow-inner`}>{icon}</div>
     </div>
     <div className="z-10 flex items-end justify-between">
        <div className="text-[11px] text-gray-500 font-medium">{subtitle}</div>
        {trend && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <IconTrendingUp className="w-3 h-3" />
            {trend}
          </div>
        )}
     </div>
  </div>
);

const ConsistencyHeatmap = ({ tasks }: { tasks: Task[] }) => {
    const days = 84; // 12 weeks
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
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <IconCalendar className="w-4 h-4 text-gray-500" />
                  Activity Intensity
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-sm bg-[#222]"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-900/40"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-700/60"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                </div>
                <span>More</span>
              </div>
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
                {heatmapData.map((d, i) => {
                    let color = 'bg-[#222]';
                    if (d.count > 0) color = 'bg-blue-900/40';
                    if (d.count > 2) color = 'bg-blue-700/60';
                    if (d.count > 4) color = 'bg-blue-500';
                    if (d.count > 6) color = 'bg-blue-400';

                    return (
                        <div 
                            key={i} 
                            className={`w-3 h-3 rounded-[2px] ${color} transition-all hover:ring-2 hover:ring-white/20 cursor-pointer`}
                            title={`${d.dateStr}: ${d.count} tasks`}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const ActivityTrendChart = ({ tasks }: { tasks: Task[] }) => {
    const [range, setRange] = useState<'7d' | '30d'>('7d');
    const [metric, setMetric] = useState<'total' | 'fitness' | 'jobSearch' | 'projects'>('total');

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
            return { 
                day, 
                total: dayTasks.length, 
                fitness: dayTasks.filter(t => t.isFitness).length,
                jobSearch: dayTasks.filter(t => t.isJobSearch).length,
                projects: dayTasks.filter(t => t.isProject).length,
                label: range === '7d' 
                    ? new Date(day).toLocaleDateString('en-US', { weekday: 'short' })
                    : new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
        });
    }, [tasks, range]);

    const maxCount = Math.max(...chartData.map(d => d[metric]), 5);
    const width = 1000;
    const height = 300;
    const px = 40;
    const py = 40;
    const cw = width - px * 2;
    const ch = height - py * 2;

    const generatePath = (type: typeof metric, close = false) => {
        const pts = chartData.map((d, i) => ({
            x: px + (i * (cw / (chartData.length - 1))),
            y: height - py - (d[type] / maxCount) * ch
        }));
        if (pts.length === 0) return '';
        
        // Use smooth curves (Bezier)
        let path = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i];
            const p1 = pts[i + 1];
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            path += ` C ${cp1x} ${p0.y}, ${cp1x} ${p1.y}, ${p1.x} ${p1.y}`;
        }

        if (close) {
          path += ` L ${pts[pts.length-1].x} ${height-py} L ${pts[0].x} ${height-py} Z`;
        }
        return path;
    };

    const metricColors = {
        total: '#3b82f6',
        fitness: '#a855f7',
        jobSearch: '#10b981',
        projects: '#f59e0b'
    };

    return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h3 className="text-white font-bold text-lg tracking-tight">Performance Trends</h3>
                    <p className="text-gray-500 text-xs mt-1">Visualizing your daily output across categories</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex bg-[#111] p-1 rounded-xl border border-[#2a2a2a]">
                      <button onClick={() => setRange('7d')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${range === '7d' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>7D</button>
                      <button onClick={() => setRange('30d')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${range === '30d' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>30D</button>
                  </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
                {(['total', 'fitness', 'jobSearch', 'projects'] as const).map(m => (
                    <button 
                        key={m}
                        onClick={() => setMetric(m)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${metric === m ? 'bg-[#222] border-[#444] text-white' : 'bg-transparent border-transparent text-gray-500 hover:bg-[#111]'}`}
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metricColors[m] }}></div>
                        <span className="text-[11px] font-bold uppercase tracking-wider">{m.replace(/([A-Z])/g, ' $1')}</span>
                    </button>
                ))}
            </div>

            <div className="relative h-[300px]">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(v => (
                    <line 
                      key={v} 
                      x1={px} 
                      y1={py + v * ch} 
                      x2={width - px} 
                      y2={py + v * ch} 
                      stroke="#222" 
                      strokeWidth="1" 
                    />
                  ))}
                  
                  <path 
                    d={generatePath(metric, true)} 
                    fill={`url(#gradient-${metric})`} 
                    className="transition-all duration-700 ease-in-out" 
                  />
                  <path 
                    d={generatePath(metric)} 
                    fill="none" 
                    stroke={metricColors[metric]} 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    className="transition-all duration-700 ease-in-out" 
                  />
                  
                  {chartData.map((d, i) => (
                      <text 
                        key={i} 
                        x={px + (i * (cw / (chartData.length - 1)))} 
                        y={height - 10} 
                        textAnchor="middle" 
                        className="fill-gray-600 text-[11px] font-bold"
                      >
                        {d.label}
                      </text>
                  ))}

                  <defs>
                    <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metricColors[metric]} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={metricColors[metric]} stopOpacity="0" />
                    </linearGradient>
                  </defs>
              </svg>
            </div>
        </div>
    );
};

const PriorityBreakdown = ({ tasks }: { tasks: Task[] }) => {
    const data = useMemo(() => {
        const counts = {
            [Priority.HIGH]: tasks.filter(t => t.priority === Priority.HIGH).length,
            [Priority.MEDIUM]: tasks.filter(t => t.priority === Priority.MEDIUM).length,
            [Priority.LOW]: tasks.filter(t => t.priority === Priority.LOW).length,
        };
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return Object.entries(counts).map(([label, count]) => ({
            label,
            count,
            percent: total > 0 ? (count / total) * 100 : 0
        }));
    }, [tasks]);

    const colors = {
        [Priority.HIGH]: 'bg-rose-500',
        [Priority.MEDIUM]: 'bg-amber-500',
        [Priority.LOW]: 'bg-blue-500',
    };

    return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-sm">
            <h3 className="text-white font-bold text-sm mb-8 flex items-center gap-2">
                <IconBarChart className="w-4 h-4 text-gray-500" />
                Priority Distribution
            </h3>
            <div className="space-y-6">
                {data.map(d => (
                    <div key={d.label} className="group">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-500 group-hover:text-gray-300 transition-colors">{d.label}</span>
                            <span className="text-xs font-bold text-white">{d.count}</span>
                        </div>
                        <div className="w-full bg-[#111] h-2.5 rounded-full overflow-hidden p-[2px] border border-[#222]">
                            <div 
                                className={`h-full ${colors[d.label as Priority]} rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]`} 
                                style={{ width: `${d.percent}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FitnessBreakdown = ({ tasks }: { tasks: Task[] }) => {
    const fitnessTasks = tasks.filter(t => t.isFitness);
    const data = useMemo(() => {
        const counts: Record<string, number> = {};
        fitnessTasks.forEach(t => {
            const cat = t.category || 'General';
            counts[cat] = (counts[cat] || 0) + (t.status === Status.DONE ? 1 : 0);
        });
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({
                label,
                count,
                percent: total > 0 ? (count / total) * 100 : 0
            }));
    }, [tasks]);

    if (fitnessTasks.length === 0) return null;

    return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-sm">
            <h3 className="text-white font-bold text-sm mb-8 flex items-center gap-2">
                <IconDumbbell className="w-4 h-4 text-purple-400" />
                Training Focus
            </h3>
            <div className="space-y-5">
                {data.slice(0, 5).map(d => (
                    <div key={d.label} className="flex items-center gap-4">
                        <div className="w-full">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-2">
                                <span className="truncate max-w-[120px]">{d.label}</span>
                                <span className="text-purple-400">{d.count} sessions</span>
                            </div>
                            <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" style={{ width: `${d.percent}%` }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
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

  const jobSearchTasks = tasks.filter(t => t.isJobSearch);
  const jobApplications = jobSearchTasks.length;
  const jobInterviews = jobSearchTasks.filter(t => t.status === Status.IN_PROGRESS).length;

  const projectTasks = tasks.filter(t => t.isProject);
  const projectsDone = projectTasks.filter(t => t.status === Status.DONE).length;
  const projectProgress = projectTasks.length > 0 ? Math.round((projectsDone / projectTasks.length) * 100) : 0;

  const topStreaks = useMemo(() => {
    return [...tasks].filter(t => t.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 5);
  }, [tasks]);

  const weeklyAvg = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    });
    const completedInLast7 = tasks.filter(t => t.lastCompleted && last7Days.includes(t.lastCompleted)).length;
    return (completedInLast7 / 7).toFixed(1);
  }, [tasks]);

  const yesterdayCount = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    return tasks.filter(t => t.lastCompleted === yesterday).length;
  }, [tasks]);

  const dailyTrend = useMemo(() => {
    if (yesterdayCount === 0) return completedToday > 0 ? '+100%' : '0%';
    const diff = ((completedToday - yesterdayCount) / yesterdayCount) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(0)}%`;
  }, [completedToday, yesterdayCount]);

  const productivityScore = useMemo(() => {
    const rateFactor = completionRate * 0.4;
    const streakFactor = Math.min(topStreaks.length * 10, 30);
    const todayFactor = Math.min(completedToday * 5, 30);
    return Math.min(Math.round(rateFactor + streakFactor + todayFactor), 100);
  }, [completionRate, topStreaks, completedToday]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Analytics</h2>
          <p className="text-gray-500 font-medium">Your productivity overview and habit tracking</p>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 bg-[#111] px-4 py-2 rounded-full border border-[#222]">
          Last Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatCard title="Daily Effort" value={completedToday} subtitle="Tasks completed today" icon={<IconCheckSquare />} color="bg-blue-500" trend={dailyTrend} />
        <StatCard title="Fitness" value={fitnessDoneToday} subtitle="Workouts finished" icon={<IconDumbbell />} color="bg-purple-500" />
        <StatCard title="Efficiency" value={`${productivityScore}%`} subtitle="Overall productivity" icon={<IconActivity />} color="bg-cyan-500" />
        <StatCard title="Velocity" value={weeklyAvg} subtitle="Avg tasks per day" icon={<IconTrendingUp />} color="bg-emerald-500" />
        <StatCard title="Job Search" value={jobApplications} subtitle={`${jobInterviews} active leads`} icon={<IconBriefcase />} color="bg-rose-500" />
        <StatCard title="Projects" value={`${projectProgress}%`} subtitle={`${projectsDone} completed`} icon={<IconLightbulb />} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <ActivityTrendChart tasks={tasks} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <PriorityBreakdown tasks={tasks} />
            <FitnessBreakdown tasks={tasks} />
          </div>
          <ConsistencyHeatmap tasks={tasks} />
        </div>
        
        <div className="space-y-8">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-sm">
             <h3 className="text-white font-bold text-sm mb-8 flex items-center gap-2">
               <IconSparkles className="w-4 h-4 text-orange-400" />
               Streak Hall of Fame
             </h3>
             <div className="space-y-4">
                {topStreaks.length > 0 ? topStreaks.map(t => (
                    <div key={t.id} className="group flex items-center justify-between p-4 bg-[#111] rounded-2xl border border-[#222] hover:border-[#444] transition-all">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-gray-300 truncate group-hover:text-white transition-colors">{t.title}</span>
                          <span className="text-[10px] text-gray-600 uppercase font-black tracking-tighter mt-0.5">{t.frequency}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-black">
                          <IconSparkles className="w-3 h-3" />
                          {t.streak}d
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-12 bg-[#111] rounded-2xl border border-dashed border-[#222]">
                      <IconSparkles className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                      <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">No Active Streaks</p>
                    </div>
                )}
             </div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-sm">
             <h3 className="text-white font-bold text-sm mb-8 flex items-center gap-2">
                <IconFolder className="w-4 h-4 text-amber-400" />
                Project Pulse
             </h3>
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Active Projects</span>
                    <span className="text-sm font-black text-white">{projectTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Completion</span>
                    <span className="text-sm font-black text-amber-400">{projectProgress}%</span>
                </div>
                <div className="w-full bg-[#111] h-3 rounded-full overflow-hidden p-[2px] border border-[#222]">
                    <div className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]" style={{ width: `${projectProgress}%` }}></div>
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed font-medium">
                  You have <span className="text-gray-400 font-bold">{projectsDone}</span> projects fully completed out of <span className="text-gray-400 font-bold">{projectTasks.length}</span> total initiatives.
                </p>
             </div>
          </div>

          <div className="relative overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 group">
             <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full group-hover:bg-blue-500/20 transition-colors"></div>
             <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">Insights</h4>
             <p className="text-xs text-gray-400 leading-relaxed font-medium relative z-10">
               "Your <span className="text-purple-400 font-bold">Fitness</span> consistency is up <span className="text-emerald-500 font-bold">12%</span> this week. This usually correlates with a higher <span className="text-blue-400 font-bold">Project Pulse</span> in the following 48 hours."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;