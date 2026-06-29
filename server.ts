/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");
const SESSION_SECRET = process.env.SESSION_SECRET || "life-tracker-secret-key-1337-prod-secure";

// Helper to generate token statefully/cryptographically
function generateToken(username: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(username.toLowerCase()).digest("hex");
}

// Helper to validate the Authorization header against the expected username
function validateAuthHeader(req: express.Request, expectedUsername: string): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.split(" ")[1];
  const expectedToken = generateToken(expectedUsername);
  return token === expectedToken;
}

// Load Firebase configuration
let dbConfig: any = null;
let firestore: any = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    dbConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.error("Failed to read firebase-applet-config.json:", err);
}

if (dbConfig) {
  try {
    const firebaseConfig = {
      apiKey: dbConfig.apiKey,
      authDomain: dbConfig.authDomain,
      projectId: dbConfig.projectId,
      storageBucket: dbConfig.storageBucket,
      messagingSenderId: dbConfig.messagingSenderId,
      appId: dbConfig.appId,
    };
    const firebaseApp = initializeApp(firebaseConfig);
    const dbId = dbConfig.firestoreDatabaseId || "(default)";
    firestore = getFirestore(firebaseApp, dbId);
    console.log(`Firebase Firestore initialized successfully with database: ${dbId}`);
  } catch (err) {
    console.error("Failed to initialize Firebase Firestore:", err);
  }
}

// Helper to load database
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file, using fallback:", err);
  }
  return { users: {} };
}

// Helper to save database safely with atomic swap to avoid data corruption
function saveDb(db: any) {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("Error writing to database file:", err);
  }
}

// Generate default state for the username matching the client expectations
function generateDefaultState(username: string) {
  const today = new Date();
  
  // Generate mock history for last 180 days
  const history: Record<string, number[]> = {};
  for (let i = 180; i > 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (Math.random() < 0.75) {
      const activeIds = [1, 2, 3, 4, 5];
      const count = Math.floor(Math.random() * 4) + 1;
      const shuffled = [...activeIds].sort(() => 0.5 - Math.random());
      history[dateStr] = shuffled.slice(0, count);
    }
  }

  // Calculate streaks
  const allDates = Object.keys(history).sort();
  let currentStreak = 0;
  let checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1);
  while (true) {
    const key = checkDate.toISOString().slice(0, 10);
    if (history[key] && history[key].length > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let curRun = 0;
  let prevDate: Date | null = null;
  for (const dStr of allDates) {
    if (history[dStr] && history[dStr].length > 0) {
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
      if (curRun > longestStreak) longestStreak = curRun;
    }
  }

  // Generate mock workouts for last 180 days
  const workouts: Record<string, any> = {};
  const workoutTypes = ["push", "pull", "legs", "cardio", "core", "full"];
  const workoutNotes = [
    "Sesi luar biasa, bench press lancar",
    "Fokus teknik squat, lutut aman",
    "Lari sore terasa segar, pace stabil",
    "Pull up tambah repetisi",
    "Latihan core intensif",
    "Full body sirkuit membakar lemak",
    "Angkat beban maksimal hari ini"
  ];
  for (let i = 180; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (Math.random() < 0.6) {
      const type = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
      workouts[dateStr] = {
        type,
        dur: 30 + Math.floor(Math.random() * 45),
        sets: 3 + Math.floor(Math.random() * 3),
        reps: 8 + Math.floor(Math.random() * 12),
        note: Math.random() < 0.4 ? workoutNotes[Math.floor(Math.random() * workoutNotes.length)] : ""
      };
    } else {
      workouts[dateStr] = {
        type: "rest",
        dur: 0,
        sets: 0,
        reps: 0,
        note: ""
      };
    }
  }

  // Generate mock expense snapshots for last 6 months
  const expenseHistory: Record<string, any> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const factor = 0.8 + Math.random() * 0.45;
    
    expenseHistory[monthKey] = {
      year,
      month,
      budget: 2000000,
      expenses: {
        makan: Math.round(350000 * factor),
        rokok: Math.round(140000 * factor),
        hiburan: Math.round(50000 * (Math.random() < 0.7 ? factor : 0.3)),
        jajanan: Math.round(161000 * factor),
        bensin: Math.round(20000 * factor),
        outfit: Math.round(97000 * (Math.random() < 0.5 ? factor : 0.4)),
        kampus: Math.round(257162 * factor),
        laundry: Math.round(30000 * (Math.random() < 0.8 ? factor : 0.5)),
        darurat: Math.round(115000 * (Math.random() < 0.3 ? factor : 0.2)),
        tabungan: 500000
      },
      customExp: []
    };
  }

  // Generate mock activity logs
  const activityLogs: any[] = [];
  const logTypes = ["workout", "expense", "habit", "goal"];
  const sampleExNames = ["Makan Nasi Padang", "Beli Kopi Susu", "Isi Premium Bensin", "Cetak Buku Tugas", "Laundry Wangi"];
  const sampleExAmts = [24000, 18000, 20000, 15000, 12000];
  const habitNames = ["Olahraga 30 menit", "Baca buku", "No sosmed pagi", "Minum 8 gelas air", "Tidur sebelum 23.00"];
  for (let i = 50; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - Math.floor(i * 0.5));
    d.setHours(7 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0);
    const timestamp = d.toISOString();
    const type = logTypes[Math.floor(Math.random() * logTypes.length)];

    if (type === "workout") {
      const wType = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
      activityLogs.push({
        id: `init_wk_${i}`,
        timestamp,
        type: "workout",
        action: `Latihan Selesai: ${wType.toUpperCase()}`,
        details: `Menyelesaikan sesi latihan selama ${30 + Math.floor(Math.random() * 30)} menit.`,
        value: 30 + Math.floor(Math.random() * 30)
      });
    } else if (type === "expense") {
      const name = sampleExNames[Math.floor(Math.random() * sampleExNames.length)];
      const amt = sampleExAmts[Math.floor(Math.random() * sampleExAmts.length)];
      activityLogs.push({
        id: `init_ex_${i}`,
        timestamp,
        type: "expense",
        action: `Pengeluaran Baru: ${name}`,
        details: `Melakukan pembayaran sebesar Rp ${amt.toLocaleString("id-ID")}`,
        value: amt
      });
    } else if (type === "habit") {
      const habitName = habitNames[Math.floor(Math.random() * habitNames.length)];
      activityLogs.push({
        id: `init_hb_${i}`,
        timestamp,
        type: "habit",
        action: `Habit Selesai: ${habitName}`,
        details: `Telah dicentang dan diselesaikan`,
        value: 15
      });
    } else {
      activityLogs.push({
        id: `init_gl_${i}`,
        timestamp,
        type: "goal",
        action: `Progress Goal: Lari 50km Sebulan`,
        details: `Progress meningkat sebesar 5km`,
        value: 5
      });
    }
  }

  return {
    budget: 2000000,
    month: today.getMonth(),
    year: today.getFullYear(),
    name: username,
    streak: currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastDate: today.toISOString().slice(0, 10),
    expenses: {
      makan: 350000,
      rokok: 140000,
      hiburan: 0,
      jajanan: 161000,
      bensin: 20000,
      outfit: 97000,
      kampus: 257162,
      laundry: 0,
      darurat: 115000,
      tabungan: 500000
    },
    workouts,
    habits: [
      { id: 1, icon: "💪", name: "Olahraga 30 menit", xp: 20 },
      { id: 2, icon: "📚", name: "Baca buku", xp: 15 },
      { id: 3, icon: "📵", name: "No sosmed pagi", xp: 10 },
      { id: 4, icon: "💧", name: "Minum 8 gelas air", xp: 10 },
      { id: 5, icon: "😴", name: "Tidur sebelum 23.00", xp: 15 }
    ],
    checkedToday: {},
    customExp: [],
    catatan: {},
    goals: [
      { id: "g_laptop", name: "Laptop", target: 8000000, progress: 3200000, speed: 400000, deadline: "2026-10-15", completed: false },
      { id: "g1", name: "Lari 50km Sebulan", target: 50, progress: 15, deadline: "2026-07-31", completed: false },
      { id: "g2", name: "Menabung untuk Investasi", target: 1000000, progress: 500000, deadline: "2026-08-15", completed: false }
    ],
    habitHistory: history,
    activityLogs,
    expenseHistory,
    weeklyHighlights: {
      expenseChange: "turun 12%",
      expenseStatus: "success",
      habitChange: "naik 18%",
      habitStatus: "success",
      workoutChange: "turun 20%",
      workoutStatus: "warning",
      suggestion: "Tambah 2 sesi workout minggu depan."
    }
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Register API
  app.post("/api/auth/register", async (req, res) => {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: "Username dan PIN diperlukan." });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 20 || !/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: "Username harus 3-20 karakter dan hanya boleh mengandung huruf, angka, underscore (_), atau hyphen (-)." });
    }

    const cleanPin = pin.trim();
    if (cleanPin.length < 4 || cleanPin.length > 30) {
      return res.status(400).json({ error: "Password harus terdiri dari 4-30 karakter." });
    }

    const key = cleanUsername.toLowerCase();
    const defaultState = generateDefaultState(cleanUsername);

    if (firestore) {
      try {
        const userRef = doc(firestore, "users", key);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          return res.status(400).json({ error: "Username sudah terdaftar! Gunakan username lain." });
        }
        await setDoc(userRef, {
          username: cleanUsername,
          pin: cleanPin,
          state: defaultState
        });
        const token = generateToken(cleanUsername);
        return res.json({ success: true, message: "Pendaftaran berhasil!", token });
      } catch (err) {
        console.error("Firebase register error:", err);
        return res.status(500).json({ error: "Gagal mendaftar ke cloud database." });
      }
    } else {
      const db = loadDb();
      if (db.users[key]) {
        return res.status(400).json({ error: "Username sudah terdaftar! Gunakan username lain." });
      }
      db.users[key] = {
        username: cleanUsername,
        pin: cleanPin,
        state: defaultState
      };
      saveDb(db);
      const token = generateToken(cleanUsername);
      return res.json({ success: true, message: "Pendaftaran berhasil! (Lokal)", token });
    }
  });

  // 2. Login API
  app.post("/api/auth/login", async (req, res) => {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: "Username dan PIN diperlukan." });
    }

    const cleanUsername = username.trim();
    const cleanPin = pin.trim();
    const key = cleanUsername.toLowerCase();

    if (firestore) {
      try {
        const userRef = doc(firestore, "users", key);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          return res.status(400).json({ error: "Username atau PIN salah." });
        }
        const userObj = userSnap.data();
        if (userObj.pin !== cleanPin) {
          return res.status(400).json({ error: "Username atau PIN salah." });
        }
        const token = generateToken(cleanUsername);
        return res.json({
          success: true,
          username: userObj.username,
          state: userObj.state,
          token
        });
      } catch (err) {
        console.error("Firebase login error:", err);
        return res.status(500).json({ error: "Gagal masuk menggunakan cloud database." });
      }
    } else {
      const db = loadDb();
      const userObj = db.users[key];
      if (!userObj || userObj.pin !== cleanPin) {
        return res.status(400).json({ error: "Username atau PIN salah." });
      }
      const token = generateToken(cleanUsername);
      return res.json({
        success: true,
        username: userObj.username,
        state: userObj.state,
        token
      });
    }
  });

  // 3. Get State API
  app.get("/api/user/state/:username", async (req, res) => {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ error: "Username diperlukan." });
    }

    const cleanUsername = username.trim();
    if (!validateAuthHeader(req, cleanUsername)) {
      return res.status(401).json({ error: "Akses ditolak. Sesi tidak valid atau telah berakhir." });
    }

    const key = cleanUsername.toLowerCase();

    if (firestore) {
      try {
        const userRef = doc(firestore, "users", key);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          return res.status(404).json({ error: "Pengguna tidak ditemukan." });
        }
        return res.json({
          success: true,
          state: userSnap.data().state
        });
      } catch (err) {
        console.error("Firebase get state error:", err);
        return res.status(500).json({ error: "Gagal mengambil data dari cloud." });
      }
    } else {
      const db = loadDb();
      const userObj = db.users[key];
      if (!userObj) {
        return res.status(404).json({ error: "Pengguna tidak ditemukan." });
      }
      return res.json({
        success: true,
        state: userObj.state
      });
    }
  });

  // 4. Save State API
  app.post("/api/user/state", async (req, res) => {
    const { username, state } = req.body;
    if (!username || !state) {
      return res.status(400).json({ error: "Username dan state diperlukan." });
    }

    const cleanUsername = username.trim();
    if (!validateAuthHeader(req, cleanUsername)) {
      return res.status(401).json({ error: "Akses ditolak. Sesi tidak valid atau telah berakhir." });
    }

    if (typeof state !== "object" || state === null) {
      return res.status(400).json({ error: "Format data state tidak valid." });
    }

    const key = cleanUsername.toLowerCase();

    if (firestore) {
      try {
        const userRef = doc(firestore, "users", key);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          return res.status(404).json({ error: "Pengguna tidak ditemukan." });
        }
        const currentData = userSnap.data();
        await setDoc(userRef, {
          ...currentData,
          state: state
        });
        return res.json({ success: true });
      } catch (err) {
        console.error("Firebase save state error:", err);
        return res.status(500).json({ error: "Gagal menyimpan data ke cloud." });
      }
    } else {
      const db = loadDb();
      const userObj = db.users[key];
      if (!userObj) {
        return res.status(404).json({ error: "Pengguna tidak ditemukan." });
      }
      userObj.state = state;
      saveDb(db);
      return res.json({ success: true });
    }
  });

  // 5. Reset All Data API (from Settings)
  app.post("/api/user/reset", async (req, res) => {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username diperlukan." });
    }

    const cleanUsername = username.trim();
    if (!validateAuthHeader(req, cleanUsername)) {
      return res.status(401).json({ error: "Akses ditolak. Sesi tidak valid atau telah berakhir." });
    }

    const key = cleanUsername.toLowerCase();
    const defaultState = generateDefaultState(cleanUsername);

    if (firestore) {
      try {
        const userRef = doc(firestore, "users", key);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          return res.status(404).json({ error: "Pengguna tidak ditemukan." });
        }
        const currentData = userSnap.data();
        await setDoc(userRef, {
          ...currentData,
          state: defaultState
        });
        return res.json({ success: true, state: defaultState });
      } catch (err) {
        console.error("Firebase reset state error:", err);
        return res.status(500).json({ error: "Gagal mereset data di cloud." });
      }
    } else {
      const db = loadDb();
      const userObj = db.users[key];
      if (!userObj) {
        return res.status(404).json({ error: "Pengguna tidak ditemukan." });
      }
      userObj.state = defaultState;
      saveDb(db);
      return res.json({ success: true, state: defaultState });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
