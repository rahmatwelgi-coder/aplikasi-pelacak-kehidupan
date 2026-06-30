/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, Habit } from "../types";
import { ECATS, WTYPES, MONTHS_ID } from "../constants";
import { fmtRp, fmtK, totalExp, totalWkXP } from "../utils";
import { getTranslation } from "../translations";
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
  const isEn = state.lang === "en";
  const t = getTranslation(state.lang);

  const MONTHS_EN = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthsList = isEn ? MONTHS_EN : MONTHS_ID;

  const currentMonthName = monthsList[state.month];
  const prevMonthIndex = state.month === 0 ? 11 : state.month - 1;
  const prevMonthYear = state.month === 0 ? state.year - 1 : state.year;
  const prevMonthName = monthsList[prevMonthIndex];

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

  const getCategoryLabel = (catId: string, defaultLabel: string) => {
    if (!isEn) return defaultLabel;
    const labelMap: Record<string, string> = {
      "makan": "Daily Food / Meals",
      "rokok": "Cigarettes / Smoking",
      "hiburan": "Entertainment / Vacation",
      "jajanan": "Snacks & Treats",
      "bensin": "Motorcycle Fuel / Gas",
      "outfit": "Clothing & Furniture",
      "kampus": "Campus & Organization",
      "laundry": "Laundry Services",
      "darurat": "Emergency Fund",
      "tabungan": "Locked Savings 🔒"
    };
    return labelMap[catId] || defaultLabel;
  };

  const categoriesData = [
    ...ECATS.map((c) => {
      const currentVal = state.expenses?.[c.id] || 0;
      const prevVal = prevMonthSnap?.expenses?.[c.id] || 0;
      const translatedLabel = getCategoryLabel(c.id, c.label);
      return {
        id: c.id,
        name: translatedLabel.split(" ")[0],
        fullName: translatedLabel,
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
    { name: isEn ? "Workout XP" : "Workout XP", value: workoutXPMonth, color: "#9B59B6" },
    { name: isEn ? "Habit XP" : "Habit XP", value: habitXPMonth, color: "#2ECC71" },
  ].filter((item) => item.value > 0);

  // --- 5. AUTOMATED INSIGHTS GENERATION ---
  const financialInsights = [];
  const pctUsed = state.budget > 0 ? Math.round((currentTotalExpense / state.budget) * 100) : 0;
  if (pctUsed > 100) {
    financialInsights.push(
      isEn
        ? `❌ Your spending has exceeded the budget by **${fmtRp(currentTotalExpense - state.budget)}** (${pctUsed}%). Limit your spending immediately!`
        : `❌ Pengeluaranmu melampaui anggaran sebesar **${fmtRp(currentTotalExpense - state.budget)}** (${pctUsed}%). Batasi pengeluaran segera!`
    );
  } else if (pctUsed > 85) {
    financialInsights.push(
      isEn
        ? `⚠️ Budget is almost exhausted (**${pctUsed}%** used). Remaining budget: **${fmtRp(state.budget - currentTotalExpense)}**.`
        : `⚠️ Anggaran hampir habis (**${pctUsed}%** terpakai). Sisa anggaran: **${fmtRp(state.budget - currentTotalExpense)}**.`
    );
  } else {
    financialInsights.push(
      isEn
        ? `🟢 Healthy finances! Only **${pctUsed}%** of your budget is used. Remaining: **${fmtRp(state.budget - currentTotalExpense)}**.`
        : `🟢 Keuangan sehat! Baru terpakai **${pctUsed}%** dari anggaranmu. Tersisa **${fmtRp(state.budget - currentTotalExpense)}**.`
    );
  }

  if (expenseDiff < 0) {
    financialInsights.push(
      isEn
        ? `📈 Your expenses **decreased by ${Math.abs(expenseDiffPct)}%** (${fmtRp(Math.abs(expenseDiff))}) compared to last month.`
        : `📈 Pengeluaranmu **turun ${Math.abs(expenseDiffPct)}%** (${fmtRp(Math.abs(expenseDiff))}) dibanding bulan lalu.`
    );
  } else if (expenseDiff > 0) {
    financialInsights.push(
      isEn
        ? `📉 Your expenses **increased by ${expenseDiffPct}%** (${fmtRp(expenseDiff)}) compared to last month.`
        : `📉 Pengeluaranmu **naik ${expenseDiffPct}%** (${fmtRp(expenseDiff)}) dibanding bulan lalu.`
    );
  }

  // Find biggest spending category
  const activeSpendCategories = categoriesData.filter((c) => c.id !== "tabungan" && c.current > 0);
  if (activeSpendCategories.length > 0) {
    const biggest = [...activeSpendCategories].sort((a, b) => b.current - a.current)[0];
    financialInsights.push(
      isEn
        ? `🔥 Your biggest spending this month is in the **${biggest.fullName}** category, totaling **${fmtRp(biggest.current)}**.`
        : `🔥 Pengeluaran terbesar bulan ini berada pada kategori **${biggest.fullName}** sebesar **${fmtRp(biggest.current)}**.`
    );
  }

  const workoutInsights = [];
  if (totalSessions >= 16) {
    workoutInsights.push(
      isEn
        ? `👑 **Outstanding Consistency!** You have completed **${totalSessions} sessions** of workouts this month. You're on track like a pro!`
        : `👑 **Konsistensi Luar Biasa!** Kamu telah menyelesaikan **${totalSessions} sesi** workout bulan ini. Kamu berada di jalur atlet pro!`
    );
  } else if (totalSessions >= 8) {
    workoutInsights.push(
      isEn
        ? `💪 **Great Job!** You completed **${totalSessions} sessions** of workouts. Keep up the performance!`
        : `💪 **Bagus Sekali!** Kamu menyelesaikan **${totalSessions} sesi** latihan. Pertahankan performa ini!`
    );
  } else if (totalSessions > 0) {
    workoutInsights.push(
      isEn
        ? `🏃 **Early Stages!** Only **${totalSessions} sessions** of workouts logged. Let's increase your workout frequency.`
        : `🏃 **Masih Awal!** Baru terkumpul **${totalSessions} sesi** workout. Yuk tingkatkan frekuensi latihanmu.`
    );
  } else {
    workoutInsights.push(
      isEn
        ? `😴 **No Logs Yet:** You haven't recorded any active workout sessions this month. Let's get moving!`
        : `😴 **Belum Ada Log:** Kamu belum mencatat sesi workout aktif bulan ini. Ayo mulai gerakan tubuhmu!`
    );
  }

  // Favorite workout translations
  const translateWorkoutLabel = (typeId: string, defaultLabel: string) => {
    if (!isEn) return defaultLabel;
    const wMap: Record<string, string> = {
      push: "Push Day",
      pull: "Pull Day",
      legs: "Legs",
      cardio: "Cardio",
      core: "Core/Abs",
      full: "Full Body",
      rest: "Rest Day"
    };
    return wMap[typeId] || defaultLabel;
  };

  let favTypeLabelTrans = favTypeLabel;
  if (favType !== "—" && isEn) {
    const tDef = WTYPES.find((x) => x.id === favType);
    favTypeLabelTrans = tDef ? `${tDef.icon} ${translateWorkoutLabel(favType, tDef.label)}` : favType;
  }

  if (favType !== "—") {
    workoutInsights.push(
      isEn
        ? `🎯 Your favorite workout focus this month is **${favTypeLabelTrans}** with **${maxCount} sessions**.`
        : `🎯 Fokus latihan terfavoritmu bulan ini adalah **${favTypeLabel}** dengan **${maxCount} sesi**.`
    );
  }

  const habitInsights = [];
  if (habitCompletionRate >= 80) {
    habitInsights.push(
      isEn
        ? `🌟 **Discipline Deity!** Habit completion rate reached **${habitCompletionRate}%**. Your positive habits are forming solid ground!`
        : `🌟 **Dewa Disiplin!** Tingkat keberhasilan habit mencapai **${habitCompletionRate}%**. Kebiasaan positifmu terbentuk sangat solid!`
    );
  } else if (habitCompletionRate >= 50) {
    habitInsights.push(
      isEn
        ? `👍 **Quite Consistent!** Your monthly habit completion rate is at **${habitCompletionRate}%**. Aim for more discipline.`
        : `👍 **Cukup Konsisten!** Rasio habit bulananmu di angka **${habitCompletionRate}%**. Upayakan lebih disiplin.`
    );
  } else if (habitCompletionRate > 0) {
    habitInsights.push(
      isEn
        ? `⚠️ **Needs Attention:** Habit completion rate is only **${habitCompletionRate}%**. Start with 1 simple habit each morning.`
        : `⚠️ **Butuh Perhatian:** Keberhasilan habit baru **${habitCompletionRate}%**. Mulai dari 1 habit sederhana setiap pagi.`
    );
  }

  const translateHabitName = (name: string) => {
    if (!isEn) return name;
    const habitMap: Record<string, string> = {
      "Olahraga 30 menit": "Exercise 30 mins",
      "Baca buku": "Read a book",
      "No sosmed pagi": "No social media morning",
      "Minum 8 gelas air": "Drink 8 glasses of water",
      "Tidur sebelum 23.00": "Sleep before 23:00"
    };
    return habitMap[name] || name;
  };

  if (individualHabitRates.length > 0) {
    const bestHabit = individualHabitRates[0];
    const worstHabit = individualHabitRates[individualHabitRates.length - 1];
    if (bestHabit.rate > 0) {
      habitInsights.push(
        isEn
          ? `🔥 Most disciplined habit: **${bestHabit.icon} ${translateHabitName(bestHabit.name)}** (${bestHabit.rate}% completed).`
          : `🔥 Kebiasaan paling disiplin: **${bestHabit.icon} ${bestHabit.name}** (${bestHabit.rate}% selesai).`
      );
    }
    if (worstHabit.rate < 40 && worstHabit.id !== bestHabit.id) {
      habitInsights.push(
        isEn
          ? `💡 Needs improvement: **${worstHabit.icon} ${translateHabitName(worstHabit.name)}** reached only (${worstHabit.rate}%).`
          : `💡 Perlu ditingkatkan: **${worstHabit.icon} ${worstHabit.name}** baru mencapai (${worstHabit.rate}%).`
      );
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-zinc-700 pb-4">
      {/* Overview Card */}
      <div className="bg-gradient-to-br from-amber-500/5 via-zinc-50/50 to-blue-500/5 border border-zinc-200 shadow-sm rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200/60 pb-5 mb-5">
          <div>
            <h3 className="text-lg font-black text-[#B8860B] uppercase tracking-wide">
              {isEn ? "Monthly Performance Analytics" : "Laporan Kinerja Bulanan"}
            </h3>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mt-1">
              {isEn ? "Performance Summary & Analysis" : "Rangkuman Performa & Analisis"} &bull; {currentMonthName} {state.year}
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
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest mt-1">{isEn ? "Expenses" : "Pengeluaran"}</div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-emerald-600">
              {habitCompletionRate}%
            </div>
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest mt-1">Habit Rate</div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-blue-600">
              {totalSessions} {isEn ? "Sessions" : "Sesi"}
            </div>
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest mt-1">Workout</div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-violet-600">
              +{totalMonthlyXP} XP
            </div>
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest mt-1">{isEn ? "XP This Month" : "XP Bulan Ini"}</div>
          </div>
        </div>
      </div>

      {/* Financial Section */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#B8860B] flex items-center gap-1.5">
            💰 {isEn ? "Financial Summary" : "Laporan Keuangan"}
          </h4>
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase font-mono">
            {isEn ? "This Month vs" : "Bulan Ini vs"} {prevMonthName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Comparative Metrics */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">{isEn ? "Total Expenses" : "Total Pengeluaran"}</span>
              <div className="flex flex-wrap items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-zinc-800 font-mono">{fmtRp(currentTotalExpense)}</span>
                <span className="text-[10px] text-zinc-400 font-semibold">{isEn ? "out of budget" : "dari budget"} {fmtRp(state.budget)}</span>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">{isEn ? "Last Month Comparison" : "Perbandingan Bulan Lalu"} ({prevMonthName})</span>
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
                {expenseDiff <= 0 ? (isEn ? "Saved" : "Hemat") : (isEn ? "Overspent" : "Boros")} {isEn ? "by" : "sebesar"} {fmtRp(Math.abs(expenseDiff))} {isEn ? "compared to last month." : "dibanding bulan lalu."}
              </span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">{isEn ? "Locked Savings" : "Tabungan Dikunci"} 🔒</span>
              <span className="text-lg font-black text-emerald-600 font-mono mt-1 block">
                {fmtRp(state.expenses?.tabungan || 0)}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="md:col-span-7 h-[220px] bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-4 flex flex-col">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-3 font-bold">{isEn ? "Category Comparison Chart (Rp)" : "Chart Perbandingan Kategori (Rp)"}</span>
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
              <div className="h-[150px] flex items-center justify-center text-xs text-zinc-400 italic">{isEn ? "No expense data yet." : "Belum ada data pengeluaran."}</div>
            )}
          </div>
        </div>

        {/* Detailed Category Table Comparison */}
        <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-4 space-y-3">
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">{isEn ? "Increase / Decrease Details" : "Rincian Kenaikan / Penurunan"}</span>
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
                        <div className="text-[9px] text-zinc-400 font-bold">{isEn ? "Prev" : "Lalu"}: {fmtRp(c.prev)}</div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg w-[60px] text-center border ${
                        isSaving ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"
                      }`}>
                        {diff === 0 ? (isEn ? "Same" : "Sama") : isSaving ? `-${Math.abs(pctChange)}%` : `+${pctChange}%`}
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
            🏋️ {isEn ? "Monthly Workout Analytics" : "Analisis Workout Bulanan"}
          </h4>
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase font-mono">{isEn ? "Exercise Discipline" : "Disiplin Latihan"}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">{isEn ? "Total Sessions" : "Total Sesi Latihan"}</span>
            <span className="text-lg font-black text-blue-600 font-mono mt-1 block">{totalSessions} {isEn ? "Sessions" : "Sesi"}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">{isEn ? "Total Duration" : "Total Waktu"}</span>
            <span className="text-lg font-black text-zinc-800 font-mono mt-1 block">{totalDuration} {isEn ? "mins" : "mnt"}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Workout XP</span>
            <span className="text-lg font-black text-violet-600 font-mono mt-1 block">+{workoutXPMonth} XP</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">{isEn ? "Favorite Workout" : "Latihan Terfavorit"}</span>
            <span className="text-xs font-extrabold text-[#B8860B] truncate mt-2 block">{favTypeLabelTrans}</span>
          </div>
        </div>

        {/* Workout list details */}
        {monthWorkouts.length > 0 && (
          <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-4 space-y-3">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">{isEn ? "Workout Sessions List This Month" : "Daftar Sesi Workout Bulan Ini"}</span>
            <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
              {monthWorkouts
                .filter((w) => w.type !== "rest")
                .map((w, idx) => {
                  const tDef = WTYPES.find((x) => x.id === w.type) || WTYPES[0];
                  const label = translateWorkoutLabel(w.type, tDef.label);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{tDef.icon}</span>
                        <div>
                          <div className="font-extrabold text-zinc-800">{label}</div>
                          <div className="text-[9px] text-zinc-400 font-bold">{w.dateKey} &bull; {w.note || (isEn ? "No notes" : "Tidak ada catatan")}</div>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-[#B8860B] font-extrabold">
                        {w.dur} {isEn ? "mins" : "mnt"} &bull; {w.sets}s/{w.reps}r
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
            ✅ {isEn ? "Monthly Habits Analytics" : "Analisis Habits Bulanan"}
          </h4>
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase font-mono">{isEn ? "Habit Consistency" : "Konsistensi Kebiasaan"}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-4 space-y-4">
            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 text-center">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">{isEn ? "Average Completion Rate" : "Rasio Selesai Rata-rata"}</span>
              <span className="text-3xl font-black text-emerald-600 font-mono mt-2 block">{habitCompletionRate}%</span>
              <span className="text-[9px] text-zinc-400 font-bold mt-2.5 block leading-relaxed">
                {totalActualCompletions} {isEn ? "out of" : "dari"} {totalPossibleCompletions} {isEn ? "total monthly target habits completed." : "total target kebiasaan bulanan berhasil diselesaikan."}
              </span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-3 text-center">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">{isEn ? "Habits XP Earned" : "Habits XP Didapat"}</span>
              <span className="text-lg font-black text-violet-600 font-mono mt-1 block">+{habitXPMonth} XP</span>
            </div>
          </div>

          <div className="md:col-span-8 bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-4 space-y-4">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">{isEn ? "Completion Rate Per Habit" : "Rasio Penyelesaian Per Habit"}</span>
            <div className="space-y-4">
              {individualHabitRates.map((h) => (
                <div key={h.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-extrabold">
                    <span className="flex items-center gap-1.5 text-zinc-700">
                      <span>{h.icon}</span>
                      <span>{translateHabitName(h.name)}</span>
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
                  <span className="text-[8px] text-zinc-400 font-black uppercase block">{isEn ? "Completed" : "Selesai"} {h.completions} {isEn ? "days out of" : "hari dari"} {recordedMonthDates.length} {isEn ? "tracked days" : "hari terlacak"}</span>
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
            ⭐ {isEn ? "Monthly XP Acquisition Distribution" : "Distribus Perolehan XP Bulanan"}
          </h4>
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase font-mono">{isEn ? "XP Source" : "Sumber XP"}</span>
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
                    formatter={(value: any) => [`+${value} XP`, isEn ? "Total" : "Jumlah"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}
                  />
                  <RechartsLegend iconSize={8} wrapperStyle={{ fontSize: "9px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-zinc-400 italic">{isEn ? "No XP earned this month." : "Belum ada XP terkumpul bulan ini."}</div>
            )}
          </div>

          <div className="md:col-span-7 space-y-3">
            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 flex justify-between items-center transition-transform hover:translate-x-1">
              <div>
                <span className="text-xs font-extrabold text-zinc-800 block">🏋️ Workout XP</span>
                <span className="text-[9px] text-zinc-400 font-bold block mt-0.5">{isEn ? "Earned from active workout session logs" : "Berasal dari log sesi workout aktif"}</span>
              </div>
              <span className="text-sm font-black font-mono text-violet-600">+{workoutXPMonth} XP</span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 flex justify-between items-center transition-transform hover:translate-x-1">
              <div>
                <span className="text-xs font-extrabold text-zinc-800 block">✅ Habit XP</span>
                <span className="text-[9px] text-zinc-400 font-bold block mt-0.5">{isEn ? "Earned from completing daily habits" : "Berasal dari keberhasilan menyelesaikan habit harian"}</span>
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
          💡 {isEn ? "Automated Insights (System Evaluation)" : "Insight Otomatis (Evaluasi Sistem)"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Keuangan Insights */}
          <div className="space-y-3">
            <div className="text-xs font-black text-[#B8860B] uppercase tracking-wider flex items-center gap-1">
              <span>💰</span> {isEn ? "Financial" : "Keuangan"}
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
              <span>🏋️</span> {isEn ? "Workouts & Fitness" : "Workout & Kebugaran"}
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
              <span>✅</span> {isEn ? "Habits & Discipline" : "Habits & Kebiasaan"}
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
                  {isEn ? "Longest monthly streak:" : "Streak terpanjang bulanan:"} <strong className="text-zinc-800 font-mono">{state.longestStreak || 0} {isEn ? "days" : "hari"}</strong> {isEn ? "in a row!" : "berturut-turut!"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
