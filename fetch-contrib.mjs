// fetch-contrib.mjs — ambil contribution calendar asli dari GitHub
// Struktur HTML GitHub:
//   <td ... data-date="2025-11-16" id="contribution-day-component-0-0" data-level="0" ...>
//   <tool-tip for="contribution-day-component-0-0" ...>No contributions on November 16th.</tool-tip>
// id = contribution-day-component-{dow}-{week}  → dow 0 = Minggu

import { writeFileSync } from "node:fs";

const USER = "Belliond";

const res = await fetch(`https://github.com/users/${USER}/contributions`, {
  signal: AbortSignal.timeout(30_000),
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },
});
if (!res.ok) throw new Error("HTTP " + res.status);
const html = await res.text();

// Parse attributes by name so harmless changes in GitHub's attribute order
// don't corrupt the snapshot.
const attr = (tag, name) =>
  tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1];

// 1) Calendar cells
const cells = [];
const reCell = /<td\b[^>]*>/gi;
let m;
while ((m = reCell.exec(html))) {
  const tag = m[0];
  if (!/\bclass=["'][^"']*\bContributionCalendar-day\b/i.test(tag)) continue;
  const date = attr(tag, "data-date");
  const id = attr(tag, "id")?.match(/^contribution-day-component-(\d+)-(\d+)$/);
  const level = Number(attr(tag, "data-level"));
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !id || !Number.isInteger(level) || level < 0 || level > 4) {
    throw new Error(`Invalid contribution calendar cell: ${tag}`);
  }
  cells.push({
    date,
    dow: Number(id[1]),
    week: Number(id[2]),
    level,
    id: attr(tag, "id"),
  });
}
if (!cells.length) throw new Error("GitHub contribution calendar was not found; contrib.json was not changed.");
if (new Set(cells.map((c) => c.id)).size !== cells.length) throw new Error("Duplicate contribution day IDs.");

// 2) Tooltip: jumlah kontribusi
const reTip = /<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/gi;
const tips = {};
let t;
while ((t = reTip.exec(html))) {
  const id = attr(t[1], "for");
  if (!id) continue;
  const txt = t[2].replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").trim();
  if (/^No contributions\b/i.test(txt)) tips[id] = 0;
  else {
    const num = txt.match(/\b([\d,]+)\s+contributions?\b/i);
    if (num) tips[id] = Number(num[1].replace(/,/g, ""));
  }
}

for (const c of cells) {
  if (!Object.hasOwn(tips, c.id)) throw new Error(`Missing/unrecognized tooltip for ${c.date}; refusing to write incomplete data.`);
  c.count = tips[c.id];
  if (!Number.isSafeInteger(c.count) || c.count < 0) throw new Error(`Invalid contribution count for ${c.date}.`);
  const day = new Date(`${c.date}T00:00:00Z`);
  if (Number.isNaN(day.valueOf()) || day.toISOString().slice(0, 10) !== c.date || day.getUTCDay() !== c.dow) {
    throw new Error(`Date/day mismatch in GitHub calendar at ${c.date}.`);
  }
}

cells.sort((a, b) => a.date.localeCompare(b.date));
for (let i = 1; i < cells.length; i++) {
  const days = (Date.parse(`${cells[i].date}T00:00:00Z`) - Date.parse(`${cells[i - 1].date}T00:00:00Z`)) / 86_400_000;
  if (days !== 1) throw new Error(`Contribution calendar has a date gap/duplicate before ${cells[i].date}.`);
}
const ageDays = Math.floor((Date.now() - Date.parse(`${cells.at(-1).date}T00:00:00Z`)) / 86_400_000);
if (ageDays < -1 || ageDays > 3) throw new Error(`GitHub calendar looks stale (${cells.at(-1).date}); refusing to publish.`);

const cols = Math.max(...cells.map((c) => c.week)) + 1;
const rows = 7;
const total = cells.reduce((a, b) => a + b.count, 0);
const active = cells.filter((c) => c.count > 0).length;

console.log("=== GRID ===");
console.log("sel            :", cells.length);
console.log("kolom (minggu) :", cols);
console.log("baris (hari)   :", rows);
console.log("total kontrib  :", total);
console.log("hari aktif     :", active);
console.log("rentang        :", cells[0].date, "→", cells[cells.length - 1].date);

const dist = {};
for (const c of cells) dist[c.level] = (dist[c.level] || 0) + 1;
console.log("distribusi lvl :", JSON.stringify(dist));

// Matriks level: matrix[dow][week]
const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
const counts = Array.from({ length: rows }, () => Array(cols).fill(0));
const occupied = new Set();
for (const c of cells) {
  const slot = `${c.dow}:${c.week}`;
  if (c.dow >= rows || c.week >= cols || occupied.has(slot)) throw new Error(`Invalid/duplicate calendar grid position for ${c.date}.`);
  occupied.add(slot);
  matrix[c.dow][c.week] = c.level;
  counts[c.dow][c.week] = c.count;
}

// Streak terpanjang & sekarang
const flat = [...cells].sort((a, b) => a.date.localeCompare(b.date));
let best = 0,
  cur = 0,
  run = 0;
for (const c of flat) {
  if (c.count > 0) {
    run++;
    if (run > best) best = run;
  } else run = 0;
}
// streak berjalan (dari akhir)
for (let i = flat.length - 1; i >= 0; i--) {
  if (flat[i].count > 0) cur++;
  else break;
}

console.log("streak terbaik :", best, "hari");
console.log("streak sekarang:", cur, "hari");

console.log("\n=== PREVIEW ASCII (1 char = 1 minggu) ===");
const ch = [".", ":", "+", "#", "@"];
for (let r = 0; r < rows; r++) console.log("  " + matrix[r].map((v) => ch[v]).join(""));

writeFileSync(
  "contrib.json",
  JSON.stringify(
    { user: USER, cols, rows, matrix, counts, total, active, best, cur, cells },
    null,
    2
  )
);
console.log("\n✓ contrib.json");
