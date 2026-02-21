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
  
  // Fitness specific fields
  reps?: string; // e.g. "3x12" or "30 mins"
  videoUrl?: string; // URL to a tutorial
  isHomeWorkout?: boolean; // If true, can be done at home
}

export interface SortOption {
  id: string;
  key: keyof Task;
  direction: 'asc' | 'desc';
}

export type ViewType = 'All Tasks' | 'Grocery Run' | 'By Status' | 'Fitness' | 'Analytics';