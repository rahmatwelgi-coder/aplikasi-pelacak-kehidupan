/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExpenseCategory, WorkoutType, LevelDefinition } from "./types";

export const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const DAYS_S = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export const ECATS: ExpenseCategory[] = [
  { id: "makan", icon: "🍜", label: "Makan Setiap Hari", color: "#C9A84C" },
  { id: "rokok", icon: "🚬", label: "Beli Rokok", color: "#E74C3C" },
  { id: "hiburan", icon: "🎮", label: "Hiburan / Liburan", color: "#3498DB" },
  { id: "jajanan", icon: "🧃", label: "Jajanan", color: "#F39C12" },
  { id: "bensin", icon: "⛽", label: "Bensin Motor", color: "#E67E22" },
  { id: "outfit", icon: "👕", label: "Perabotan / Outfit", color: "#9B59B6" },
  { id: "kampus", icon: "🎓", label: "Keperluan Kampus/Org.", color: "#1F618D" },
  { id: "laundry", icon: "👗", label: "Laundry", color: "#22D3EE" },
  { id: "darurat", icon: "🆘", label: "Uang Darurat / Berlebih", color: "#E67E22" },
  { id: "tabungan", icon: "🏦", label: "Tabungan 🔒", color: "#2ECC71", locked: true },
];

export const WTYPES: WorkoutType[] = [
  { id: "push", label: "Push Day", icon: "💪", color: "#E67E22", xp: 30 },
  { id: "pull", label: "Pull Day", icon: "🏋️", color: "#3498DB", xp: 30 },
  { id: "legs", label: "Legs", icon: "🦵", color: "#E74C3C", xp: 35 },
  { id: "cardio", label: "Cardio", icon: "🏃", color: "#2ECC71", xp: 25 },
  { id: "core", label: "Core/Abs", icon: "🧘", color: "#9B59B6", xp: 20 },
  { id: "full", label: "Full Body", icon: "🔥", color: "#F39C12", xp: 40 },
  { id: "rest", label: "Rest Day", icon: "😴", color: "#555", xp: 5 },
];

export const LEVELS: LevelDefinition[] = [
  { min: 0, title: "Pemula", color: "#888" },
  { min: 100, title: "Aktif", color: "#3498DB" },
  { min: 250, title: "Disiplin", color: "#2ECC71" },
  { min: 450, title: "Konsisten", color: "#C9A84C" },
  { min: 700, title: "Atletis", color: "#E74C3C" },
  { min: 1000, title: "Elite", color: "#9B59B6" },
  { min: 1400, title: "LEGEND", color: "#C9A84C" },
];

export const DEFAULT_WK = {
  "2025-05-01": { type: "push", dur: 45, sets: 4, reps: 12, note: "Bench press PR: 70kg!" },
  "2025-05-02": { type: "rest", dur: 0, sets: 0, reps: 0, note: "Recovery" },
  "2025-05-03": { type: "pull", dur: 50, sets: 4, reps: 10, note: "Deadlift 80kg x5" },
  "2025-05-04": { type: "cardio", dur: 30, sets: 0, reps: 5, note: "Lari 5km" },
  "2025-05-05": { type: "legs", dur: 55, sets: 4, reps: 10, note: "Squat 60kg x4x10" },
  "2025-05-06": { type: "rest", dur: 0, sets: 0, reps: 0, note: "" },
  "2025-05-07": { type: "push", dur: 45, sets: 4, reps: 12, note: "Incline bench 60kg" },
  "2025-05-08": { type: "core", dur: 30, sets: 3, reps: 20, note: "Plank 90s x3" },
  "2025-05-09": { type: "cardio", dur: 35, sets: 0, reps: 5, note: "Latihan BKMM" },
  "2025-05-10": { type: "pull", dur: 50, sets: 4, reps: 10, note: "Row barbell 60kg" },
  "2025-05-11": { type: "rest", dur: 0, sets: 0, reps: 0, note: "" },
  "2025-05-12": { type: "push", dur: 45, sets: 4, reps: 12, note: "" },
  "2025-05-13": { type: "full", dur: 60, sets: 5, reps: 10, note: "PR overhead press 50kg" },
  "2025-05-14": { type: "cardio", dur: 40, sets: 0, reps: 6, note: "Lari 6km — PB!" },
  "2025-05-15": { type: "legs", dur: 55, sets: 4, reps: 10, note: "Bulgarian split squat" },
};

export const DEFAULT_HABITS = [
  { id: 1, icon: "💪", name: "Olahraga 30 menit", xp: 20 },
  { id: 2, icon: "📚", name: "Baca buku", xp: 15 },
  { id: 3, icon: "📵", name: "No sosmed pagi", xp: 10 },
  { id: 4, icon: "💧", name: "Minum 8 gelas air", xp: 10 },
  { id: 5, icon: "😴", name: "Tidur sebelum 23.00", xp: 15 },
];

export const ICONS_LIST = ["⚡", "🏃", "📚", "💧", "😴", "🧘", "🎵", "📵", "🍎", "✏️", "🏆", "🎯", "💊", "🌿", "🔥", "💪", "📖", "🧠", "🎮", "🚴"];
