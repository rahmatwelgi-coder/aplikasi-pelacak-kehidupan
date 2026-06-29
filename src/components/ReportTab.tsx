/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, Habit } from "../types";
import { ECATS, WTYPES, MONTHS_ID } from "../constants";
import { fmtRp, fmtK, totalExp, totalWkXP } from "../utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  PieChart,
  Pie,
} from "recharts";

interface ReportTabProps {
  state: AppState;
}

export default function ReportTab({ state }: ReportTabProps) {
  const currentMonthName = MONTHS_ID[state.month];
  const prevMonthIndex = state.month === 0 ? 11 : state.month - 1;
  const prevMonthYear = state.month === 0 ? state.year - 1 : state.year;
  const prevMonthName = MONTHS_ID[prevMonthIndex];

  const currentMonthPrefix = `${state.year}-${String(state.month + 1).padStart(2, "0")}`;
  const prevMonthKey = `${prevMonthYear}-${String(prevMonthIndex + 1).padStart(2, "0")}`;
  const todayKey = new Date().toISOString().slice(0, 10);

  // --- 1. EXPENSES CALCULATIONS ---
  const currentTotalExpense = totalExp(state);
  
  // Retrieve previous month's actual snapshot from database
  const prevMonthSnap = state.expenseHistory?.[prevMonthKey];

  const currentCustom = state.customExp || [];
  const prevCustom = prevMonthSnap?.customExp || [];
  
  // Combine custom expense names from both current and previous month to avoid skipping data
  const allCustomNames = Array.from(new Set([
    ...currentCustom.map(e => e.name),
    ...prevCustom.map(e => e.name)
  ]));

  const categoriesData = [
    ...ECATS.map((c) => {
      const currentVal = state.expenses?.[c.id] || 0;
      const prevVal = prevMonthSnap?.expenses?.[c.id] || 0;
      return {
        id: c.id,
        name: c.label.split(" ")[0],
        fullName: c.label,
        icon: c.icon,
        color: c.color,
        current: currentVal,
        prev: prevVal,
      };
    }),
    ...allCustomNames.map((name) => {
      const curItem = currentCustom.find((e) => e.name === name);
      const prevItem = prevCustom.find((e) => e.name === name);
      return {
        id: curItem?.id || prevItem?.id || name,
        name: name.slice(0, 8),
        fullName: name,
        icon: curItem?.icon || prevItem?.icon || "📦",
        color: "#888",
        current: curItem?.amt || 0,
        prev: prevItem?.amt || 0,
      };
    }),
  ];

  const prevTotalExpense = categoriesData.reduce((acc, item) => acc + item.prev, 0);
  const expenseDiff = currentTotalExpense - prevTotalExpense;
  const expenseDiffPct = prevTotalExpense > 0 ? Math.round((expenseDiff / prevTotalExpense) * 100) : 0;

  // Chart data for side-by-side comparison
  const expenseComparisonChartData = categoriesData
    .filter((c) => c.id !== "tabungan" && (c.current > 0 || c.prev > 0))
    .map((c) => ({
      name: c.name,
      [currentMonthName]: c.current,
      [prevMonthName]: c.prev,
    }));

  // --- 2. WORKOUT CALCULATIONS ---
  // Get current month's workout logs
  const monthWorkouts = Object.entries(state.workouts || {})
    .filter(([dateKey]) => dateKey.startsWith(currentMonthPrefix))
    .map(([dateKey, log]) => ({ dateKey, ...log }));

  const totalSessions = monthWorkouts.filter((w) => w.type !== "rest").length;
  const totalDuration = monthWorkouts.reduce((acc, w) => acc + (w.dur || 0), 0);

  // Workout XP obtained in current month
  const workoutXPMonth = monthWorkouts.reduce((acc, w) => {
    const customXp = state.customWkXP?.[w.type];
    if (customXp !== undefined) return acc + customXp;
    const t = WTYPES.find((x) => x.id === w.type);
    return acc + (t?.xp || 0);
  }, 0);

  // Favorite workout type
  const typeCounts: Record<string, number> = {};
  monthWorkouts.forEach((w) => {
    if (w.type !== "rest") {
      typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
    }
  });
  let favType = "—";
  let favTypeLabel = "—";
  let maxCount = 0;
  Object.entries(typeCounts).forEach(([type, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favType = type;
      const tDef = WTYPES.find((x) => x.id === type);
      favTypeLabel = tDef ? `${tDef.icon} ${tDef.label}` : type;
    }
  });

  // --- 3. HABITS CALCULATIONS ---
  const habitsList = state.habits || [];
  const habitHistory = state.habitHistory || {};

  // Find all dates belonging to the current month in habitHistory or checkedToday
  const daysInCurrentMonth = new Date(state.year, state.month + 1, 0).getDate();
  const recordedMonthDates: string[] = [];
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${state.year}-${String(state.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    // Limit to today or past
    if (new Date(dateStr) <= new Date()) {
      recordedMonthDates.push(dateStr);
    }
  }

  let totalPossibleCompletions = recordedMonthDates.length * habitsList.length;
  let totalActualCompletions = 0;
  const habitCompletionsCount: Record<number, number> = {};

  recordedMonthDates.forEach((dateStr) => {
    const completedIds = dateStr === todayKey
      ? Object.values(state.checkedToday || {}).map(Number)
      : habitHistory[dateStr] || [];

    totalActualCompletions += completedIds.length;
    completedIds.forEach((id) => {
      habitCompletionsCount[id] = (habitCompletionsCount[id] || 0) + 1;
    });
  });

  const habitCompletionRate = totalPossibleCompletions > 0 
    ? Math.round((totalActualCompletions / totalPossibleCompletions) * 100) 
    : 0;

  // Individual habit rates
  const individualHabitRates = habitsList.map((h) => {
    const completions = habitCompletionsCount[h.id] || 0;
    const rate = recordedMonthDates.length > 0 
      ? Math.round((completions / recordedMonthDates.length) * 100) 
      : 0;
    return {
      ...h,
      completions,
      rate,
    };
  }).sort((a, b) => b.rate - a.rate);

  // Habit XP obtained in current month
  let habitXPMonth = 0;
  recordedMonthDates.forEach((dateStr) => {
    const completedIds = dateStr === todayKey
      ? Object.values(state.checkedToday || {}).map(Number)
      : habitHistory[dateStr] || [];
    completedIds.forEach((id) => {
      const hObj = habitsList.find((x) => x.id === id);
      if (hObj) {
        habitXPMonth += hObj.xp;
      }
    });
  });

  // --- 4. TOTAL MONTHLY XP ---
  const totalMonthlyXP = workoutXPMonth + habitXPMonth;

  const xpPieData = [
    { name: "Workout XP", value: workoutXPMonth, color: "#9B59B6" },
    { name: "Habit XP", value: habitXPMonth, color: "#2ECC71" },
  ].filter((item) => item.value > 0);

  // --- 5. AUTOMATED INSIGHTS GENERATION ---
  const financialInsights = [];
  const pctUsed = state.budget > 0 ? Math.round((currentTotalExpense / state.budget) * 100) : 0;
  if (pctUsed > 100) {
    financialInsights.push(`❌ Pengeluaranmu melampaui anggaran sebesar **${fmtRp(currentTotalExpense - state.budget)}** (${pctUsed}%). Batasi pengeluaran segera!`);
  } else if (pctUsed > 85) {
    financialInsights.push(`⚠️ Anggaran hampir habis (**${pctUsed}%** terpakai). Sisa anggaran: **${fmtRp(state.budget - currentTotalExpense)}**.`);
  } else {
    financialInsights.push(`🟢 Keuangan sehat! Baru terpakai **${pctUsed}%** dari anggaranmu. Tersisa **${fmtRp(state.budget - currentTotalExpense)}**.`);
  }

  if (expenseDiff < 0) {
    financialInsights.push(`📈 Pengeluaranmu **turun ${Math.abs(expenseDiffPct)}%** (${fmtRp(Math.abs(expenseDiff))}) dibanding bulan lalu.`);
  } else if (expenseDiff > 0) {
    financialInsights.push(`📉 Pengeluaranmu **naik ${expenseDiffPct}%** (${fmtRp(expenseDiff)}) dibanding bulan lalu.`);
  }

  // Find biggest spending category
  const activeSpendCategories = categoriesData.filter((c) => c.id !== "tabungan" && c.current > 0);
  if (activeSpendCategories.length > 0) {
    const biggest = [...activeSpendCategories].sort((a, b) => b.current - a.current)[0];
    financialInsights.push(`🔥 Pengeluaran terbesar bulan ini berada pada kategori **${biggest.fullName}** sebesar **${fmtRp(biggest.current)}**.`);
  }

  const workoutInsights = [];
  if (totalSessions >= 16) {
    workoutInsights.push(`👑 **Konsistensi Luar Biasa!** Kamu telah menyelesaikan **${totalSessions} sesi** workout bulan ini. Kamu berada di jalur atlet pro!`);
  } else if (totalSessions >= 8) {
    workoutInsights.push(`💪 **Bagus Sekali!** Kamu menyelesaikan **${totalSessions} sesi** latihan. Pertahankan performa ini!`);
  } else if (totalSessions > 0) {
    workoutInsights.push(`🏃 **Masih Awal!** Baru terkumpul **${totalSessions} sesi** workout. Yuk tingkatkan frekuensi latihanmu.`);
  } else {
    workoutInsights.push(`😴 **Belum Ada Log:** Kamu belum mencatat sesi workout aktif bulan ini. Ayo mulai gerakan tubuhmu!`);
  }

  if (favType !== "—") {
    workoutInsights.push(`🎯 Fokus latihan terfavoritmu bulan ini adalah **${favTypeLabel}** dengan **${maxCount} sesi**.`);
  }

  const habitInsights = [];
  if (habitCompletionRate >= 80) {
    habitInsights.push(`🌟 **Dewa Disiplin!** Tingkat keberhasilan habit mencapai **${habitCompletionRate}%**. Kebiasaan positifmu terbentuk sangat solid!`);
  } else if (habitCompletionRate >= 50) {
    habitInsights.push(`👍 **Cukup Konsisten!** Rasio habit bulananmu di angka **${habitCompletionRate}%**. Upayakan lebih disiplin.`);
  } else if (habitCompletionRate > 0) {
    habitInsights.push(`⚠️ **Butuh Perhatian:** Keberhasilan habit baru **${habitCompletionRate}%**. Mulai dari 1 habit sederhana setiap pagi.`);
  }

  if (individualHabitRates.length > 0) {
    const bestHabit = individualHabitRates[0];
    const worstHabit = individualHabitRates[individualHabitRates.length - 1];
    if (bestHabit.rate > 0) {
      habitInsights.push(`🔥 Kebiasaan paling disiplin: **${bestHabit.icon} ${bestHabit.name}** (${bestHabit.rate}% selesai).`);
    }
    if (worstHabit.rate < 40 && worstHabit.id !== bestHabit.id) {
      habitInsights.push(`💡 Perlu ditingkatkan: **${worstHabit.icon} ${worstHabit.name}** baru mencapai (${worstHabit.rate}%).`);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-zinc-700 pb-4">
      {/* Overview Card */}
      <div className="bg-gradient-to-br from-amber-500/5 via-zinc-50/50 to-blue-500/5 border border-zinc-200 shadow-sm rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200/60 pb-5 mb-5">
          <div>
            <h3 className="text-lg font-black text-[#B8860B] uppercase tracking-wide">
              Laporan Kinerja Bulanan
            </h3>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mt-1">
              Rangkuman Performa & Analisis &bull; {currentMonthName} {state.year}
            </p>
          </div>
          <span className="bg-amber-50 text-[#B8860B] border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-mono font-black">
            ⭐ +{totalMonthlyXP} XP Gained
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-black font-mono text-rose-600">
              {fmtK(currentTotalExpense)}
            </div>
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest mt-1">Pengeluaran</div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-emerald-600">
              {habitCompletionRate}%
            </div>
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest mt-1">Habit Rate</div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-blue-600">
              {totalSessions} Sesi
            </div>
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest mt-1">Workout</div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-violet-600">
              +{totalMonthlyXP} XP
            </div>
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest mt-1">XP Bulan Ini</div>
          </div>
        </div>
      </div>

      {/* Financial Section */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#B8860B] flex items-center gap-1.5">
            💰 Laporan Keuangan
          </h4>
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase font-mono">
            Bulan Ini vs {prevMonthName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Comparative Metrics */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">Total Pengeluaran</span>
              <div className="flex flex-wrap items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-zinc-800 font-mono">{fmtRp(currentTotalExpense)}</span>
                <span className="text-[10px] text-zinc-400 font-semibold">dari budget {fmtRp(state.budget)}</span>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">Perbandingan Bulan Lalu ({prevMonthName})</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-extrabold text-zinc-600 font-mono">{fmtRp(prevTotalExpense)}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  expenseDiff <= 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"
                }`}>
                  {expenseDiff <= 0 ? "📉 -" : "📈 +"}
                  {Math.abs(expenseDiffPct)}%
                </span>
              </div>
              <span className="text-[9px] text-zinc-400 font-bold block mt-1.5">
                {expenseDiff <= 0 ? "Hemat" : "Boros"} sebesar {fmtRp(Math.abs(expenseDiff))} dibanding bulan lalu.
              </span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">Tabungan Dikunci 🔒</span>
              <span className="text-lg font-black text-emerald-600 font-mono mt-1 block">
                {fmtRp(state.expenses?.tabungan || 0)}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="md:col-span-7 h-[220px] bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-4 flex flex-col">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-3 font-bold">Chart Perbandingan Kategori (Rp)</span>
            {expenseComparisonChartData.length > 0 ? (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseComparisonChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={8} tickLine={false} tickFormatter={(v) => fmtK(v)} />
                    <RechartsTooltip
                      formatter={(value: any) => [fmtRp(value), ""]}
                      contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}
                    />
                    <RechartsLegend iconSize={6} wrapperStyle={{ fontSize: "8px" }} />
                    <Bar dataKey={currentMonthName} fill="#C9A84C" radius={[2, 2, 0, 0]} />
                    <Bar dataKey={prevMonthName} fill="#e4e4e7" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-xs text-zinc-400 italic">Belum ada data pengeluaran.</div>
            )}
          </div>
        </div>

        {/* Detailed Category Table Comparison */}
        <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-4 space-y-3">
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">Rincian Kenaikan / Penurunan</span>
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {categoriesData
              .filter((c) => c.current > 0 || c.prev > 0)
              .map((c) => {
                const diff = c.current - c.prev;
                const isSaving = diff <= 0;
                const pctChange = c.prev > 0 ? Math.round((diff / c.prev) * 100) : 0;

                return (
                  <div key={c.id} className="flex items-center justify-between text-xs border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.icon}</span>
                      <span className="font-extrabold text-zinc-800">{c.fullName}</span>
                    </div>
                    <div className="flex items-center gap-3.5 font-mono">
                      <div className="text-right">
                        <div className="text-zinc-800 font-extrabold">{fmtRp(c.current)}</div>
                        <div className="text-[9px] text-zinc-400 font-bold">Lalu: {fmtRp(c.prev)}</div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg w-[60px] text-center border ${
                        isSaving ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"
                      }`}>
                        {diff === 0 ? "Sama" : isSaving ? `-${Math.abs(pctChange)}%` : `+${pctChange}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Workout Section */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-1.5">
            🏋️ Analisis Workout Bulanan
          </h4>
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase font-mono">Disiplin Latihan</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Total Sesi Latihan</span>
            <span className="text-lg font-black text-blue-600 font-mono mt-1 block">{totalSessions} Sesi</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Total Waktu</span>
            <span className="text-lg font-black text-zinc-800 font-mono mt-1 block">{totalDuration} mnt</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Workout XP</span>
            <span className="text-lg font-black text-violet-600 font-mono mt-1 block">+{workoutXPMonth} XP</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Latihan Terfavorit</span>
            <span className="text-xs font-extrabold text-[#B8860B] truncate mt-2 block">{favTypeLabel}</span>
          </div>
        </div>

        {/* Workout list details */}
        {monthWorkouts.length > 0 && (
          <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-4 space-y-3">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">Daftar Sesi Workout Bulan Ini</span>
            <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
              {monthWorkouts
                .filter((w) => w.type !== "rest")
                .map((w, idx) => {
                  const tDef = WTYPES.find((x) => x.id === w.type) || WTYPES[0];
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{tDef.icon}</span>
                        <div>
                          <div className="font-extrabold text-zinc-800">{tDef.label}</div>
                          <div className="text-[9px] text-zinc-400 font-bold">{w.dateKey} &bull; {w.note || "Tidak ada catatan"}</div>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-[#B8860B] font-extrabold">
                        {w.dur} mnt &bull; {w.sets}s/{w.reps}r
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Habits Section */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#10B981] flex items-center gap-1.5">
            ✅ Analisis Habits Bulanan
          </h4>
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase font-mono">Konsistensi Kebiasaan</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-4 space-y-4">
            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 text-center">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Rasio Selesai Rata-rata</span>
              <span className="text-3xl font-black text-emerald-600 font-mono mt-2 block">{habitCompletionRate}%</span>
              <span className="text-[9px] text-zinc-400 font-bold mt-2.5 block leading-relaxed">
                {totalActualCompletions} dari {totalPossibleCompletions} total target kebiasaan bulanan berhasil diselesaikan.
              </span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-3 text-center">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Habits XP Didapat</span>
              <span className="text-lg font-black text-violet-600 font-mono mt-1 block">+{habitXPMonth} XP</span>
            </div>
          </div>

          <div className="md:col-span-8 bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-4 space-y-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">Rasio Penyelesaian Per Habit</span>
            <div className="space-y-4">
              {individualHabitRates.map((h) => (
                <div key={h.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-extrabold">
                    <span className="flex items-center gap-1.5 text-zinc-700">
                      <span>{h.icon}</span>
                      <span>{h.name}</span>
                    </span>
                    <span className="font-mono text-[#10B981]">{h.rate}%</span>
                  </div>
                  {/* Duolingo style progress bar */}
                  <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden p-[1px] border border-zinc-200/60">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${h.rate}%`, 
                        backgroundColor: h.rate >= 80 ? "#10B981" : h.rate >= 50 ? "#F59E0B" : "#EF4444" 
                      }} 
                    />
                  </div>
                  <span className="text-[8px] text-zinc-400 font-black uppercase block">Selesai {h.completions} hari dari {recordedMonthDates.length} hari terlacak</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* XP Source Breakdown */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-violet-600 flex items-center gap-1.5">
            ⭐ Distribusi Perolehan XP Bulanan
          </h4>
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase font-mono">Sumber XP</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-5 h-[170px] flex items-center justify-center bg-zinc-50/50 rounded-2xl border border-zinc-200/60 p-3">
            {xpPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={xpPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {xpPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [`+${value} XP`, "Jumlah"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}
                  />
                  <RechartsLegend iconSize={8} wrapperStyle={{ fontSize: "9px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-zinc-400 italic">Belum ada XP terkumpul bulan ini.</div>
            )}
          </div>

          <div className="md:col-span-7 space-y-3">
            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 flex justify-between items-center transition-transform hover:translate-x-1">
              <div>
                <span className="text-xs font-extrabold text-zinc-800 block">🏋️ Workout XP</span>
                <span className="text-[9px] text-zinc-400 font-bold block mt-0.5">Berasal dari log sesi workout aktif</span>
              </div>
              <span className="text-sm font-black font-mono text-violet-600">+{workoutXPMonth} XP</span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 flex justify-between items-center transition-transform hover:translate-x-1">
              <div>
                <span className="text-xs font-extrabold text-zinc-800 block">✅ Habit XP</span>
                <span className="text-[9px] text-zinc-400 font-bold block mt-0.5">Berasal dari keberhasilan menyelesaikan habit harian</span>
              </div>
              <span className="text-sm font-black font-mono text-emerald-600">+{habitXPMonth} XP</span>
            </div>

            <div className="border border-amber-200 rounded-2xl p-4 flex justify-between items-center bg-amber-50/50 shadow-sm">
              <span className="text-xs font-black text-[#B8860B] uppercase tracking-wider">Total Monthly XP Gained</span>
              <span className="text-base font-extrabold font-mono text-[#B8860B]">+{totalMonthlyXP} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Automated Dynamic Insights */}
      <div className="bg-gradient-to-r from-amber-500/5 to-blue-500/5 border border-amber-200 rounded-3xl p-6 space-y-5 shadow-sm">
        <h4 className="text-xs font-black uppercase tracking-widest text-[#B8860B] flex items-center gap-1.5 border-b border-zinc-200 pb-3">
          💡 Insight Otomatis (Evaluasi Sistem)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Keuangan Insights */}
          <div className="space-y-3">
            <div className="text-xs font-black text-[#B8860B] uppercase tracking-wider flex items-center gap-1">
              <span>💰</span> Keuangan
            </div>
            <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
              {financialInsights.map((ins, i) => (
                <div key={i} className="flex gap-2 items-start border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-[#B8860B] font-black">•</span>
                  <p dangerouslySetInnerHTML={{ __html: ins.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                </div>
              ))}
            </div>
          </div>

          {/* Workout Insights */}
          <div className="space-y-3">
            <div className="text-xs font-black text-blue-600 uppercase tracking-wider flex items-center gap-1">
              <span>🏋️</span> Workout & Kebugaran
            </div>
            <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
              {workoutInsights.map((ins, i) => (
                <div key={i} className="flex gap-2 items-start border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-blue-500 font-black">•</span>
                  <p dangerouslySetInnerHTML={{ __html: ins.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                </div>
              ))}
            </div>
          </div>

          {/* Habits Insights */}
          <div className="space-y-3">
            <div className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <span>✅</span> Habits & Kebiasaan
            </div>
            <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
              {habitInsights.map((ins, i) => (
                <div key={i} className="flex gap-2 items-start border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-emerald-500 font-black">•</span>
                  <p dangerouslySetInnerHTML={{ __html: ins.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                </div>
              ))}
              {/* Highlight Streak */}
              <div className="flex gap-2 items-start bg-white/60 border border-zinc-200 rounded-2xl p-3 mt-2 shadow-sm">
                <span className="text-rose-500">🔥</span>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Streak terpanjang bulanan: <strong className="text-zinc-800 font-mono">{state.longestStreak || 0} hari</strong> berturut-turut!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
