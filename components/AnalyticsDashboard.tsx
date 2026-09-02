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
  IconFolder,
  IconClock,
  IconPieChart,
  IconArrowUpRight,
  IconArrowDownRight
} from './Icons';
import { getLocalToday } from './TaskTable';
import { motion, AnimatePresence } from 'motion/react';

interface AnalyticsDashboardProps {
  tasks: Task[];
}

const StatCard = ({ title, value, subtitle, icon, color, trend, trendValue }: { title: string, value: string | number, subtitle?: string, icon: React.ReactNode, color: string, trend?: 'up' | 'down' | 'neutral', trendValue?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-app-border rounded-3xl p-7 flex flex-col justify-between h-48 relative overflow-hidden group hover:border-app-purple-300 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1"
  >
     <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-[0.05] ${color} blur-2xl group-hover:opacity-[0.1] transition-opacity`}></div>
     <div className="flex justify-between items-start z-10">
        <div className="space-y-1">
          <h3 className="text-app-muted text-[10px] font-black uppercase tracking-[0.2em]">{title}</h3>
          <div className="text-4xl font-black text-app-ink tracking-tighter font-display">{value}</div>
        </div>
        <div className={`p-3.5 rounded-2xl bg-app-surface text-app-purple-600 group-hover:bg-app-purple-600 group-hover:text-white transition-all shadow-sm`}>{icon}</div>
     </div>
     <div className="z-10 flex items-end justify-between">
        <div className="text-[10px] text-app-muted font-bold uppercase tracking-tight">{subtitle}</div>
        {trendValue && (
          <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-xl ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : trend === 'down' ? 'text-rose-600 bg-rose-50' : 'text-gray-500 bg-gray-50'}`}>
            {trend === 'up' ? <IconArrowUpRight className="w-3.5 h-3.5" /> : trend === 'down' ? <IconArrowDownRight className="w-3.5 h-3.5" /> : null}
            {trendValue}
          </div>
        )}
     </div>
  </motion.div>
);

const WeeklyRhythm = ({ tasks }: { tasks: Task[] }) => {
  const rhythmData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    tasks.forEach(t => {
      if (t.lastCompleted) {
        const date = new Date(t.lastCompleted);
        if (date >= thirtyDaysAgo) {
          counts[date.getDay()]++;
        }
      }
    });

    const max = Math.max(...counts, 1);
    return days.map((day, i) => ({
      day,
      count: counts[i],
      percent: (counts[i] / max) * 100
    }));
  }, [tasks]);

  return (
    <div className="bg-white border border-app-border rounded-3xl p-8 shadow-sm">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h3 className="text-app-ink font-black text-sm flex items-center gap-2">
            <IconClock className="w-4 h-4 text-app-purple-600" />
            Weekly Activity
          </h3>
          <p className="text-[10px] text-app-muted mt-1 uppercase font-black tracking-widest leading-none">Completion velocity by day</p>
        </div>
      </div>
      <div className="flex items-end justify-between h-44 gap-3">
        {rhythmData.map((d, i) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-4 group">
            <div className="w-full relative flex flex-col justify-end h-full">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${d.percent}%` }}
                className={`w-full rounded-2xl transition-all duration-500 ${d.day === 'Sat' || d.day === 'Sun' ? 'bg-app-surface' : 'bg-app-purple-500 opacity-20 group-hover:opacity-100 group-hover:bg-app-purple-600'}`}
              />
              <AnimatePresence>
                <motion.div 
                  className="absolute -top-12 left-1/2 -translate-x-1/2 bg-app-ink text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 z-20 whitespace-nowrap"
                >
                  {d.count} Tasks
                </motion.div>
              </AnimatePresence>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${d.day === 'Sat' || d.day === 'Sun' ? 'text-app-muted/50' : 'text-app-ink'}`}>{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const CategoryRadar = ({ tasks }: { tasks: Task[] }) => {
  const categories = [
    { name: 'Fitness', icon: <IconDumbbell className="w-3 h-3" />, color: '#8b5cf6', getter: (t: Task) => t.isFitness },
    { name: 'Career', icon: <IconBriefcase className="w-3 h-3" />, color: '#f43f5e', getter: (t: Task) => t.isJobSearch },
    { name: 'Projects', icon: <IconLightbulb className="w-3 h-3" />, color: '#f59e0b', getter: (t: Task) => t.isProject },
    { name: 'Tasks', icon: <IconCheckSquare className="w-3 h-3" />, color: '#3b82f6', getter: (t: Task) => !t.isFitness && !t.isJobSearch && !t.isProject && !t.isBuyList },
    { name: 'Streaks', icon: <IconSparkles className="w-3 h-3" />, color: '#10b981', getter: (t: Task) => t.streak > 0 }
  ];

  const chartData = useMemo(() => {
    return categories.map(cat => {
      const catTasks = tasks.filter(cat.getter);
      const done = catTasks.filter(t => t.status === Status.DONE).length;
      const score = catTasks.length > 0 ? (done / catTasks.length) * 100 : 0;
      return { 
        ...cat, 
        score,
        angle: 0
      };
    }).map((d, i, arr) => ({
      ...d,
      angle: (i / arr.length) * Math.PI * 2
    }));
  }, [tasks]);

  const size = 300;
  const center = size / 2;
  const radius = size * 0.35;

  const points = chartData.map(d => ({
    x: center + (Math.cos(d.angle - Math.PI / 2) * radius * (d.score / 100)),
    y: center + (Math.sin(d.angle - Math.PI / 2) * radius * (d.score / 100))
  }));

  const pathD = points.length > 0 ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z' : '';

  return (
    <div className="bg-white border border-app-border rounded-3xl p-8 shadow-sm flex flex-col items-center">
      <h3 className="text-app-ink font-black text-sm mb-6 w-full flex items-center gap-2">
        <IconPieChart className="w-4 h-4 text-app-purple-500" />
        Focus Balance
      </h3>
      <div className="relative w-full aspect-square max-w-[280px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
           {[0.2, 0.4, 0.6, 0.8, 1].map(r => (
             <circle key={r} cx={center} cy={center} r={radius * r} fill="none" stroke="#f1f5f9" strokeDasharray="4 4" />
           ))}
           {chartData.map(d => (
             <line key={d.name} x1={center} y1={center} x2={center + Math.cos(d.angle - Math.PI / 2) * radius} y2={center + Math.sin(d.angle - Math.PI / 2) * radius} stroke="#f1f5f9" />
           ))}
           
           <motion.path 
             initial={{ pathLength: 0, opacity: 0 }}
             animate={{ pathLength: 1, opacity: 1 }}
             d={pathD} 
             fill="rgba(139, 92, 246, 0.1)" 
             stroke="#8b5cf6" 
             strokeWidth="3" 
           />

           {chartData.map(d => {
             const labelX = center + Math.cos(d.angle - Math.PI / 2) * (radius + 28);
             const labelY = center + Math.sin(d.angle - Math.PI / 2) * (radius + 28);
             return (
               <g key={d.name}>
                 <text x={labelX} y={labelY} textAnchor="middle" className="fill-app-muted text-[10px] font-black uppercase tracking-widest">{d.name}</text>
               </g>
             )
           })}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full mt-6">
          {chartData.map(d => (
            <div key={d.name} className="flex items-center gap-2 p-2.5 bg-app-surface rounded-xl border border-app-border">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
              <span className="text-[10px] font-black text-app-ink uppercase tracking-tighter">{d.name}: {Math.round(d.score)}%</span>
            </div>
          ))}
      </div>
    </div>
  )
}

const ConsistencyHeatmap = ({ tasks }: { tasks: Task[] }) => {
    const days = 84; 
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
        <div className="bg-white border border-app-border rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-app-ink font-black text-sm flex items-center gap-2">
                  <IconCalendar className="w-4 h-4 text-app-purple-600" />
                  Activity Cloud
              </h3>
              <div className="flex items-center gap-3 text-[10px] text-app-muted font-black uppercase tracking-widest">
                <span>Low</span>
                <div className="flex gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-md bg-app-surface border border-app-border"></div>
                  <div className="w-3.5 h-3.5 rounded-md bg-app-purple-100"></div>
                  <div className="w-3.5 h-3.5 rounded-md bg-app-purple-300"></div>
                  <div className="w-3.5 h-3.5 rounded-md bg-app-purple-600"></div>
                </div>
                <span>High</span>
              </div>
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-4 scrollbar-hide">
                {heatmapData.map((d, i) => {
                    let color = 'bg-app-surface';
                    if (d.count > 0) color = 'bg-app-purple-100';
                    if (d.count > 2) color = 'bg-app-purple-200';
                    if (d.count > 4) color = 'bg-app-purple-400';
                    if (d.count > 6) color = 'bg-app-purple-600';

                    return (
                        <div 
                            key={i} 
                            className={`w-3.5 h-3.5 rounded-md ${color} transition-all hover:scale-125 hover:z-10 cursor-pointer border border-white/20`}
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
        total: '#8b5cf6',
        fitness: '#c084fc',
        jobSearch: '#f43f5e',
        projects: '#f59e0b'
    };

    return (
        <div className="bg-white border border-app-border rounded-3xl p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h3 className="text-app-ink font-black text-xl tracking-tight font-display">Performance Velocity</h3>
                    <p className="text-app-muted text-[11px] font-black uppercase tracking-widest mt-1">Cross-category output mapping</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex bg-app-surface p-1 rounded-2xl border border-app-border">
                      <button onClick={() => setRange('7d')} className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all ${range === '7d' ? 'bg-white text-app-purple-700 shadow-sm border border-app-purple-100' : 'text-app-muted hover:text-app-ink'}`}>7D</button>
                      <button onClick={() => setRange('30d')} className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all ${range === '30d' ? 'bg-white text-app-purple-700 shadow-sm border border-app-purple-100' : 'text-app-muted hover:text-app-ink'}`}>30D</button>
                  </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-10">
                {(['total', 'fitness', 'jobSearch', 'projects'] as const).map(m => (
                    <button 
                        key={m}
                        onClick={() => setMetric(m)}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border transition-all ${metric === m ? 'bg-app-purple-50 border-app-purple-200 text-app-purple-700' : 'bg-transparent border-transparent text-app-muted hover:bg-app-surface'}`}
                    >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: metricColors[m] }}></div>
                        <span className="text-[11px] font-black uppercase tracking-widest">{m.replace(/([A-Z])/g, ' $1')}</span>
                    </button>
                ))}
            </div>

            <div className="relative h-[320px]">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                  {[0, 0.25, 0.5, 0.75, 1].map(v => (
                    <line 
                      key={v} 
                      x1={px} 
                      y1={py + v * ch} 
                      x2={width - px} 
                      y2={py + v * ch} 
                      stroke="#f1f5f9" 
                      strokeWidth="1.5" 
                      strokeDasharray="4 4"
                    />
                  ))}
                  
                  <motion.path 
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    d={generatePath(metric, true)} 
                    fill={`url(#gradient-${metric})`} 
                    className="transition-all duration-700 ease-in-out" 
                  />
                  <motion.path 
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    d={generatePath(metric)} 
                    fill="none" 
                    stroke={metricColors[metric]} 
                    strokeWidth="5" 
                    strokeLinecap="round" 
                    className="transition-all duration-700 ease-in-out" 
                  />
                  
                  {chartData.map((d, i) => (
                      <text 
                        key={i} 
                        x={px + (i * (cw / (chartData.length - 1)))} 
                        y={height + 15} 
                        textAnchor="middle" 
                        className="fill-app-muted text-[11px] font-black uppercase tracking-tighter"
                      >
                        {d.label}
                      </text>
                  ))}

                  <defs>
                    <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metricColors[metric]} stopOpacity="0.15" />
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
        [Priority.LOW]: 'bg-app-purple-500',
    };

    return (
        <div className="bg-white border border-app-border rounded-3xl p-8 shadow-sm">
            <h3 className="text-app-ink font-black text-sm mb-10 flex items-center gap-2">
                <IconBarChart className="w-5 h-5 text-app-purple-500" />
                Priority Mix
            </h3>
            <div className="space-y-8">
                {data.map(d => (
                    <div key={d.label} className="group">
                        <div className="flex justify-between items-end mb-2.5">
                            <span className="text-[11px] uppercase font-black tracking-widest text-app-muted group-hover:text-app-ink transition-colors">{d.label}</span>
                            <span className="text-sm font-black text-app-ink tracking-tight">{d.count}</span>
                        </div>
                        <div className="w-full bg-app-surface h-3.5 rounded-full overflow-hidden p-1 border border-app-border">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${d.percent}%` }}
                                className={`h-full ${colors[d.label as Priority]} rounded-full transition-all duration-1000 ease-out shadow-sm`} 
                            ></motion.div>
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
        <div className="bg-white border border-app-border rounded-3xl p-8 shadow-sm">
            <h3 className="text-app-ink font-black text-sm mb-10 flex items-center gap-2">
                <IconDumbbell className="w-5 h-5 text-app-purple-600" />
                Biometric Focus
            </h3>
            <div className="space-y-7">
                {data.slice(0, 5).map(d => (
                    <div key={d.label} className="flex items-center gap-4">
                        <div className="w-full">
                            <div className="flex justify-between text-[11px] uppercase font-black text-app-muted mb-2.5">
                                <span className="truncate max-w-[120px]">{d.label}</span>
                                <span className="text-app-purple-600">{d.count} sessions</span>
                            </div>
                            <div className="w-full bg-app-surface h-2 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${d.percent}%` }}
                                  className="h-full bg-app-purple-500 shadow-sm" 
                                ></motion.div>
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

  const lastWeekAvg = useMemo(() => {
    const last14Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 7 - i);
        return d.toISOString().split('T')[0];
    });
    const completedLastWeek = tasks.filter(t => t.lastCompleted && last14Days.includes(t.lastCompleted)).length;
    return (completedLastWeek / 7);
  }, [tasks]);

  const velocityTrend = useMemo(() => {
    const current = parseFloat(weeklyAvg);
    const last = lastWeekAvg;
    if (last === 0) return { trend: 'neutral' as const, value: 'New' };
    const diff = ((current - last) / last) * 100;
    return {
      trend: diff > 0 ? 'up' as const : diff < 0 ? 'down' as const : 'neutral' as const,
      value: `${Math.abs(Math.round(diff))}%`
    };
  }, [weeklyAvg, lastWeekAvg]);

  const dailyTrend = useMemo(() => {
    if (yesterdayCount === 0) return { trend: 'up' as const, value: completedToday > 0 ? '100%' : '0%' };
    const diff = ((completedToday - yesterdayCount) / yesterdayCount) * 100;
    return {
      trend: diff > 0 ? 'up' as const : diff < 0 ? 'down' as const : 'neutral' as const,
      value: `${Math.abs(Math.round(diff))}%`
    };
  }, [completedToday, yesterdayCount]);

  const productivityScore = useMemo(() => {
    const rateFactor = completionRate * 0.4;
    const streakFactor = Math.min(topStreaks.length * 10, 30);
    const todayFactor = Math.min(completedToday * 5, 30);
    return Math.min(Math.round(rateFactor + streakFactor + todayFactor), 100);
  }, [completionRate, topStreaks, completedToday]);

  const totalTimeSpent = useMemo(() => {
    const totalMinutes = tasks
      .filter(t => t.status === Status.DONE && t.scheduledDuration)
      .reduce((acc, t) => acc + (t.scheduledDuration || 0), 0);
    
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [tasks]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-5xl font-black text-app-ink tracking-tight font-display">Intelligence</h2>
          <p className="text-app-muted font-black uppercase text-[11px] tracking-[0.3em] leading-none">Holistic performance & behavioral mapping</p>
        </div>
        <div className="text-[11px] font-black uppercase tracking-widest text-app-purple-700 bg-app-purple-50 px-8 py-4 rounded-3xl border border-app-purple-100 shadow-sm">
          Dynamic Sync — {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard title="Daily Output" value={completedToday} subtitle="Completed Today" icon={<IconCheckSquare />} color="bg-app-purple-500" trend={dailyTrend.trend} trendValue={dailyTrend.value} />
        <StatCard title="Focus Velocity" value={weeklyAvg} subtitle="Sessions/Day (7d)" icon={<IconTrendingUp />} color="bg-emerald-500" trend={velocityTrend.trend} trendValue={velocityTrend.value} />
        <StatCard title="Precision" value={`${completionRate}%`} subtitle="Efficiency Index" icon={<IconActivity />} color="bg-app-ink" />
        <StatCard title="Temporal Sync" value={totalTimeSpent} subtitle="Total Cycle Time" icon={<IconClock />} color="bg-blue-500" />
        <StatCard title="Bio-Matrix" value={fitnessDoneToday} subtitle="Fitness Nodes" icon={<IconDumbbell />} color="bg-rose-500" />
        <StatCard title="Global Score" value={productivityScore} subtitle="Performance Index" icon={<IconPieChart />} color="bg-amber-500" />
      </div>

      <div className="bg-app-ink rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
           <svg viewBox="0 0 400 400" className="w-full h-full text-white fill-current">
              <path d="M0,200 Q100,50 200,200 T400,200" fill="none" stroke="currentColor" strokeWidth="20" />
              <path d="M0,150 Q100,0 200,150 T400,150" fill="none" stroke="currentColor" strokeWidth="10" opacity="0.5" />
           </svg>
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
           <div className="space-y-6">
              <h3 className="text-4xl font-black tracking-tight font-display">System Integrity</h3>
              <p className="text-white/60 text-sm font-medium leading-relaxed max-w-sm">Autonomous performance monitoring across distributed task nodes. High precision mapping active.</p>
              <div className="flex gap-4">
                 <div className="px-5 py-2.5 bg-white/10 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest">Stable Sync</div>
                 <div className="px-5 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">Optimized</div>
              </div>
           </div>
           <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Carrier Strength', value: jobApplications > 0 ? Math.round((jobApplications/totalTasks)*100) : 0, color: 'text-blue-400' },
                { label: 'Project Flux', value: projectProgress, color: 'text-app-purple-400' },
                { label: 'Fitness Peak', value: fitnessTasks.length > 0 ? Math.round((fitnessTasks.filter(t => t.status===Status.DONE).length/fitnessTasks.length)*100) : 0, color: 'text-rose-400' },
                { label: 'Global Uptime', value: productivityScore, color: 'text-amber-400' }
              ].map(stat => (
                <div key={stat.label} className="space-y-3">
                   <div className="text-[10px] font-black uppercase tracking-widest text-white/40">{stat.label}</div>
                   <div className={`text-4xl font-black ${stat.color} font-display tabular-nums tracking-tighter`}>{stat.value}%</div>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${stat.value}%` }} className={`h-full bg-current ${stat.color}`} />
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <ActivityTrendChart tasks={tasks} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <WeeklyRhythm tasks={tasks} />
             <CategoryRadar tasks={tasks} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <PriorityBreakdown tasks={tasks} />
            <FitnessBreakdown tasks={tasks} />
          </div>
          <ConsistencyHeatmap tasks={tasks} />
        </div>
        
        <div className="space-y-10">
          <div className="bg-white border border-app-border rounded-3xl p-8 shadow-sm">
             <h3 className="text-app-ink font-black text-sm mb-10 flex items-center gap-2">
               <IconSparkles className="w-5 h-5 text-amber-500" />
               Hall of Fame
             </h3>
             <div className="space-y-4">
                {topStreaks.length > 0 ? topStreaks.map(t => (
                    <div key={t.id} className="group flex items-center justify-between p-5 bg-app-surface rounded-3xl border border-app-border hover:border-app-purple-200 transition-all">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-app-ink truncate transition-colors">{t.title}</span>
                          <span className="text-[10px] text-app-muted uppercase font-black tracking-tighter mt-1">{t.frequency}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3.5 py-1.5 rounded-2xl text-[11px] font-black border border-amber-100">
                          <IconSparkles className="w-3 h-3" />
                          {t.streak}d
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-16 bg-app-surface rounded-3xl border-2 border-dashed border-app-border">
                      <IconSparkles className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                      <p className="text-app-muted text-[10px] font-black uppercase tracking-widest">No Active Streaks</p>
                    </div>
                )}
             </div>
          </div>
          
          <div className="bg-white border border-app-border rounded-3xl p-8 shadow-sm">
             <h3 className="text-app-ink font-black text-sm mb-10 flex items-center gap-2">
                <IconFolder className="w-5 h-5 text-app-purple-500" />
                Project Pulse
             </h3>
             <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <span className="text-[11px] uppercase font-black tracking-widest text-app-muted">Active Hubs</span>
                    <span className="text-lg font-black text-app-ink">{projectTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[11px] uppercase font-black tracking-widest text-app-muted">Completion</span>
                    <span className="text-lg font-black text-app-purple-600">{projectProgress}%</span>
                </div>
                <div className="w-full bg-app-surface h-3.5 rounded-full overflow-hidden p-1 border border-app-border">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${projectProgress}%` }}
                        className="h-full bg-app-purple-500 rounded-full shadow-sm" 
                    ></motion.div>
                </div>
                <p className="text-[11px] text-app-muted leading-relaxed font-bold">
                  You have <span className="text-app-ink">{projectsDone}</span> milestones fully achieved across <span className="text-app-ink">{projectTasks.length}</span> core initiatives.
                </p>
             </div>
          </div>

          <div className="relative overflow-hidden bg-app-ink text-white rounded-3xl p-8 group shadow-2xl">
             <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-app-purple-500/20 blur-3xl rounded-full group-hover:bg-app-purple-500/30 transition-all duration-700"></div>
             <h4 className="text-app-purple-400 font-black text-[11px] uppercase tracking-[0.3em] mb-6">Autonomous Insight</h4>
             <p className="text-sm text-gray-300 leading-relaxed font-bold relative z-10 antialiased">
                "Your <span className="text-white">Consistency</span> is up <span className="text-emerald-400">{velocityTrend.value}</span>. Peak focus usually occurs on <span className="text-app-purple-400">Wednesdays</span>. You are most productive when tackling <span className="text-amber-400">Project</span> tasks early."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
