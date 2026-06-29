/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { AppState, CustomExpense } from "../types";
import { ECATS } from "../constants";
import { fmtRp, fmtK, totalExp } from "../utils";
import Modal from "./Modal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";

interface ExpenseTabProps {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
  showToast: (msg: string) => void;
}

export default function ExpenseTab({ state, onChange, showToast }: ExpenseTabProps) {
  const [editEId, setEditEId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  
  // Custom expense creation state
  const [customName, setCustomName] = useState("");
  const [customAmt, setCustomAmt] = useState("");

  // Edit custom category state
  const [selectedCustomId, setSelectedCustomId] = useState<string | null>(null);
  const [editCustomName, setEditCustomName] = useState("");
  const [editCustomAmt, setEditCustomAmt] = useState("");

  // Unlock Savings state
  const [isTabunganModalOpen, setIsTabunganModalOpen] = useState(false);
  const [tabConfirmInput, setTabConfirmInput] = useState("");
  const [isTabUnfinished, setIsTabUnfinished] = useState(true);
  const [tabVal, setTabVal] = useState("");

  const tot = totalExp(state);
  const sisa = state.budget - tot;
  const pct = state.budget > 0 ? Math.min(100, Math.round((tot / state.budget) * 100)) : 0;
  const pbC = pct > 90 ? "#E74C3C" : pct > 70 ? "#E67E22" : "#2ECC71";
  const aktual = tot - (state.expenses?.tabungan || 0);

  // Combine standard + custom categories
  const allCategories = [
    ...ECATS,
    ...(state.customExp || []).map((e) => ({
      id: e.id,
      icon: e.icon || "📦",
      label: e.name,
      color: "#888",
      custom: true,
      locked: false,
    })),
  ];

  const handleSaveBudget = (v: number) => {
    onChange({ budget: v });
  };

  const handleAddCustomExpense = () => {
    const trimmed = customName.trim();
    const parsedAmt = parseInt(customAmt) || 0;
    if (!trimmed) {
      showToast("❌ Isi nama pengeluaran!");
      return;
    }
    const newCustom: CustomExpense = {
      id: `c_${Date.now()}`,
      name: trimmed,
      amt: parsedAmt,
      icon: "📦",
    };
    const updatedCustoms = [...(state.customExp || []), newCustom];
    onChange({ customExp: updatedCustoms });
    setCustomName("");
    setCustomAmt("");
    showToast(`✅ "${trimmed}" berhasil ditambahkan!`);
  };

  const handleDeleteCustomExpense = (id: string) => {
    const updatedCustoms = (state.customExp || []).filter((e) => e.id !== id);
    // Also cleanup if it was stored under expenses map directly
    const updatedExpenses = { ...state.expenses };
    delete updatedExpenses[id];
    onChange({ customExp: updatedCustoms, expenses: updatedExpenses });
    showToast("🗑️ Kategori berhasil dihapus");
  };

  const handleEditCustom = (id: string, name: string, amt: number) => {
    setSelectedCustomId(id);
    setEditCustomName(name);
    setEditCustomAmt(String(amt));
  };

  const handleSaveCustomEdit = () => {
    if (!selectedCustomId) return;
    const trimmed = editCustomName.trim();
    if (!trimmed) {
      showToast("❌ Nama tidak boleh kosong!");
      return;
    }
    const parsedAmt = parseInt(editCustomAmt) || 0;
    const updatedCustoms = (state.customExp || []).map((e) =>
      e.id === selectedCustomId ? { ...e, name: trimmed, amt: parsedAmt } : e
    );
    onChange({ customExp: updatedCustoms });
    setSelectedCustomId(null);
    showToast(`✅ "${trimmed}" berhasil diperbarui!`);
  };

  const handleSaveTabungan = () => {
    const parsedVal = parseInt(tabVal) || 0;
    const updatedExpenses = { ...state.expenses, tabungan: parsedVal };
    onChange({ expenses: updatedExpenses });
    setIsTabunganModalOpen(false);
    setTabConfirmInput("");
    setIsTabUnfinished(true);
    setTabVal("");
    showToast(`✅ Tabungan diperbarui: ${fmtRp(parsedVal)} 🔒`);
  };

  const handleCommitExpenseChange = (id: string) => {
    const parsedVal = parseInt(editVal.replace(/\D/g, "")) || 0;
    
    // Check if custom or standard
    const isCustom = (state.customExp || []).some((e) => e.id === id);
    if (isCustom) {
      const updatedCustoms = (state.customExp || []).map((e) =>
        e.id === id ? { ...e, amt: parsedVal } : e
      );
      onChange({ customExp: updatedCustoms });
    } else {
      const updatedExpenses = { ...state.expenses, [id]: parsedVal };
      onChange({ expenses: updatedExpenses });
    }
    setEditEId(null);
    setEditVal("");
    showToast(`✅ Pengeluaran ${fmtRp(parsedVal)} disimpan`);
  };

  // Recharts data for chart below
  const chartData = ECATS.filter((c) => c.id !== "tabungan" && (state.expenses?.[c.id] || 0) > 0).map((c) => ({
    name: c.label.split(" ")[0],
    jumlah: state.expenses?.[c.id] || 0,
    color: c.color,
  }));

  return (
    <div className="space-y-6 animate-fade-in text-zinc-700 pb-4">
      {/* Monthly Budget Input Card */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B] mb-3 flex items-center gap-1.5">
          💰 Anggaran Bulanan
        </h3>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span className="text-lg font-black text-[#B8860B]">Rp</span>
          <input
            type="text"
            value={state.budget.toLocaleString("id-ID")}
            onChange={(e) => {
              const cleaned = parseInt(e.target.value.replace(/\D/g, "")) || 0;
              handleSaveBudget(cleaned);
            }}
            placeholder="2.000.000"
            className="bg-zinc-50 border border-zinc-200 text-zinc-800 font-mono font-extrabold text-lg rounded-2xl py-2.5 px-4 w-[200px] outline-none focus:border-[#C9A84C] focus:bg-white focus:ring-1 focus:ring-[#C9A84C] transition-all"
          />
          <button
            onClick={() => showToast("✅ Budget berhasil disimpan!")}
            className="bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold px-5 py-2.5 rounded-2xl text-xs transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
          >
            Simpan
          </button>
        </div>

        <div className="flex justify-between text-xs mb-2.5">
          <span className="text-zinc-500 font-medium">Terpakai</span>
          <span className="font-extrabold" style={{ color: pbC }}>
            {pct}%
          </span>
        </div>
        {/* Duolingo style bold progress bar */}
        <div className="h-4 bg-zinc-100 rounded-full overflow-hidden p-[2px] border border-zinc-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
          <div
            className="h-full rounded-full transition-all duration-1000 relative overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            style={{ width: `${pct}%`, backgroundColor: pbC }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>
        <div className="flex justify-between mt-3 text-xs font-mono font-bold">
          <span className="text-zinc-400">Total: {fmtRp(tot)}</span>
          <span className="font-black" style={{ color: sisa >= 0 ? "#10B981" : "#EF4444" }}>
            {sisa >= 0 ? "Sisa: " : "OVER: "} {fmtRp(Math.abs(sisa))}
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { l: "Total Pengeluaran", v: fmtRp(tot), c: "text-[#B8860B]", bg: "bg-amber-50/40 border-amber-100" },
          { l: "Sisa Anggaran", v: fmtRp(sisa), c: sisa >= 0 ? "text-emerald-600" : "text-rose-600", bg: sisa >= 0 ? "bg-emerald-50/30 border-emerald-100" : "bg-rose-50/40 border-rose-100" },
          { l: "Tabungan 🔒", v: fmtRp(state.expenses?.tabungan || 0), c: "text-emerald-600", bg: "bg-emerald-50/30 border-emerald-100" },
          { l: "Aktual (Belanja)", v: fmtRp(aktual), c: "text-blue-600", bg: "bg-blue-50/30 border-blue-100" },
        ].map((k, i) => (
          <div key={i} className={`bg-white border border-zinc-200/50 rounded-2xl p-4 shadow-sm text-center ${k.bg} transition-all duration-300 hover:scale-[1.02]`}>
            <div className={`text-xs font-extrabold font-mono ${k.c}`}>
              {k.v}
            </div>
            <div className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider mt-1">{k.l}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-zinc-600 bg-amber-50/50 rounded-2xl p-4 leading-relaxed border border-amber-200/30">
        💡 <strong className="text-[#B8860B] font-extrabold">Ketuk baris kategori</strong> &rarr; Ketik jumlah &rarr; Enter untuk menyimpan otomatis ke cloud ☁️
      </div>

      {/* Category Rows */}
      <div className="space-y-3">
        {allCategories.map((cat) => {
          const isCustom = "custom" in cat && cat.custom;
          const val = isCustom
            ? (state.customExp || []).find((e) => e.id === cat.id)?.amt || 0
            : state.expenses?.[cat.id] || 0;
          
          const limit = state.catBudget?.[cat.id] || 0;
          const overLimit = limit > 0 && val > limit;
          const nearLimit = limit > 0 && val > limit * 0.8 && !overLimit;

          const catPct = state.budget > 0 ? Math.min(100, Math.round((val / state.budget) * 100)) : 0;
          const limitPct = limit > 0 ? Math.min(100, Math.round((val / limit) * 100)) : 0;
          
          const barColor = cat.locked ? "#10B981" : overLimit ? "#EF4444" : nearLimit ? "#F97316" : cat.color;
          const isEditing = editEId === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => {
                if (cat.locked) return;
                if (isCustom) {
                  const item = (state.customExp || []).find((e) => e.id === cat.id);
                  if (item) handleEditCustom(cat.id, item.name, item.amt);
                } else {
                  setEditEId(isEditing ? null : cat.id);
                  setEditVal(String(val || ""));
                }
              }}
              className={`flex items-center gap-4 bg-white border border-zinc-200/50 rounded-2xl p-4 transition-all duration-200 hover:bg-zinc-50 hover:shadow-sm cursor-pointer ${
                isEditing ? "border-[#C9A84C] bg-amber-50/20" : ""
              }`}
            >
              <span className="text-2xl select-none">{cat.icon}</span>
              
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold flex flex-wrap items-center gap-1.5">
                  <span className={cat.locked ? "text-emerald-600 font-extrabold" : "text-zinc-800"}>
                    {cat.label}
                  </span>
                  {overLimit && (
                    <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md font-extrabold border border-rose-100">
                      ⚠️ OVER LIMIT
                    </span>
                  )}
                  {nearLimit && (
                    <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md font-extrabold border border-orange-100">
                      ⚡ 80% LIMIT
                    </span>
                  )}
                </div>
                
                <div className="h-1.5 bg-zinc-100 rounded-full mt-2 overflow-hidden border border-zinc-200/10">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${limit > 0 ? limitPct : catPct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                
                <div className="text-[8px] text-zinc-400 mt-1 font-extrabold tracking-wide uppercase">
                  {limit > 0
                    ? `${fmtRp(val)} / batas ${fmtRp(limit)} (${limitPct}%)`
                    : catPct > 0
                    ? `${catPct}% dari total anggaran`
                    : "Belum dianggarkan secara spesifik"}
                </div>
              </div>

              {/* Action Column */}
              <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      placeholder="0"
                      className="bg-white border border-zinc-300 text-zinc-800 rounded-lg p-1.5 w-[110px] text-center text-xs font-extrabold outline-none font-mono focus:border-[#C9A84C]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitExpenseChange(cat.id);
                        if (e.key === "Escape") setEditEId(null);
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleCommitExpenseChange(cat.id)}
                      className="bg-[#C9A84C] text-black hover:bg-[#B8860B] hover:text-white font-extrabold p-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditEId(null)}
                      className="bg-transparent border border-zinc-200 text-zinc-400 p-1.5 rounded-lg text-xs hover:text-zinc-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : cat.locked ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-600 font-mono">
                      {fmtRp(val)}
                    </span>
                    <button
                      onClick={() => {
                        setTabVal(String(state.expenses?.tabungan || 500000));
                        setIsTabunganModalOpen(true);
                      }}
                      className="bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-600 rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      🔓 Edit
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-mono ${val > 0 ? "font-extrabold text-zinc-700" : "text-zinc-300 text-[11px]"}`}>
                      {val > 0 ? fmtRp(val) : "belum diisi ✏️"}
                    </span>
                    {isCustom && (
                      <>
                        <button
                          onClick={() => {
                            const item = (state.customExp || []).find((e) => e.id === cat.id);
                            if (item) handleEditCustom(cat.id, item.name, item.amt);
                          }}
                          className="text-[#B8860B] bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-lg px-2 py-1 text-[10px] cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Hapus kategori kustom ini?")) handleDeleteCustomExpense(cat.id);
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 text-xs cursor-pointer"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Expense */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
          ➕ Tambah Pengeluaran Lainnya
        </h4>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Nama pengeluaran..."
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="flex-1 min-w-[130px] bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl py-2.5 px-4 text-xs outline-none focus:bg-white focus:border-[#C9A84C]"
          />
          <input
            type="number"
            placeholder="Jumlah (Rp)"
            value={customAmt}
            onChange={(e) => setCustomAmt(e.target.value)}
            className="w-[120px] bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl py-2.5 px-4 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono"
          />
          <button
            onClick={handleAddCustomExpense}
            className="bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold px-5 py-2.5 rounded-2xl text-xs transition-colors cursor-pointer active:scale-95"
          >
            + Tambah
          </button>
        </div>
      </div>

      {/* Expense Share Bar Chart */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
          Grafik Pengeluaran per Kategori
        </h4>
        <div className="h-[200px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis type="number" stroke="#a1a1aa" fontSize={8} tickFormatter={(v) => fmtK(v)} />
                <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={9} width={50} tickLine={false} />
                <RechartsTooltip
                  formatter={(value: any) => [fmtRp(value), "Jumlah"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f4f4f5", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", color: "#18181b" }}
                />
                <Bar dataKey="jumlah" fill="#C9A84C" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-400 italic text-center">
              <span className="text-xl mb-1">📊</span>
              <span>Belum ada data pengeluaran.</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Category Edit Modal */}
      <Modal
        isOpen={selectedCustomId !== null}
        onClose={() => setSelectedCustomId(null)}
        title="✏️ Edit Pengeluaran"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
              Nama Kategori
            </label>
            <input
              type="text"
              value={editCustomName}
              onChange={(e) => setEditCustomName(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm focus:border-[#C9A84C] text-zinc-800 outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
              Jumlah (Rp)
            </label>
            <input
              type="number"
              value={editCustomAmt}
              onChange={(e) => setEditCustomAmt(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-lg text-right font-extrabold font-mono text-[#B8860B] focus:border-[#C9A84C] outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveCustomEdit}
              className="flex-1 bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold p-3 rounded-xl transition-colors text-xs cursor-pointer"
            >
              ✓ Simpan
            </button>
            <button
              onClick={() => {
                if (selectedCustomId) {
                  handleDeleteCustomExpense(selectedCustomId);
                  setSelectedCustomId(null);
                }
              }}
              className="bg-rose-50 border border-rose-100 text-rose-600 font-extrabold p-3 rounded-xl hover:bg-rose-100 transition-colors text-xs px-4 cursor-pointer"
            >
              🗑️ Hapus
            </button>
          </div>
        </div>
      </Modal>

      {/* Tabungan (Savings) Unlock Modal */}
      <Modal
        isOpen={isTabunganModalOpen}
        onClose={() => {
          setIsTabunganModalOpen(false);
          setTabConfirmInput("");
          setIsTabUnfinished(true);
        }}
        title="🏦 Edit Tabungan"
      >
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 leading-relaxed">
            ⚠️ Tabungan dikunci untuk mencegah pengeluaran tidak sengaja.
            <br />
            Untuk membuka kunci, ketik <strong className="text-[#B8860B] font-bold">SETUJU</strong> di bawah.
          </div>

          <div>
            <label className="block text-[9px] text-zinc-400 uppercase tracking-widest mb-1 font-bold">
              Ketik SETUJU untuk buka kunci
            </label>
            <input
              type="text"
              placeholder="SETUJU"
              value={tabConfirmInput}
              onChange={(e) => {
                setTabConfirmInput(e.target.value);
                if (e.target.value.trim().toUpperCase() === "SETUJU") {
                  setIsTabUnfinished(false);
                  showToast("🔓 Kunci terbuka! Edit jumlah tabungan.");
                } else {
                  setIsTabUnfinished(true);
                }
              }}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl py-3 px-4 text-center text-sm font-black tracking-widest uppercase outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {!isTabUnfinished && (
            <div className="animate-fade-in">
              <label className="block text-[9px] text-emerald-600 uppercase tracking-widest mb-1 font-bold">
                Jumlah Tabungan
              </label>
              <input
                type="number"
                value={tabVal}
                onChange={(e) => setTabVal(e.target.value)}
                className="w-full bg-zinc-50 border-2 border-emerald-500 rounded-xl p-3 text-lg font-black font-mono text-emerald-600 text-right outline-none"
              />
            </div>
          )}

          <button
            onClick={() => {
              if (tabConfirmInput.trim().toUpperCase() === "SETUJU") {
                if (isTabUnfinished) {
                  setIsTabUnfinished(false);
                } else {
                  handleSaveTabungan();
                }
              } else {
                showToast("❌ Ketik SETUJU (huruf kapital) untuk membuka");
              }
            }}
            className={`w-full font-bold p-3 rounded-xl text-xs transition-colors cursor-pointer ${
              isTabUnfinished
                ? "bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }`}
          >
            {isTabUnfinished ? "Cek Konfirmasi" : "✓ Simpan Tabungan"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
