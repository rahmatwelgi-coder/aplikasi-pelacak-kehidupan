/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, LevelDefinition } from "./types";
import { LEVELS, DEFAULT_WK, DEFAULT_HABITS } from "./constants";

export const fmtRp = (n: number) => {
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID");
};

export const fmtK = (n: number) => {
  if (n >= 1e6) {
    return (n / 1e6).toFixed(1) + "jt";
  }
  if (n >= 1e3) {
    return Math.round(n / 1e3) + "rb";
  }
  return String(Math.round(n || 0));
};

export function getLv(xp: number) {
  let idx = 0;
  for (let j = LEVELS.length - 1; j >= 0; j--) {
    if (xp >= LEVELS[j].min) {
      idx = j;
      break;
    }
  }
  const currentLevel = LEVELS[idx];
  const nextLevel = LEVELS[idx + 1] || { min: currentLevel.min + 600, title: "Grandmaster", color: "#C9A84C" };
  
  const cur = xp - currentLevel.min;
  const need = nextLevel.min - currentLevel.min;
  const pct = Math.min(100, Math.round((cur / need) * 100));
  
  return {
    ...currentLevel,
    num: idx + 1,
    cur,
    need,
    pct
  };
}

export function daysInMonth(y: number, m: number) {
  const dim = new Date(y, m + 1, 0).getDate();
  const DAYS_S = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  return Array.from({ length: dim }, (_, i) => {
    const dt = new Date(y, m, i + 1);
    // Pad with zeroes for exact key
    const yearStr = y;
    const monthStr = String(m + 1).padStart(2, "0");
    const dayStr = String(i + 1).padStart(2, "0");
    const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
    return {
      date: dateKey,
      day: i + 1,
      wd: DAYS_S[dt.getDay()]
    };
  });
}

export function totalExp(state: AppState): number {
  const baseExpenses = Object.values(state.expenses || {}).reduce((a, v) => a + (v || 0), 0);
  const customExpenses = (state.customExp || []).reduce((a, e) => a + (e.amt || 0), 0);
  return baseExpenses + customExpenses;
}

export function totalWkXP(state: AppState, wkTypes: any[]): number {
  return Object.values(state.workouts || {}).reduce((a, w) => {
    const customXp = state.customWkXP?.[w.type];
    if (customXp !== undefined) return a + customXp;
    const t = wkTypes.find((x) => x.id === w.type);
    return a + (t?.xp || 0);
  }, 0);
}

export function totalHabXP(state: AppState): number {
  return Object.values(state.checkedToday || {}).reduce((a, v) => {
    const h = (state.habits || []).find((x) => x.id === v);
    return a + (h?.xp || 0);
  }, 0);
}

export function generateMockHabitHistory() {
  const history: Record<string, number[]> = {};
  const today = new Date();
  for (let i = 180; i > 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (Math.random() < 0.75) {
      const activeIds = [1, 2, 3, 4, 5];
      const count = Math.floor(Math.random() * 4) + 1; // 1 to 4 checked
      const shuffled = [...activeIds].sort(() => 0.5 - Math.random());
      history[dateStr] = shuffled.slice(0, count);
    }
  }
  return history;
}

export function generateMockWorkouts() {
  const workouts: Record<string, any> = {};
  const today = new Date();
  const types = ["push", "pull", "legs", "cardio", "core", "full"];
  const notes = [
    "Sesi luar biasa, bench press lancar",
    "Fokus teknik squat, lutut aman",
    "Lari sore terasa segar, pace stabil",
    "Pull up tambah repetisi",
    "Latihan core intensif",
    "Full body sirkuit membakar lemak",
    "Angkat beban maksimal hari ini"
  ];

  for (let i = 180; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    
    // 60% chance of workout on any given day
    if (Math.random() < 0.6) {
      const type = types[Math.floor(Math.random() * types.length)];
      workouts[dateStr] = {
        type,
        dur: 30 + Math.floor(Math.random() * 45),
        sets: 3 + Math.floor(Math.random() * 3),
        reps: 8 + Math.floor(Math.random() * 12),
        note: Math.random() < 0.4 ? notes[Math.floor(Math.random() * notes.length)] : ""
      };
    } else {
      workouts[dateStr] = {
        type: "rest",
        dur: 0,
        sets: 0,
        reps: 0,
        note: ""
      };
    }
  }
  return workouts;
}

export function generateMockExpenseHistory() {
  const expenseHistory: Record<string, any> = {};
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    
    const factor = 0.8 + Math.random() * 0.45; // slightly varying factors
    expenseHistory[monthKey] = {
      year,
      month,
      budget: 2000000,
      expenses: {
        makan: Math.round(350000 * factor),
        rokok: Math.round(140000 * factor),
        hiburan: Math.round(50000 * (Math.random() < 0.7 ? factor : 0.3)),
        jajanan: Math.round(161000 * factor),
        bensin: Math.round(20000 * factor),
        outfit: Math.round(97000 * (Math.random() < 0.5 ? factor : 0.4)),
        kampus: Math.round(257162 * factor),
        laundry: Math.round(30000 * (Math.random() < 0.8 ? factor : 0.5)),
        darurat: Math.round(115000 * (Math.random() < 0.3 ? factor : 0.2)),
        tabungan: 500000
      },
      customExp: []
    };
  }
  return expenseHistory;
}

export function generateMockActivityLogs() {
  const activityLogs: any[] = [];
  const today = new Date();
  const logTypes = ["workout", "expense", "habit", "goal"];
  const sampleExNames = ["Makan Nasi Padang", "Beli Kopi Susu", "Isi Premium Bensin", "Cetak Buku Tugas", "Laundry Wangi"];
  const sampleExAmts = [24000, 18000, 20000, 15000, 12000];
  const habitNames = ["Olahraga 30 menit", "Baca buku", "No sosmed pagi", "Minum 8 gelas air", "Tidur sebelum 23.00"];

  for (let i = 50; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - Math.floor(i * 0.5));
    d.setHours(7 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0);
    const timestamp = d.toISOString();
    const type = logTypes[Math.floor(Math.random() * logTypes.length)];

    if (type === "workout") {
      const wTypes = ["push", "pull", "cardio", "core", "legs", "full"];
      const wType = wTypes[Math.floor(Math.random() * wTypes.length)];
      activityLogs.push({
        id: `init_wk_${i}`,
        timestamp,
        type: "workout",
        action: `Latihan Selesai: ${wType.toUpperCase()}`,
        details: `Menyelesaikan sesi latihan selama ${30 + Math.floor(Math.random() * 30)} menit.`,
        value: 30 + Math.floor(Math.random() * 30)
      });
    } else if (type === "expense") {
      const name = sampleExNames[Math.floor(Math.random() * sampleExNames.length)];
      const amt = sampleExAmts[Math.floor(Math.random() * sampleExAmts.length)];
      activityLogs.push({
        id: `init_ex_${i}`,
        timestamp,
        type: "expense",
        action: `Pengeluaran Baru: ${name}`,
        details: `Melakukan pembayaran sebesar Rp ${amt.toLocaleString("id-ID")}`,
        value: amt
      });
    } else if (type === "habit") {
      const habitName = habitNames[Math.floor(Math.random() * habitNames.length)];
      activityLogs.push({
        id: `init_hb_${i}`,
        timestamp,
        type: "habit",
        action: `Habit Selesai: ${habitName}`,
        details: `Telah dicentang dan diselesaikan`,
        value: 15
      });
    } else {
      activityLogs.push({
        id: `init_gl_${i}`,
        timestamp,
        type: "goal",
        action: `Progress Goal: Lari 50km Sebulan`,
        details: `Progress meningkat sebesar 5km`,
        value: 5
      });
    }
  }
  return activityLogs;
}

export function calculateStreak(history: Record<string, number[]>) {
  const allDates = Object.keys(history).sort();
  if (allDates.length === 0) return { current: 0, longest: 0 };

  // Calculate current streak from yesterday going backward
  let current = 0;
  let checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1);
  while (true) {
    const key = checkDate.toISOString().slice(0, 10);
    if (history[key] && history[key].length > 0) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longest = 0;
  let curRun = 0;
  let prevDate: Date | null = null;
  for (const dStr of allDates) {
    if (history[dStr] && history[dStr].length > 0) {
      const d = new Date(dStr);
      d.setHours(0,0,0,0);
      if (prevDate === null) {
        curRun = 1;
      } else {
        const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          curRun++;
        } else if (diffDays > 1) {
          curRun = 1;
        }
      }
      prevDate = d;
      if (curRun > longest) longest = curRun;
    }
  }

  return { current, longest: Math.max(longest, current) };
}

export function makeDefaultState(name = ""): AppState {
  const today = new Date();
  const mockHistory = generateMockHabitHistory();
  const streaks = calculateStreak(mockHistory);
  const mockWorkouts = generateMockWorkouts();
  const mockExpenseHistory = generateMockExpenseHistory();
  const mockActivityLogs = generateMockActivityLogs();
  
  return {
    budget: 2000000,
    month: today.getMonth(),
    year: today.getFullYear(),
    name: name,
    streak: streaks.current,
    longestStreak: streaks.longest,
    lastDate: today.toISOString().slice(0, 10),
    expenses: {
      makan: 350000,
      rokok: 140000,
      hiburan: 0,
      jajanan: 161000,
      bensin: 20000,
      outfit: 97000,
      kampus: 257162,
      laundry: 0,
      darurat: 115000,
      tabungan: 500000
    },
    workouts: mockWorkouts,
    habits: [...DEFAULT_HABITS],
    checkedToday: {},
    customExp: [],
    catatan: {},
    goals: [
      { id: "g_laptop", name: "Laptop", target: 8000000, progress: 3200000, speed: 400000, deadline: "2026-10-15", completed: false },
      { id: "g1", name: "Lari 50km Sebulan", target: 50, progress: 15, deadline: "2026-07-31", completed: false },
      { id: "g2", name: "Menabung untuk Investasi", target: 1000000, progress: 500000, deadline: "2026-08-15", completed: false }
    ],
    habitHistory: mockHistory,
    activityLogs: mockActivityLogs,
    expenseHistory: mockExpenseHistory,
    theme: "light",
    lang: "id"
  };
}
