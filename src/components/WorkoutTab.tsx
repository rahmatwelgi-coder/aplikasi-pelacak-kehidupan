/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { AppState, WorkoutLog } from "../types";
import { WTYPES, DAYS_S, MONTHS_ID } from "../constants";
import { fmtRp, fmtK, daysInMonth, totalWkXP } from "../utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";

interface WorkoutTabProps {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
  showToast: (msg: string) => void;
}

export default function WorkoutTab({ state, onChange, showToast }: WorkoutTabProps) {
  const [selDate, setSelDate] = useState<string | null>(null);
  const [selType, setSelType] = useState("push");
  
  // Form values
  const [wkDur, setWkWur] = useState("45");
  const [wkSets, setWkSets] = useState("4");
  const [wkReps, setWkReps] = useState("12");
  const [wkNote, setWkNote] = useState("");

  const days = daysInMonth(state.year, state.month);
  const wk = state.workouts || {};
  const wDone = Object.values(wk).filter((w) => w.type !== "rest").length;
  const wMnt = Object.values(wk).reduce((a, w) => a + (w.dur || 0), 0);
  const xp = totalWkXP(state, WTYPES);

  const selectedLog = selDate ? state.workouts?.[selDate] : null;

  const handlePickDate = (dateKey: string) => {
    // Prevent picking future dates
    const parsedDate = new Date(dateKey);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (parsedDate > today) return;

    setSelDate(dateKey);
    const existing = state.workouts?.[dateKey];
    if (existing) {
      setSelType(existing.type);
      setWkWur(String(existing.dur || 0));
      setWkSets(String(existing.sets || 0));
      setWkReps(String(existing.reps || 0));
      setWkNote(existing.note || "");
    } else {
      setSelType("push");
      setWkWur("45");
      setWkSets("4");
      setWkReps("12");
      setWkNote("");
    }
  };

  const handleSaveWorkout = () => {
    if (!selDate) return;
    const typeDef = WTYPES.find((x) => x.id === selType) || WTYPES[0];
    
    const newLog: WorkoutLog = {
      type: selType,
      dur: parseInt(wkDur) || 0,
      sets: parseInt(wkSets) || 0,
      reps: parseInt(wkReps) || 0,
      note: wkNote.trim(),
    };

    const updatedWorkouts = { ...state.workouts, [selDate]: newLog };
    
    // Auto-update streak if saved today or yesterday
    let newStreak = state.streak;
    if (selDate === new Date().toISOString().slice(0, 10)) {
      if (selType !== "rest" && state.streak === 0) {
        newStreak = 1;
      }
    }

    onChange({ workouts: updatedWorkouts, streak: newStreak });
    showToast(`💪 +${state.customWkXP?.[selType] || typeDef.xp} XP — ${typeDef.label} tersimpan ☁️`);
  };

  const handleDeleteWorkout = () => {
    if (!selDate) return;
    const updatedWorkouts = { ...state.workouts };
    delete updatedWorkouts[selDate];
    onChange({ workouts: updatedWorkouts });
    setSelDate(null);
    showToast("🗑️ Log workout berhasil dihapus");
  };

  // Recharts data calculations
  // 1. Weekly Workout Volume (5 weeks)
  const weeklyVolumeData = Array.from({ length: 5 }, (_, wIndex) => {
    let durSum = 0;
    let sessionCount = 0;
    for (let dIndex = 0; dIndex < 7; dIndex++) {
      const dayNum = wIndex * 7 + dIndex;
      if (dayNum >= days.length) break;
      const dKey = days[dayNum].date;
      const log = state.workouts?.[dKey];
      if (log && log.type !== "rest") {
        durSum += log.dur || 0;
        sessionCount++;
      }
    }
    return {
      week: `Minggu ${wIndex + 1}`,
      Durasi: durSum,
      Sesi: sessionCount * 10, // scaled x10 as in original
    };
  });

  // 2. Durations and XP line charts data
  const dailyMetricsData = days.map((d) => {
    const log = state.workouts?.[d.date];
    const typeDef = log ? WTYPES.find((t) => t.id === log.type) : null;
    const itemXp = log ? (state.customWkXP?.[log.type] ?? typeDef?.xp ?? 0) : 0;
    return {
      day: d.day,
      Durasi: log ? log.dur : 0,
      XP: itemXp,
    };
  });

  // History list sorted descending
  const historyLogs = Object.entries(state.workouts || {})
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30); // show last 30 logs

  const selectedTypeDef = WTYPES.find((x) => x.id === selType) || WTYPES[0];

  return (
    <div className="space-y-6 animate-fade-in text-zinc-700 pb-4">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { i: "🏋️", v: wDone, l: "Sesi Aktif", c: "text-[#B8860B]", bg: "bg-amber-50/40 border-amber-100" },
          { i: "⏱️", v: `${wMnt}m`, l: "Total Menit", c: "text-emerald-600", bg: "bg-emerald-50/30 border-emerald-100" },
          { i: "⭐", v: `${xp} XP`, l: "Total XP", c: "text-indigo-600", bg: "bg-indigo-50/30 border-indigo-100" },
          { i: "🔥", v: state.streak || 0, l: "Streak", c: "text-rose-600", bg: "bg-rose-50/40 border-rose-100" },
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Calendar Map (7 cols) */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 lg:col-span-7">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B]">
              Kalender {MONTHS_ID[state.month]} {state.year}
            </h3>
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase">Ketuk hari untuk isi log</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {DAYS_S.map((d) => (
              <div key={d} className="text-center text-[9px] font-black text-zinc-400 py-1 uppercase tracking-wider">
                {d}
              </div>
            ))}

            {/* Empty slots for first week offset */}
            {Array.from({ length: new Date(state.year, state.month, 1).getDay() }).map((_, i) => (
              <div key={`offset-${i}`} />
            ))}

            {days.map((d) => {
              const log = state.workouts?.[d.date];
              const typeDef = log ? WTYPES.find((x) => x.id === log.type) : null;
              const isSelected = d.date === selDate;
              const isToday = d.date === new Date().toISOString().slice(0, 10);
              const isFuture = new Date(d.date) > new Date();

              return (
                <div
                  key={d.date}
                  onClick={() => handlePickDate(d.date)}
                  className={`border rounded-xl p-1 text-center min-h-[52px] flex flex-col justify-between cursor-pointer transition-all ${
                    isFuture
                      ? "opacity-20 cursor-not-allowed bg-zinc-50 border-transparent"
                      : isSelected
                      ? "border-[#C9A84C] bg-amber-50/50 shadow-sm ring-1 ring-[#C9A84C]"
                      : isToday
                      ? "border-zinc-800 bg-zinc-100 shadow-sm"
                      : "border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-200"
                  }`}
                  style={
                    log && !isSelected
                      ? { backgroundColor: `${typeDef?.color}0c`, borderColor: `${typeDef?.color}3a` }
                      : {}
                  }
                >
                  <span className="text-base select-none block min-h-[18px]">
                    {typeDef?.icon || ""}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold block font-mono ${
                      isSelected
                        ? "text-[#B8860B]"
                        : isToday
                        ? "text-zinc-900 underline font-black"
                        : log
                        ? "text-zinc-700"
                        : "text-zinc-400"
                    }`}
                  >
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Emojis Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-5 border-t border-zinc-100 pt-4">
            {WTYPES.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-extrabold uppercase">
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Log Form Column (5 cols) */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold">
                  Log Workout
                </div>
                <div className="text-sm font-black text-[#B8860B]">
                  {selDate || "Pilih hari dulu 🗓️"}
                </div>
              </div>
              {selectedLog && (
                <button
                  onClick={handleDeleteWorkout}
                  className="bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                >
                  🗑️ Hapus
                </button>
              )}
            </div>

            {/* Type selector buttons */}
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2.5">
              Tipe Latihan
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {WTYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelType(t.id)}
                  disabled={!selDate}
                  className={`py-2 px-1 rounded-xl text-[9px] font-extrabold border transition-all flex items-center justify-center gap-1 select-none cursor-pointer ${
                    selType === t.id
                      ? "text-white"
                      : "bg-zinc-50 text-zinc-400 border-zinc-200/60 hover:border-zinc-300 hover:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                  style={selType === t.id ? { borderColor: t.color, backgroundColor: t.color } : {}}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-2 gap-3.5 mb-4">
              <div>
                <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                  Durasi (mnt)
                </label>
                <input
                  type="number"
                  value={wkDur}
                  onChange={(e) => setWkWur(e.target.value)}
                  disabled={!selDate}
                  placeholder="45"
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono text-center disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                  Sets / Rounds
                </label>
                <input
                  type="number"
                  value={wkSets}
                  onChange={(e) => setWkSets(e.target.value)}
                  disabled={!selDate}
                  placeholder="4"
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono text-center disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                  Reps / Jarak (Km)
                </label>
                <input
                  type="number"
                  value={wkReps}
                  onChange={(e) => setWkReps(e.target.value)}
                  disabled={!selDate}
                  placeholder="12"
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono text-center disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                  XP Didapat
                </label>
                <div
                  className="border rounded-xl py-1.5 px-3 text-center transition-all shadow-sm"
                  style={{
                    backgroundColor: `${selectedTypeDef.color}08`,
                    borderColor: `${selectedTypeDef.color}25`,
                  }}
                >
                  <div
                    className="text-base font-black font-mono"
                    style={{ color: selectedTypeDef.color }}
                  >
                    +{state.customWkXP?.[selType] || selectedTypeDef.xp}
                  </div>
                  <div className="text-[8px] text-zinc-400 uppercase tracking-widest font-extrabold">Otomatis</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                Catatan / PR Baru
              </label>
              <input
                type="text"
                value={wkNote}
                onChange={(e) => setWkNote(e.target.value)}
                disabled={!selDate}
                placeholder="Squat PR: 100kg!"
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl py-2.5 px-4 text-xs outline-none focus:bg-white focus:border-[#C9A84C] disabled:opacity-40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveWorkout();
                }}
              />
            </div>
          </div>

          <button
            onClick={handleSaveWorkout}
            disabled={!selDate}
            className="w-full bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold py-3 px-4 rounded-2xl text-xs mt-5 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-98 shadow-sm"
          >
            {selDate ? "💪 Simpan Workout" : "💪 Pilih hari dulu di kalender"}
          </button>
        </div>
      </div>

      {/* Recharts graphs */}
      {/* 1. Weekly Volume */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
          Volume Mingguan (menit)
        </h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyVolumeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="week" stroke="#71717a" fontSize={9} tickLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} />
              <RechartsTooltip
                formatter={(value: any, name: string) => [
                  name === "Sesi" ? `${value / 10} sesi` : `${value} mnt`,
                  name,
                ]}
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", color: "#18181b" }}
              />
              <RechartsLegend iconSize={8} wrapperStyle={{ fontSize: "9px", fontWeight: "bold" }} />
              <Bar dataKey="Durasi" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sesi" fill="#3498DB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Durasi per hari */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
            Durasi Latihan per Hari
          </h3>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMetricsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="day" stroke="#71717a" fontSize={8} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} />
                <RechartsTooltip
                  formatter={(value: any) => [`${value} mnt`, "Durasi"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", color: "#18181b" }}
                />
                <Line type="monotone" dataKey="Durasi" stroke="#C9A84C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* XP per hari */}
        <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
            Workout XP per Hari
          </h3>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMetricsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="day" stroke="#71717a" fontSize={8} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} />
                <RechartsTooltip
                  formatter={(value: any) => [`+${value} XP`, "XP"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", color: "#18181b" }}
                />
                <Line type="monotone" dataKey="XP" stroke="#9B59B6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Workout History */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
          Riwayat Workout Bulan Ini
        </h3>
        <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 select-none">
          {historyLogs.length > 0 ? (
            historyLogs.map(([dateKey, wLog]) => {
              const typeDef = WTYPES.find((x) => x.id === wLog.type) || WTYPES[6];
              return (
                <div
                  key={dateKey}
                  onClick={() => handlePickDate(dateKey)}
                  className="flex items-center gap-3 py-3 border-b border-zinc-100 hover:bg-zinc-50 rounded-xl px-2.5 cursor-pointer transition-colors"
                >
                  <span className="text-2xl">{typeDef.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold" style={{ color: typeDef.color }}>
                      {typeDef.label}
                    </div>
                    <div className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">
                      {dateKey} &bull; {wLog.dur || 0}m &bull; {wLog.sets || 0} sets &bull;{" "}
                      {wLog.reps || 0} reps {wLog.note && `&bull; "${wLog.note}"`}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-[#B8860B] font-mono">
                    +{state.customWkXP?.[wLog.type] || typeDef.xp} XP
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-xs text-zinc-400 italic">
              <span className="text-xl mb-1 block">💪</span>
              Belum ada log workout.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
