import React, { useState, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocFromServer } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signInWithGoogleRedirect, logout, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, GoogleAuthProvider, getRedirectResult } from 'firebase/auth';
import TaskTable, { getLocalToday } from './components/TaskTable';
import SmartTaskInput from './components/SmartTaskInput';
import SortPopup from './components/SortPopup';
import KanbanBoard from './components/KanbanBoard';
import FitnessBoard from './components/FitnessBoard';
import JobSearchBoard from './components/JobSearchBoard';
import ProjectsBoard from './components/ProjectsBoard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CalendarView from './components/CalendarView';
import ScheduleView from './components/ScheduleView';
import ZoraAssistant from './components/ZoraAssistant';
import ErrorBoundary from './components/ErrorBoundary';
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
  IconCalendar,
  IconClock
} from './components/Icons';

const App: React.FC = () => {
  const [user, loadingAuth] = useAuthState(auth);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [view, setView] = useState<ViewType>('Schedule');
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortOption[]>([]);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Handle redirect result on mount
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            setGoogleAccessToken(credential.accessToken);
            localStorage.setItem('google_access_token', credential.accessToken);
          }
        }
      } catch (error: any) {
        console.error("Redirect Login Error:", error);
        setLoginError(error.message);
      }
    };
    checkRedirect();
  }, []);

  const handleGoogleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        localStorage.setItem('google_access_token', credential.accessToken);
      }
    } catch (error: any) {
      console.error("Google Login Error:", error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError("The sign-in popup was blocked by your browser. Please enable popups for this site or use the 'Try Redirect' option below.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("This domain is not authorized for Google Sign-In. Please add this domain to your Firebase Console's authorized domains.");
      } else {
        setLoginError(error.message || "An unexpected error occurred during sign-in.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLoginRedirect = async () => {
    setLoginError(null);
    try {
      await signInWithGoogleRedirect();
    } catch (error: any) {
      setLoginError(error.message);
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
          updated.status = Status.TODO;
        }
        return updated;
      });

      setTasks(resetTasks);
      setHasLoaded(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
      setHasLoaded(true);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTask = async (newTaskData: Partial<Task>, customTitle?: string) => {
    if (!user) return;

    try {
      const today = getLocalToday();
      await addDoc(collection(db, 'tasks'), {
        title: customTitle || newTaskData.title || 'New Task',
        status: newTaskData.status || Status.TODO,
        frequency: newTaskData.frequency || Frequency.ONCE,
        priority: newTaskData.priority || Priority.MEDIUM,
        nextDue: newTaskData.nextDue || today,
        isFitness: newTaskData.isFitness || false,
        isGrocery: newTaskData.isGrocery || false,
        isJobSearch: newTaskData.isJobSearch || false,
        isProject: newTaskData.isProject || false,
        uid: user.uid,
        streak: 0,
        lastCompleted: null,
        order: tasks.length,
        ...newTaskData
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'tasks');
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    if (!user) return;
    try {
      const { id, ...data } = updatedTask;
      await updateDoc(doc(db, 'tasks', id), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${updatedTask.id}`);
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
      handleFirestoreError(e, OperationType.WRITE, 'tasks (batch reorder)');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `tasks/${taskId}`);
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
       return !task.isFitness && !task.isGrocery && !task.isJobSearch && !task.isProject && !task.isWeeklyTracker;
    }
    
    return true;
  });

  const handleReset = async () => {
    setSearch('');
    setSortConfig([]);
    // Correctly reset the 'order' field for all tasks to be sequential in Firestore
    const batch = writeBatch(db);
    const sorted = [...tasks].sort((a, b) => (a.id > b.id ? 1 : -1));
    sorted.forEach((task, index) => {
      batch.update(doc(db, 'tasks', task.id), { order: index });
    });
    await batch.commit();
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
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs leading-relaxed">
              <p className="font-bold mb-1">Sign-in Error:</p>
              {loginError}
            </div>
          )}

          <button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-semibold py-3 px-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isLoggingIn ? 'Connecting...' : 'Continue with Google'}
          </button>

          <button 
            onClick={handleGoogleLoginRedirect}
            className="w-full mt-3 flex items-center justify-center gap-3 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 font-semibold py-3 px-4 rounded-xl transition-all border border-[#373737]"
          >
            Try Redirect (if popup fails)
          </button>

          <div className="mt-8 pt-6 border-t border-[#333] text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Trouble signing in?</p>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              Ensure popups are enabled in your browser settings. If you're on a custom domain, make sure it's added to the "Authorized domains" list in your Firebase Console.
            </p>
          </div>
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
    <ErrorBoundary>
      <div className="min-h-screen bg-notion-bg text-notion-text font-sans pb-40 relative">
      {/* User Profile in Top Right Corner */}
      <div className="absolute top-4 right-4 md:top-8 md:right-12 flex items-center gap-2 bg-[#202020] border border-[#373737] rounded-full px-3 py-1.5 z-50">
        <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-6 h-6 rounded-full" />
        <span className="text-xs font-medium text-gray-300 hidden sm:inline">{user.displayName}</span>
        <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 ml-2 font-bold uppercase tracking-wider">Sign Out</button>
      </div>
      <header className="px-4 md:px-12 pt-8 md:pt-12">
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

        <div className="flex items-center justify-between border-b border-notion-border overflow-x-auto no-scrollbar">
          <div className="flex gap-2 md:gap-4 flex-nowrap">
            {[
              { label: 'All Tasks', icon: IconList },
              { label: 'Schedule', icon: IconClock },
              { label: 'Calendar', icon: IconCalendar },
              { label: 'Analytics', icon: IconBarChart },
              { label: 'Projects', icon: IconLightbulb },
              { label: 'Fitness', icon: IconDumbbell },
              { label: 'Job Search', icon: IconBriefcase },
              { label: 'Grocery Run', icon: IconShoppingCart },
              { label: 'By Status', icon: IconLayout },
            ].map((v) => (
              <button key={v.label} onClick={() => setView(v.label as ViewType)} className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors border-b-2 whitespace-nowrap ${view === v.label ? 'border-white text-white font-medium' : 'border-transparent text-notion-muted hover:text-gray-300'}`}>
                <v.icon className="w-4 h-4" /> {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="relative flex-1 md:flex-none min-w-[150px]">
              <IconSearch className="w-4 h-4 text-notion-muted absolute left-2 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent border border-transparent hover:border-notion-border focus:border-blue-500 rounded px-2 py-1 pl-8 text-sm outline-none w-full md:w-48 transition-colors" />
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-all ${sortConfig.length > 0 ? 'text-blue-500 bg-blue-500/10' : 'text-notion-muted hover:bg-notion-hover'}`}
              >
                <IconSort className="w-4 h-4" />
                <span className="hidden sm:inline">Sort</span> {sortConfig.length > 0 && `(${sortConfig.length})`}
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
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
          <div className="w-full md:w-auto">
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

      <main className="px-4 md:px-12">
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
        ) : view === 'Schedule' ? (
            <ScheduleView 
              tasks={tasks}
              onUpdateTask={handleUpdateTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
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
               const currentView = view as string;
               const isGrocery = currentView === 'Grocery Run';
               const isJobSearch = currentView === 'Job Search';
               const isProject = currentView === 'Projects';
               handleAddTask({ title, status: s, frequency: Frequency.ONCE, priority: Priority.MEDIUM, nextDue: today, isGrocery, isJobSearch, isProject, isFitness: false });
             }} 
           />
        )}
      </main>

      <ZoraAssistant tasks={tasks} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
    </div>
    </ErrorBoundary>
  );
};

export default App;