import React, { useState, useEffect } from 'react';
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
import { IconChevronLeft, IconChevronRight, IconRotateCcw } from './Icons';
import { getLocalToday, calculateNextDue } from './TaskTable';
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
      if (task.lastCompleted !== today) {
        updates.streak = (task.streak || 0) + 1;
        updates.lastCompleted = today;
      }
      if (task.frequency !== Frequency.ONCE) {
        updates.nextDue = calculateNextDue(task.frequency, today);
      }
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
    <div className="bg-[#191919] border border-notion-border rounded-xl overflow-hidden shadow-2xl">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-notion-border bg-[#202020]">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button 
            onClick={fetchGoogleEvents}
            disabled={isLoadingEvents || !googleAccessToken}
            className={`p-1.5 rounded-lg transition-colors ${
              isLoadingEvents ? 'text-blue-500 animate-spin' : 'text-notion-muted hover:text-white hover:bg-notion-hover'
            }`}
            title="Sync Google Calendar"
          >
            <IconRotateCcw className="w-4 h-4" />
          </button>
          <div className="group relative">
            <div className="w-4 h-4 rounded-full border border-notion-muted text-notion-muted flex items-center justify-center text-[10px] cursor-help">?</div>
            <div className="absolute left-0 top-6 w-64 p-3 bg-[#252525] border border-notion-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] text-[11px] text-notion-muted leading-relaxed">
              <p className="mb-2 text-white font-medium">Why Firebase?</p>
              <p>Firebase handles the secure "Login with Google" process. It provides the temporary access token needed to talk to the Google Calendar API directly from your browser. Your calendar data is <span className="text-white">never stored</span> in Firebase.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {calendarError ? (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg max-w-[500px]">
              <span className="text-[10px] text-red-400 font-medium leading-normal" title={calendarError}>
                {calendarError}
              </span>
              <button 
                onClick={onConnectGoogle}
                className="text-[10px] bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-1 rounded transition-colors whitespace-nowrap self-start mt-0.5"
              >
                Reconnect
              </button>
            </div>
          ) : !googleAccessToken ? (
            <div className="flex flex-col items-end gap-1">
              <button 
                onClick={onConnectGoogle}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-all border border-white/10"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" className="w-3 h-3" />
                Connect Google Calendar
              </button>
              <span className="text-[9px] text-notion-muted italic">Requires "Calendar Read" permission in popup</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] text-green-500 font-bold uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Google Calendar Connected
              </div>
              <button 
                onClick={onDisconnectGoogle}
                className="text-[10px] text-notion-muted hover:text-red-400 transition-colors font-bold uppercase tracking-wider"
              >
                Disconnect
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button 
              onClick={prevMonth}
              className="p-2 hover:bg-notion-hover rounded-lg text-notion-muted hover:text-white transition-colors"
            >
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 text-sm font-medium text-notion-muted hover:text-white hover:bg-notion-hover rounded-lg transition-colors"
            >
              Today
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 hover:bg-notion-hover rounded-lg text-notion-muted hover:text-white transition-colors"
            >
              <IconChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-notion-border bg-[#202020]/50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-bold text-notion-muted uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-[120px]">
        {calendarDays.map((day, idx) => {
          const dayTasks = getTasksForDay(day);
          const dayGoogleEvents = getGoogleEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={day.toString()} 
              className={`border-r border-b border-notion-border p-2 transition-colors hover:bg-[#202020]/30 relative ${
                !isCurrentMonth ? 'bg-[#151515]/50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs font-medium ${
                  isToday 
                    ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center -ml-1 -mt-1' 
                    : isCurrentMonth ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="space-y-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                {/* Google Events */}
                {dayGoogleEvents.map(event => (
                  <div 
                    key={event.id}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-300 truncate"
                    title={`Google Event: ${event.summary}`}
                  >
                    📅 {event.summary}
                  </div>
                ))}

                {/* Local Tasks */}
                {dayTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => handleToggleTask(task)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${getPriorityColor(task.priority)} ${
                      task.status === Status.DONE ? 'opacity-40 grayscale' : ''
                    }`}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
