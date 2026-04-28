export enum Status {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

export enum Priority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum Frequency {
  DAILY = 'Daily',
  WEEKDAYS = 'Weekdays',
  WEEKLY = 'Weekly',
  BIWEEKLY = 'Biweekly',
  MONTHLY = 'Monthly',
  ONCE = 'Once'
}

export enum FitnessCategory {
  ABS = 'Abs',
  GLUTES = 'Glutes',
  SNOWBOARD = 'Snowboard',
  DAILY = 'Daily Workout',
  OTHERS = 'Others'
}

export interface Task {
  id: string;
  uid: string;
  title: string;
  status: Status;
  frequency: Frequency;
  priority: Priority;
  nextDue: string; // ISO Date string
  lastCompleted: string | null; // ISO Date string
  streak: number;
  category?: string; // Optional category for grouping
  order?: number; // For manual drag and drop sorting
  isFitness?: boolean; // Explicit flag for fitness tasks
  isGrocery?: boolean; // Explicit flag for grocery tasks
  isJobSearch?: boolean; // Explicit flag for job search tasks
  isProject?: boolean; // Explicit flag for project tasks
  isWeeklyTracker?: boolean; // Explicit flag for weekly fitness tracker
  showInCalendar?: boolean; // If true, task appears in calendar view
  
  // Fitness specific fields
  reps?: string; // e.g. "3x12" or "30 mins"
  videoUrl?: string; // URL to a tutorial
  isHomeWorkout?: boolean; // If true, can be done at home

  // Job Search specific fields
  company?: string;
  role?: string;
  salary?: string;
  location?: string;
  link?: string;
  notes?: string;
  jobCount?: number; // Number of jobs applied to on this date
  
  // Schedule specific fields
  scheduledTime?: string | null; // e.g. "09:00"
  scheduledDuration?: number | null; // minutes
}

export interface SortOption {
  id: string;
  key: keyof Task;
  direction: 'asc' | 'desc';
}

export type ViewType = 'All Tasks' | 'Grocery Run' | 'By Status' | 'Fitness' | 'Job Search' | 'Projects' | 'Analytics' | 'Calendar' | 'Schedule';