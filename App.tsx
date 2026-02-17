import React, { useState, useEffect, useMemo } from 'react';
import TaskTable, { getLocalToday } from './components/TaskTable';
import SmartTaskInput from './components/SmartTaskInput';
import SortPopup from './components/SortPopup';
import KanbanBoard from './components/KanbanBoard';
import FitnessBoard from './components/FitnessBoard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ZoraAssistant from './components/ZoraAssistant';
import { Task, Status, Priority, Frequency, ViewType, SortOption, FitnessCategory } from './types';
import { 
  IconCheckSquare, 
  IconList, 
  IconSearch, 
  IconSort, 
  IconLayout,
  IconRotateCcw,
  IconShoppingCart,
  IconDumbbell,
  IconBarChart,
  IconSparkles,
  IconCalendar
} from './components/Icons';

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Morning Routine', status: Status.TODO, frequency: Frequency.DAILY, priority: Priority.HIGH, nextDue: getLocalToday(), lastCompleted: null, streak: 0, order: 0 },
  { id: '2', title: 'Lunch Break', status: Status.TODO, frequency: Frequency.DAILY, priority: Priority.MEDIUM, nextDue: getLocalToday(), lastCompleted: null, streak: 0, order: 1 },
  { id: '3', title: '5 Min Plank', status: Status.TODO, frequency: Frequency.DAILY, priority: Priority.HIGH, nextDue: getLocalToday(), lastCompleted: null, streak: 0, category: FitnessCategory.DAILY, reps: '5 mins', isHomeWorkout: true, order: 2 },
  { id: '4', title: 'Grocery Run', status: Status.TODO, frequency: Frequency.WEEKLY, priority: Priority.MEDIUM, nextDue: getLocalToday(), lastCompleted: null, streak: 0, category: FitnessCategory.GROCERY, order: 3 },
];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [view, setView] = useState<ViewType>('All Tasks');
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortOption[]>([]);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // 1. Initial Data Load & Reset Engine
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notion-tasks');
      const today = getLocalToday();
      let rawTasks = INITIAL_TASKS;

      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawTasks = parsed;
        }
      }

      // Auto-Reset completed tasks whose nextDue is Today or in the Past
      const resetTasks = rawTasks.map(task => {
        let updated = { ...task };
        if (updated.status === Status.DONE && updated.nextDue <= today && updated.frequency !== Frequency.ONCE) {
          updated.status = Status.TODO;
        }
        return updated;
      });

      setTasks(resetTasks);
    } catch (e) {
      console.error("Initialization failed:", e);
      setTasks(INITIAL_TASKS);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  // 2. Continuous Persistence
  useEffect(() => { 
    if (!hasLoaded) return; 
    localStorage.setItem('notion-tasks', JSON.stringify(tasks)); 
  }, [tasks, hasLoaded]);

  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'streak' | 'lastCompleted'>, customTitle?: string) => {
    const newTask: Task = {
      ...newTaskData,
      title: customTitle || newTaskData.title,
      id: Math.random().toString(36).substr(2, 9),
      streak: 0,
      lastCompleted: null,
      order: tasks.length
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleReorderTasks = (reorderedTasks: Task[]) => {
    const updated = reorderedTasks.map((task, index) => ({ ...task, order: index }));
    setTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const today = getLocalToday();
  const tasksDueToday = useMemo(() => tasks.filter(t => t.nextDue === today && t.status !== Status.DONE), [tasks, today]);
  const bestStreak = useMemo(() => Math.max(...tasks.map(t => t.streak), 0), [tasks]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !search || task.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Define what constitutes a "Fitness" task more broadly to prevent disappearing items
    const isFitnessCategory = [
      FitnessCategory.ABS, 
      FitnessCategory.GLUTES, 
      FitnessCategory.SNOWBOARD, 
      FitnessCategory.DAILY,
      'Others', // Catch tasks in the "Others" column
      'Daily'   // Legacy support
    ].includes(task.category as any);

    const titleLower = task.title.toLowerCase();
    const isFitnessKeyword = titleLower.includes('workout') || titleLower.includes('exercise') || titleLower.includes('gym') || titleLower.includes('training');
    
    // It's a fitness task if it's in a fitness category OR has fitness keywords and no specific general category
    const isFitness = isFitnessCategory || (isFitnessKeyword && (task.category === undefined || task.category === ''));
    const isGrocery = task.category === FitnessCategory.GROCERY;

    if (view === 'Analytics') return true;
    if (view === 'Grocery Run') return isGrocery;
    if (view === 'Fitness') return isFitness;
    
    // In "All Tasks", we hide Fitness and Grocery to keep the general list clean
    if (view === 'All Tasks' || view === 'By Status') {
       return !isFitness && !isGrocery;
    }
    
    return true;
  });

  const handleReset = () => {
    setSearch('');
    setSortConfig([]);
    const resetOrder = [...tasks].sort((a, b) => (a.id > b.id ? 1 : -1));
    setTasks(resetOrder.map((t, i) => ({ ...t, order: i })));
  };

  if (!hasLoaded) {
    return (
      <div className="min-h-screen bg-notion-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-notion-muted font-medium animate-pulse">Synchronizing Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-notion-bg text-notion-text font-sans pb-40">
      <header className="px-12 pt-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-notion-blue rounded flex items-center justify-center text-white shadow-xl">
            <IconCheckSquare className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-white">Focus Space</h1>
        </div>

        {view === 'All Tasks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-[#202020] border border-[#373737] rounded-xl p-4 flex items-center gap-4">
               <div className="bg-blue-500/10 p-3 rounded-lg text-blue-400"><IconCalendar className="w-6 h-6" /></div>
               <div>
                 <div className="text-xl font-bold text-white">{tasksDueToday.filter(t => !filteredTasks.find(ft => ft.id === t.id)).length} Tasks Remaining</div>
                 <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">General Tasks Due Today</div>
               </div>
            </div>
            <div className="bg-[#202020] border border-[#373737] rounded-xl p-4 flex items-center gap-4">
               <div className="bg-orange-500/10 p-3 rounded-lg text-orange-400"><IconSparkles className="w-6 h-6" /></div>
               <div>
                 <div className="text-xl font-bold text-white">{bestStreak} Day Streak</div>
                 <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Consistency is key</div>
               </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-notion-border">
          <div className="flex gap-4">
            {[
              { label: 'All Tasks', icon: IconList },
              { label: 'Grocery Run', icon: IconShoppingCart },
              { label: 'By Status', icon: IconLayout },
              { label: 'Fitness', icon: IconDumbbell },
              { label: 'Analytics', icon: IconBarChart },
            ].map((v) => (
              <button key={v.label} onClick={() => setView(v.label as ViewType)} className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors border-b-2 ${view === v.label ? 'border-white text-white font-medium' : 'border-transparent text-notion-muted hover:text-gray-300'}`}>
                <v.icon className="w-4 h-4" /> {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <IconSearch className="w-4 h-4 text-notion-muted absolute left-2 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent border border-transparent hover:border-notion-border focus:border-blue-500 rounded px-2 py-1 pl-8 text-sm outline-none w-48 transition-colors" />
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-all ${sortConfig.length > 0 ? 'text-blue-500 bg-blue-500/10' : 'text-notion-muted hover:bg-notion-hover'}`}
              >
                <IconSort className="w-4 h-4" />
                Sort {sortConfig.length > 0 && `(${sortConfig.length})`}
              </button>
              {isSortMenuOpen && (
                <SortPopup 
                  sorts={sortConfig} 
                  onChange={setSortConfig} 
                  onClose={() => setIsSortMenuOpen(false)} 
                />
              )}
            </div>

            <button onClick={handleReset} className="text-notion-muted hover:bg-notion-hover px-2 py-1 rounded text-sm flex items-center gap-2">
              <IconRotateCcw className="w-4 h-4" /> 
              Reset
            </button>
          </div>
          <SmartTaskInput 
            onAddTask={(t) => {
              let finalTask = { ...t };
              if (view === 'Grocery Run') finalTask.category = FitnessCategory.GROCERY;
              // If adding while in fitness view, default to the Daily Workout category
              if (view === 'Fitness') finalTask.category = FitnessCategory.DAILY;
              handleAddTask(finalTask);
            }} 
          />
        </div>
      </header>

      <main className="px-12">
        {view === 'By Status' ? (
           <KanbanBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(s) => handleAddTask({ title: 'New Task', status: s, frequency: Frequency.ONCE, priority: Priority.MEDIUM, nextDue: today })} onDeleteTask={handleDeleteTask} />
        ) : view === 'Fitness' ? (
           <FitnessBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(cat) => handleAddTask({ title: 'New Exercise', status: Status.TODO, frequency: Frequency.DAILY, priority: Priority.MEDIUM, nextDue: today, category: cat })} onDeleteTask={handleDeleteTask} />
        ) : view === 'Analytics' ? (
            <AnalyticsDashboard tasks={tasks} />
        ) : (
           <TaskTable 
             tasks={filteredTasks} 
             onUpdateTask={handleUpdateTask} 
             onReorderTasks={handleReorderTasks}
             sortConfig={sortConfig} 
             onSortChange={setSortConfig} 
             onDeleteTask={handleDeleteTask} 
             onAddTask={(s, title) => {
               const category = view === 'Grocery Run' ? FitnessCategory.GROCERY : undefined;
               handleAddTask({ title, status: s, frequency: Frequency.ONCE, priority: Priority.MEDIUM, nextDue: today, category });
             }} 
           />
        )}
      </main>

      <ZoraAssistant tasks={tasks} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
    </div>
  );
};

export default App;