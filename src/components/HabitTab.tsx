/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AppState, Habit } from "../types";
import { ICONS_LIST } from "../constants";
import { totalHabXP } from "../utils";
import Modal from "./Modal";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip as RechartsTooltip } from "recharts";

interface HabitTabProps {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
  showToast: (msg: string) => void;
}

export default function HabitTab({ state, onChange, showToast }: HabitTabProps) {
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIco, setNewHabitIco] = useState("⚡");
  const [newHabitXp, setNewHabitXp] = useState("10");

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editHabitName, setEditHabitName] = useState("");
  const [editHabitIco, setEditHabitIco] = useState("⚡");
  const [editHabitXp, setEditHabitXp] = useState("10");

  const [catatanText, setCatatanText] = useState("");
  const [hoveredDay, setHoveredDay] = useState<{ date: string; label: string; count: number; names: string } | null>(null);
  
  const todayKey = new Date().toISOString().slice(0, 10);
  const habits = state.habits || [];
  const doneCount = habits.filter((h) => state.checkedToday?.[h.id] !== undefined).length;
  const totalCount = habits.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const pbC = pct >= 80 ? "#2ECC71" : pct >= 50 ? "#E67E22" : "#E74C3C";
  const xpToday = totalHabXP(state);

  const habitHistory = state.habitHistory || {};
  const checkedTodayCount = doneCount;

  // Real-time current streak calculation (including today)
  const getRealTimeStreak = () => {
    let streakCount = 0;
    let checkDate = new Date();
    
    // If completed something today, start checking from today
    if (checkedTodayCount > 0) {
      streakCount = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Otherwise count starting from yesterday backward
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    while (true) {
      const key = checkDate.toISOString().slice(0, 10);
      const dayChecked = habitHistory[key] && habitHistory[key].length > 0;
      if (dayChecked) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streakCount;
  };

  // Real-time longest streak calculation (including today)
  const getRealTimeLongestStreak = () => {
    const todayStr = todayKey;
    const combinedHistory = { ...habitHistory };
    if (checkedTodayCount > 0) {
      combinedHistory[todayStr] = Object.values(state.checkedToday || {}).map(Number);
    }
    
    const allDates = Object.keys(combinedHistory).sort();
    if (allDates.length === 0) return 0;
    
    let longest = state.longestStreak || 0;
    let curRun = 0;
    let prevDate: Date | null = null;
    
    for (const dStr of allDates) {
      if (combinedHistory[dStr] && combinedHistory[dStr].length > 0) {
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
    return longest;
  };

  // Historical average completion rate of habits over recorded history
  const getCompletionRate = () => {
    const totalHabitsCount = habits.length;
    if (totalHabitsCount === 0) return 0;
    
    const todayStr = todayKey;
    const combinedHistory = { ...habitHistory };
    combinedHistory[todayStr] = Object.values(state.checkedToday || {}).map(Number);
    
    const dates = Object.keys(combinedHistory);
    if (dates.length === 0) return 0;
    
    let totalPctSum = 0;
    for (const d of dates) {
      const completedCount = combinedHistory[d]?.length || 0;
      totalPctSum += (completedCount / totalHabitsCount);
    }
    
    return Math.round((totalPctSum / dates.length) * 100);
  };

  const realTimeStreak = getRealTimeStreak();
  const realTimeLongestStreak = getRealTimeLongestStreak();
  const completionRate = getCompletionRate();

  // Weekly real XP trend from history
  const getWeeklyXPData = () => {
    const daysShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const today = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      
      const completedIds = dStr === todayKey
        ? Object.values(state.checkedToday || {}).map(Number)
        : habitHistory[dStr] || [];
        
      const dayXP = completedIds.reduce((sum, id) => {
        const h = habits.find((x) => x.id === id);
        return sum + (h?.xp || 0);
      }, 0);
      
      data.push({
        name: i === 0 ? "Hari ini" : daysShort[d.getDay()],
        XP: dayXP
      });
    }
    return data;
  };

  const realHabitsTrend = getWeeklyXPData();

  // Generate 18 weeks contribution graph days (Sunday - Saturday alignment)
  const getGraphDays = () => {
    const days = [];
    const today = new Date();
    const todayDayIndex = today.getDay();
    const totalDays = 18 * 7;
    
    const startOffset = totalDays - 1;
    const start = new Date(today.getTime() - startOffset * 24 * 60 * 60 * 1000);
    const startDay = start.getDay();
    start.setDate(start.getDate() - startDay);
    
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        dayOfMonth: d.getDate(),
        month: d.getMonth(),
        dayOfWeek: d.getDay(),
        label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      });
    }
    return days;
  };

  const graphDays = getGraphDays();
  const weeks: typeof graphDays[] = [];
  for (let i = 0; i < graphDays.length; i += 7) {
    weeks.push(graphDays.slice(i, i + 7));
  }

  // Generate 91 days (13 weeks of Monday - Sunday) ending with the current week
  const getHeatmapWeeks = () => {
    const today = new Date();
    const todayDay = today.getDay();
    const todayIndex = todayDay === 0 ? 6 : todayDay - 1;

    // Get Monday of current week
    const currentMon = new Date(today);
    currentMon.setDate(today.getDate() - todayIndex);
    currentMon.setHours(0, 0, 0, 0);

    // Start Monday is 12 weeks before this week's Monday (total 13 weeks)
    const startMon = new Date(currentMon);
    startMon.setDate(currentMon.getDate() - 12 * 7);

    const weeksList = [];
    for (let w = 0; w < 13; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const dateObj = new Date(startMon);
        dateObj.setDate(startMon.getDate() + w * 7 + d);
        const dStr = dateObj.toISOString().slice(0, 10);
        weekDays.push({
          date: dStr,
          dateObj,
        });
      }
      weeksList.push(weekDays);
    }
    return weeksList;
  };

  const heatmapWeeks = getHeatmapWeeks();

  let activeDaysCount = 0;
  heatmapWeeks.forEach((week) => {
    week.forEach((day) => {
      if (day.date <= todayKey) {
        const completedIds = day.date === todayKey
          ? Object.values(state.checkedToday || {}).map(Number)
          : habitHistory[day.date] || [];
        if (completedIds.length > 0) {
          activeDaysCount++;
        }
      }
    });
  });

  const getMonthLabels = () => {
    const labels: { index: number; text: string }[] = [];
    let prevMonth = -1;
    weeks.forEach((week, index) => {
      const month = week[0].month;
      if (month !== prevMonth) {
        labels.push({
          index,
          text: new Date(week[0].date).toLocaleDateString("id-ID", { month: "short" })
        });
        prevMonth = month;
      }
    });
    return labels;
  };
  
  const monthLabels = getMonthLabels();

  // Sync state's catatan to local state on load/update
  useEffect(() => {
    if (state.catatan?.[todayKey] !== undefined) {
      setCatatanText(state.catatan[todayKey]);
    } else {
      setCatatanText("");
    }
  }, [state.catatan, todayKey]);

  const handleCatatanChange = (txt: string) => {
    setCatatanText(txt);
    const updatedNotes = { ...state.catatan, [todayKey]: txt };
    onChange({ catatan: updatedNotes });
  };

  const handleToggleHabit = (id: number) => {
    const isDone = state.checkedToday?.[id] !== undefined;
    const updatedChecked = { ...state.checkedToday };
    
    if (isDone) {
      delete updatedChecked[id];
      onChange({ checkedToday: updatedChecked });
      const h = habits.find((x) => x.id === id);
      if (h) showToast(`↩️ ${h.name} dibatalkan`);
    } else {
      updatedChecked[id] = id;
      onChange({ checkedToday: updatedChecked });
      const h = habits.find((x) => x.id === id);
      if (h) showToast(`✅ +${h.xp} XP — ${h.name}!`);
    }
  };

  const handleAddHabit = () => {
    const name = newHabitName.trim();
    if (!name) return;
    const parsedXp = parseInt(newHabitXp) || 10;
    const newHab: Habit = {
      id: Date.now(),
      icon: newHabitIco,
      name,
      xp: parsedXp,
    };
    onChange({ habits: [...habits, newHab] });
    setNewHabitName("");
    showToast(`✅ "${name}" ditambahkan!`);
  };

  const handleDeleteHabit = (id: number) => {
    if (!confirm("Hapus habit ini?")) return;
    const updatedHabits = habits.filter((h) => h.id !== id);
    const updatedChecked = { ...state.checkedToday };
    delete updatedChecked[id];
    onChange({ habits: updatedHabits, checkedToday: updatedChecked });
    showToast("🗑️ Habit berhasil dihapus");
  };

  const handleOpenEdit = (h: Habit) => {
    setEditingHabit(h);
    setEditHabitName(h.name);
    setEditHabitIco(h.icon);
    setEditHabitXp(String(h.xp));
  };

  const handleSaveEditHabit = () => {
    if (!editingHabit) return;
    const name = editHabitName.trim();
    if (!name) {
      showToast("❌ Nama tidak boleh kosong!");
      return;
    }
    const parsedXp = parseInt(editHabitXp) || 10;
    const updatedHabits = habits.map((h) =>
      h.id === editingHabit.id ? { ...h, icon: editHabitIco, name, xp: parsedXp } : h
    );
    onChange({ habits: updatedHabits });
    setEditingHabit(null);
    showToast(`✅ Habit "${name}" diperbarui!`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-zinc-700 pb-4">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { i: "✅", v: `${doneCount}/${totalCount}`, l: "Hari Ini", c: "text-[#B8860B]", bg: "bg-amber-50/40 border-amber-100" },
          { i: "🔥", v: `${realTimeStreak} hari`, l: "Streak Saat Ini", c: "text-rose-600", bg: "bg-rose-50/40 border-rose-100" },
          { i: "👑", v: `${realTimeLongestStreak} hari`, l: "Streak Terpanjang", c: "text-amber-600", bg: "bg-yellow-50/30 border-yellow-100" },
          { i: "📊", v: `${completionRate}%`, l: "Rasio Selesai", c: "text-emerald-600", bg: "bg-emerald-50/30 border-emerald-100" },
        ].map((k, i) => (
          <div key={i} className={`bg-white border border-zinc-200/50 rounded-2xl p-4 shadow-sm text-center ${k.bg} transition-all duration-300 hover:scale-[1.02]`}>
            <div className="text-2xl mb-1">{k.i}</div>
            <div className={`text-base font-extrabold font-mono ${k.c}`}>
              {k.v}
            </div>
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider mt-1">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar Card */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <div className="flex justify-between text-xs mb-2.5">
          <span className="text-zinc-500 font-medium">Completion Hari Ini</span>
          <span className="font-extrabold" style={{ color: pbC }}>
            {pct}%
          </span>
        </div>
        {/* Duolingo style progress bar */}
        <div className="h-4 bg-zinc-100 rounded-full overflow-hidden p-[2px] border border-zinc-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
          <div
            className="h-full rounded-full transition-all duration-1000 relative overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            style={{ width: `${pct}%`, backgroundColor: pbC }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Habit Calendar (GitHub Contribution Graph Style) */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
            📅 Habit Calendar &mdash; Grafik Kontribusi
          </h4>
          <span className="text-[9px] text-[#B8860B] font-extrabold uppercase">18 Minggu Terakhir</span>
        </div>

        {/* Contribution Map Container */}
        <div className="relative border border-zinc-200/60 bg-zinc-50/50 rounded-2xl p-4 overflow-hidden">
          {/* Month Labels row */}
          <div className="relative pl-7 pb-2 flex text-[8px] text-zinc-400 font-black uppercase tracking-wider select-none h-4">
            {weeks.map((_, i) => {
              const label = monthLabels.find((l) => l.index === i);
              return (
                <div key={i} className="w-3 mr-1 flex-shrink-0 text-left relative">
                  {label && (
                    <span className="absolute left-0 top-0 whitespace-nowrap text-zinc-400">
                      {label.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-1.5">
            {/* Days of week labels on left */}
            <div className="flex flex-col gap-1 text-[8px] text-zinc-400 font-black uppercase tracking-wider select-none pr-1.5 mt-0.5">
              <span className="h-3 flex items-center">Min</span>
              <span className="h-3" />
              <span className="h-3 flex items-center">Sel</span>
              <span className="h-3" />
              <span className="h-3 flex items-center">Kam</span>
              <span className="h-3" />
              <span className="h-3 flex items-center">Sab</span>
            </div>

            {/* Grid of Weeks (scrollable on mobile) */}
            <div className="flex-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
              <div className="flex gap-1 min-w-[270px]">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1 flex-shrink-0">
                    {week.map((day) => {
                       const completedIds = day.date === todayKey
                        ? Object.values(state.checkedToday || {}).map(Number)
                        : habitHistory[day.date] || [];
                      const count = completedIds.length;
                      
                      // Intensity colors based on completed habits count (gold theme)
                      let cellColor = "bg-zinc-100 border-zinc-200/40";
                      if (count === 1) cellColor = "bg-[#C9A84C]/20 border-[#C9A84C]/30 hover:bg-[#C9A84C]/40";
                      else if (count === 2) cellColor = "bg-[#C9A84C]/45 border-[#C9A84C]/50 hover:bg-[#C9A84C]/65";
                      else if (count === 3) cellColor = "bg-[#C9A84C]/75 border-[#C9A84C]/80 hover:bg-[#C9A84C]/90 text-white";
                      else if (count >= 4) cellColor = "bg-[#B8860B] text-white border-[#B8860B] hover:opacity-95";
                      
                      const isToday = day.date === todayKey;
                      
                      return (
                        <div
                          key={day.date}
                          onMouseEnter={() => {
                            const names = completedIds
                              .map((id) => habits.find((h) => h.id === id)?.name)
                              .filter(Boolean)
                              .join(", ");
                            setHoveredDay({
                              date: day.date,
                              label: day.label,
                              count,
                              names: names || "Tidak ada habit selesai"
                            });
                          }}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`w-3 h-3 rounded-[3px] border transition-all duration-150 cursor-pointer ${cellColor} ${
                            isToday ? "ring-2 ring-zinc-800 ring-offset-2 ring-offset-white" : ""
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grid Legend Footer */}
          <div className="flex justify-between items-center text-[8px] text-zinc-400 font-extrabold uppercase mt-4 pt-3 border-t border-zinc-100">
            <span>Arahkan kursor / ketuk sel untuk detail</span>
            <div className="flex items-center gap-1 select-none">
              <span>Kurang</span>
              <div className="w-2.5 h-2.5 rounded-[1px] bg-zinc-100 border border-zinc-200/40" />
              <div className="w-2.5 h-2.5 rounded-[1px] bg-[#C9A84C]/20 border border-[#C9A84C]/30" />
              <div className="w-2.5 h-2.5 rounded-[1px] bg-[#C9A84C]/45 border border-[#C9A84C]/50" />
              <div className="w-2.5 h-2.5 rounded-[1px] bg-[#C9A84C]/75 border border-[#C9A84C]/80" />
              <div className="w-2.5 h-2.5 rounded-[1px] bg-[#B8860B] border border-[#B8860B]" />
              <span>Sangat Aktif</span>
            </div>
          </div>
        </div>

        {/* Hovered Tooltip detail display area */}
        <div className="h-6 mt-3 flex items-center justify-center">
          {hoveredDay ? (
            <div className="text-[10px] text-[#B8860B] font-extrabold font-mono flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 animate-fade-in shadow-sm">
              <span className="text-zinc-500 font-bold">{hoveredDay.label}:</span>
              <span>{hoveredDay.count} habit ({hoveredDay.names})</span>
            </div>
          ) : (
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider italic">Konsistensi harian menciptakan perubahan abadi ✨</span>
          )}
        </div>
      </div>

      {/* Daily Notes / Catatan Harian (Autosaves) */}
      <div className="bg-blue-50/40 border border-blue-100 rounded-3xl p-6">
        <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-1.5">
          📝 Catatan Harian &mdash;{" "}
          <span className="text-[#B8860B] font-extrabold">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </h4>
        <textarea
          placeholder="Tulis catatan hari ini... mood, progress, target besok, dll."
          value={catatanText}
          onChange={(e) => handleCatatanChange(e.target.value)}
          className="w-full min-h-[90px] bg-white border border-zinc-200 text-zinc-800 rounded-2xl p-4 text-xs leading-relaxed outline-none focus:border-blue-500 resize-y shadow-sm"
        />
        <div className="flex justify-between items-center mt-2 font-mono">
          <span className="text-[9px] text-zinc-400 font-extrabold uppercase">☁️ Tersimpan otomatis saat mengetik</span>
          <span className="text-[9px] text-emerald-600 font-black uppercase">Autosaved</span>
        </div>
      </div>

      {/* TUGAS 2: Habit Heatmap Calendar */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5">
          📊 Habit Heatmap &mdash; 91 Hari Terakhir
        </h4>
        
        <div className="flex items-start gap-2.5 overflow-x-auto pb-2">
          {/* Day of Week Labels */}
          <div className="flex flex-col justify-between pt-[14px] text-[8px] text-zinc-400 font-bold uppercase w-6 h-[96px] select-none">
            <span>Sen</span>
            <span>Rab</span>
            <span>Jum</span>
            <span>Min</span>
          </div>

          {/* Grid of Weeks */}
          <div className="flex gap-[2px]">
            {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[2px]">
                {week.map((day) => {
                  const isFuture = day.date > todayKey;
                  const completedIds = isFuture
                    ? []
                    : day.date === todayKey
                    ? Object.values(state.checkedToday || {}).map(Number)
                    : habitHistory[day.date] || [];
                  
                  const count = completedIds.length;
                  const pctDone = totalCount > 0 ? (count / totalCount) * 100 : 0;
                  
                  let cellColor = "bg-zinc-100 border border-zinc-200/10";
                  if (isFuture) {
                    cellColor = "bg-zinc-50 border border-dashed border-zinc-200 opacity-40";
                  } else if (pctDone > 0) {
                    if (pctDone <= 33) cellColor = "bg-emerald-200 border border-emerald-300/10";
                    else if (pctDone <= 66) cellColor = "bg-emerald-400 border border-emerald-500/10";
                    else if (pctDone <= 99) cellColor = "bg-emerald-500 border border-emerald-600/10";
                    else cellColor = "bg-emerald-600 border border-emerald-700/10";
                  }

                  const formattedDate = new Date(day.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  });

                  return (
                    <div
                      key={day.date}
                      title={isFuture ? `${formattedDate} (Mendatang)` : `Tanggal: ${formattedDate} | Habit selesai: ${count}/${totalCount}`}
                      className="w-[12px] h-[12px] rounded-[2px] transition-all duration-150"
                      style={{
                        backgroundColor: isFuture ? undefined : (pctDone === 0 ? "#f4f4f5" : pctDone <= 33 ? "#a7f3d0" : pctDone <= 66 ? "#34d399" : pctDone <= 99 ? "#10b981" : "#059669")
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend & Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-3 gap-2 text-[10px] text-zinc-400 font-bold border-t border-zinc-100 pt-2.5">
          <span>🎯 {activeDaysCount} hari aktif dari 91 hari terakhir</span>
          <div className="flex items-center gap-1 select-none">
            <span className="text-[9px]">Kosong</span>
            <div className="w-[10px] h-[10px] rounded-[1px] bg-zinc-100 border border-zinc-200/20" />
            <div className="w-[10px] h-[10px] rounded-[1px] bg-emerald-200" />
            <div className="w-[10px] h-[10px] rounded-[1px] bg-emerald-400" />
            <div className="w-[10px] h-[10px] rounded-[1px] bg-emerald-500" />
            <div className="w-[10px] h-[10px] rounded-[1px] bg-emerald-600" />
            <span className="text-[9px]">Penuh</span>
          </div>
        </div>
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        {habits.map((h) => {
          const isCompleted = state.checkedToday?.[h.id] !== undefined;
          return (
            <div
              key={h.id}
              onClick={() => handleToggleHabit(h.id)}
              className={`flex items-center gap-4 bg-white border rounded-2xl p-4 cursor-pointer hover:bg-zinc-50 transition-all duration-200 select-none ${
                isCompleted ? "border-emerald-300 bg-emerald-50/20" : "border-zinc-200/50 shadow-sm"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs font-black transition-all ${
                  isCompleted
                    ? "bg-[#10B981] border-[#10B981] text-white"
                    : "border-zinc-300 text-transparent hover:border-zinc-400"
                }`}
              >
                ✓
              </div>
              
              <span className="text-2xl">{h.icon}</span>
              
              <div className={`flex-1 text-xs font-extrabold ${isCompleted ? "text-zinc-400 line-through font-bold" : "text-zinc-800"}`}>
                {h.name}
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-extrabold text-[#B8860B] font-mono pr-2">
                  +{h.xp} XP
                </span>
                <button
                  onClick={() => handleOpenEdit(h)}
                  className="text-[#B8860B] bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-lg px-2.5 py-1 text-[10px] cursor-pointer transition-colors"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteHabit(h.id)}
                  className="text-zinc-300 hover:text-rose-500 p-1 text-xs cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Habit */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
          ➕ Tambah Habit Baru
        </h4>
        <div className="flex flex-wrap gap-2">
          <select
            value={newHabitIco}
            onChange={(e) => setNewHabitIco(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-2xl p-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C]"
          >
            {ICONS_LIST.map((ic) => (
              <option key={ic} value={ic}>
                {ic}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Nama habit..."
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            className="flex-1 min-w-[130px] bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#C9A84C]"
          />

          <input
            type="number"
            placeholder="XP"
            value={newHabitXp}
            onChange={(e) => setNewHabitXp(e.target.value)}
            className="w-[70px] bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono text-center"
          />

          <button
            onClick={handleAddHabit}
            className="bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold px-5 py-2.5 rounded-2xl text-xs transition-colors cursor-pointer active:scale-95 shadow-sm"
          >
            + Tambah
          </button>
        </div>
      </div>

      {/* Weekly Habit XP Bar Chart */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
          XP Habits 7 Hari Terakhir
        </h4>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={realHabitsTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} />
              <RechartsTooltip
                formatter={(value: any) => [`${value} XP`, "XP"]}
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", color: "#18181b" }}
              />
              <Bar dataKey="XP" fill="rgba(201,168,76,0.25)" radius={[4, 4, 0, 0]}>
                {realHabitsTrend.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 6 ? "#C9A84C" : "rgba(201,168,76,0.25)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Edit Habit Modal */}
      <Modal
        isOpen={editingHabit !== null}
        onClose={() => setEditingHabit(null)}
        title="✏️ Edit Habit"
      >
        {editingHabit && (
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-2 font-bold">
                Pilih Ikon
              </label>
              <div className="flex flex-wrap gap-2 max-h-[110px] overflow-y-auto border border-zinc-200/60 bg-zinc-50 p-2.5 rounded-xl">
                {ICONS_LIST.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setEditHabitIco(ic)}
                    className={`p-2 rounded-lg text-lg hover:bg-zinc-100 border transition-all cursor-pointer ${
                      editHabitIco === ic ? "border-[#C9A84C] bg-amber-50" : "border-transparent"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                Nama Habit
              </label>
              <input
                type="text"
                value={editHabitName}
                onChange={(e) => setEditHabitName(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm focus:border-[#C9A84C] text-zinc-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                XP per Sesi
              </label>
              <input
                type="number"
                value={editHabitXp}
                onChange={(e) => setEditHabitXp(e.target.value)}
                min="1"
                max="100"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-lg font-black font-mono text-[#B8860B] text-center outline-none focus:border-[#C9A84C]"
              />
            </div>

            <button
              onClick={handleSaveEditHabit}
              className="w-full bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold p-3.5 rounded-xl transition-all text-xs cursor-pointer"
            >
              ✓ Simpan Perubahan
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
