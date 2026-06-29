/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { AppState, WeeklyHighlights } from "../types";
import { ECATS, WTYPES } from "../constants";
import { fmtRp, fmtK, totalExp, totalWkXP, getLv } from "../utils";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

interface OverviewTabProps {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
  showToast: (msg: string, type?: "success" | "warning" | "error" | "info") => void;
}

export default function OverviewTab({ state, onChange, showToast }: OverviewTabProps) {
  const defaultWeekly: WeeklyHighlights = {
    expenseChange: "turun 12%",
    expenseStatus: "success",
    habitChange: "naik 18%",
    habitStatus: "success",
    workoutChange: "turun 20%",
    workoutStatus: "warning",
    suggestion: "Tambah 2 sesi workout minggu depan."
  };
  const weekly = state.weeklyHighlights || defaultWeekly;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [expenseChange, setExpenseChange] = useState(weekly.expenseChange);
  const [expenseStatus, setExpenseStatus] = useState<"success" | "warning" | "info" | "neutral">(weekly.expenseStatus);
  const [habitChange, setHabitChange] = useState(weekly.habitChange);
  const [habitStatus, setHabitStatus] = useState<"success" | "warning" | "info" | "neutral">(weekly.habitStatus);
  const [workoutChange, setWorkoutChange] = useState(weekly.workoutChange);
  const [workoutStatus, setWorkoutStatus] = useState<"success" | "warning" | "info" | "neutral">(weekly.workoutStatus);
  const [suggestion, setSuggestion] = useState(weekly.suggestion);

  const openEdit = () => {
    const current = state.weeklyHighlights || defaultWeekly;
    setExpenseChange(current.expenseChange);
    setExpenseStatus(current.expenseStatus);
    setHabitChange(current.habitChange);
    setHabitStatus(current.habitStatus);
    setWorkoutChange(current.workoutChange);
    setWorkoutStatus(current.workoutStatus);
    setSuggestion(current.suggestion);
    setIsEditOpen(true);
  };

  const handleSave = () => {
    const updated: WeeklyHighlights = {
      expenseChange,
      expenseStatus,
      habitChange,
      habitStatus,
      workoutChange,
      workoutStatus,
      suggestion,
    };
    onChange({ weeklyHighlights: updated });
    setIsEditOpen(false);
    showToast("✨ Ringkasan Mingguan berhasil diperbarui!", "success");
  };

  const renderStatusIcon = (status: "success" | "warning" | "info" | "neutral") => {
    switch (status) {
      case "success":
        return <span className="text-emerald-500 font-extrabold text-sm">✓</span>;
      case "warning":
        return <span className="text-amber-500 font-extrabold text-sm">⚠</span>;
      case "info":
        return <span className="text-blue-500 font-extrabold text-sm">ℹ</span>;
      default:
        return <span className="text-zinc-400 font-extrabold text-sm">•</span>;
    }
  };

  const tot = totalExp(state);
  const sisa = state.budget - tot;
  const aktual = tot - (state.expenses?.tabungan || 0);
  const pct = state.budget > 0 ? Math.min(100, Math.round((tot / state.budget) * 100)) : 0;
  
  const wDone = Object.values(state.workouts || {}).filter((w) => w.type !== "rest").length;
  const wMnt = Object.values(state.workouts || {}).reduce((a, w) => a + (w.dur || 0), 0);
  const xpTot = totalWkXP(state, WTYPES);

  const dim = new Date(state.year, state.month + 1, 0).getDate();
  const todayDate = new Date().getDate();
  const dLeft = Math.max(0, dim - todayDate);
  const sar = dLeft > 0 ? Math.round(sisa / dLeft) : 0;
  
  // Custom Progress colors for Light mode
  const pbC = pct > 90 ? "#EF4444" : pct > 70 ? "#F97316" : "#D4AF37";

  // --- LIFE SCORE DYNAMIC CALCULATIONS ---
  // 1. Finansial Score
  const finScore = state.budget > 0 
    ? (tot <= state.budget 
        ? Math.round(100 - (tot / state.budget) * 15) 
        : Math.max(0, Math.round(85 - ((tot - state.budget) / state.budget) * 50)))
    : 100;

  // 2. Workout Score
  const currentMonthPrefix = `${state.year}-${String(state.month + 1).padStart(2, "0")}`;
  const curMonthWorkoutsList = Object.entries(state.workouts || {}).filter(([dateStr]) => 
    dateStr.startsWith(currentMonthPrefix)
  );
  const curMonthWDone = curMonthWorkoutsList.filter(([_, w]) => w.type !== "rest").length;
  const workoutScore = Math.max(20, Math.min(100, Math.round((curMonthWDone / 25) * 100)));

  // 3. Habit Score
  const todayKey = new Date().toISOString().slice(0, 10);
  let totalCheckedLast7 = 0;
  let possibleLast7 = 7 * (state.habits?.length || 5);
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (key === todayKey) {
      totalCheckedLast7 += Object.keys(state.checkedToday || {}).length;
    } else {
      totalCheckedLast7 += (state.habitHistory?.[key] || []).length;
    }
  }
  const last7Pct = possibleLast7 > 0 ? (totalCheckedLast7 / possibleLast7) * 100 : 0;
  const habitScore = Math.max(30, Math.min(100, Math.round(50 + (last7Pct * 0.7) + Math.min(10, (state.streak || 0) * 1))));

  // 4. Goal Score
  const completedCount = state.goals?.filter(g => g.completed).length || 0;
  const totalCount = state.goals?.length || 1;
  const avgProgress = totalCount > 0 ? (state.goals || []).reduce((acc, g) => acc + (g.target > 0 ? (g.progress / g.target) * 100 : 0), 0) / totalCount : 0;
  const goalScore = Math.max(15, Math.min(100, Math.round(71 + (completedCount / totalCount) * 15 + (avgProgress * 0.25))));

  // Overall Score
  const lifeScore = Math.round((finScore + workoutScore + habitScore + goalScore) / 4);

  // Data for Category Pie Chart (Non-Tabungan)
  const pieData = ECATS.filter((c) => c.id !== "tabungan" && (state.expenses?.[c.id] || 0) > 0).map((c) => ({
    name: c.label.split(" ")[0],
    value: state.expenses?.[c.id] || 0,
    color: c.color,
  }));

  // Data for Workout Durations per day
  const lineData = Array.from({ length: dim }, (_, i) => {
    const dayNum = i + 1;
    const dateKey = `${state.year}-${String(state.month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const w = state.workouts?.[dateKey];
    return {
      day: dayNum,
      duration: w ? w.dur : 0,
    };
  });

  // Data for Expenses per Category (bar chart)
  const expenseBarData = ECATS.filter((c) => c.id !== "tabungan" && (state.expenses?.[c.id] || 0) > 0).map((c) => ({
    name: c.label.split(" ")[0],
    jumlah: state.expenses?.[c.id] || 0,
    color: c.color,
  }));

  // Data for Workout Sessions per Type
  const workoutTypeCounts = WTYPES.map((t) => ({
    name: t.label,
    sesi: Object.values(state.workouts || {}).filter((w) => w.type === t.id).length,
    color: t.color,
  })).filter((t) => t.sesi > 0);

  // Financial Tips & Health suggestions
  const budgetTips = [];
  if (pct > 90) {
    budgetTips.push("⚠️ Anggaran kamu sudah kritis! Sebaiknya kurangi belanja non-esensial.");
  } else if (pct > 70) {
    budgetTips.push("⚡ Pengeluaran agak boros bulan ini. Mulai batasi jajan.");
  } else {
    budgetTips.push("🟢 Pengeluaran terjaga dengan baik. Pertahankan!");
  }
  budgetTips.push(`Tabungan bulan ini aman terkunci: ${fmtRp(state.expenses?.tabungan || 0)}.`);

  const workoutTips = [];
  if (wDone >= 12) {
    workoutTips.push("🔥 Luar biasa! Konsistensi workout kamu setara atlet elite bulan ini.");
  } else if (wDone >= 6) {
    workoutTips.push("💪 Bagus! Rutinitas workout kamu sudah terbentuk aktif.");
  } else {
    workoutTips.push("😴 Yuk, tingkatkan frekuensi workout biar badan lebih bugar!");
  }

  const activeGoals = state.goals?.filter((g) => !g.completed) || [];

  return (
    <div className="space-y-6 animate-fade-in text-zinc-700 pb-4">
      {/* Dynamic & Premium Life Score Hero Section */}
      <div className="bg-white border border-zinc-200/60 shadow-[0_12px_40px_rgba(0,0,0,0.02)] rounded-3xl p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Circular Score Gauge */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-zinc-100 pb-6 md:pb-0 md:pr-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B] mb-4">
              Indeks Kualitas Hidup
            </h3>
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* SVG Ring Progress */}
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="68"
                  className="stroke-zinc-100"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="68"
                  className="stroke-[#C9A84C] transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={427.2}
                  strokeDashoffset={427.2 - (427.2 * lifeScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner Score Label */}
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold text-zinc-900 tracking-tight font-mono">
                  {lifeScore}
                </span>
                <span className="text-[9px] text-zinc-400 font-extrabold tracking-widest uppercase mt-0.5">
                  Life Score
                </span>
                <span className="text-[8px] text-zinc-300 font-bold font-mono mt-0.5">
                  /100
                </span>
              </div>
            </div>
            
            <p className="text-xs text-zinc-400 font-medium mt-4 max-w-[200px] leading-relaxed">
              {lifeScore >= 80 
                ? "Luar biasa! Kamu menjaga keseimbangan hidup dengan sangat disiplin." 
                : lifeScore >= 60 
                ? "Bagus! Terus tingkatkan performa harianmu untuk hasil optimal." 
                : "Ayo lebih disiplin! Fokus perbaiki salah satu aspek hari ini."}
            </p>
          </div>

          {/* Subscores Grid and Progress Bars */}
          <div className="md:col-span-7 space-y-4.5">
            <div>
              <h4 className="text-xs font-black text-zinc-800 tracking-wide uppercase mb-1">
                Metrik Keseimbangan Hidup
              </h4>
              <p className="text-[10px] text-zinc-400 font-medium">
                Kombinasi performa keuangan, latihan fisik, konsistensi habit, dan target pencapaian harian.
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Finansial */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                    <span>💰</span> Finansial
                  </span>
                  <span className="text-xs font-extrabold font-mono text-[#B8860B]">{finScore}</span>
                </div>
                <div className="h-2 bg-zinc-50 border border-zinc-100 rounded-full overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${finScore}%` }}
                  />
                </div>
              </div>

              {/* Workout */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                    <span>🏋️</span> Workout
                  </span>
                  <span className="text-xs font-extrabold font-mono text-purple-600">{workoutScore}</span>
                </div>
                <div className="h-2 bg-zinc-50 border border-zinc-100 rounded-full overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-700"
                    style={{ width: `${workoutScore}%` }}
                  />
                </div>
              </div>

              {/* Habit */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                    <span>✅</span> Habit
                  </span>
                  <span className="text-xs font-extrabold font-mono text-blue-600">{habitScore}</span>
                </div>
                <div className="h-2 bg-zinc-50 border border-zinc-100 rounded-full overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${habitScore}%` }}
                  />
                </div>
              </div>

              {/* Goal */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                    <span>🎯</span> Goal
                  </span>
                  <span className="text-xs font-extrabold font-mono text-orange-600">{goalScore}</span>
                </div>
                <div className="h-2 bg-zinc-50 border border-zinc-100 rounded-full overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-700"
                    style={{ width: `${goalScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minggu Ini Section */}
      <div className="bg-white border border-zinc-200/60 shadow-[0_12px_40px_rgba(0,0,0,0.02)] rounded-3xl p-6 relative">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#B8860B] flex items-center gap-2">
            <span>📈</span> Minggu Ini
          </h3>
          <button
            onClick={openEdit}
            className="text-[10px] text-zinc-400 hover:text-[#B8860B] font-extrabold tracking-wider uppercase bg-zinc-50 border border-zinc-100 hover:border-zinc-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            ✏️ Edit Ringkasan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Metrics Column */}
          <div className="md:col-span-6 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
              Performa & Capaian:
            </h4>
            <div className="space-y-2.5 text-sm font-semibold text-zinc-700">
              <div className="flex items-center gap-2.5 bg-zinc-50/50 border border-zinc-100 rounded-2xl p-3">
                <span className="w-6 h-6 rounded-full bg-emerald-50 text-center flex items-center justify-center border border-emerald-100">
                  {renderStatusIcon(weekly.expenseStatus)}
                </span>
                <span className="text-zinc-600">Pengeluaran {weekly.expenseChange}</span>
              </div>
              
              <div className="flex items-center gap-2.5 bg-zinc-50/50 border border-zinc-100 rounded-2xl p-3">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-center flex items-center justify-center border border-blue-100">
                  {renderStatusIcon(weekly.habitStatus)}
                </span>
                <span className="text-zinc-600">Habit {weekly.habitChange}</span>
              </div>

              <div className="flex items-center gap-2.5 bg-zinc-50/50 border border-zinc-100 rounded-2xl p-3">
                <span className="w-6 h-6 rounded-full bg-amber-50 text-center flex items-center justify-center border border-amber-100">
                  {renderStatusIcon(weekly.workoutStatus)}
                </span>
                <span className="text-zinc-600">Workout {weekly.workoutChange}</span>
              </div>
            </div>
          </div>

          {/* Suggestion Column */}
          <div className="md:col-span-6 flex flex-col h-full justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                Saran & Rekomendasi:
              </h4>
              <div className="flex items-start gap-3 text-xs text-zinc-600 bg-amber-50/40 border border-amber-100/50 rounded-2xl p-4 leading-relaxed h-full">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-semibold text-zinc-800 text-sm mb-1">Rencana Aksi</p>
                  <p className="font-semibold text-zinc-600 leading-relaxed">{weekly.suggestion}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal for Minggu Ini */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-3xl w-full max-w-md p-6 overflow-hidden space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-800">
                ✏️ Edit Ringkasan Minggu Ini
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pengeluaran */}
              <div className="space-y-1.5">
                <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">
                  Pengeluaran
                </label>
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={expenseChange}
                    onChange={(e) => setExpenseChange(e.target.value)}
                    className="col-span-8 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-[#C9A84C]"
                    placeholder="e.g. turun 12%"
                  />
                  <select
                    value={expenseStatus}
                    onChange={(e) => setExpenseStatus(e.target.value as any)}
                    className="col-span-4 bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-2.5 outline-none focus:bg-white focus:border-[#C9A84C]"
                  >
                    <option value="success">✓ Sukses</option>
                    <option value="warning">⚠ Peringatan</option>
                    <option value="info">ℹ Info</option>
                    <option value="neutral">• Netral</option>
                  </select>
                </div>
              </div>

              {/* Habit */}
              <div className="space-y-1.5">
                <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">
                  Habit
                </label>
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={habitChange}
                    onChange={(e) => setHabitChange(e.target.value)}
                    className="col-span-8 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-[#C9A84C]"
                    placeholder="e.g. naik 18%"
                  />
                  <select
                    value={habitStatus}
                    onChange={(e) => setHabitStatus(e.target.value as any)}
                    className="col-span-4 bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-2.5 outline-none focus:bg-white focus:border-[#C9A84C]"
                  >
                    <option value="success">✓ Sukses</option>
                    <option value="warning">⚠ Peringatan</option>
                    <option value="info">ℹ Info</option>
                    <option value="neutral">• Netral</option>
                  </select>
                </div>
              </div>

              {/* Workout */}
              <div className="space-y-1.5">
                <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">
                  Workout
                </label>
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={workoutChange}
                    onChange={(e) => setWorkoutChange(e.target.value)}
                    className="col-span-8 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-[#C9A84C]"
                    placeholder="e.g. turun 20%"
                  />
                  <select
                    value={workoutStatus}
                    onChange={(e) => setWorkoutStatus(e.target.value as any)}
                    className="col-span-4 bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-2.5 outline-none focus:bg-white focus:border-[#C9A84C]"
                  >
                    <option value="success">✓ Sukses</option>
                    <option value="warning">⚠ Peringatan</option>
                    <option value="info">ℹ Info</option>
                    <option value="neutral">• Netral</option>
                  </select>
                </div>
              </div>

              {/* Saran */}
              <div className="space-y-1.5">
                <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">
                  Saran / Rekomendasi
                </label>
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-[#C9A84C] font-semibold"
                  placeholder="Masukkan saran mingguan..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-[#C9A84C] hover:bg-[#B8860B] text-white rounded-xl transition-all cursor-pointer shadow-md shadow-[#C9A84C]/10"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grouped Modern KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Keuangan Card Group */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#B8860B] flex items-center gap-2">
              <span className="p-1.5 bg-amber-50 rounded-xl text-sm">💰</span> Finansial & Anggaran
            </h3>
            <span className="text-[10px] text-zinc-400 font-extrabold font-mono uppercase bg-zinc-100 px-2 py-0.5 rounded-md">Bulan Ini</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { i: "💵", v: fmtRp(state.budget), l: "Anggaran", c: "text-emerald-600" },
              { i: "📤", v: fmtRp(tot), l: "Pengeluaran", c: pct > 90 ? "text-rose-600" : pct > 70 ? "text-orange-600" : "text-[#B8860B]" },
              { i: "💰", v: fmtRp(sisa), l: "Sisa", c: sisa >= 0 ? "text-emerald-600" : "text-rose-600" },
              { i: "💡", v: fmtRp(sar), l: "Saran Harian", c: "text-blue-600" },
            ].map((k, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 transition-all duration-300 hover:bg-zinc-100/50 hover:shadow-sm hover:-translate-y-0.5 group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold">{k.l}</span>
                  <span className="text-sm scale-100 group-hover:scale-110 transition-transform">{k.i}</span>
                </div>
                <div className={`text-base font-extrabold font-mono tracking-tight ${k.c}`}>
                  {k.v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kebugaran Card Group */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#3498DB] flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 rounded-xl text-sm">🏋️</span> Kebugaran & Disiplin
            </h3>
            <span className="text-[10px] text-zinc-400 font-extrabold font-mono uppercase bg-zinc-100 px-2 py-0.5 rounded-md">Bulan Ini</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { i: "🏃", v: `${wDone} Sesi`, l: "Workout Aktif", c: "text-purple-600" },
              { i: "⏱️", v: `${wMnt} mnt`, l: "Durasi Latihan", c: "text-orange-600" },
              { i: "⭐", v: `${xpTot} XP`, l: "Workout XP", c: "text-[#B8860B]" },
              { i: "🔥", v: `${state.streak || 0} Hari`, l: "Habit Streak", c: "text-rose-600" },
            ].map((k, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 transition-all duration-300 hover:bg-zinc-100/50 hover:shadow-sm hover:-translate-y-0.5 group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold">{k.l}</span>
                  <span className="text-sm scale-100 group-hover:scale-110 transition-transform">{k.i}</span>
                </div>
                <div className={`text-base font-extrabold font-mono tracking-tight ${k.c}`}>
                  {k.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Budget Progress Card */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-500 uppercase tracking-wider font-extrabold text-[10px]">Utilisasi Anggaran Bulan Ini</span>
          <span className="font-extrabold font-mono text-xs px-3 py-1 rounded-full bg-zinc-50 border border-zinc-200/50" style={{ color: pbC }}>
            {pct}% Terpakai
          </span>
        </div>
        
        {/* Duolingo style bold progress bar */}
        <div className="h-4 bg-zinc-100 rounded-full overflow-hidden p-[2px] border border-zinc-200/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
          <div
            className="h-full rounded-full transition-all duration-1000 relative overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
            style={{ width: `${pct}%`, backgroundColor: pbC }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>

        <div className="flex justify-between mt-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span className="text-zinc-400 text-[10px] font-bold uppercase">Terpakai:</span>
            <span className="font-extrabold text-zinc-800">{fmtRp(tot)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sisa >= 0 ? "#10B981" : "#EF4444" }} />
            <span className="text-zinc-400 text-[10px] font-bold uppercase">Sisa:</span>
            <span className="font-extrabold" style={{ color: sisa >= 0 ? "#10B981" : "#EF4444" }}>{fmtRp(sisa)}</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Share (Pie) */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              📈 Distribusi Pengeluaran
            </h3>
            <span className="text-[9px] text-[#B8860B] bg-amber-50 px-2 py-0.5 rounded-full font-black font-mono">Non-Tabungan</span>
          </div>
          
          <div className="h-[210px] flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [fmtRp(value), "Jumlah"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", color: "#18181b" }}
                  />
                  <RechartsLegend
                    verticalAlign="bottom"
                    height={32}
                    iconSize={6}
                    wrapperStyle={{ fontSize: "8px", fontWeight: "bold" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-zinc-400 italic flex flex-col items-center gap-2 py-8 text-center">
                <span className="text-2xl">🤷‍♂️</span>
                <span className="font-bold text-zinc-600">Belum ada pengeluaran bulan ini.</span>
                <span className="text-[9px] text-zinc-400 max-w-[180px]">Catat belanja harianmu di tab Pengeluaran</span>
              </div>
            )}
          </div>
        </div>

        {/* Workout Duration Trend (Line) */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              📊 Tren Durasi Workout
            </h3>
            <span className="text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-black font-mono">Harian (Mnt)</span>
          </div>

          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <XAxis dataKey="day" stroke="#a1a1aa" fontSize={8} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <RechartsTooltip
                  formatter={(value: any) => [`${value} mnt`, "Durasi"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", color: "#18181b" }}
                />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="#C9A84C"
                  strokeWidth={2.5}
                  dot={{ r: 1.5, fill: "#C9A84C", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#B8860B" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bar Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expenses per Category */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              📈 Pengeluaran per Kategori
            </h3>
            <span className="text-[9px] text-zinc-400 font-extrabold font-mono bg-zinc-100 px-2 py-0.5 rounded-full">Bulan Ini</span>
          </div>

          <div className="h-[200px]">
            {expenseBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseBarData} layout="vertical" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis type="number" stroke="#a1a1aa" fontSize={8} tickFormatter={(v) => fmtK(v)} />
                  <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={9} width={50} tickLine={false} />
                  <RechartsTooltip
                    formatter={(value: any) => [fmtRp(value), "Jumlah"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", color: "#18181b" }}
                  />
                  <Bar dataKey="jumlah" fill="#C9A84C" radius={[0, 4, 4, 0]} barSize={10}>
                    {expenseBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-400 italic text-center py-8">
                <span className="text-xl">💳</span>
                <span className="font-bold text-zinc-500 mt-1">Belum ada pengeluaran tercatat</span>
              </div>
            )}
          </div>
        </div>

        {/* Sessions per Type */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              🔥 Intensitas Jenis Workout
            </h3>
            <span className="text-[9px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-black font-mono">Sesi Latihan</span>
          </div>

          <div className="h-[200px]">
            {workoutTypeCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workoutTypeCounts} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} />
                  <RechartsTooltip
                    formatter={(value: any) => [`${value} sesi`, "Jumlah"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", color: "#18181b" }}
                  />
                  <Bar dataKey="sesi" fill="#9B59B6" radius={[4, 4, 0, 0]} barSize={16}>
                    {workoutTypeCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-400 italic text-center py-8">
                <span className="text-xl">🏋️</span>
                <span className="font-bold text-zinc-500 mt-1">Belum ada log workout bulan ini</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Keuangan Card */}
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-3xl p-5 flex flex-col justify-between hover:bg-amber-50 transition-colors duration-300">
          <div>
            <h4 className="text-xs font-black text-[#B8860B] mb-3.5 flex items-center gap-2 uppercase tracking-wider">
              <span className="p-1 bg-amber-100 rounded-lg text-xs">💰</span> Finansial Insight
            </h4>
            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed">
              {budgetTips.map((tip, i) => (
                <div key={i} className="flex gap-2 items-start border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-[#C9A84C] font-bold mt-0.5">•</span>
                  <p className="font-medium text-zinc-700">{tip}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-zinc-200/50 mt-4 pt-3.5 flex justify-between items-center text-[10px] text-zinc-400 font-extrabold font-mono uppercase">
            <span>Riwayat Aktual</span>
            <span className="text-emerald-600 font-bold">{fmtRp(aktual)}</span>
          </div>
        </div>

        {/* Workout Card */}
        <div className="bg-blue-50/30 border border-blue-200/60 rounded-3xl p-5 flex flex-col justify-between hover:bg-blue-50 transition-colors duration-300">
          <div>
            <h4 className="text-xs font-black text-blue-600 mb-3.5 flex items-center gap-2 uppercase tracking-wider">
              <span className="p-1 bg-blue-100 rounded-lg text-xs">🏋️</span> Kebugaran Insight
            </h4>
            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed">
              {workoutTips.map((tip, i) => (
                <div key={i} className="flex gap-2 items-start border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  <p className="font-medium text-zinc-700">{tip}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-zinc-200/50 mt-4 pt-3.5 flex justify-between items-center text-[10px] text-zinc-400 font-extrabold font-mono uppercase">
            <span>Volume Total</span>
            <span className="text-blue-600 font-bold">{wMnt} Mnt &bull; {wDone} Sesi</span>
          </div>
        </div>

        {/* Goals Card */}
        <div className="bg-emerald-50/30 border border-emerald-200/60 rounded-3xl p-5 flex flex-col justify-between hover:bg-emerald-50 transition-colors duration-300">
          <div>
            <h4 className="text-xs font-black text-emerald-600 mb-3.5 flex items-center gap-2 uppercase tracking-wider">
              <span className="p-1 bg-emerald-100 rounded-lg text-xs">🎯</span> Target & Goals
            </h4>
            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed">
              {activeGoals.length > 0 ? (
                <>
                  <p className="pb-1.5 border-b border-zinc-100 font-medium text-zinc-700">
                    Kamu memiliki <strong className="text-zinc-900 font-extrabold">{activeGoals.length} goal aktif</strong> bulan ini.
                  </p>
                  <div className="space-y-3">
                    {activeGoals.slice(0, 2).map((g) => {
                      const gPct = g.target > 0 ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0;
                      return (
                        <div key={g.id} className="pb-1 last:pb-0">
                          <div className="flex justify-between font-bold text-[11px] mb-1">
                            <span className="truncate max-w-[130px] text-zinc-700">{g.name}</span>
                            <span className="font-mono text-[#B8860B]">{gPct}%</span>
                          </div>
                          <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden p-[1px] border border-zinc-200/10">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${gPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-4 text-center text-zinc-400 italic">
                  <span className="text-xl">🏆</span>
                  <span className="font-bold text-zinc-500">Belum ada goal aktif</span>
                  <p className="text-[9px] tracking-wide uppercase font-extrabold text-zinc-400">Yuk buat target barumu!</p>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-zinc-200/50 mt-4 pt-3.5 flex justify-between items-center text-[10px] text-zinc-400 font-extrabold font-mono uppercase">
            <span>Sisa Goals</span>
            <span className="text-emerald-600 font-bold">{activeGoals.length} Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
}