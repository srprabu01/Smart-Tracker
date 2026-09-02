import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  getDay,
  differenceInDays
} from 'date-fns';
import { Task, Status, Priority, Frequency } from '../types';
import { IconChevronLeft, IconChevronRight, IconRotateCcw, IconCalendar } from './Icons';
import { getLocalToday, calculateNextDue, getTaskCompletionUpdates } from './TaskTable';
import firebaseConfig from '../firebase-applet-config.json';

interface GoogleEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

interface CalendarViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  googleAccessToken: string | null;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onUpdateTask, googleAccessToken, onConnectGoogle, onDisconnectGoogle }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  useEffect(() => {
    if (googleAccessToken) {
      fetchGoogleEvents();
    }
  }, [googleAccessToken, currentMonth]);

  const fetchGoogleEvents = async () => {
    if (!googleAccessToken) return;
    setIsLoadingEvents(true);
    setCalendarError(null);
    try {
      const timeMin = monthStart.toISOString();
      const timeMax = monthEnd.toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Google Calendar API Error:', response.status, errorData);
        
        if (response.status === 401) {
          setCalendarError('Session expired. Please click "Reconnect" to sync your calendar.');
          return; // Don't throw, just set error
        }
        
        if (response.status === 403) {
          setCalendarError('403: Access Denied. 1) Check "See your calendar" during login. 2) If that fails, go to Google Cloud Console, select project "gen-lang-client-0468049179", and enable "Google Calendar API" in the Library.');
          return;
        }

        throw new Error(`Failed to fetch events: ${response.status}`);
      }
      
      const data = await response.json();
      setGoogleEvents(data.items || []);
    } catch (error) {
      console.error('Error fetching Google events:', error);
      setCalendarError(error instanceof Error ? error.message : 'An unknown error occurred while fetching Google events.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const calendarTasks = tasks.filter(t => t.showInCalendar);

  const shouldShowTaskOnDay = (task: Task, day: Date) => {
    const dueDate = parseISO(task.nextDue);
    
    // Always show on the exact next due date
    if (isSameDay(dueDate, day)) return true;

    // For recurring tasks, show on all applicable days in the calendar
    switch (task.frequency) {
      case Frequency.DAILY:
        return true;
      case Frequency.WEEKDAYS:
        const dw = getDay(day);
        return dw >= 1 && dw <= 5;
      case Frequency.WEEKLY:
        return getDay(day) === getDay(dueDate);
      case Frequency.BIWEEKLY:
        return Math.abs(differenceInDays(day, dueDate)) % 14 === 0;
      case Frequency.MONTHLY:
        return day.getDate() === dueDate.getDate();
      default:
        return false;
    }
  };

  const getTasksForDay = (day: Date) => {
    return calendarTasks.filter(t => shouldShowTaskOnDay(t, day));
  };

  const getGoogleEventsForDay = (day: Date) => {
    return googleEvents.filter(event => {
      const start = event.start.date || event.start.dateTime;
      if (!start) return false;
      return isSameDay(parseISO(start), day);
    });
  };

  const handleToggleTask = (task: Task) => {
    const today = getLocalToday();
    const isDone = task.status === Status.DONE;
    const newStatus = isDone ? Status.TODO : Status.DONE;
    
    let updates: Partial<Task> = { status: newStatus };
    
    if (newStatus === Status.DONE) {
      updates = getTaskCompletionUpdates(task, today);
    }
    
    onUpdateTask({ ...task, ...updates });
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.HIGH: return 'bg-red-500/20 text-red-400 border-red-500/30';
      case Priority.MEDIUM: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case Priority.LOW: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="bg-white border border-app-border rounded-[3rem] overflow-hidden shadow-sm mb-32">
      {/* Calendar Header */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between p-10 border-b border-app-border bg-white gap-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-app-purple-50 rounded-[1.5rem] border border-app-purple-100">
             <IconCalendar className="w-8 h-8 text-app-purple-600" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-app-ink tracking-tight font-display">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <button 
                onClick={fetchGoogleEvents}
                disabled={isLoadingEvents || !googleAccessToken}
                className={`p-1 rounded-lg transition-all ${
                  isLoadingEvents ? 'text-app-purple-500 animate-spin' : 'text-app-muted hover:text-app-purple-600'
                }`}
                title="Refresh Temporal Sync"
              >
                <IconRotateCcw className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-app-border mx-1"></div>
              <p className="text-[10px] font-black text-app-muted uppercase tracking-[0.2em]">Global Network Hub</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {calendarError ? (
            <div className="flex items-center gap-4 bg-rose-50 border border-rose-100 px-5 py-3 rounded-2xl">
              <span className="text-[10px] text-rose-600 font-black uppercase tracking-widest leading-normal">
                Connection Failed
              </span>
              <button 
                onClick={onConnectGoogle}
                className="text-[10px] bg-rose-500 hover:bg-rose-600 text-white font-black px-4 py-2 rounded-xl transition-all uppercase tracking-widest"
              >
                Retry
              </button>
            </div>
          ) : !googleAccessToken ? (
            <button 
              onClick={onConnectGoogle}
              className="flex items-center gap-3 bg-app-ink hover:bg-app-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 px-8 rounded-2xl transition-all shadow-xl hover:shadow-app-purple-200"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" className="w-4 h-4" />
              Temporal Sync
            </button>
          ) : (
            <div className="flex items-center gap-6 bg-app-surface px-6 py-3 rounded-[1.5rem] border border-app-border">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] text-app-ink font-black uppercase tracking-widest">Authorized</span>
              </div>
              <div className="w-px h-4 bg-app-border"></div>
              <button 
                onClick={onDisconnectGoogle}
                className="text-[10px] text-app-muted hover:text-rose-600 transition-colors font-black uppercase tracking-widest"
              >
                Sever
              </button>
            </div>
          )}
          
          <div className="flex items-center bg-app-surface p-1 rounded-2xl border border-app-border shadow-inner">
            <button 
              onClick={prevMonth}
              className="p-3 hover:bg-white rounded-xl text-app-muted hover:text-app-purple-600 transition-all hover:shadow-sm"
            >
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-6 py-2 text-[10px] font-black text-app-ink uppercase tracking-widest hover:text-app-purple-600 transition-colors"
            >
              Today
            </button>
            <button 
              onClick={nextMonth}
              className="p-3 hover:bg-white rounded-xl text-app-muted hover:text-app-purple-600 transition-all hover:shadow-sm"
            >
              <IconChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide pb-20 -mx-4 md:mx-0">
        <div className="min-w-[800px]">
          {/* Days Header */}
          <div className="grid grid-cols-7 bg-app-surface/50 border-b border-app-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-5 text-center text-[10px] font-black text-app-muted uppercase tracking-[0.3em]">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-[160px]">

        {calendarDays.map((day, idx) => {
          const dayTasks = getTasksForDay(day);
          const dayGoogleEvents = getGoogleEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={day.toString()} 
              className={`border-r border-b border-app-border p-4 transition-all hover:bg-app-purple-50/30 group relative ${
                !isCurrentMonth ? 'bg-app-surface/20' : 'bg-white'
              } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-xs font-black tabular-nums transition-all ${
                  isToday 
                    ? 'bg-app-purple-600 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-app-purple-200 -mt-1 -ml-1 scale-110' 
                    : isCurrentMonth ? 'text-app-ink' : 'text-app-muted opacity-30'
                }`}>
                  {format(day, 'd')}
                </span>
                {dayTasks.length + dayGoogleEvents.length > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-app-purple-400 opacity-50 group-hover:scale-150 transition-transform"></div>
                )}
              </div>
              
              <div className="space-y-1.5 overflow-y-auto max-h-[100px] pr-1 scrollbar-hide">
                {/* Google Events */}
                {dayGoogleEvents.map(event => (
                  <div 
                    key={event.id}
                    className="text-[9px] font-black uppercase tracking-tighter px-2.5 py-1.5 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 truncate shadow-sm"
                    title={`Google Event: ${event.summary}`}
                  >
                    {event.summary}
                  </div>
                ))}

                {/* Local Tasks */}
                {dayTasks.map(task => (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={task.id}
                    onClick={() => handleToggleTask(task)}
                    className={`text-[9px] font-black uppercase tracking-tighter px-2.5 py-1.5 rounded-lg border truncate cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
                      task.priority === Priority.HIGH ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      task.priority === Priority.MEDIUM ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-app-purple-50 text-app-purple-600 border-app-purple-100'
                    } ${
                      task.status === Status.DONE ? 'opacity-30 grayscale' : ''
                    }`}
                    title={task.title}
                  >
                    {task.title}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
    </div>
  );
};

export default CalendarView;
