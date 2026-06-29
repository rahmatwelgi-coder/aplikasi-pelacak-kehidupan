/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { AppState, Goal } from "../types";
import Modal from "./Modal";

interface GoalsTabProps {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
  showToast: (msg: string) => void;
}

export default function GoalsTab({ state, onChange, showToast }: GoalsTabProps) {
  const goals = state.goals || [];

  // Local state for add/edit modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form states
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalProgress, setGoalProgress] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalSpeed, setGoalSpeed] = useState("");

  // Helper to auto-calculate deadline based on speed
  const handleAutoCalculateDeadline = (targetStr: string, progressStr: string, speedStr: string) => {
    const targetVal = parseFloat(targetStr) || 0;
    const progVal = parseFloat(progressStr) || 0;
    const speedVal = parseFloat(speedStr) || 0;
    if (speedVal > 0 && targetVal > progVal) {
      const weeksNeeded = (targetVal - progVal) / speedVal;
      const daysNeeded = Math.ceil(weeksNeeded * 7);
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + daysNeeded);
      setGoalDeadline(estDate.toISOString().slice(0, 10));
      showToast("💡 Estimasi tanggal selesai dihitung otomatis berdasarkan kecepatan!");
    } else {
      showToast("⚠️ Masukkan Target, Progress, dan Kecepatan (> 0) terlebih dahulu!");
    }
  };

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

  const handleOpenAdd = () => {
    setGoalName("");
    setGoalTarget("");
    setGoalProgress("0");
    setGoalSpeed("");
    const today = new Date();
    // Default deadline: 30 days from now
    const defaultDate = new Date(today.setDate(today.getDate() + 30)).toISOString().slice(0, 10);
    setGoalDeadline(defaultDate);
    setIsAddOpen(true);
  };

  const handleAddGoal = () => {
    const name = goalName.trim();
    if (!name) {
      showToast("❌ Nama goal tidak boleh kosong!");
      return;
    }
    const targetVal = parseFloat(goalTarget) || 0;
    if (targetVal <= 0) {
      showToast("❌ Target harus lebih besar dari 0!");
      return;
    }
    const progVal = parseFloat(goalProgress) || 0;
    const speedVal = parseFloat(goalSpeed) || undefined;

    const newGoal: Goal = {
      id: "goal_" + Date.now(),
      name,
      target: targetVal,
      progress: Math.min(targetVal, Math.max(0, progVal)),
      deadline: goalDeadline,
      completed: progVal >= targetVal,
      speed: speedVal,
    };

    const updatedGoals = [...goals, newGoal];
    onChange({ goals: updatedGoals });
    setIsAddOpen(false);
    showToast(`🎯 Goal "${name}" berhasil ditambahkan!`);
  };

  const handleOpenEdit = (g: Goal) => {
    setEditingGoal(g);
    setGoalName(g.name);
    setGoalTarget(String(g.target));
    setGoalProgress(String(g.progress));
    setGoalDeadline(g.deadline);
    setGoalSpeed(g.speed !== undefined ? String(g.speed) : "");
    setIsEditOpen(true);
  };

  const handleEditGoal = () => {
    if (!editingGoal) return;
    const name = goalName.trim();
    if (!name) {
      showToast("❌ Nama goal tidak boleh kosong!");
      return;
    }
    const targetVal = parseFloat(goalTarget) || 0;
    if (targetVal <= 0) {
      showToast("❌ Target harus lebih besar dari 0!");
      return;
    }
    const progVal = parseFloat(goalProgress) || 0;
    const speedVal = parseFloat(goalSpeed) || undefined;

    const updatedGoals = goals.map((g) => {
      if (g.id === editingGoal.id) {
        const finalProg = Math.min(targetVal, Math.max(0, progVal));
        return {
          ...g,
          name,
          target: targetVal,
          progress: finalProg,
          deadline: goalDeadline,
          completed: finalProg >= targetVal,
          speed: speedVal,
        };
      }
      return g;
    });

    onChange({ goals: updatedGoals });
    setIsEditOpen(false);
    setEditingGoal(null);
    showToast(`✓ Goal "${name}" berhasil diperbarui!`);
  };

  const handleDeleteGoal = (id: string, name: string) => {
    if (!confirm(`Hapus goal "${name}"?\nTindakan ini tidak bisa dibatalkan.`)) return;
    const updatedGoals = goals.filter((g) => g.id !== id);
    onChange({ goals: updatedGoals });
    showToast("🗑️ Goal berhasil dihapus");
  };

  const handleAdjustProgress = (goal: Goal, amount: number) => {
    const updatedGoals = goals.map((g) => {
      if (g.id === goal.id) {
        const newProg = Math.min(g.target, Math.max(0, g.progress + amount));
        const isNowCompleted = newProg >= g.target;
        if (isNowCompleted && !g.completed) {
          showToast(`🏆 Selamat! Goal "${g.name}" telah tercapai!`);
        }
        return {
          ...g,
          progress: newProg,
          completed: isNowCompleted,
        };
      }
      return g;
    });
    onChange({ goals: updatedGoals });
  };

  const handleToggleComplete = (goal: Goal) => {
    const updatedGoals = goals.map((g) => {
      if (g.id === goal.id) {
        const nextCompleted = !g.completed;
        const nextProgress = nextCompleted ? g.target : Math.min(g.progress, g.target - 1);
        if (nextCompleted) {
          showToast(`🏆 Goal "${g.name}" ditandai selesai!`);
        }
        return {
          ...g,
          completed: nextCompleted,
          progress: nextProgress >= 0 ? nextProgress : 0,
        };
      }
      return g;
    });
    onChange({ goals: updatedGoals });
  };

  // Helper calculation for days remaining
  const getDaysRemaining = (deadlineStr: string) => {
    if (!deadlineStr) return null;
    const deadlineDate = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Formatter for metric values
  const formatMetric = (val: number) => {
    if (val >= 10000) {
      return "Rp " + Math.round(val).toLocaleString("id-ID");
    }
    return val.toLocaleString("id-ID");
  };

  const getStatusBadge = (goal: Goal) => {
    if (goal.completed) {
      return {
        text: "🏆 Selesai",
        style: "bg-[#2ECC71]/10 border-[#2ECC71]/30 text-[#2ECC71]",
      };
    }
    const days = getDaysRemaining(goal.deadline);
    if (days !== null && days < 0) {
      return {
        text: `⚠️ Terlewat ${Math.abs(days)} hari`,
        style: "bg-[#E74C3C]/10 border-[#E74C3C]/30 text-[#E74C3C]",
      };
    }
    if (days === 0) {
      return {
        text: "⏳ Hari ini!",
        style: "bg-[#E67E22]/10 border-[#E67E22]/30 text-[#E67E22]",
      };
    }
    return {
      text: `⏳ ${days} hari lagi`,
      style: "bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]",
    };
  };

  // Filter & Search application
  const filteredGoals = goals.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "completed") {
      return matchesSearch && g.completed;
    }
    if (statusFilter === "active") {
      return matchesSearch && !g.completed;
    }
    return matchesSearch;
  });

  // Top overall stats
  const totalCount = goals.length;
  const completedCount = goals.filter((g) => g.completed).length;
  const activeCount = totalCount - completedCount;
  
  // Weighted or average completion rate
  const totalTargetSum = goals.reduce((acc, g) => acc + g.target, 0);
  const totalProgSum = goals.reduce((acc, g) => acc + g.progress, 0);
  const overallPct = totalTargetSum > 0 ? Math.round((totalProgSum / totalTargetSum) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in text-zinc-700 pb-4">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all hover:scale-[1.02]">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#B8860B]">
            Total Goal
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-extrabold text-zinc-800 font-mono">{totalCount}</span>
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase">rencana</span>
          </div>
        </div>

        <div className="bg-orange-50/30 border border-orange-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all hover:scale-[1.02]">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#E67E22]">
            Goal Goal Aktif
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-extrabold text-[#E67E22] font-mono">{activeCount}</span>
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase">berjalan</span>
          </div>
        </div>

        <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all hover:scale-[1.02]">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">
            Goal Selesai
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-extrabold text-[#10B981] font-mono">{completedCount}</span>
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase">tercapai</span>
          </div>
        </div>

        <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all hover:scale-[1.02]">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#3b82f6]">
            Rata-rata Progress
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-extrabold text-blue-600 font-mono">{overallPct}%</span>
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase">selesai</span>
          </div>
        </div>
      </div>

      {/* 2. Control Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-50/50 border border-zinc-200/50 rounded-3xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {(["all", "active", "completed"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold transition-all capitalize cursor-pointer ${
                statusFilter === filter
                  ? "bg-[#C9A84C] text-[#1a1500] shadow-sm"
                  : "bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {filter === "all" ? "Semua" : filter === "active" ? "Aktif" : "Selesai"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Cari nama goal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 sm:w-[200px] bg-white border border-zinc-200 text-zinc-800 rounded-2xl px-4 py-2 text-xs outline-none focus:border-[#C9A84C]"
          />
          <button
            onClick={handleOpenAdd}
            className="bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold px-4.5 py-2.5 rounded-2xl text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm active:scale-95"
          >
            <span>🎯</span> Tambah Goal
          </button>
        </div>
      </div>

      {/* 3. Goals Grid / List */}
      {filteredGoals.length === 0 ? (
        <div className="bg-zinc-50/30 border border-dashed border-zinc-200 rounded-3xl p-10 text-center">
          <span className="text-4xl block mb-3 select-none">🎯</span>
          <h5 className="text-sm font-black text-zinc-800 uppercase tracking-wide">Belum Ada Goal Terdaftar</h5>
          <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Mulai pasang target pribadimu hari ini! Klik tombol &ldquo;Tambah Goal&rdquo; untuk melacak kemajuanmu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGoals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0;
            const badge = getStatusBadge(g);

            // Progress bar color based on progress percentage
            const barBg = g.completed
              ? "bg-[#10B981]"
              : pct >= 75
              ? "bg-[#14B8A6]"
              : pct >= 40
              ? "bg-[#C9A84C]"
              : pct > 0
              ? "bg-[#F97316]"
              : "bg-zinc-200";

            return (
              <div
                key={g.id}
                className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-5 flex flex-col justify-between hover:border-[#C9A84C]/50 transition-all group"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider ${badge.style}`}>
                      {badge.text}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-[#B8860B] transition-colors cursor-pointer text-xs"
                        title="Edit Goal"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(g.id, g.name)}
                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer text-xs"
                        title="Hapus Goal"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-black text-zinc-800 mt-3 group-hover:text-[#B8860B] transition-colors leading-snug">
                    {g.name}
                  </h4>

                  {/* Deadline & Speed Info */}
                  <div className="grid grid-cols-2 gap-2 mt-3 bg-zinc-50/80 border border-zinc-100 rounded-2xl p-2.5 text-zinc-600">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">
                        📅 Estimasi Selesai
                      </span>
                      <span className="text-[11px] font-mono font-bold text-zinc-700">
                        {new Date(g.deadline).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">
                        ⚡ Kecepatan Saat Ini
                      </span>
                      <span className="text-[11px] font-mono font-bold text-zinc-700">
                        {g.speed !== undefined ? `${formatMetric(g.speed)}/mg` : "Tidak diset"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Stats & Bar */}
                <div className="mt-5 space-y-3">
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <span className="font-extrabold text-zinc-800 font-mono">{formatMetric(g.progress)}</span>
                      <span className="text-zinc-300 mx-1">/</span>
                      <span className="text-zinc-400 font-bold font-mono">{formatMetric(g.target)}</span>
                    </div>
                    <span className="font-black text-[#B8860B] font-mono">{pct}%</span>
                  </div>

                  {/* Modern Duolingo styled progress bar */}
                  <div className="h-3.5 bg-zinc-100 rounded-full overflow-hidden p-[2px] border border-zinc-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${barBg}`}
                      style={{ width: `${pct}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100 mt-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAdjustProgress(g, -1)}
                        disabled={g.progress <= 0}
                        className="w-7 h-7 flex items-center justify-center bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-zinc-700 font-extrabold transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-xs"
                        title="Kurangi Progress"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleAdjustProgress(g, 1)}
                        disabled={g.progress >= g.target}
                        className="w-7 h-7 flex items-center justify-center bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-zinc-700 font-extrabold transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-xs"
                        title="Tambah Progress"
                      >
                        +
                      </button>

                      {/* Quick increments for larger targets */}
                      {g.target >= 10 && (
                        <button
                          onClick={() => handleAdjustProgress(g, Math.ceil(g.target / 10))}
                          disabled={g.progress >= g.target}
                          className="px-2 h-7 flex items-center justify-center bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-[10px] text-zinc-500 font-mono font-black transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                        >
                          +{Math.ceil(g.target / 10)}
                        </button>
                      )}
                    </div>

                    <label className="flex items-center gap-1.5 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={g.completed}
                        onChange={() => handleToggleComplete(g)}
                        className="w-4 h-4 rounded-md border-zinc-300 accent-emerald-500"
                      />
                      <span className="text-[9px] font-black text-zinc-400 tracking-wider uppercase">Selesai</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal Add Goal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="➕ Tambah Goal Baru">
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black mb-1.5">
              Nama Goal
            </label>
            <input
              type="text"
              placeholder="e.g. Laptop, Tabungan Kawinan..."
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black mb-1.5">
                Target Angka / Rupiah
              </label>
              <input
                type="number"
                placeholder="e.g. 8000000"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono"
              />
            </div>

            <div>
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black mb-1.5">
                Progress Awal
              </label>
              <input
                type="number"
                value={goalProgress}
                onChange={(e) => setGoalProgress(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black mb-1.5">
              Kecepatan Nabung / Progress (per minggu, opsional)
            </label>
            <input
              type="number"
              placeholder="e.g. 400000"
              value={goalSpeed}
              onChange={(e) => setGoalSpeed(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">
                Tanggal Estimasi Selesai / Deadline
              </label>
              {parseFloat(goalSpeed) > 0 && (
                <button
                  type="button"
                  onClick={() => handleAutoCalculateDeadline(goalTarget, goalProgress, goalSpeed)}
                  className="text-[9px] text-[#B8860B] hover:underline font-bold cursor-pointer"
                >
                  ⚡ Hitung Otomatis
                </button>
              )}
            </div>
            <input
              type="date"
              value={goalDeadline}
              onChange={(e) => setGoalDeadline(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono"
            />
          </div>

          <button
            onClick={handleAddGoal}
            className="w-full bg-[#C9A84C] hover:bg-[#B8860B] hover:text-white text-[#1a1500] font-extrabold py-3 rounded-xl text-xs transition-colors mt-2 cursor-pointer"
          >
            ✓ Simpan Goal
          </button>
        </div>
      </Modal>

      {/* 5. Modal Edit Goal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="✏️ Edit Goal">
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black mb-1.5">
              Nama Goal
            </label>
            <input
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black mb-1.5">
                Target Angka / Rupiah
              </label>
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono"
              />
            </div>

            <div>
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black mb-1.5">
                Progress
              </label>
              <input
                type="number"
                value={goalProgress}
                onChange={(e) => setGoalProgress(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black mb-1.5">
              Kecepatan Nabung / Progress (per minggu, opsional)
            </label>
            <input
              type="number"
              placeholder="e.g. 400000"
              value={goalSpeed}
              onChange={(e) => setGoalSpeed(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">
                Tanggal Estimasi Selesai / Deadline
              </label>
              {parseFloat(goalSpeed) > 0 && (
                <button
                  type="button"
                  onClick={() => handleAutoCalculateDeadline(goalTarget, goalProgress, goalSpeed)}
                  className="text-[9px] text-[#B8860B] hover:underline font-bold cursor-pointer"
                >
                  ⚡ Hitung Otomatis
                </button>
              )}
            </div>
            <input
              type="date"
              value={goalDeadline}
              onChange={(e) => setGoalDeadline(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono"
            />
          </div>

          <button
            onClick={handleEditGoal}
            className="w-full bg-[#C9A84C] hover:bg-[#B8860B] hover:text-white text-[#1a1500] font-extrabold py-3 rounded-xl text-xs transition-colors mt-2 cursor-pointer"
          >
            ✓ Simpan Perubahan
          </button>
        </div>
      </Modal>
    </div>
  );
}
