/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, ReactNode } from "react";
import { AppState, HistoryLog } from "../types";
import { fmtRp, fmtK } from "../utils";
import { MONTHS_ID, WTYPES } from "../constants";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Dumbbell,
  CheckSquare,
  Coins,
  Target,
  Activity,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";

interface HistoryTabProps {
  state: AppState;
}

export default function HistoryTab({ state }: HistoryTabProps) {
  const [trendRange, setTrendRange] = useState<3 | 6>(3);
  const [logFilter, setLogFilter] = useState<"all" | "workout" | "expense" | "habit" | "goal">("all");

  // --- TIMESTAMP / DATE HELPER ---
  const today = useMemo(() => new Date(), []);
  
  // Get date key string (YYYY-MM-DD) for n days ago
  const getNDaysAgoKey = (n: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  // --- 1. WEEK OVER WEEK (WoW) CALCULATIONS (Last 7 Days vs Previous 7 Days) ---
  const wowData = useMemo(() => {
    let thisWeekExp = 0;
    let prevWeekExp = 0;
    let thisWeekWorkouts = 0;
    let prevWeekWorkouts = 0;
    let thisWeekHabits = 0;
    let prevWeekHabits = 0;

    // Last 7 days: day 0 to 6
    const thisWeekKeys = Array.from({ length: 7 }, (_, i) => getNDaysAgoKey(i));
    // Previous 7 days: day 7 to 13
    const prevWeekKeys = Array.from({ length: 7 }, (_, i) => getNDaysAgoKey(i + 7));

    // Habit checks count
    const habitHist = state.habitHistory || {};
    thisWeekKeys.forEach((key) => {
      thisWeekHabits += (habitHist[key] || []).length;
    });
    prevWeekKeys.forEach((key) => {
      prevWeekHabits += (habitHist[key] || []).length;
    });

    // Workouts count
    const wks = state.workouts || {};
    thisWeekKeys.forEach((key) => {
      if (wks[key] && wks[key].type !== "rest") thisWeekWorkouts++;
    });
    prevWeekKeys.forEach((key) => {
      if (wks[key] && wks[key].type !== "rest") prevWeekWorkouts++;
    });

    // Expense WoW from activity logs
    const logs = state.activityLogs || [];
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    logs.forEach((log) => {
      if (log.type === "expense" && log.value) {
        const logDate = new Date(log.timestamp);
        if (logDate >= oneWeekAgo && logDate <= today) {
          thisWeekExp += log.value;
        } else if (logDate >= twoWeeksAgo && logDate < oneWeekAgo) {
          prevWeekExp += log.value;
        }
      }
    });

    return {
      expenses: { thisWeek: thisWeekExp, prevWeek: prevWeekExp },
      workouts: { thisWeek: thisWeekWorkouts, prevWeek: prevWeekWorkouts },
      habits: { thisWeek: thisWeekHabits, prevWeek: prevWeekHabits },
    };
  }, [state, today]);

  // --- 2. MONTH OVER MONTH (MoM) CALCULATIONS (This Month vs Last Month) ---
  const momData = useMemo(() => {
    const curYear = state.year;
    const curMonth = state.month;
    const prevMonthIdx = curMonth === 0 ? 11 : curMonth - 1;
    const prevYear = curMonth === 0 ? curYear - 1 : curYear;

    const curMonthKey = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
    const prevMonthKey = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, "0")}`;

    // Expenses
    const currentTotalExpense = Object.values(state.expenses || {}).reduce((a, b) => a + b, 0) + 
      (state.customExp || []).reduce((a, b) => a + (b.amt || 0), 0);
    
    const prevMonthSnap = state.expenseHistory?.[prevMonthKey];
    let prevTotalExpense = prevMonthSnap?.expenses
      ? Object.values(prevMonthSnap.expenses).reduce((acc: number, b: number) => acc + b, 0) +
        (prevMonthSnap.customExp || []).reduce((acc: number, b: any) => acc + (b.amt || 0), 0)
      : 0;

    // Workouts count
    const wks = state.workouts || {};
    let curMonthWorkouts = 0;
    let prevMonthWorkouts = 0;

    Object.entries(wks).forEach(([dateStr, log]) => {
      if (log.type !== "rest") {
        if (dateStr.startsWith(curMonthKey)) curMonthWorkouts++;
        else if (dateStr.startsWith(prevMonthKey)) prevMonthWorkouts++;
      }
    });

    // Habits completions
    const habitHist = state.habitHistory || {};
    let curMonthHabits = 0;
    let prevMonthHabits = 0;

    Object.entries(habitHist).forEach(([dateStr, list]) => {
      if (dateStr.startsWith(curMonthKey)) curMonthHabits += list.length;
      else if (dateStr.startsWith(prevMonthKey)) prevMonthHabits += list.length;
    });

    return {
      expenses: { thisMonth: currentTotalExpense, prevMonth: prevTotalExpense },
      workouts: { thisMonth: curMonthWorkouts, prevMonth: prevMonthWorkouts },
      habits: { thisMonth: curMonthHabits, prevMonth: prevMonthHabits },
    };
  }, [state]);

  // --- 3. TREND DATA (Last 3 or 6 Months) ---
  const historicalTrends = useMemo(() => {
    const dataPoints: any[] = [];
    const limit = trendRange; // 3 or 6

    for (let i = limit - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthLabel = MONTHS_ID[month].slice(0, 3) + " " + String(year).slice(2);
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

      // Expenses
      let expenseVal = 0;
      if (i === 0) {
        // current month
        expenseVal = Object.values(state.expenses || {}).reduce((a, b) => a + b, 0) + 
          (state.customExp || []).reduce((a, b) => a + (b.amt || 0), 0);
      } else {
        const snap = state.expenseHistory?.[monthKey];
        if (snap) {
          expenseVal = Object.values(snap.expenses || {}).reduce((a, b) => a + b, 0) + 
            (snap.customExp || []).reduce((a, b) => a + (b.amt || 0), 0);
        }
      }

      // Workouts
      let workoutSessions = 0;
      let workoutDuration = 0;
      Object.entries(state.workouts || {}).forEach(([dateStr, log]) => {
        if (dateStr.startsWith(monthKey) && log.type !== "rest") {
          workoutSessions++;
          workoutDuration += log.dur || 0;
        }
      });

      // Habits completion rate
      let possibleChecks = 30 * (state.habits?.length || 5);
      let actualChecks = 0;
      Object.entries(state.habitHistory || {}).forEach(([dateStr, list]) => {
        if (dateStr.startsWith(monthKey)) {
          actualChecks += list.length;
        }
      });

      const habitRate = possibleChecks > 0 ? Math.round((actualChecks / possibleChecks) * 100) : 0;

      dataPoints.push({
        name: monthLabel,
        key: monthKey,
        "Pengeluaran (Rp)": expenseVal,
        "Workout (Sesi)": workoutSessions,
        "Workout Durasi (Mnt)": workoutDuration,
        "Habit Rate (%)": habitRate,
      });
    }

    return dataPoints;
  }, [state, today, trendRange]);

  // --- 4. GOAL PROGRESS OVER TIME ---
  const goalsOverTime = useMemo(() => {
    const activeGoals = state.goals || [];
    // Calculate progress timeline from activity logs for goals
    const goalLogs = (state.activityLogs || []).filter(log => log.type === "goal");
    
    return activeGoals.map(goal => {
      // Find historical progress points from logs
      const historyPoints = goalLogs
        .filter(log => log.action.includes(goal.name) || log.details.includes(goal.name))
        .map(log => ({
          date: new Date(log.timestamp).toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
          timestamp: new Date(log.timestamp).getTime(),
          detail: log.details,
          value: log.value || 0
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      return {
        ...goal,
        historyPoints
      };
    });
  }, [state]);

  // --- 5. ACTIVITY FEED FILTERING ---
  const filteredLogs = useMemo(() => {
    const logs = state.activityLogs || [];
    // Sort descending by timestamp
    const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (logFilter === "all") return sorted;
    return sorted.filter(log => log.type === logFilter);
  }, [state, logFilter]);

  // Comparison card helper
  const renderCompCard = (
    title: string,
    icon: ReactNode,
    curVal: string | number,
    prevVal: string | number,
    diffPct: number,
    isLowerBetter = false,
    subtitle = ""
  ) => {
    const isImproved = isLowerBetter ? diffPct < 0 : diffPct > 0;
    const isNeutral = diffPct === 0;

    return (
      <div className="bg-white border border-zinc-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{title}</span>
          <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-600">{icon}</div>
        </div>
        
        <div>
          <div className="text-2xl font-black text-zinc-950 tracking-tight font-mono">{curVal}</div>
          <div className="flex items-center gap-1.5 mt-2">
            {!isNeutral ? (
              <span
                className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-lg border ${
                  isImproved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {isImproved ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {Math.abs(diffPct)}%
              </span>
            ) : (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-zinc-50 text-zinc-500 border border-zinc-200">
                0%
              </span>
            )}
            <span className="text-[10px] text-zinc-400 font-medium">Lalu: {prevVal}</span>
          </div>
        </div>
        {subtitle && <p className="text-[10px] text-zinc-400 mt-2 italic font-medium">{subtitle}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in text-zinc-700 pb-10">
      
      {/* 1. TOP HEADER SUMMARY CARD */}
      <div className="bg-gradient-to-br from-amber-500/5 via-white to-amber-500/10 border border-[#B8860B]/30 shadow-sm rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-amber-500/10 pointer-events-none">
          <Activity className="w-48 h-48" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/60 pb-5 mb-5 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-100 text-[#B8860B] rounded-lg">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-black text-[#B8860B] uppercase tracking-wide">
                Historical Analytics
              </h3>
            </div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mt-1">
              Analisis Tren & Histori Aktivitas Akumulatif Komprehensif
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start md:self-auto bg-amber-50/80 border border-amber-200 px-4 py-2 rounded-full shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
            <span className="text-xs font-mono font-black text-[#B8860B]">
              Sejarah Terlacak: 180 Hari Terakhir
            </span>
          </div>
        </div>

        <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
          Selamat datang di dasbor analisis performa tingkat lanjut Anda. Di sini, sistem memantau, merangkum,
          dan membandingkan tren mingguan dan bulanan Anda secara otomatis untuk membantu Anda menjaga
          konsistensi finansial dan kebugaran tubuh.
        </p>
      </div>

      {/* 2. COMPARATIVE SUMMARY: WOW & MOM */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#B8860B]" />
            Analisis Perbandingan Berkala
          </h4>
        </div>

        {/* WEEK OVER WEEK SECTION */}
        <div className="space-y-3">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            📅 Perbandingan Minggu Ini vs Minggu Lalu (Last 7 Days vs Prev 7 Days)
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {renderCompCard(
              "Pengeluaran (WoW)",
              <Coins className="w-4 h-4 text-rose-500" />,
              fmtRp(wowData.expenses.thisWeek),
              fmtRp(wowData.expenses.prevWeek),
              wowData.expenses.prevWeek > 0
                ? Math.round(((wowData.expenses.thisWeek - wowData.expenses.prevWeek) / wowData.expenses.prevWeek) * 100)
                : 0,
              true,
              wowData.expenses.thisWeek <= wowData.expenses.prevWeek ? "Hemat dari minggu lalu! 👍" : "Konsumsi meningkat minggu ini"
            )}

            {renderCompCard(
              "Workout (WoW)",
              <Dumbbell className="w-4 h-4 text-blue-500" />,
              `${wowData.workouts.thisWeek} Sesi`,
              `${wowData.workouts.prevWeek} Sesi`,
              wowData.workouts.prevWeek > 0
                ? Math.round(((wowData.workouts.thisWeek - wowData.workouts.prevWeek) / wowData.workouts.prevWeek) * 100)
                : 0,
              false,
              wowData.workouts.thisWeek >= wowData.workouts.prevWeek ? "Fisik makin terlatih! 💪" : "Semangat latihan kendor"
            )}

            {renderCompCard(
              "Habits Checked (WoW)",
              <CheckSquare className="w-4 h-4 text-emerald-500" />,
              `${wowData.habits.thisWeek} Cek`,
              `${wowData.habits.prevWeek} Cek`,
              wowData.habits.prevWeek > 0
                ? Math.round(((wowData.habits.thisWeek - wowData.habits.prevWeek) / wowData.habits.prevWeek) * 100)
                : 0,
              false,
              wowData.habits.thisWeek >= wowData.habits.prevWeek ? "Kebiasaan solid terjaga! ✨" : "Sedang kurang disiplin"
            )}
          </div>
        </div>

        {/* MONTH OVER MONTH SECTION */}
        <div className="space-y-3 pt-2">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            📅 Perbandingan Bulan Ini vs Bulan Lalu (MoM)
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {renderCompCard(
              "Pengeluaran (MoM)",
              <Coins className="w-4 h-4 text-rose-500" />,
              fmtRp(momData.expenses.thisMonth),
              fmtRp(momData.expenses.prevMonth),
              momData.expenses.prevMonth > 0
                ? Math.round(((momData.expenses.thisMonth - momData.expenses.prevMonth) / momData.expenses.prevMonth) * 100)
                : 0,
              true,
              momData.expenses.thisMonth <= momData.expenses.prevMonth ? "Anggaran bulanan aman terkendali" : "Hati-hati, pengeluaran melonjak!"
            )}

            {renderCompCard(
              "Workout (MoM)",
              <Dumbbell className="w-4 h-4 text-blue-500" />,
              `${momData.workouts.thisMonth} Sesi`,
              `${momData.workouts.prevMonth} Sesi`,
              momData.workouts.prevMonth > 0
                ? Math.round(((momData.workouts.thisMonth - momData.workouts.prevMonth) / momData.workouts.prevMonth) * 100)
                : 0,
              false,
              momData.workouts.thisMonth >= momData.workouts.prevMonth ? "Massa otot dan stamina meningkat!" : "Butuh tambahan jadwal gym"
            )}

            {renderCompCard(
              "Habits Checked (MoM)",
              <CheckSquare className="w-4 h-4 text-emerald-500" />,
              `${momData.habits.thisMonth} Cek`,
              `${momData.habits.prevMonth} Cek`,
              momData.habits.prevMonth > 0
                ? Math.round(((momData.habits.thisMonth - momData.habits.prevMonth) / momData.habits.prevMonth) * 100)
                : 0,
              false,
              momData.habits.thisMonth >= momData.habits.prevMonth ? "Disiplin naik kelas! 🌟" : "Perbaiki fokus kebiasaan"
            )}
          </div>
        </div>
      </div>

      {/* 3. TREND GRAPHS: 3 MONTH VS 6 MONTH */}
      <div className="bg-white border border-zinc-200/80 shadow-sm rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#B8860B] flex items-center gap-1.5">
              📈 Analisis Tren Multidimensi
            </h4>
            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">
              Grafik Fluktuasi Kinerja Finansial, Workout, dan Habit
            </p>
          </div>

          <div className="flex bg-zinc-100 p-1 rounded-full border border-zinc-200/50 self-start sm:self-auto font-mono">
            {[3, 6].map((num) => (
              <button
                key={num}
                onClick={() => setTrendRange(num as 3 | 6)}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                  trendRange === num
                    ? "bg-white text-[#B8860B] shadow-sm border border-zinc-200/50"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                Tren {num} Bulan
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend 1: Expenses */}
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 flex flex-col justify-between">
            <div className="mb-3">
              <span className="text-[10px] text-[#B8860B] font-black uppercase tracking-wider block">💸 Tren Pengeluaran</span>
              <span className="text-xs text-zinc-400 font-medium">Pengeluaran total per bulan</span>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={9} tickLine={false} tickFormatter={(v) => fmtK(v)} />
                  <Tooltip
                    formatter={(value: any) => [fmtRp(value), "Pengeluaran"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", fontSize: "11px" }}
                  />
                  <Bar dataKey="Pengeluaran (Rp)" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend 2: Workouts */}
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 flex flex-col justify-between">
            <div className="mb-3">
              <span className="text-[10px] text-blue-600 font-black uppercase tracking-wider block">🏋️ Tren Intensitas Workout</span>
              <span className="text-xs text-zinc-400 font-medium">Total sesi & menit per bulan</span>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWorkout" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={9} tickLine={false} />
                  <Tooltip
                    formatter={(value: any, name: string) => [value, name]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="Workout (Sesi)" stroke="#2563eb" fillOpacity={1} fill="url(#colorWorkout)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Workout Durasi (Mnt)" stroke="#60a5fa" fillOpacity={0} strokeWidth={1} strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend 3: Habits */}
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 flex flex-col justify-between">
            <div className="mb-3">
              <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block">✅ Tren Rasio Habit</span>
              <span className="text-xs text-zinc-400 font-medium">Persentase keberhasilan habit</span>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHabit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={9} tickLine={false} unit="%" />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, "Habit Rate"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="Habit Rate (%)" stroke="#059669" fillOpacity={1} fill="url(#colorHabit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 4. GOAL PROGRESS TIMELINE FROM TIME TO TIME */}
      <div className="bg-white border border-zinc-200/80 shadow-sm rounded-3xl p-6 space-y-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-violet-600 flex items-center gap-1.5 border-b border-zinc-100 pb-3">
            <Target className="w-4 h-4 text-violet-500" />
            Progress Goal Dari Waktu ke Waktu
          </h4>
          <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">
            Rekam jejak peningkatan pencapaian target Anda
          </p>
        </div>

        {goalsOverTime.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {goalsOverTime.map((goal) => {
              const currentPct = goal.target > 0 ? Math.round((goal.progress / goal.target) * 100) : 0;
              return (
                <div key={goal.id} className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="bg-violet-100 text-violet-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-violet-200">
                        {goal.completed ? "Selesai 🎉" : "Aktif 🎯"}
                      </span>
                      <h5 className="font-extrabold text-zinc-800 text-sm mt-1">{goal.name}</h5>
                    </div>
                    <span className="font-mono text-zinc-500 text-xs">
                      {goal.progress} / {goal.target}
                    </span>
                  </div>

                  {/* Linear Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-zinc-200 h-2.5 rounded-full p-[1px] border border-zinc-300/40">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500" 
                        style={{ width: `${Math.min(100, currentPct)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-zinc-400">
                      <span>Tingkat Kenaikan</span>
                      <span className="text-violet-600 font-bold">{currentPct}% Selesai</span>
                    </div>
                  </div>

                  {/* Goal Milestones */}
                  <div className="space-y-2 border-t border-zinc-200/50 pt-3">
                    <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Milestone / Log Update</span>
                    {goal.historyPoints.length > 0 ? (
                      <div className="space-y-2.5 max-h-[100px] overflow-y-auto pr-1">
                        {goal.historyPoints.map((pt, idx) => (
                          <div key={idx} className="flex justify-between items-start text-[10px] border-b border-zinc-100 pb-1.5 last:border-none last:pb-0">
                            <div>
                              <p className="font-bold text-zinc-700 leading-tight">{pt.detail}</p>
                              <span className="text-[8px] text-zinc-400">{pt.date}</span>
                            </div>
                            <span className="font-mono font-black text-violet-600 bg-violet-50 border border-violet-100 px-1 py-0.5 rounded">
                              +{pt.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-400 italic">Belum ada catatan aktivitas khusus untuk goal ini. Progress diupdate secara berkala.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 border border-dashed border-zinc-200 rounded-2xl text-center text-xs text-zinc-400 italic">
            Belum ada goal yang dikonfigurasi.
          </div>
        )}
      </div>

      {/* 5. HISTORICAL USER ACTIVITY FEED */}
      <div className="bg-white border border-zinc-200/80 shadow-sm rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#B8860B] flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-[#B8860B]" />
              Feed Histori Aktivitas Lengkap
            </h4>
            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">
              Log sinkronisasi timestamp lengkap &bull; Data tidak pernah ditimpa
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/40">
            {[
              { id: "all", label: "Semua" },
              { id: "workout", label: "🏋️ Workout" },
              { id: "expense", label: "💰 Pengeluaran" },
              { id: "habit", label: "✅ Habit" },
              { id: "goal", label: "🎯 Goal" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setLogFilter(f.id as any)}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                  logFilter === f.id
                    ? "bg-white text-[#B8860B] shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {filteredLogs.map((log) => {
              let typeColor = "bg-zinc-100 text-zinc-600 border-zinc-200";
              let typeIcon = "📋";
              if (log.type === "workout") {
                typeColor = "bg-blue-50 text-blue-700 border-blue-200";
                typeIcon = "🏋️";
              } else if (log.type === "expense") {
                typeColor = "bg-rose-50 text-rose-700 border-rose-200";
                typeIcon = "💰";
              } else if (log.type === "habit") {
                typeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                typeIcon = "✅";
              } else if (log.type === "goal") {
                typeColor = "bg-violet-50 text-violet-700 border-violet-200";
                typeIcon = "🎯";
              }

              return (
                <div 
                  key={log.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-200/50 rounded-2xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{typeIcon}</span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${typeColor}`}>
                          {log.type}
                        </span>
                        <h6 className="font-extrabold text-zinc-800 text-xs">{log.action}</h6>
                      </div>
                      <p className="text-xs text-zinc-500">{log.details}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-zinc-100 pt-2 sm:pt-0">
                    <span className="text-[10px] text-zinc-400 font-mono font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-300" />
                      {new Date(log.timestamp).toLocaleString("id-ID", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    {log.value !== undefined && log.value > 0 && (
                      <span className="text-[10px] font-black text-[#B8860B] font-mono mt-0.5">
                        Val: {log.type === "expense" ? fmtRp(log.value) : `+${log.value}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-zinc-400 italic text-xs border border-dashed border-zinc-200 rounded-3xl">
            Belum ada log aktivitas untuk kategori yang dipilih.
          </div>
        )}
      </div>

    </div>
  );
}
