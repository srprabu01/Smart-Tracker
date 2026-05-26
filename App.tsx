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
import BucketlistBoard from './components/BucketlistBoard';
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
  IconClock,
  IconHeart
} from './components/Icons';

const App: React.FC = () => {
  const [user, loadingAuth] = useAuthState(auth);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('isGuest') === 'true');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [view, setView] = useState<ViewType>('Schedule');
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortOption[]>([]);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Determine effective user
  const effectiveUser = useMemo(() => {
    if (user) return user;
    if (isGuest) return { uid: 'guest', displayName: 'Guest User', photoURL: null } as any;
    return null;
  }, [user, isGuest]);

  const handleGuestLogin = () => {
    setIsGuest(true);
    localStorage.setItem('isGuest', 'true');
    setHasLoaded(false); 
  };

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
          setIsGuest(false);
          localStorage.removeItem('isGuest');
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
      setIsGuest(false);
      localStorage.removeItem('isGuest');
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
    if (isGuest) return;
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
  }, [isGuest]);

  // 2. Data Sync logic (Firestore or LocalStorage)
  useEffect(() => {
    if (!effectiveUser) {
      setTasks([]);
      setHasLoaded(true);
      return;
    }

    if (isGuest) {
      const savedTasks = localStorage.getItem('guest_tasks');
      const loadedTasks = savedTasks ? JSON.parse(savedTasks) : [];
      
      const today = getLocalToday();
      const resetTasks = loadedTasks.map((task: Task) => {
        let updated = { ...task };
        if (updated.status === Status.DONE && updated.nextDue <= today && updated.frequency !== Frequency.ONCE) {
          updated.status = Status.TODO;
        }
        return updated;
      });
      
      setTasks(resetTasks);
      setHasLoaded(true);
      return;
    }

    const q = query(collection(db, 'tasks'), where('uid', '==', effectiveUser.uid));
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
  }, [effectiveUser, isGuest]);

  // Guest persistence logic
  useEffect(() => {
    if (isGuest && hasLoaded) {
      localStorage.setItem('guest_tasks', JSON.stringify(tasks));
    }
  }, [tasks, isGuest, hasLoaded]);

  const handleAddTask = async (newTaskData: Partial<Task>, customTitle?: string) => {
    if (!effectiveUser) return;

    const today = getLocalToday();
    const newTask = {
      id: isGuest ? Math.random().toString(36).substr(2, 9) : '',
      title: customTitle || newTaskData.title || 'New Task',
      status: newTaskData.status || Status.TODO,
      frequency: newTaskData.frequency || Frequency.ONCE,
      priority: newTaskData.priority || Priority.MEDIUM,
      nextDue: newTaskData.nextDue || today,
      isFitness: newTaskData.isFitness || false,
      isGrocery: newTaskData.isGrocery || false,
      isJobSearch: newTaskData.isJobSearch || false,
      isProject: newTaskData.isProject || false,
      isBucketlist: newTaskData.isBucketlist || false,
      uid: effectiveUser.uid,
      streak: 0,
      lastCompleted: null,
      order: tasks.length,
      ...newTaskData
    } as Task;

    if (isGuest) {
      setTasks(prev => [...prev, newTask]);
    } else {
      try {
        await addDoc(collection(db, 'tasks'), newTask);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'tasks');
      }
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    if (!effectiveUser) return;
    
    if (isGuest) {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    } else {
      try {
        const { id, ...data } = updatedTask;
        await updateDoc(doc(db, 'tasks', id), data);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `tasks/${updatedTask.id}`);
      }
    }
  };

  const handleReorderTasks = async (reorderedTasks: Task[]) => {
    if (!effectiveUser) return;

    const reorderedIds = new Set(reorderedTasks.map(t => t.id));

    if (isGuest) {
      setTasks(prev => {
        // Find tasks in the current global state that match the IDs we're reordering
        const tasksToMove = prev.filter(t => reorderedIds.has(t.id));
        // Extract their current order values and sort them to get the "order slots"
        const sortedOrders = tasksToMove.map(t => t.order ?? 0).sort((a, b) => a - b);
        
        // Map taskId to its index in the NEW reorderedTasks array
        const reorderIndexMap = new Map(reorderedTasks.map((t, i) => [t.id, i]));
        // Map taskId to the new task object
        const dataMap = new Map(reorderedTasks.map(t => [t.id, t]));
        
        const updatedTasks = prev.map(t => {
          if (reorderedIds.has(t.id)) {
            const index = reorderIndexMap.get(t.id)!;
            // Assign the i-th slot to the i-th task in the new sequence
            const newOrder = sortedOrders[index] ?? 0;
            return { ...dataMap.get(t.id)!, order: newOrder };
          }
          return t;
        });
        
        return updatedTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      });
    } else {
      // Find current orders of the subset in the existing state
      const tasksToMove = tasks.filter(t => reorderedIds.has(t.id));
      const sortedOrders = tasksToMove.map(t => t.order ?? 0).sort((a, b) => a - b);
      
      try {
        const batch = writeBatch(db);
        reorderedTasks.forEach((t, i) => {
          // Assign original slots to the new sequence
          const newOrder = sortedOrders[i] ?? i;
          batch.update(doc(db, 'tasks', t.id), { ...t, order: newOrder });
        });
        await batch.commit();
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'tasks (batch reorder)');
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!effectiveUser) return;

    if (isGuest) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `tasks/${taskId}`);
      }
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
    const isBucketlist = task.isBucketlist;

    if (view === 'Analytics') return true;
    if (view === 'Grocery Run') return task.isGrocery;
    if (view === 'Fitness') return task.isFitness;
    if (view === 'Job Search') return task.isJobSearch;
    if (view === 'Projects') return task.isProject;
    if (view === 'Bucketlist') return task.isBucketlist;
    
    // In "All Tasks" and "By Status", we hide special categories to keep the list clean
    if (view === 'All Tasks' || view === 'By Status') {
       return !task.isFitness && !task.isGrocery && !task.isJobSearch && !task.isProject && !task.isBucketlist && !task.isWeeklyTracker;
    }
    
    return true;
  });

  const handleReset = async () => {
    setSearch('');
    setSortConfig([]);
    
    if (isGuest) {
      setTasks(prev => [...prev].sort((a, b) => (a.id > b.id ? 1 : -1)).map((t, i) => ({ ...t, order: i })));
    } else {
      const batch = writeBatch(db);
      const sorted = [...tasks].sort((a, b) => (a.id > b.id ? 1 : -1));
      sorted.forEach((task, index) => {
        batch.update(doc(db, 'tasks', task.id), { order: index });
      });
      await batch.commit();
    }
  };

  if (loadingAuth || !hasLoaded) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-app-purple-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-app-muted font-medium animate-pulse">Synchronizing Workspace...</p>
        </div>
      </div>
    );
  }

  if (!effectiveUser) {
    return (
      <div className="min-h-screen bg-app-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-app-border rounded-3xl p-10 shadow-xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-app-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 transform rotate-3">
              <IconCheckSquare className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black text-app-ink tracking-tighter mb-2 font-display">Focus Space</h1>
            <p className="text-app-muted text-sm px-4">Your intelligent sanctuary for tasks, habits, and focus. Organized, minimal, and yours.</p>
          </div>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs leading-relaxed">
              <p className="font-bold mb-1">Sign-in Error:</p>
              {loginError}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 bg-app-ink hover:bg-black text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="white"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="white"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    opacity="0.8"
                  />
                  <path
                    fill="white"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    opacity="0.6"
                  />
                  <path
                    fill="white"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    opacity="0.4"
                  />
                </svg>
              )}
              {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
            </button>

            <button 
              onClick={handleGuestLogin}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-app-purple-50 text-app-purple-700 font-bold py-4 px-6 rounded-2xl transition-all border-2 border-app-purple-100 shadow-sm active:scale-95"
            >
              Continue as Guest
            </button>

            <button 
              onClick={handleGoogleLoginRedirect}
              className="w-full text-gray-500 hover:text-gray-400 py-2 text-xs transition-all underline underline-offset-4"
            >
              Use Redirect (if popup fails)
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-[#333] text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Trouble signing in?</p>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              Ensure popups are enabled. If you're using guest mode, your data will stay in this browser only and will be lost if you clear your cache.
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
    setIsGuest(false);
    localStorage.removeItem('isGuest');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-app-bg text-app-ink font-sans pb-40 relative selection:bg-app-purple-200">
      {/* User Profile in Top Right Corner */}
      <div className="absolute top-4 right-4 md:top-8 md:right-12 flex items-center gap-3 bg-white border border-app-border rounded-full pr-4 pl-1.5 py-1.5 z-50 shadow-sm">
        {effectiveUser.photoURL ? (
          <img src={effectiveUser.photoURL} alt={effectiveUser.displayName || ''} className="w-7 h-7 rounded-full shadow-sm" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-app-purple-600 flex items-center justify-center text-[11px] font-black text-white uppercase shadow-sm">
            {effectiveUser.displayName?.charAt(0) || 'G'}
          </div>
        )}
        <div className="flex flex-col -space-y-0.5">
          <span className="text-[10px] font-black text-app-ink leading-tight hidden sm:inline">{effectiveUser.displayName}</span>
          <button onClick={handleLogout} className="text-[9px] text-app-muted hover:text-red-500 font-black uppercase tracking-tighter transition-colors text-left">Disconnect</button>
        </div>
      </div>
      <header className="px-4 md:px-12 pt-8 md:pt-16">
        <div className="flex flex-col mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-app-purple-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-app-purple-900/20 transform -rotate-1 group">
              <IconCheckSquare className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-app-ink tracking-tight font-display">Focus Space</h1>
              <p className="text-[10px] text-app-muted font-black uppercase tracking-[0.2em]">{view} • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {view === 'All Tasks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-app-purple-50 border border-app-purple-100 rounded-3xl p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-app-purple-200/50 rounded-full blur-2xl group-hover:bg-app-purple-300 transition-colors"></div>
               <div className="flex justify-between items-start z-10">
                 <IconCalendar className="w-5 h-5 text-app-purple-700" />
                 <span className="text-2xl font-black text-app-purple-900 leading-none">{filteredTasks.filter(t => t.nextDue === today && t.status !== Status.DONE).length}</span>
               </div>
               <div className="z-10 text-[10px] text-app-purple-800 font-bold uppercase tracking-widest">Tasks for Today</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-200/50 rounded-full blur-2xl group-hover:bg-emerald-300 transition-colors"></div>
               <div className="flex justify-between items-start z-10">
                 <IconSparkles className="w-5 h-5 text-emerald-700" />
                 <span className="text-2xl font-black text-emerald-900 leading-none">{bestStreak}d</span>
               </div>
               <div className="z-10 text-[10px] text-emerald-800 font-bold uppercase tracking-widest">Active Streak</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-200/50 rounded-full blur-2xl group-hover:bg-amber-300 transition-colors"></div>
               <div className="flex justify-between items-start z-10">
                 <IconLightbulb className="w-5 h-5 text-amber-700" />
                 <span className="text-2xl font-black text-amber-900 leading-none">{tasks.filter(t => t.isProject).length}</span>
               </div>
               <div className="z-10 text-[10px] text-amber-800 font-bold uppercase tracking-widest">Active Projects</div>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-rose-200/50 rounded-full blur-2xl group-hover:bg-rose-300 transition-colors"></div>
               <div className="flex justify-between items-start z-10">
                 <IconBriefcase className="w-5 h-5 text-rose-700" />
                 <span className="text-2xl font-black text-rose-900 leading-none">{tasks.filter(t => t.isJobSearch).length}</span>
               </div>
               <div className="z-10 text-[10px] text-rose-800 font-bold uppercase tracking-widest">Career Goals</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-app-border mb-8 overflow-x-auto no-scrollbar">
          <div className="flex gap-1 md:gap-2 flex-nowrap pb-px">
            {[
              { label: 'All Tasks', icon: IconList },
              { label: 'By Status', icon: IconLayout },
              { label: 'Schedule', icon: IconClock },
              { label: 'Calendar', icon: IconCalendar },
              { label: 'Projects', icon: IconLightbulb },
              { label: 'Job Search', icon: IconBriefcase },
              { label: 'Fitness', icon: IconDumbbell },
              { label: 'Grocery Run', icon: IconShoppingCart },
              { label: 'Bucketlist', icon: IconHeart },
              { label: 'Analytics', icon: IconBarChart },
            ].map((v) => (
              <button key={v.label} onClick={() => setView(v.label as ViewType)} className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${view === v.label ? 'border-app-purple-600 text-app-purple-700 bg-app-purple-50/50' : 'border-transparent text-app-muted hover:text-app-ink'}`}>
                <v.icon className={`w-4 h-4 ${view === v.label ? 'text-app-purple-600' : 'text-gray-400'}`} /> {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between py-6 gap-6 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 md:flex-none min-w-[200px] group">
              <IconSearch className="w-4 h-4 text-app-muted absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-app-purple-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Find anything..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="bg-app-surface border border-app-border hover:border-app-purple-300 focus:border-app-purple-500 rounded-xl px-4 py-2.5 pl-10 text-sm outline-none w-full md:w-64 transition-all" 
              />
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${sortConfig.length > 0 ? 'text-app-purple-700 bg-app-purple-50 border-app-purple-200' : 'text-app-muted border-app-border hover:bg-app-surface'}`}
              >
                <IconSort className="w-4 h-4" />
                <span>Sort</span> {sortConfig.length > 0 && <span className="bg-app-purple-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] ml-1">{sortConfig.length}</span>}
              </button>
              {isSortMenuOpen && (
                <SortPopup 
                  sorts={sortConfig} 
                  onChange={setSortConfig} 
                  onClose={() => setIsSortMenuOpen(false)} 
                />
              )}
            </div>

            <button onClick={handleReset} className="text-app-muted hover:text-app-ink hover:bg-app-surface px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-transparent hover:border-app-border">
              <IconRotateCcw className="w-4 h-4" /> 
              <span>Reset</span>
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
              } else if (view === 'Bucketlist') {
                finalTask.isBucketlist = true;
                finalTask.isProject = false;
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
                const isLikelyBucketlist = t.title.toLowerCase().includes('bucket') || t.title.toLowerCase().includes('dream') || t.title.toLowerCase().includes('life goal') || t.title.toLowerCase().includes('wanna');
                
                finalTask.isFitness = isLikelyFitness;
                finalTask.isGrocery = isLikelyGrocery;
                finalTask.isJobSearch = isLikelyJobSearch;
                finalTask.isProject = isLikelyProject;
                finalTask.isBucketlist = isLikelyBucketlist;
                
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
           <FitnessBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(cat) => handleAddTask({ title: 'New Exercise', status: Status.TODO, frequency: Frequency.DAILY, priority: Priority.MEDIUM, nextDue: today, category: cat, isFitness: true, isGrocery: false, isJobSearch: false })} onDeleteTask={handleDeleteTask} onReorderTasks={handleReorderTasks} />
        ) : view === 'Job Search' ? (
           <JobSearchBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(t) => handleAddTask({ ...t, isJobSearch: true, isFitness: false, isGrocery: false, isProject: false })} onDeleteTask={handleDeleteTask} />
        ) : view === 'Projects' ? (
           <ProjectsBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(t) => handleAddTask({ ...t, isProject: true, isJobSearch: false, isFitness: false, isGrocery: false })} onDeleteTask={handleDeleteTask} />
        ) : view === 'Bucketlist' ? (
           <BucketlistBoard tasks={filteredTasks} onUpdateTask={handleUpdateTask} onAddTask={(t) => handleAddTask({ ...t, isBucketlist: true, isProject: false, isJobSearch: false, isFitness: false, isGrocery: false })} onDeleteTask={handleDeleteTask} />
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
              onReorderTasks={handleReorderTasks}
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
               const isBucketlist = currentView === 'Bucketlist';
               handleAddTask({ title, status: s, frequency: Frequency.ONCE, priority: Priority.MEDIUM, nextDue: today, isGrocery, isJobSearch, isProject, isBucketlist, isFitness: false });
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