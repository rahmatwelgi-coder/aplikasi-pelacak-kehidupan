/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ExpenseCategory {
  id: string;
  icon: string;
  label: string;
  color: string;
  locked?: boolean;
}

export interface CustomExpense {
  id: string;
  name: string;
  amt: number;
  icon: string;
}

export interface WorkoutType {
  id: string;
  label: string;
  icon: string;
  color: string;
  xp: number;
}

export interface WorkoutLog {
  type: string;
  dur: number;
  sets: number;
  reps: number;
  note: string;
}

export interface Habit {
  id: number;
  icon: string;
  name: string;
  xp: number;
}

export interface AppState {
  name: string;
  budget: number;
  month: number; // 0-11
  year: number;
  streak: number;
  lastDate: string | null;
  expenses: Record<string, number>;
  workouts: Record<string, WorkoutLog>;
  habits: Habit[];
  checkedToday: Record<string, number>; // id to id map or list
  customExp: CustomExpense[];
  catatan?: Record<string, string>; // date to text note
  customWkXP?: Record<string, number>; // custom xp per workout type
  catBudget?: Record<string, number>; // category budget limit
  goals?: Goal[];
  habitHistory?: Record<string, number[]>; // date string "YYYY-MM-DD" to array of habit IDs
  longestStreak?: number;
  activityLogs?: HistoryLog[];
  expenseHistory?: Record<string, MonthlyExpenseSnapshot>; // key is "YYYY-MM"
  weeklyHighlights?: WeeklyHighlights;
}

export interface HistoryLog {
  id: string;
  timestamp: string; // ISO String complete timestamp
  type: "workout" | "expense" | "habit" | "goal" | "system";
  action: string;
  details: string;
  value?: number;
}

export interface MonthlyExpenseSnapshot {
  year: number;
  month: number; // 0-11
  expenses: Record<string, number>;
  customExp: CustomExpense[];
  budget: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  progress: number;
  deadline: string;
  completed: boolean;
  speed?: number; // Kecepatan saat ini (Rp per minggu atau unit/minggu)
  estimatedDate?: string; // Estimasi tanggal selesai (YYYY-MM-DD)
}

export interface WeeklyHighlights {
  expenseChange: string;
  expenseStatus: "success" | "warning" | "info" | "neutral";
  habitChange: string;
  habitStatus: "success" | "warning" | "info" | "neutral";
  workoutChange: string;
  workoutStatus: "success" | "warning" | "info" | "neutral";
  suggestion: string;
}

export interface LevelDefinition {
  min: number;
  title: string;
  color: string;
}
