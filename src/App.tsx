/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { AppState } from "./types";
import { WTYPES, LEVELS, MONTHS_ID } from "./constants";
import { fmtRp, fmtK, totalExp, totalWkXP, totalHabXP, getLv, makeDefaultState } from "./utils";
import { getTranslation } from "./translations";

// Tabs
import OverviewTab from "./components/OverviewTab";
import ExpenseTab from "./components/ExpenseTab";
import WorkoutTab from "./components/WorkoutTab";
import HabitTab from "./components/HabitTab";
import SettingsTab from "./components/SettingsTab";
import GoalsTab from "./components/GoalsTab";
import ReportTab from "./components/ReportTab";
import HistoryTab from "./components/HistoryTab";
import LoginScreen from "./components/LoginScreen";

type SyncStatus = "saved" | "saving" | "offline";
type TabId = "overview" | "expense" | "workout" | "habit" | "goals" | "report" | "history" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [user, setUser] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Application State
  const [state, setState] = useState<AppState | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("—");

  // Toasts
  const [toastMsg, setToastMsg] = useState("");
  const [isToastOpen, setIsToastOpen] = useState(false);

  // Prevent save loop on snapshot update
  const isUpdatingFromSnapshot = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocalChangeTime = useRef<number>(0);

  // Dynamic toast helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setIsToastOpen(true);
  };

  useEffect(() => {
    if (isToastOpen) {
      const t = setTimeout(() => setIsToastOpen(false), 2600);
      return () => clearTimeout(t);
    }
  }, [isToastOpen]);

  // Initial Boot & Session Restore Check
  useEffect(() => {
    async function boot() {
      const cachedUser = localStorage.getItem("lt_username");
      const cachedToken = localStorage.getItem("lt_token");
      if (cachedUser && cachedToken) {
        setUser(cachedUser);
        setToken(cachedToken);
        try {
          const res = await fetch(`/api/user/state/${encodeURIComponent(cachedUser)}`, {
            headers: { "Authorization": `Bearer ${cachedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.state) {
              setState(data.state);
              setSyncStatus("saved");
              setLastSavedTime(new Date().toLocaleTimeString("id-ID"));
            } else {
              const localData = localStorage.getItem(`lt_state_${cachedUser}`);
              setState(localData ? JSON.parse(localData) : makeDefaultState(cachedUser));
              setSyncStatus("offline");
            }
          } else {
            if (res.status === 401) {
              // Session expired/invalid - clear credentials
              localStorage.removeItem("lt_username");
              localStorage.removeItem("lt_token");
              setUser(null);
              setToken(null);
              setState(null);
            } else {
              const localData = localStorage.getItem(`lt_state_${cachedUser}`);
              setState(localData ? JSON.parse(localData) : makeDefaultState(cachedUser));
              setSyncStatus("offline");
            }
          }
        } catch (err) {
          console.error("Boot error:", err);
          const localData = localStorage.getItem(`lt_state_${cachedUser}`);
          setState(localData ? JSON.parse(localData) : makeDefaultState(cachedUser));
          setSyncStatus("offline");
        }
      } else {
        localStorage.removeItem("lt_username");
        localStorage.removeItem("lt_token");
        setUser(null);
        setToken(null);
        setState(null);
      }
      setIsLoading(false);
    }
    boot();
  }, []);

  // Periodically fetch state to sync changes across devices in real-time
  useEffect(() => {
    if (!user || !token) return;
    
    const interval = setInterval(async () => {
      // Don't poll if we are currently saving, or if there was a local change in the last 5 seconds
      if (syncStatus === "saving" || Date.now() - lastLocalChangeTime.current < 5000) return;
      
      try {
        const res = await fetch(`/api/user/state/${encodeURIComponent(user)}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.state) {
            const currentString = state ? JSON.stringify(state) : "";
            const remoteString = JSON.stringify(data.state);
 
            if (currentString !== remoteString && syncStatus !== "saving" && Date.now() - lastLocalChangeTime.current >= 5000) {
              isUpdatingFromSnapshot.current = true;
              setState(data.state);
              setSyncStatus("saved");
              setLastSavedTime(new Date().toLocaleTimeString("id-ID"));
              // Save the fresh synchronized copy locally too
              localStorage.setItem(`lt_state_${user}`, remoteString);
              setTimeout(() => {
                isUpdatingFromSnapshot.current = false;
              }, 100);
            }
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 4000); // 4 seconds interval for snappy sync without backend pressure
 
    return () => clearInterval(interval);
  }, [user, token, state, syncStatus]);
 
  // Auto-Save Effect (triggers on state changes)
  useEffect(() => {
    if (!state || !user || !token) return;
    if (isUpdatingFromSnapshot.current) return;
 
    // Write to localStorage immediately so that no state changes are ever lost on sudden close/reload
    localStorage.setItem(`lt_state_${user}`, JSON.stringify(state));
 
    // Track local change timestamp to prevent sync overwrite while active
    lastLocalChangeTime.current = Date.now();
    setSyncStatus("saving");
 
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
 
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/user/state", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ username: user, state })
        });
        
        if (res.ok) {
          setSyncStatus("saved");
          setLastSavedTime(new Date().toLocaleTimeString("id-ID"));
        } else {
          setSyncStatus("offline");
        }
      } catch (err) {
        console.error("Error saving online:", err);
        setSyncStatus("offline");
      }
    }, 1200); // Debounce saves to 1.2s to prevent database lockups
 
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state, user, token]);

  // Auth: Log In
  const handleLogin = async (username: string, pin: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Username atau PIN salah.");
      }

      localStorage.setItem("lt_username", data.username);
      localStorage.setItem("lt_token", data.token);
      setUser(data.username);
      setToken(data.token);
      setState(data.state);
      setSyncStatus("saved");
      setLastSavedTime(new Date().toLocaleTimeString("id-ID"));
      setIsLoading(false);
      showToast(`🔑 Selamat datang kembali, ${data.username}!`);
    } catch (err: any) {
      setIsLoading(false);
      throw new Error(err.message || "Username atau PIN salah.");
    }
  };

  // Auth: Register
  const handleRegister = async (username: string, pin: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat akun.");
      }

      // Automatically login after successful registration
      await handleLogin(username, pin);
    } catch (err: any) {
      setIsLoading(false);
      throw new Error(err.message || "Gagal membuat akun.");
    }
  };

  // Auth: Log Out
  const handleLogout = async () => {
    if (!confirm(`Keluar dari akun ${user}?\n\nSemua data kamu aman tersimpan online.`)) return;
    
    setIsLoading(true);
    localStorage.removeItem("lt_username");
    localStorage.removeItem("lt_token");
    setUser(null);
    setToken(null);
    setState(null);
    setIsLoading(false);
  };

  // Admin Option: Wipe Data
  const handleResetAllData = async () => {
    if (!user || !token) return;
    try {
      const res = await fetch("/api/user/reset", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ username: user })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState(data.state);
        setSyncStatus("saved");
        setLastSavedTime(new Date().toLocaleTimeString("id-ID"));
        showToast("🗑️ Seluruh data direset!");
      } else {
        showToast("❌ Gagal mereset data.");
      }
    } catch (err) {
      console.error("Reset error:", err);
      showToast("❌ Gagal mereset data.");
    }
  };

  // Export to Excel (Dynamic script creation)
  const handleExportExcel = () => {
    if (!state) return;
    showToast("⏳ Menyiapkan Excel...");
    
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => {
      const XLSX = (window as any).XLSX;
      if (!XLSX) return;

      const wb = XLSX.utils.book_new();
      
      // sheet 1: Expenses
      const baseExpensesData = [
        ["Kategori", "Jumlah (Rp)", "Status"],
        ...Object.entries(state.expenses || {}).map(([key, val]) => [
          key,
          val,
          key === "tabungan" ? "🔒 Terkunci" : "✅ Aktif",
        ]),
        ...state.customExp.map((e) => [e.name, e.amt, "📦 Kustom"]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(baseExpensesData), "💳 Pengeluaran");

      // sheet 2: Workout log
      const days = Array.from({ length: new Date(state.year, state.month + 1, 0).getDate() }, (_, i) => {
        const dayNum = i + 1;
        const dKey = `${state.year}-${String(state.month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        const log = state.workouts?.[dKey];
        return [
          dKey,
          log?.type || "rest",
          log?.dur || 0,
          log?.sets || 0,
          log?.reps || 0,
          log?.note || "",
        ];
      });

      const workoutSheetData = [
        ["Tanggal", "Tipe", "Durasi (mnt)", "Sets/Rounds", "Reps/Km", "Catatan"],
        ...days,
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(workoutSheetData), "🏋️ Workout");

      // sheet 3: Goals
      const goalsSheetData = [
        ["Nama Goal", "Target", "Progress", "Selesai (Ya/Tidak)", "Estimasi Selesai", "Kecepatan"],
        ...(state.goals || []).map((g) => [
          g.name,
          g.target,
          g.progress,
          g.completed ? "Ya" : "Tidak",
          g.deadline,
          g.speed !== undefined ? g.speed : "Tidak diset",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(goalsSheetData), "🎯 Goals");

      // sheet 4: Habit History
      const habitHistorySheetData = [
        ["Tanggal", "Jumlah Habit Selesai", "Daftar ID Habit Selesai"],
        ...Object.entries(state.habitHistory || {}).map(([date, ids]) => {
          const habitIds = (ids || []) as number[];
          return [
            date,
            habitIds.length,
            habitIds.join(", "),
          ];
        }),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(habitHistorySheetData), "✅ Habit History");

      // sheet 5: Activity Log
      const activityLogsSheetData = [
        ["Waktu", "Tipe", "Aksi", "Detail", "Nilai"],
        ...(state.activityLogs || []).map((log) => [
          log.timestamp ? new Date(log.timestamp).toLocaleString("id-ID") : "",
          log.type,
          log.action,
          log.details,
          log.value,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(activityLogsSheetData), "📋 Activity Log");

      XLSX.writeFile(wb, `LifeTracker_Export_${user}_${state.year}_${state.month + 1}.xlsx`);
      showToast("✅ Excel berhasil didownload!");
    };
    document.head.appendChild(s);
  };

  // State update callback
  const handleStateChange = (updates: Partial<AppState>) => {
    if (!state) return;

    // 1. Maintain expenseHistory snapshot for the current month
    const currentMonthKey = `${state.year}-${String(state.month + 1).padStart(2, "0")}`;
    const newExpenseHistory = { ...(state.expenseHistory || {}) };
    
    if (updates.expenses !== undefined || updates.customExp !== undefined || updates.budget !== undefined) {
      newExpenseHistory[currentMonthKey] = {
        year: state.year,
        month: state.month,
        expenses: updates.expenses !== undefined ? updates.expenses : state.expenses,
        customExp: updates.customExp !== undefined ? updates.customExp : state.customExp,
        budget: updates.budget !== undefined ? updates.budget : state.budget,
      };
      updates.expenseHistory = newExpenseHistory;
    }

    // 2. Generate activity logs with complete timestamp
    const newLogs: any[] = [];
    const timestampStr = new Date().toISOString();

    // Check workouts update
    if (updates.workouts) {
      Object.entries(updates.workouts).forEach(([dateStr, log]) => {
        const prevLog = state.workouts?.[dateStr];
        if (JSON.stringify(prevLog) !== JSON.stringify(log)) {
          if (log && log.type !== "rest") {
            newLogs.push({
              id: `log_wk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              timestamp: timestampStr,
              type: "workout",
              action: `Latihan Selesai: ${log.type.toUpperCase()}`,
              details: `Menyelesaikan workout ${log.type.toUpperCase()} selama ${log.dur} mnt (${log.sets}s / ${log.reps}r). ${log.note ? `Catatan: "${log.note}"` : ""}`,
              value: log.dur
            });
          }
        }
      });
    }

    // Check habits update
    if (updates.checkedToday) {
      const checkedNow = Object.values(updates.checkedToday);
      const checkedBefore = Object.values(state.checkedToday || {});
      const newlyChecked = checkedNow.filter(id => !checkedBefore.includes(id));
      newlyChecked.forEach(id => {
        const hObj = state.habits.find(x => x.id === id);
        if (hObj) {
          const multiplier = hObj.difficulty === "hard" ? 2 : 
                             hObj.difficulty === "easy" ? 1 : 1.5;
          const earnedXP = Math.round(hObj.xp * multiplier);
          newLogs.push({
            id: `log_hb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            timestamp: timestampStr,
            type: "habit",
            action: `Habit Selesai: ${hObj.icon} ${hObj.name}`,
            details: `Diselesaikan hari ini (+${earnedXP} XP)`,
            value: earnedXP
          });
        }
      });
    }

    // Check expenses update
    if (updates.expenses) {
      Object.entries(updates.expenses).forEach(([catId, amount]) => {
        const prevAmount = state.expenses?.[catId] || 0;
        if (amount > prevAmount) {
          newLogs.push({
            id: `log_ex_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            timestamp: timestampStr,
            type: "expense",
            action: `Pengeluaran Baru: Kategori ${catId.toUpperCase()}`,
            details: `Bertambah Rp ${(amount - prevAmount).toLocaleString("id-ID")}`,
            value: amount - prevAmount
          });
        }
      });
    }

    // Check custom expenses update
    if (updates.customExp) {
      const curCustom = state.customExp || [];
      const newCustom = updates.customExp;
      if (newCustom.length > curCustom.length) {
        // added custom expense
        const added = newCustom.find(ne => !curCustom.some(ce => ce.id === ne.id));
        if (added) {
          newLogs.push({
            id: `log_ex_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            timestamp: timestampStr,
            type: "expense",
            action: `Pengeluaran Baru: ${added.name}`,
            details: `Mencatat pengeluaran custom sebesar Rp ${added.amt.toLocaleString("id-ID")}`,
            value: added.amt
          });
        }
      }
    }

    // Check goals progress update
    if (updates.goals) {
      updates.goals.forEach(g => {
        const prevG = state.goals?.find(x => x.id === g.id);
        if (prevG) {
          if (g.progress !== prevG.progress) {
            newLogs.push({
              id: `log_gl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              timestamp: timestampStr,
              type: "goal",
              action: `Progress Goal: ${g.name}`,
              details: `Progress meningkat dari ${prevG.progress} ke ${g.progress} (Target: ${g.target})`,
              value: g.progress - prevG.progress
            });
          }
          if (g.completed && !prevG.completed) {
            newLogs.push({
              id: `log_glc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              timestamp: timestampStr,
              type: "goal",
              action: `Goal Selesai! 🎉`,
              details: `Goal "${g.name}" telah berhasil terselesaikan!`,
              value: g.target
            });
          }
        } else {
          newLogs.push({
            id: `log_gln_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            timestamp: timestampStr,
            type: "goal",
            action: `Goal Ditambahkan`,
            details: `Membuat goal baru "${g.name}" dengan target ${g.target}`,
            value: 0
          });
        }
      });
    }

    // Append logs
    if (newLogs.length > 0) {
      updates.activityLogs = [...(state.activityLogs || []), ...newLogs];
    }

    setState((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // Automated day-transition checking and archiving
  useEffect(() => {
    if (!state || !user) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (state.lastDate && state.lastDate !== todayStr) {
      const lastDateKey = state.lastDate;

      // 1. Capture yesterday's checked habits into history
      const prevCheckedIds = Object.values(state.checkedToday || {});
      const updatedHistory = {
        ...(state.habitHistory || {}),
      };
      
      // Save what was checked yesterday
      updatedHistory[lastDateKey] = prevCheckedIds;

      // Check whether yesterday had completed habits
      const hadActivityYesterday = prevCheckedIds.length > 0;
      if (!hadActivityYesterday && (state.streak || 0) > 0) {
        const currentFreezes = state.streakFreezes !== undefined ? state.streakFreezes : 1;
        if (currentFreezes > 0) {
          showToast("🛡️ Streak Freeze digunakan! Streak-mu terlindungi.");
          handleStateChange({
            streakFreezes: currentFreezes - 1,
            checkedToday: {},
            habitHistory: updatedHistory,
            lastDate: todayStr,
            streak: state.streak,
            longestStreak: Math.max(state.longestStreak || 0, state.streak || 0)
          });
          return;
        }
      }

      // 2. Recalculate streaks
      const allDates = Object.keys(updatedHistory).sort();
      
      // Calculate current streak going backward from yesterday
      let currentStreak = 0;
      let checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const key = checkDate.toISOString().slice(0, 10);
        if (updatedHistory[key] && updatedHistory[key].length > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Calculate longest streak
      let longestStreak = state.longestStreak || 0;
      let curRun = 0;
      let prevDate: Date | null = null;
      for (const dStr of allDates) {
        if (updatedHistory[dStr] && updatedHistory[dStr].length > 0) {
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
          if (curRun > longestStreak) longestStreak = curRun;
        }
      }

      // 3. Update the state for the new day
      handleStateChange({
        checkedToday: {},
        habitHistory: updatedHistory,
        lastDate: todayStr,
        streak: currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak)
      });

      showToast("🌅 Hari baru dimulai! Progress hari kemarin telah disimpan.");
    }
  }, [state, user]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#FAF9F6] flex flex-col items-center justify-center gap-4 z-[999]">
        <div className="w-12 h-12 border-4 border-zinc-200/50 border-t-[#C9A84C] rounded-full animate-spin" />
        <span className="text-xs text-zinc-500 font-medium tracking-wider">Memuat Life Tracker...</span>
      </div>
    );
  }

  if (!user || !state) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        isLoading={isLoading}
      />
    );
  }

  // Header Calculations
  const xp = totalWkXP(state, WTYPES) + totalHabXP(state);
  const lv = getLv(xp, state.lang);
  const totalSpend = totalExp(state);
  const sisa = state.budget - totalSpend;

  const t = getTranslation(state.lang);
  const isDark = state.theme === "dark";

  const getMonthName = (monthIdx: number, lang: string) => {
    const monthsEN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthsID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return lang === "en" ? monthsEN[monthIdx] : monthsID[monthIdx];
  };

  return (
    <div className={`min-h-screen relative pb-16 font-sans transition-colors duration-300 ${isDark ? "dark bg-zinc-950 text-zinc-100" : "bg-[#FAF9F6] text-zinc-800"}`}>
      {/* Dynamic Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] rounded-full bg-[#C9A84C]/[0.05] blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] rounded-full bg-[#3498DB]/[0.04] blur-[130px]" />
      </div>

      {/* Toast Alert */}
      <div
        className={`fixed top-5 right-5 z-[9999] bg-[#C9A84C] text-[#1a1500] font-bold py-3 px-5 rounded-2xl text-xs shadow-[0_10px_30px_rgba(201,168,76,0.3)] transition-all duration-300 transform ${
          isToastOpen ? "translate-y-0 opacity-100" : "-translate-y-12 opacity-0 pointer-events-none"
        }`}
      >
        {toastMsg}
      </div>

      {/* TOPBAR */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/85 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl drop-shadow-sm">⚡</span>
            <div>
              <div className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {state.name || "Life Tracker"}
              </div>
              <div className="text-[9px] text-zinc-400 dark:text-zinc-500 tracking-widest uppercase font-extrabold mt-0.5">
                {getMonthName(state.month, state.lang || "id")} {state.year}
              </div>
            </div>
          </div>

          {/* Level / XP Progress Bar */}
          <div className="flex-1 sm:max-w-[280px]">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11px] font-black" style={{ color: lv.color === "#C9A84C" ? "#B8860B" : lv.color }}>
                Lv.{lv.num} {lv.title}
              </span>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold font-mono">
                {lv.cur} / {lv.need} XP
              </span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-[1px] border border-zinc-200/20 dark:border-zinc-800">
              <div
                className="h-full rounded-full transition-all duration-500 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                style={{ width: `${lv.pct}%`, backgroundColor: lv.color }}
              />
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2 text-[10px]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_6px_rgba(0,0,0,0.01)] py-1 px-3 rounded-full flex items-center gap-1.5">
              <span>💰</span>
              <span
                className={`font-extrabold font-mono ${
                  sisa >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                Rp{fmtK(sisa, state.lang)}
              </span>
              <span className="text-zinc-400 dark:text-zinc-500 uppercase text-[7px] font-extrabold">{t.remaining}</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_6px_rgba(0,0,0,0.01)] py-1 px-3 rounded-full flex items-center gap-1.5">
              <span className="text-orange-500">🔥</span>
              <span className="font-extrabold font-mono text-orange-600 dark:text-orange-400">{state.streak || 0}</span>
              <span className="text-zinc-400 dark:text-zinc-500 uppercase text-[7px] font-extrabold">{t.streak}</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_6px_rgba(0,0,0,0.01)] py-1 px-3 rounded-full flex items-center gap-1.5">
              <span className="text-indigo-500">⭐</span>
              <span className="font-extrabold font-mono text-indigo-600 dark:text-indigo-400">{xp}</span>
              <span className="text-zinc-400 dark:text-zinc-500 uppercase text-[7px] font-extrabold">XP</span>
            </div>
          </div>
        </div>
      </header>

      {/* CLOUD AUTOSAVE STATUS BAR */}
      <div className="bg-white/40 dark:bg-zinc-900/40 border-b border-zinc-200/50 dark:border-zinc-800/50 px-4 py-2">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                syncStatus === "saved"
                  ? "bg-emerald-500 shadow-[0_0_8px_#10B981]"
                  : syncStatus === "saving"
                  ? "bg-amber-500 animate-pulse shadow-[0_0_8px_#F59E0B]"
                  : "bg-rose-500 shadow-[0_0_8px_#EF4444]"
              }`}
            />
            <span
              className={`text-[10px] font-bold tracking-wide ${
                syncStatus === "saved"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : syncStatus === "saving"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {syncStatus === "saved"
                ? t.savedToCloud
                : syncStatus === "saving"
                ? t.savingChanges
                : t.offlineMode}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportExcel}
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:bg-zinc-100 text-zinc-700 dark:text-zinc-300 rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition-colors tracking-wide cursor-pointer shadow-sm"
            >
              📊 {t.excelBackup}
            </button>
            <button
              onClick={handleLogout}
              className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 hover:bg-rose-100/70 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition-colors tracking-wide cursor-pointer shadow-sm"
            >
              {t.exit}
            </button>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold ml-1 font-mono">
              {t.updateTime}: {lastSavedTime}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTROLLER TABS */}
      <div className="bg-white/60 dark:bg-zinc-900/60 sticky top-[69px] sm:top-[61px] z-30 border-b border-zinc-200/50 dark:border-zinc-800/85 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex overflow-x-auto scrollbar-none px-2">
          {[
            { id: "overview", label: `⚡ ${t.overview}` },
            { id: "expense", label: `💰 ${t.expense}` },
            { id: "workout", label: `🏋️ ${t.workout}` },
            { id: "habit", label: `✅ ${t.habit}` },
            { id: "goals", label: `🎯 ${t.goals}` },
            { id: "report", label: `📊 ${t.report}` },
            { id: "history", label: `📈 ${t.history}` },
            { id: "settings", label: `⚙️ ${t.settings}` },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => setActiveTab(tb.id as TabId)}
              className={`py-3 px-4 text-xs font-bold tracking-wider uppercase border-b-2 whitespace-nowrap transition-all outline-none cursor-pointer ${
                activeTab === tb.id
                  ? "text-zinc-900 dark:text-white border-zinc-900 dark:border-amber-400 font-black"
                  : "text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-white hover:border-zinc-200 dark:hover:border-zinc-800"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <main className="max-w-4xl mx-auto p-4 relative z-10">
        {activeTab === "overview" && (
          <OverviewTab state={state} onChange={handleStateChange} showToast={showToast} />
        )}
        {activeTab === "expense" && (
          <ExpenseTab state={state} onChange={handleStateChange} showToast={showToast} />
        )}
        {activeTab === "workout" && (
          <WorkoutTab state={state} onChange={handleStateChange} showToast={showToast} />
        )}
        {activeTab === "habit" && (
          <HabitTab state={state} onChange={handleStateChange} showToast={showToast} />
        )}
        {activeTab === "goals" && (
          <GoalsTab state={state} onChange={handleStateChange} showToast={showToast} />
        )}
        {activeTab === "report" && <ReportTab state={state} />}
        {activeTab === "history" && <HistoryTab state={state} />}
        {activeTab === "settings" && (
          <SettingsTab
            state={state}
            onChange={handleStateChange}
            showToast={showToast}
            onLogout={handleLogout}
            onResetAllData={handleResetAllData}
            username={user}
          />
        )}
      </main>
    </div>
  );
}
