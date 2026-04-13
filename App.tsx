import React, { useState, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocFromServer } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout, googleProvider } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import TaskTable, { getLocalToday } from './components/TaskTable';
import SmartTaskInput from './components/SmartTaskInput';
import SortPopup from './components/SortPopup';
import KanbanBoard from './components/KanbanBoard';
import FitnessBoard from './components/FitnessBoard';
import JobSearchBoard from './components/JobSearchBoard';
import ProjectsBoard from './components/ProjectsBoard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CalendarView from './components/CalendarView';
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
  IconBriefcase,
  IconLightbulb,
  IconBarChart,
  IconSparkles,
  IconCalendar
} from './components/Icons';

const App: React.FC = () => {
  const [user, loadingAuth] = useAuthState(auth);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [view, setView] = useState<ViewType>('All Tasks');
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortOption[]>([]);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        localStorage.setItem('google_access_token', credential.accessToken);
      }
    } catch (error) {
      console.error("Google Login Error:", error);
    }
  };

  const handleDisconnectCalendar = () => {
    setGoogleAccessToken(null);
    localStorage.removeItem('google_access_token');
  };

  // 1. Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // 2. Real-time Firestore Sync
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setHasLoaded(true);
      return;
    }

    const q = query(collection(db, 'tasks'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = getLocalToday();
      const fetchedTasks = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Task[];

      // Auto-Reset completed tasks whose nextDue is Today or in the Past
      const resetTasks = fetchedTasks.map(task => {
        let updated = { ...task };
        if (updated.status === Status.DONE && updated.nextDue <= today && updated.frequency !== Frequency.ONCE) {
          // Note: We don't update Firestore here to avoid infinite loops or unnecessary writes
          // App logic handles completion and nextDue advancement
          updated.status = Status.TODO;
        }
        return updated;
      });

      setTasks(resetTasks);
      setHasLoaded(true);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setHasLoaded(true);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTask = async (newTaskData: Omit<Task, 'id' | 'uid' | 'streak' | 'lastCompleted'>, customTitle?: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTaskData,
        uid: user.uid,
        title: customTitle || newTaskData.title,
        streak: 0,
        lastCompleted: null,
        order: tasks.length
      });
    } catch (e) {
      console.error("Error adding task:", e);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    if (!user) return;
    try {
      const { id, ...data } = updatedTask;
      await updateDoc(doc(db, 'tasks', id), data);
    } catch (e) {
      console.error("Error updating task:", e);
    }
  };

  const handleReorderTasks = async (reorderedTasks: Task[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      reorderedTasks.forEach((t, i) => {
        batch.update(doc(db, 'tasks', t.id), { order: i });
      });
      await batch.commit();
    } catch (e) {
      console.error("Error reordering tasks:", e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (e) {
      console.error("Error deleting task:", e);
    }
  };

  const today = getLocalToday();
  const tasksDueToday = useMemo(() => tasks.filter(t => t.nextDue === today && t.status !== Status.DONE), [tasks, today]);
  const bestStreak = useMemo(() => Math.max(...tasks.map(t => t.streak), 0), [tasks]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !search || task.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const isFitness = task.isFitness;
    const isGrocery = task.isGrocery;
    const isJobSearch = task.isJobSearch;
    const isProject = task.isProject;

    if (view === 'Analytics') return true;
    if (view === 'Grocery Run') return task.isGrocery;
    if (view === 'Fitness') return task.isFitness;
    if (view === 'Job Search') return task.isJobSearch;
    if (view === 'Projects') return task.isProject;
    
    // In "All Tasks" and "By Status", we hide Fitness, Grocery, Job Search, and Projects to keep the general list clean
    if (view === 'All Tasks' || view === 'By Status') {
       return !task.isFitness && !task.isGrocery && !task.isJobSearch && !task.isProject;
    }
    
    return true;
  });

  const handleReset = () => {
    setSearch('');
    setSortConfig([]);
    const resetOrder = [...tasks].sort((a, b) => (a.id > b.id ? 1 : -1));
    setTasks(resetOrder.map((t, i) => ({ ...t, order: i })));
  };

  if (loadingAuth || !hasLoaded) {
    return (
      <div className="min-h-screen bg-notion-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-notion-muted font-medium animate-pulse">Synchronizing Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-notion-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#202020] border border-[#373737] rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-12 h-12 bg-notion-blue rounded-xl flex items-center justify-center text-white shadow-xl">
              <IconCheckSquare className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-white">Focus Space</h1>
          </div>
          <p className="text-notion-muted mb-8 text-sm text-center">Your personal workspace for tasks, habits, and projects. Sign in to sync your data across devices.</p>
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-semibold py-3 px-4 rounded-xl transition-all shadow-lg"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    setGoogleAccessToken(null);
    localStorage.removeItem('google_access_token');
    logout();
  };

  return (
    <div className="min-h-screen bg-notion-bg text-notion-text font-sans pb-40 relative">
      {/* User Profile in Top Right Corner */}
      <div className="absolute top-8 right-12 flex items-center gap-2 bg-[#202020] border border-[#373737] rounded-full px-3 py-1.5 z-50">
        <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-6 h-6 rounded-full" />
        <span className="text-xs font-medium text-gray-300">{user.displayName}</span>
        <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 ml-2 font-bold uppercase tracking-wider">Sign Out</button>
      </div>
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
                 <div className="text-xl font-bold text-white">{filteredTasks.filter(t => t.nextDue === today && t.status !== Status.DONE).length} Tasks Remaining</div>
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
              { label: 'Job Search', icon: IconBriefcase },
              { label: 'Projects', icon: IconLightbulb },
              { label: 'Analytics', icon: IconBarChart },
              { label: 'Calendar', icon: IconCalendar },
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
          <div className="flex items-center gap-4">
            <SmartTaskInput 
            onAddTask={(t) => {
              let finalTask = { ...t };
              // If we're in a specific view, force the flag
              if (view === 'Grocery Run') {
                finalTask.isGrocery = true;
                finalTask.isFitness = false;
              } else if (view === 'Fitness') {
                finalTask.isFitness = true;
                finalTask.isGrocery = false;
                finalTask.isJobSearch = false;
                finalTask.category = finalTask.category || FitnessCategory.DAILY;
              } else if (view === 'Job Search') {
                finalTask.isJobSearch = true;
                finalTask.isFitness = false;
                finalTask.isGrocery = false;
                finalTask.isProject = false;
              } else if (view === 'Projects') {
                finalTask.isProject = true;
                finalTask.isJobSearch = false;
                finalTask.isFitness = false;
                finalTask.isGrocery = false;
              } else {
                // In other views, infer from the parsed data
                // If Gemini found reps or isHomeWorkout, it's likely a fitness task
                const isLikelyFitness = !!t.reps || !!t.isHomeWorkout || t.title.toLowerCase().includes('workout') || t.title.toLowerCase().includes('exercise');
                const isLikelyGrocery = t.title.toLowerCase().includes('buy') || t.title.toLowerCase().includes('grocery') || t.title.toLowerCase().includes('shop');
                const isLikelyJobSearch = t.title.toLowerCase().includes('job') || t.title.toLowerCase().includes('apply') || t.title.toLowerCase().includes('interview') || !!t.company;
                const isLikelyProject = t.title.toLowerCase().includes('project') || t.title.toLowerCase().includes('idea') || t.title.toLowerCase().includes('build');
                
                finalTask.isFitness = isLikelyFitness;
                finalTask.isGrocery = isLikelyGrocery;
                finalTask.isJobSearch = isLikelyJobSearch;
                finalTask.isProject = isLikelyProject;
                
                if (isLikelyFitness && !finalTask.category) {
                  finalTask.category = FitnessCategory.DAILY;
                }
              }
              handleAddTask(finalTask);
            }} 
          />
          </div>
        </div>
      </header>

      <main className="px-12">
        {view === 'By Status' ? (
           <KanbanBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(s) => handleAddTask({ title: 'New Task', status: s, frequency: Frequency.ONCE, priority: Priority.MEDIUM, nextDue: today, isFitness: false, isGrocery: false, isJobSearch: false })} onDeleteTask={handleDeleteTask} />
        ) : view === 'Fitness' ? (
           <FitnessBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(cat) => handleAddTask({ title: 'New Exercise', status: Status.TODO, frequency: Frequency.DAILY, priority: Priority.MEDIUM, nextDue: today, category: cat, isFitness: true, isGrocery: false, isJobSearch: false })} onDeleteTask={handleDeleteTask} />
        ) : view === 'Job Search' ? (
           <JobSearchBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(t) => handleAddTask({ ...t, isJobSearch: true, isFitness: false, isGrocery: false, isProject: false })} onDeleteTask={handleDeleteTask} />
        ) : view === 'Projects' ? (
           <ProjectsBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(t) => handleAddTask({ ...t, isProject: true, isJobSearch: false, isFitness: false, isGrocery: false })} onDeleteTask={handleDeleteTask} />
        ) : view === 'Analytics' ? (
            <AnalyticsDashboard tasks={tasks} />
        ) : view === 'Calendar' ? (
            <CalendarView 
              tasks={tasks} 
              onUpdateTask={handleUpdateTask} 
              googleAccessToken={googleAccessToken}
              onConnectGoogle={handleGoogleLogin}
              onDisconnectGoogle={handleDisconnectCalendar}
            />
        ) : (
           <TaskTable 
             tasks={filteredTasks} 
             onUpdateTask={handleUpdateTask} 
             onReorderTasks={handleReorderTasks}
             sortConfig={sortConfig} 
             onSortChange={setSortConfig} 
             onDeleteTask={handleDeleteTask} 
             onAddTask={(s, title) => {
               const isGrocery = view === 'Grocery Run';
               const isJobSearch = view === 'Job Search';
               const isProject = view === 'Projects';
               handleAddTask({ title, status: s, frequency: Frequency.ONCE, priority: Priority.MEDIUM, nextDue: today, isGrocery, isJobSearch, isProject, isFitness: false });
             }} 
           />
        )}
      </main>

      <ZoraAssistant tasks={tasks} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
    </div>
  );
};

export default App;