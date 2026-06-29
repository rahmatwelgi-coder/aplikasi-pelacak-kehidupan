/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";

interface LoginScreenProps {
  onLogin: (username: string, pin: string) => Promise<void>;
  onRegister: (username: string, pin: string) => Promise<void>;
  isLoading: boolean;
}

type TabType = "masuk" | "daftar";

export default function LoginScreen({
  onLogin,
  onRegister,
  isLoading,
}: LoginScreenProps) {
  const [tab, setTab] = useState<TabType>("masuk");
  const [user, setUser] = useState("hackprogres");
  const [pin, setPin] = useState("master123");
  const [confirmPin, setConfirmPin] = useState("master123");
  const [errorMsg, setErrorMsg] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleAction = async () => {
    setErrorMsg("");
    const cleanedUser = user.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const cleanedPin = pin.trim();

    if (!cleanedUser) {
      setErrorMsg("Isi user!");
      return;
    }
    if (cleanedUser.length < 3) {
      setErrorMsg("User minimal 3 karakter!");
      return;
    }
    if (!cleanedPin) {
      setErrorMsg("Isi password!");
      return;
    }
    if (cleanedPin.length < 4) {
      setErrorMsg("Password minimal 4 karakter!");
      return;
    }

    if (tab === "daftar") {
      if (cleanedPin !== confirmPin.trim()) {
        setErrorMsg("Konfirmasi password tidak cocok!");
        return;
      }
      try {
        await onRegister(cleanedUser, cleanedPin);
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal membuat akun.");
      }
    } else {
      try {
        await onLogin(cleanedUser, cleanedPin);
      } catch (err: any) {
        setErrorMsg(err.message || "User atau password salah.");
      }
    }
  };

  return (
    <div translate="no" className="notranslate fixed inset-0 z-50 flex items-center justify-center bg-zinc-50 p-4 overflow-y-auto">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[5%] left-[15%] w-[70vw] h-[50vh] rounded-full bg-amber-200/10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[60vw] h-[40vh] rounded-full bg-blue-100/10 blur-[100px]" />
      </div>

      <div className="bg-white border border-zinc-200 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.06)] rounded-[32px] p-8 max-w-md w-full relative z-10">
        <div className="text-center mb-6">
          <span className="text-5xl block mb-2.5 animate-bounce">⚡</span>
          <h1 className="text-2xl font-black text-[#B8860B] tracking-wide uppercase">
            Life Tracker
          </h1>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed font-medium">
            Masuk ke akun kamu atau buat akun baru.
            <br />
            Data tersimpan online &bull; otomatis sinkron antar-perangkat.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 mb-5 leading-relaxed font-medium">
          🌐 <strong className="text-emerald-950 font-black">DATABASE ONLINE AKTIF:</strong>
          <br />
          Akun kamu disimpan aman secara online di server dan otomatis sinkron antar-perangkat secara real-time!
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-2xl mb-6">
          <button
            onClick={() => {
              setTab("masuk");
              setErrorMsg("");
            }}
            className={`flex-1 py-2 text-center text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${
              tab === "masuk"
                ? "bg-white text-[#B8860B] shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => {
              setTab("daftar");
              setErrorMsg("");
            }}
            className={`flex-1 py-2 text-center text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${
              tab === "daftar"
                ? "bg-white text-[#B8860B] shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Buat Baru
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-600 mb-4 text-center font-bold animate-pulse">
            {errorMsg}
          </div>
        )}

        {tab === "masuk" ? (
          <div className="space-y-4">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 leading-relaxed font-medium">
              🔑 Masuk menggunakan <strong>user + password</strong> yang sudah kamu buat sebelumnya.
            </div>

            <div>
              <label translate="no" className="notranslate block text-[9px] text-zinc-400 uppercase tracking-widest font-bold mb-1.5">
                User
              </label>
              <input
                translate="no"
                type="text"
                placeholder="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                disabled={isLoading}
                className="notranslate w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl py-3 px-4 text-center text-sm font-semibold tracking-wide outline-none focus:bg-white focus:border-[#C9A84C] transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const nextInput = document.getElementById("l-pin");
                    if (nextInput) nextInput.focus();
                  }
                }}
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Huruf kecil, tanpa spasi
              </span>
            </div>

            <div>
              <label translate="no" className="notranslate block text-[9px] text-zinc-400 uppercase tracking-widest font-bold mb-1.5">
                Password
              </label>
              <input
                translate="no"
                id="l-pin"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isLoading}
                className="notranslate w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl py-3 px-4 text-center text-sm font-semibold tracking-wide outline-none focus:bg-white focus:border-[#C9A84C] transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAction();
                }}
              />
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                <span className="text-[10px] text-zinc-400">
                  Password sama seperti waktu mendaftar
                </span>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[10px] text-[#B8860B] hover:text-[#C9A84C] font-semibold cursor-pointer underline hover:no-underline"
                >
                  Lupa password
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed font-medium">
              ✏️ Buat akun baru. <strong className="text-[#B8860B]">Ingat user & password kamu!</strong> Ini yang dipakai untuk masuk dari perangkat lain.
            </div>

            <div>
              <label translate="no" className="notranslate block text-[9px] text-zinc-400 uppercase tracking-widest font-bold mb-1.5">
                User
              </label>
              <input
                translate="no"
                type="text"
                placeholder="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                disabled={isLoading}
                className="notranslate w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl py-3 px-4 text-center text-sm font-semibold tracking-wide outline-none focus:bg-white focus:border-[#C9A84C] transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const nextInput = document.getElementById("d-pin");
                    if (nextInput) nextInput.focus();
                  }
                }}
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Huruf kecil, angka, titik (.), strip (-), atau underscore (_)
              </span>
            </div>

            <div>
              <label translate="no" className="notranslate block text-[9px] text-zinc-400 uppercase tracking-widest font-bold mb-1.5">
                Password (minimal 4 digit/karakter)
              </label>
              <input
                translate="no"
                id="d-pin"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isLoading}
                className="notranslate w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl py-3 px-4 text-center text-sm font-semibold tracking-wide outline-none focus:bg-white focus:border-[#C9A84C] transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const nextInput = document.getElementById("d-pin2");
                    if (nextInput) nextInput.focus();
                  }
                }}
              />
            </div>

            <div>
              <label translate="no" className="notranslate block text-[9px] text-zinc-400 uppercase tracking-widest font-bold mb-1.5">
                Konfirmasi Password
              </label>
              <input
                translate="no"
                id="d-pin2"
                type="password"
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                disabled={isLoading}
                className="notranslate w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl py-3 px-4 text-center text-sm font-semibold tracking-wide outline-none focus:bg-white focus:border-[#C9A84C] transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAction();
                }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleAction}
          disabled={isLoading}
          className="w-full bg-[#C9A84C] text-[#1a1500] hover:bg-[#B8860B] hover:text-white font-extrabold py-4 px-6 rounded-2xl text-xs tracking-wider uppercase mt-6 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : tab === "masuk" ? (
            "Masuk →"
          ) : (
            "✓ Buat Akun Baru"
          )}
        </button>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 shadow-xl rounded-[24px] p-6 max-w-sm w-full relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-black text-zinc-900 mb-3 flex items-center gap-2">
              <span>🔑</span> Lupa Password?
            </h3>
            <div className="text-xs text-zinc-600 space-y-3 leading-relaxed mb-5">
              <p>
                Karena aplikasi Life Tracker ini berjalan secara privat untuk kebutuhan personal Anda, seluruh data disimpan dengan aman di cloud database pribadi Anda.
              </p>
              <p className="bg-amber-50 text-amber-900 border border-amber-100 p-3 rounded-xl font-medium">
                💡 <strong>Cara Memulihkan:</strong>
                <br />
                Buka tab Firebase Console Firestore Anda, pilih koleksi <code className="bg-white px-1 py-0.5 rounded border text-[10px]">users</code>, lalu temukan dokumen berdasarkan <code className="bg-white px-1 py-0.5 rounded border text-[10px]">username</code> Anda untuk melihat password Anda (nilai pada field <code className="bg-white px-1 py-0.5 rounded border text-[10px]">pin</code>).
              </p>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Mengerti & Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
