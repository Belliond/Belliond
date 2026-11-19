// fetch-contrib.mjs — ambil contribution calendar asli dari GitHub
// Struktur HTML GitHub:
//   <td ... data-date="2025-11-16" id="contribution-day-component-0-0" data-level="0" ...>
//   <tool-tip for="contribution-day-component-0-0" ...>No contributions on November 16th.</tool-tip>
// id = contribution-day-component-{dow}-{week}  → dow 0 = Minggu

import { writeFileSync } from "node:fs";

const USER = "Belliond";

const res = await fetch(`https://github.com/users/${USER}/contributions`, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },
});
if (!res.ok) throw new Error("HTTP " + res.status);
const html = await res.text();

// 1) Sel: data-date lalu id lalu data-level
const reCell =
  /data-date="(\d{4}-\d{2}-\d{2})"\s+id="contribution-day-component-(\d+)-(\d+)"\s+data-level="(\d)"/g;
const cells = [];
let m;
while ((m = reCell.exec(html))) {
  cells.push({
    date: m[1],
    dow: Number(m[2]),
    week: Number(m[3]),
    level: Number(m[4]),
    id: `contribution-day-component-${m[2]}-${m[3]}`,
  });
}

// 2) Tooltip: jumlah kontribusi
const reTip = /for="(contribution-day-component-\d+-\d+)"[^>]*>([^<]+)<\/tool-tip>/g;
const tips = {};
let t;
while ((t = reTip.exec(html))) {
  const txt = t[2].trim();
  let n = 0;
  if (/^No contributions/i.test(txt)) n = 0;
  else {
    const num = txt.match(/^([\d,]+)\s+contribution/i);
    if (num) n = Number(num[1].replace(/,/g, ""));
  }
  tips[t[1]] = n;
}

for (const c of cells) c.count = tips[c.id] ?? 0;

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
for (const c of cells) {
  if (c.dow < rows && c.week < cols) {
    matrix[c.dow][c.week] = c.level;
    counts[c.dow][c.week] = c.count;
  }
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
