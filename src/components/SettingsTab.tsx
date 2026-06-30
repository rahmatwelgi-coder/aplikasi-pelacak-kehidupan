/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { AppState } from "../types";
import { MONTHS_ID, WTYPES, ECATS } from "../constants";
import { getTranslation } from "../translations";

interface SettingsTabProps {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
  showToast: (msg: string) => void;
  onLogout: () => void;
  onResetAllData: () => Promise<void>;
  username: string;
}

export default function SettingsTab({
  state,
  onChange,
  showToast,
  onLogout,
  onResetAllData,
  username,
}: SettingsTabProps) {
  const t = getTranslation(state.lang);

  // Local state for profile values to avoid double rendering lag
  const [profileName, setProfileName] = useState(state.name || "");
  const [profileBudget, setProfileBudget] = useState(state.budget.toLocaleString("id-ID"));
  const [streakVal, setStreakVal] = useState(String(state.streak || 0));

  // Calendar Period States
  const [periodMonth, setPeriodMonth] = useState(String(state.month));
  const [periodYear, setPeriodYear] = useState(String(state.year));

  // AI Context Exporter state
  const [showAIExporter, setShowAIExporter] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);

  const getAIContextText = () => {
    return `# CONTEXT APLIKASI UNTUK PENGEMBANGAN AI (LIFE TRACKER APP)

## 1. Ringkasan Sistem & Arsitektur
- **Nama Aplikasi**: Life Tracker (Aplikasi Pelacak Kehidupan Pribadi)
- **Framework & Tech Stack**: React (Vite) + Tailwind CSS + Express (server.ts) + Firebase Firestore
- **Sistem Database & Auth**: Username dan Password/PIN tersimpan di Firestore via API proxy server-side.
- **Struktur Komponen & Tab Utama**:
  - \`OverviewTab.tsx\`: Ringkasan aktivitas harian, streak, ringkasan XP workout, status anggaran belanja, dan visual capaian target hidup.
  - \`ExpenseTab.tsx\`: Pencatatan pengeluaran harian per kategori, integrasi budget limit bulanan, dan tabungan.
  - \`WorkoutTab.tsx\`: Kalender dan log latihan fisik dengan reward sistem XP.
  - \`HabitTab.tsx\`: Pelacak konsistensi kebiasaan (habits) harian dalam bentuk grid interaktif bulanan.
  - \`GoalsTab.tsx\`: Manajemen target hidup jangka pendek dan panjang dengan progress bar dinamis.
  - \`ReportTab.tsx\`: Analisis visual, dashboard pengeluaran, perbandingan bulanan, dan diagram keuangan interaktif (menggunakan Recharts/D3).
  - \`HistoryTab.tsx\`: Log terpusat dari semua catatan historis (pengeluaran, workout, habit) lengkap dengan fitur hapus, edit, pencarian, dan penyaringan tipe entri.
  - \`SettingsTab.tsx\`: Pengaturan periode, streak, bobot XP olahraga, batas kategori belanja, akun, dan integrasi ekspor AI.

## 2. Data Aktif Pengguna Saat Ini
- **Username Akun**: ${username || "Offline/Tamu"}
- **Nama Tampilan**: ${state.name || "User"}
- **Periode Aktif**: ${MONTHS_ID[state.month] || state.month} ${state.year}
- **Batas Anggaran Bulanan**: Rp ${(state.budget || 0).toLocaleString("id-ID")}
- **Jumlah Kebiasaan Aktif**: ${Object.keys(state.habits || {}).length} kebiasaan terdaftar
- **Jumlah Target (Goals)**: ${state.goals?.length || 0} target terdaftar
- **Kustomisasi XP Workout**: ${JSON.stringify(state.customWkXP || {})}
- **Batas Kategori Belanja**: ${JSON.stringify(state.catBudget || {})}

## 3. Instruksi Kerja untuk AI Penerima (ChatGPT, Claude, Gemini, dll)
Halo! Saya sedang mengembangkan aplikasi Life Tracker ini menggunakan Google AI Studio Coding Agent. Karena URL aplikasi dilindungi autentikasi Google, saya mengirimkan salinan struktur dan status data saya ini secara langsung.

Tugas Kamu:
1. Analisis seluruh arsitektur, data, dan tab yang ada di atas.
2. Berikan analisis mendalam dan ide-ide kreatif (seperti integrasi fitur baru, penyempurnaan UI/UX yang elegan, penambahan charts baru, atau fitur mikro yang meningkatkan produktivitas).
3. **PENTING**: Buatkan sebuah "PROMPT SIAP PAKAI" yang sangat detail dalam bahasa Indonesia. Instruksikan agar prompt tersebut bisa langsung saya salin dan berikan kembali ke Google AI Studio Coding Agent saya di chat sebelah agar dia dapat mengimplementasikan seluruh ide baru tersebut secara otomatis tanpa merusak data atau sistem yang ada!`;
  };

  const handleCopyAIContext = () => {
    const text = getAIContextText();
    navigator.clipboard.writeText(text).then(() => {
      setAiCopied(true);
      showToast("📋 Konteks AI disalin ke papan klip!");
      setTimeout(() => setAiCopied(false), 3000);
    }).catch(() => {
      showToast("❌ Gagal menyalin secara otomatis. Silakan salin teks di bawah secara manual.");
    });
  };

  const handleSavePeriod = () => {
    const m = parseInt(periodMonth);
    const y = parseInt(periodYear) || 2025;
    const changed = m !== state.month || y !== state.year;
    
    if (changed && !confirm(`Ganti periode ke ${MONTHS_ID[m]} ${y}?\n\nData workout bulan sebelumnya akan direset. Lanjutkan?`)) {
      return;
    }

    onChange({
      month: m,
      year: y,
      workouts: changed ? {} : state.workouts, // Reset workouts if period changed
    });
    showToast(`✅ Periode aktif: ${MONTHS_ID[m]} ${y}`);
  };

  const handleSaveProfile = () => {
    const budgetRaw = parseInt(profileBudget.replace(/\D/g, "")) || 2000000;
    onChange({
      name: profileName.trim(),
      budget: budgetRaw,
    });
    showToast("✅ Profil berhasil disimpan!");
  };

  const handleSaveStreak = () => {
    const s = parseInt(streakVal) || 0;
    onChange({ streak: s });
    showToast(`🔥 Streak dikonfigurasi: ${s} hari!`);
  };

  const handleCustomWkXpChange = (typeId: string, val: number) => {
    const updatedCustomXp = { ...(state.customWkXP || {}) };
    updatedCustomXp[typeId] = val;
    onChange({ customWkXP: updatedCustomXp });
  };

  const handleResetWkXp = () => {
    if (!confirm("Reset semua XP workout ke setelan default pabrik?")) return;
    onChange({ customWkXP: {} });
    showToast("✅ XP workout direset ke default!");
  };

  const handleCatBudgetLimitChange = (catId: string, limitVal: number) => {
    const updatedLimits = { ...(state.catBudget || {}) };
    if (limitVal > 0) {
      updatedLimits[catId] = limitVal;
    } else {
      delete updatedLimits[catId];
    }
    onChange({ catBudget: updatedLimits });
  };

  const handleConfirmReset = async () => {
    if (
      !confirm(
        "⚠️ HAPUS SEMUA DATA PERMANEN?\n\nSeluruh data kamu akan dihapus selamanya dari database online.\nTindakan ini tidak bisa dibatalkan!\n\nLanjutkan?"
      )
    ) {
      return;
    }
    await onResetAllData();
  };

  return (
    <div className="space-y-6 animate-fade-in text-zinc-700 pb-4">
      {/* 1. Period Tracker Settings */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-5 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B] mb-1">
          📅 Periode Aktif Tracker
        </h4>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed font-medium">
          ⚠️ Mengganti periode bulan aktif akan mereset data kalender workout kamu untuk mencegah korupsi data. Disarankan mengunduh backup excel terlebih dahulu!
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[135px]">
            <label className="block text-[8px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
              Bulan
            </label>
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 px-3 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-semibold text-zinc-800"
            >
              {MONTHS_ID.map((mo, i) => (
                <option key={mo} value={i} className="text-zinc-800">
                  {mo}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[105px]">
            <label className="block text-[8px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
              Tahun
            </label>
            <input
              type="number"
              value={periodYear}
              onChange={(e) => setPeriodYear(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#C9A84C] font-mono text-center font-bold text-zinc-800"
            />
          </div>

          <button
            onClick={handleSavePeriod}
            className="bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            ✓ Simpan Periode
          </button>
        </div>
      </div>

      {/* 2. Profile & Budget Card */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-5 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B] mb-2">
          👤 Profil & Anggaran
        </h4>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
            <div>
              <div className="text-xs font-bold text-zinc-800">Nama Tampilan</div>
              <div className="text-[10px] text-zinc-400 font-medium mt-0.5">Muncul di header aplikasi</div>
            </div>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Nama kamu..."
              className="bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] w-[190px] text-right font-semibold text-zinc-800"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
            <div>
              <div className="text-xs font-bold text-zinc-800">Anggaran Bulanan</div>
              <div className="text-[10px] text-zinc-400 font-medium mt-0.5">Batas total pengeluaran</div>
            </div>
            <input
              type="text"
              value={profileBudget}
              onChange={(e) => setProfileBudget(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] w-[190px] text-right font-mono font-bold text-[#B8860B]"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          className="bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
        >
          ✓ Simpan Profil
        </button>
      </div>

      {/* App Preferences Card (Theme & Language) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-5 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B] mb-2">
          ⚙️ {t.settingsPreferences}
        </h4>
        <div className="space-y-4">
          {/* Bahasa */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{t.languageLabel}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Pilih bahasa / Select language</div>
            </div>
            <select
              value={state.lang || "id"}
              onChange={(e) => {
                onChange({ lang: e.target.value as "id" | "en" });
                showToast(e.target.value === "id" ? "✅ Bahasa diatur ke Indonesia!" : "✅ Language set to English!");
              }}
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 px-3 text-xs outline-none focus:bg-white dark:focus:bg-zinc-700 focus:border-[#C9A84C] font-semibold text-zinc-800 dark:text-zinc-100 w-[160px]"
            >
              <option value="id" className="text-zinc-800 dark:text-zinc-100">Bahasa Indonesia</option>
              <option value="en" className="text-zinc-800 dark:text-zinc-100">English</option>
            </select>
          </div>

          {/* Tema */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{t.themeLabel}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Tampilan gelap/terang / Dark/light mode</div>
            </div>
            <div className="flex gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => {
                  onChange({ theme: "light" });
                  showToast("☀️ Mode Terang!");
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  state.theme !== "dark"
                    ? "bg-white dark:bg-zinc-700 text-[#B8860B] shadow-sm font-extrabold"
                    : "text-zinc-400 hover:text-zinc-300 dark:hover:text-zinc-200"
                }`}
              >
                ☀️ {t.themeLight}
              </button>
              <button
                onClick={() => {
                  onChange({ theme: "dark" });
                  showToast("🌙 Mode Gelap!");
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  state.theme === "dark"
                    ? "bg-zinc-700 text-[#C9A84C] shadow-sm font-extrabold"
                    : "text-zinc-400 hover:text-zinc-300 dark:hover:text-zinc-200"
                }`}
              >
                🌙 {t.themeDark}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Workout Streak Settings */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-5 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B] mb-2">
          🔥 Streak Workout
        </h4>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <div className="text-xs font-bold text-zinc-800">Streak Saat Ini</div>
            <div className="text-[10px] text-zinc-400 font-medium mt-0.5">Konsistensi workout harian</div>
          </div>
          <input
            type="number"
            value={streakVal}
            onChange={(e) => setStreakVal(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs outline-none focus:bg-white focus:border-rose-500 w-[90px] text-center font-mono font-bold text-rose-600"
          />
        </div>
        <button
          onClick={handleSaveStreak}
          className="bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white text-rose-600 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
        >
          🔥 Simpan Streak
        </button>
      </div>

      {/* 4. Custom XP Reward Settings */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-5 space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B] mb-1">
          ⭐ Kustomisasi XP per Tipe Workout
        </h4>
        <p className="text-[10px] text-zinc-400 font-bold mb-3 leading-relaxed">
          Ubah nilai XP yang didapatkan setiap sesi workout yang selesai dilakukan.
        </p>

        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {WTYPES.map((t) => {
            const currentXp = state.customWkXP?.[t.id] ?? t.xp;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="text-lg select-none">{t.icon}</span>
                  <span className="text-zinc-600 font-bold">{t.label}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-400 font-black uppercase font-mono">XP:</span>
                  <input
                    type="number"
                    value={currentXp}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 1;
                      handleCustomWkXpChange(t.id, v);
                    }}
                    className="bg-zinc-50 border border-zinc-200 rounded-xl py-1 px-2.5 text-xs outline-none focus:bg-white focus:border-[#C9A84C] w-[70px] text-center font-mono font-extrabold text-[#B8860B]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2.5 mt-4">
          <button
            onClick={() => showToast("✅ XP workout berhasil diperbarui!")}
            className="bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            ✓ Simpan XP
          </button>
          <button
            onClick={handleResetWkXp}
            className="bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 font-extrabold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            ↩️ Reset Default
          </button>
        </div>
      </div>

      {/* 5. Custom Category Budget Limits */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-5 space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B] mb-1">
          🎯 Batas Anggaran per Kategori
        </h4>
        <p className="text-[10px] text-zinc-400 font-bold mb-3 leading-relaxed">
          Set batas maksimal bulanan per kategori. Baris kategori akan langsung berwarna merah di tab Pengeluaran jika melewati batas.
        </p>

        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {[
            ...ECATS.filter((c) => c.id !== "tabungan"),
            ...(state.customExp || []).map((e) => ({
              id: e.id,
              icon: e.icon || "📦",
              label: e.name,
            }))
          ].map((c) => {
            const limitVal = state.catBudget?.[c.id] || "";
            return (
              <div
                key={c.id}
                className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="text-lg select-none">{c.icon}</span>
                  <span className="text-zinc-600 font-bold">{c.label}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-400 font-black uppercase font-mono">Batas Rp:</span>
                  <input
                    type="number"
                    value={limitVal}
                    placeholder="Tak terbatas"
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      handleCatBudgetLimitChange(c.id, v);
                    }}
                    className="bg-zinc-50 border border-zinc-200 rounded-xl py-1 px-3 text-xs outline-none focus:bg-white focus:border-[#C9A84C] w-[130px] text-right font-mono font-semibold text-zinc-800"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => showToast("✅ Batas anggaran kategori disimpan!")}
          className="bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-colors mt-4 cursor-pointer"
        >
          ✓ Simpan Batas
        </button>
      </div>

      {/* AI Context Exporter Card */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#B8860B]">
            🤖 Eksportir Konteks untuk AI Lain
          </h4>
          <span className="bg-amber-100 text-[#B8860B] font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Solusi Bypass
          </span>
        </div>
        
        <p className="text-xs text-zinc-500 leading-relaxed">
          Karena web ini di-host di lingkungan terlindungi Google AI Studio, AI lain (seperti ChatGPT, Claude, atau Gemini luar) <strong>tidak bisa mengakses tautan web secara langsung</strong> karena tertolak login Google. 
        </p>
        
        <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
          💡 Gunakan tombol di bawah ini untuk mengunduh/menyalin seluruh struktur aplikasi beserta konfigurasi data aktif kamu, lalu berikan ke AI lain tersebut untuk mendapatkan umpan balik yang 100% akurat!
        </p>

        <div className="pt-2 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleCopyAIContext}
              className="flex-1 bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold px-5 py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{aiCopied ? "✓ Berhasil Disalin!" : "📋 Salin Konteks AI & Instruksi"}</span>
            </button>
            <button
              onClick={() => setShowAIExporter(!showAIExporter)}
              className="bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 font-extrabold px-4 py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1"
            >
              <span>{showAIExporter ? "Sembunyikan 👁️" : "Lihat Teks 👁️"}</span>
            </button>
          </div>

          {showAIExporter && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pratinjau Teks Konteks:</span>
                <button 
                  onClick={handleCopyAIContext}
                  className="text-xs text-[#B8860B] font-bold hover:underline"
                >
                  Salin Cepat
                </button>
              </div>
              <textarea
                readOnly
                value={getAIContextText()}
                rows={10}
                className="w-full bg-zinc-900 text-zinc-100 p-3 rounded-xl font-mono text-[10px] leading-relaxed outline-none focus:ring-1 focus:ring-[#C9A84C]"
              />
            </div>
          )}
        </div>
      </div>

      {/* 6. User Account Info Card */}
      <div className="bg-white border border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-5 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">
          🔐 Akun & Keamanan
        </h4>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
            <div>
              <div className="text-xs font-bold text-zinc-800">Masuk Sebagai</div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono font-bold">
                {username || "Mode Offline"}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="bg-zinc-50 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 font-extrabold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              ↩️ Keluar Akun
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5">
            <div className="flex-1 min-w-[200px]">
              <div className="text-xs font-bold text-rose-600">Hapus Semua Data</div>
              <div className="text-[10px] text-zinc-400 mt-1 leading-relaxed font-semibold">
                Hapus permanen semua data tracker, workouts, dan habits online kamu. Tindakan ini tidak bisa dibatalkan!
              </div>
            </div>
            <button
              onClick={handleConfirmReset}
              className="bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white text-rose-600 font-black px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              🗑️ Reset Total
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
