// generate.mjs — README profil, tema Ghost Task Matrix (neobrutalism)
// Palet, font, border, dan hard-shadow diambil persis dari
// https://belliond.github.io/task-vault/style.css (:root)
//
// Output: satu SVG utuh (assets/profile.svg) — bukan tiga file terpisah.
// Alasannya: SVG ini full-bleed gelap, dan GitHub selalu memberi margin
// antar <img> di README. Kalau dipecah, celah antar gambar jadi pita putih
// yang merusak tampilan satu halaman. Satu kanvas = mulus seperti situsnya.

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";

const contrib = JSON.parse(readFileSync("contrib.json", "utf8"));

/* ─────────────────────── TOKEN DESAIN ─────────────────────── */
// Disalin dari :root milik task-vault, tanpa perubahan nilai.

const T = {
  bg: "#050a08",
  panel: "rgba(14,26,21,0.84)",

  green: "#4dffb2",
  greenDark: "#19d991",
  cyan: "#4fe6ff",

  text: "#eafef4",
  textSoft: "#9ac9bb",

  border: "#19d991",
  borderBright: "#7dffc9",
  borderW: 3,

  shadowHard: "#0f7a55",
  radius: 6,
};

// Font: disematkan base64 supaya SVG tetap benar walau dirender lewat <img>
// (cara GitHub menampilkan SVG di README — tanpa akses ke CSS halaman).
const FONT_GROTESK = readFileSync("_fonts/grotesk.woff2").toString("base64");
const FONT_MONO400 = readFileSync("_fonts/mono400.woff2").toString("base64");
const FONT_MONO700 = readFileSync("_fonts/mono700.woff2").toString("base64");

const FF_HEAD = `"Space Grotesk","Segoe UI",system-ui,sans-serif`;
const FF_MONO = `"Space Mono","Courier New",Consolas,monospace`;

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const FONT_DEFS = `<style>
    @font-face{font-family:"Space Grotesk";src:url(data:font/woff2;base64,${FONT_GROTESK}) format("woff2");font-weight:400 700;font-display:block;}
    @font-face{font-family:"Space Mono";src:url(data:font/woff2;base64,${FONT_MONO400}) format("woff2");font-weight:400;font-display:block;}
    @font-face{font-family:"Space Mono";src:url(data:font/woff2;base64,${FONT_MONO700}) format("woff2");font-weight:700;font-display:block;}
  </style>`;

/* ─────────────────── GEOMETRI GRID KONTRIBUSI ─────────────────── */

const PITCH = 15;
const CELL = 11;
const COLS = contrib.cols;
const ROWS = 7;
const GRID_W = COLS * PITCH - (PITCH - CELL);
const GRID_X = Math.round((900 - GRID_W) / 2);
// Grid 2D datar: 7 baris x PITCH = 105px, dikurangi sisa (PITCH - CELL).
const GRID_H = ROWS * PITCH - (PITCH - CELL);
const GRID_Y = 440;

// Titik-titik tetap di seksi hero, ditulis sebagai konstanta supaya label dan
// legenda tidak meleset kalau grid digeser.
const DIVIDER_Y = 366;
const LEGEND_Y = 562;

const cellX = (c) => GRID_X + c * PITCH;
const cellY = (r) => GRID_Y + r * PITCH;

/* ───────────── KOTAK 3D neobrutalism: tepi tegas ───────────── */

function box(x, y, w, h, k, cTop, cFront, cSide, stroke) {
  const s = stroke
    ? ` stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"`
    : "";
  const front = `<path d="M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z" fill="${cFront}"${s}/>`;
  const top = `<path d="M${x},${y} L${x + k},${y - k} L${x + w + k},${y - k} L${x + w},${y} Z" fill="${cTop}"${s}/>`;
  const side = `<path d="M${x + w},${y} L${x + w + k},${y - k} L${x + w + k},${y - k + h} L${x + w},${y + h} Z" fill="${cSide}"${s}/>`;
  return { front, top, side };
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (v) =>
    Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return `#${((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, "0")}`;
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

/* Skala level: hijau redup → hijau terang (sesuai aksen situs) */
const LEVELS = ["#0e1a15", "#1a4d3a", "#19d991", "#4dffb2", "#a6ffdb"];

/* ───────────────────── MESIN GERAK (SMIL) ───────────────────── */
// Semua elemen digerakkan lewat <animateTransform> / <animate> supaya SVG ini
// tetap "hidup" walau dirender sebagai <img> (tanpa JS, tanpa CSS halaman).
//
// Nilai gerak dibuat dari banyak sampel sinus, bukan keySplines: spline di
// SVG-yang-dirender-sebagai-<img> dukungannya beda-beda antar browser, sedang
// polyline padat hasilnya sama halusnya dan aman di mana saja.
//
// begin negatif = animasi dianggap sudah jalan sejak sekian detik lalu. Itu
// trik supaya tiap elemen punya fase berbeda tanpa ada yang "menunggu" dulu.

const SINE_SAMPLES = 20;

function sineValues(amp, axis = "y") {
  const out = [];
  for (let i = 0; i <= SINE_SAMPLES; i++) {
    const a = (i / SINE_SAMPLES) * Math.PI * 2;
    const v = (Math.sin(a) * amp).toFixed(2);
    out.push(axis === "y" ? `0,${v}` : `${v},0`);
  }
  return out.join(";");
}

// Melayang naik-turun pelan.
function bob(inner, { dur = 8, amp = 1.6, delay = 0 } = {}) {
  return `<g>${inner}<animateTransform attributeName="transform" type="translate"
      values="${sineValues(amp, "y")}" dur="${dur}s" begin="${-delay}s"
      repeatCount="indefinite"/></g>`;
}

// Bergoyang kiri-kanan pelan.
function sway(inner, { dur = 9, amp = 2, delay = 0 } = {}) {
  return `<g>${inner}<animateTransform attributeName="transform" type="translate"
      values="${sineValues(amp, "x")}" dur="${dur}s" begin="${-delay}s"
      repeatCount="indefinite"/></g>`;
}

// Napas: opasitas naik-turun, untuk label dan teks yang tidak boleh goyang
// posisinya (biar tetap enak dibaca).
function breathe(inner, { dur = 5, from = 0.55, to = 1, delay = 0 } = {}) {
  return `<g opacity="${from}">${inner}<animate attributeName="opacity"
      values="${from};${to};${from}" dur="${dur}s" begin="${-delay}s"
      repeatCount="indefinite"/></g>`;
}

// Garis putus-putus yang berjalan.
function marchingLine(x1, y1, x2, y2, { color, width = 2, dash = "6 6", dur = 3, opacity = 1 } = {}) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
      stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}"
      opacity="${opacity}"><animate attributeName="stroke-dashoffset"
      values="0;-24" dur="${dur}s" repeatCount="indefinite"/></line>`;
}

// Grid kontribusi versi 2D datar: tidak ada pilar/top/side sama sekali.
// Intensitas commit dibaca dari warna sel (LEVELS), bukan dari tinggi kubus.
// Tiap KOLOM dibungkus satu grup yang bergoyang dengan fase berbeda, jadi
// grid-nya seperti gelombang pelan yang menyapu dari kiri ke kanan.
function terrain() {
  const cols = [];

  for (let c = 0; c < COLS; c++) {
    let cells = "";
    for (let r = 0; r < ROWS; r++) {
      const x = cellX(c);
      const y = cellY(r);
      const lvl = contrib.matrix[r][c];
      cells +=
        lvl === 0
          ? `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"
              fill="#0b1411" stroke="#123026" stroke-width="1"/>`
          : `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"
              fill="${LEVELS[lvl]}" stroke="#0b1411" stroke-width="1"/>`;
    }
    cols.push(bob(cells, { dur: 9, amp: 1.6, delay: c * 0.14 }));
  }

  return cols.join("");
}

/* ───────────────────── JALUR ULAR ───────────────────── */

function buildPath(width, height) {
  const left = 24, right = width - 24, top = 24, bottom = height - 24;
  const line = (start, end) => {
    const direction = Math.sign(end - start);
    const points = Array.from(
      { length: Math.floor(Math.abs(end - start) / PITCH) + 1 },
      (_, i) => start + direction * i * PITCH,
    );
    if (points.at(-1) !== end) points.push(end);
    return points;
  };
  const xs = line(left, right), ys = line(top, bottom);
  const pts = xs.map((x) => [x, top]);
  for (const y of ys.slice(1)) pts.push([right, y]);
  for (const x of line(right, left).slice(1)) pts.push([x, bottom]);
  for (const y of line(bottom, top).slice(1, -1)) pts.push([left, y]);
  return pts;
}

const DUR = 40;
// Badan ular = deretan kubus 3D yang saling menimpa, bukan satu garis tebal.
// Tiap segmen tertinggal 1 waypoint dari segmen di depannya; karena jarak
// antar waypoint = PITCH (15px) dan lebar segmen 15px, kubusnya bersambung.
const SEGMENTS = 26;

function snake() {
  const path = buildPath(900, TOTAL_H);
  const pathLength = path.length;
  const track = (lag) => {
    const out = [];
    for (let j = 0; j <= pathLength; j++) {
      // Indeks jalur makin besar = makin MAJU. Jadi segmen harus mundur,
      // bukan maju: pakai (j - lag), bukan (j + lag). Kalau plus, badan
      // mendahului kepala dan ularnya jalan kebalik.
      const [x, y] = path[(j - lag + pathLength) % pathLength];
      out.push(`${x},${y}`);
    }
    return out.join(";");
  };

  let out = "";

  // Gambar dari ekor ke kepala supaya kepala selalu di atas
  for (let i = SEGMENTS - 1; i >= 0; i--) {
    const isHead = i === 0;
    const tt = i / (SEGMENTS - 1); // 0 = kepala, 1 = ekor

    const col =
      tt < 0.55
        ? mix(T.borderBright, T.green, tt / 0.55)
        : mix(T.green, T.cyan, (tt - 0.55) / 0.45);

    const s = isHead ? 15 : 15 - tt * 7;
    const k = isHead ? 7 : 4 + (1 - tt) * 2;
    const half = s / 2;

    const { front, top, side } = box(
      -half, -half, s, s, k,
      shade(col, 0.3), col, shade(col, -0.45), "#050a08"
    );

    // Hard shadow: salinan yang digeser 3px, warna --shadow-hard-color
    const sh = box(
      -half + 3, -half + 3, s, s, k,
      T.shadowHard, T.shadowHard, T.shadowHard
    );

    const eyes = isHead
      ? `<circle cx="${-half + s * 0.3}" cy="${-half + s * 0.3}" r="2.2" fill="#050a08"/>
         <circle cx="${-half + s * 0.7}" cy="${-half + s * 0.3}" r="2.2" fill="#050a08"/>`
      : "";

    out += `<g data-role="snake-segment" opacity="${(1 - tt * 0.25).toFixed(2)}">
      <animateTransform attributeName="transform" type="translate"
        values="${track(i)}" dur="${DUR}s" repeatCount="indefinite"/>
      ${sh.front}${sh.side}${sh.top}${front}${side}${top}${eyes}
    </g>`;
  }

  return out;
}

/* ───────────────────── KOMPONEN NEOBRUTAL ───────────────────── */

// Kartu: border 3px + hard shadow 4px 4px 0
function card(x, y, w, h, fill) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${T.radius}"
      fill="${fill || T.panel}" stroke="${T.border}" stroke-width="${T.borderW}"/>
    <rect x="${x + 4}" y="${y + 4}" width="${w}" height="${h}" rx="${T.radius}"
      fill="none" stroke="${T.shadowHard}" stroke-width="${T.borderW}"/>`;
}

// .section-label tidak set font-family → inherit Space Grotesk dari body.
// text-shadow: 2px 2px 0 var(--green-dark) → salinan teks digeser 2px.
function sectionLabel(x, y, text, fill) {
  return `<text x="${x + 2}" y="${y + 2}" font-family='${FF_HEAD}' font-size="12" font-weight="700"
      fill="${T.greenDark}" letter-spacing="3">${esc(text)}</text>
    <text x="${x}" y="${y}" font-family='${FF_HEAD}' font-size="12" font-weight="700"
      fill="${fill || T.green}" letter-spacing="3">${esc(text)}</text>`;
}

/* ───────────────────────── SEKSI: HERO ───────────────────────── */

function heroSection() {
  const stats = [
    { n: contrib.total, l: "KONTRIBUSI" },
    { n: contrib.active, l: "HARI AKTIF" },
    { n: contrib.best, l: "STREAK TERBAIK" },
  ];

  const cardW = 249;
  const cardH = 128;
  const gap = 22;
  const startX = 54;
  const cardY = 200;

  const statCards = stats
    .map((s, i) => {
      const x = startX + i * (cardW + gap);
      const idx = String(i + 1).padStart(2, "0");
      // Angka besar ikut berdenyut pelan (skala 1 -> 1.03), labelnya tetap.
      const body = `
      ${card(x, cardY, cardW, cardH)}
      <text x="${x + 24}" y="${cardY + 34}" font-family='${FF_HEAD}' font-size="12" font-weight="700"
            fill="${T.textSoft}" letter-spacing="3">${s.l}</text>
      <text x="${x + cardW - 24}" y="${cardY + 34}" text-anchor="end" font-family='${FF_MONO}' font-size="11"
            font-weight="700" fill="${T.greenDark}" letter-spacing="1">${idx}</text>
      ${breathe(
        `<text x="${x + 24}" y="${cardY + 96}" font-family='${FF_HEAD}' font-size="50" font-weight="700"
            fill="${T.text}" letter-spacing="-1">${s.n}</text>`,
        { dur: 4.5, from: 0.72, to: 1, delay: i * 1.1 }
      )}`;
      return bob(body, { dur: 7 + i * 0.8, amp: 2.2, delay: i * 1.3 });
    })
    .join("\n    ");

  // Rata kanan: swatch 5 x 11px pitch 15 = 71px, berakhir di ~783 supaya
  // tidak bertabrakan dengan "BANYAK" yang rata kanan di 846.
  const legend = LEVELS.map((c, i) => {
    const x = 712 + i * 15;
    return bob(
      `<rect x="${x}" y="${LEGEND_Y}" width="11" height="11" rx="2" fill="${c}"
        stroke="#0b1411" stroke-width="1"/>`,
      { dur: 3.4, amp: 2.4, delay: i * 0.28 }
    );
  }).join("");

  const body = `
${breathe(sectionLabel(54, 60, "// PUSAT KENDALI"), { dur: 4.2 })}

${sway(
    `<text x="54" y="122" font-family='${FF_HEAD}' font-size="52" font-weight="700"
      fill="${T.text}" letter-spacing="-1">Krisna D. Cristian</text>`,
    { dur: 11, amp: 2.5 }
  )}

${breathe(
    `<text x="54" y="158" font-family='${FF_HEAD}' font-size="17"
      fill="${T.textSoft}">Teknik Informatika · Institut Teknologi Sumatera · Lampung</text>`,
    { dur: 6.5, from: 0.6, to: 1, delay: 1.2 }
  )}

${statCards}

${marchingLine(54, DIVIDER_Y, 846, DIVIDER_Y, { color: T.border, width: 2, dash: "10 8", dur: 2.6 })}
${breathe(sectionLabel(54, 404, "// PETA KONTRIBUSI"), { dur: 5, delay: 0.8 })}
${breathe(
    `<text x="846" y="404" text-anchor="end" font-family='${FF_MONO}' font-size="11"
      fill="${T.textSoft}" letter-spacing="0.5">365 HARI · ${contrib.total} TOTAL</text>`,
    { dur: 6, from: 0.65, to: 1, delay: 2 }
  )}

<g>${terrain()}</g>

${breathe(
    `<text x="54" y="${LEGEND_Y + 9}" font-family='${FF_MONO}' font-size="10" font-weight="700"
      fill="${T.textSoft}" letter-spacing="1.4">SEDIKIT</text>`,
    { dur: 4, from: 0.6, to: 1 }
  )}
${legend}
${breathe(
    `<text x="846" y="${LEGEND_Y + 9}" text-anchor="end" font-family='${FF_MONO}' font-size="10" font-weight="700"
      fill="${T.textSoft}" letter-spacing="1.4">BANYAK</text>`,
    { dur: 4, from: 0.6, to: 1, delay: 2 }
  )}`;

  return { h: 600, body };
}

/* ───────────────────────── SEKSI: STACK ───────────────────────── */

const TECH = [
  "TypeScript", "JavaScript", "React", "Next.js", "Tailwind",
  "Supabase", "PostgreSQL", "Prisma", "Node.js",
  "PHP", "Laravel", "C#", ".NET",
  "Three.js", "Playwright", "LaTeX", "Git", "GitHub Actions",
];

function stackSection() {
  const H = 40;
  const GAP = 12;
  const PAD = 20;
  let x = 54;
  let y = 108;
  let out = "";
  let i = 0;

  for (const name of TECH) {
    const w = Math.round(name.length * 7.4 + PAD * 2);
    if (x + w > 846) {
      x = 54;
      y += H + GAP;
    }
    // chip: border 2px + hard shadow kecil (2px 2px 0)
    // Tiap chip melayang dengan fase sendiri, jadi barisannya seperti riak.
    const chip = `<g>
      <rect x="${x + 2}" y="${y + 2}" width="${w}" height="${H}" rx="4" fill="${T.shadowHard}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${H}" rx="4" fill="${T.panel}"
            stroke="${T.border}" stroke-width="2"/>
      <text x="${x + PAD}" y="${y + H / 2 + 4.6}" font-family='${FF_MONO}' font-size="12" font-weight="700"
            fill="${T.textSoft}" letter-spacing="0.4">${esc(name)}</text>
    </g>`;
    out += bob(chip, { dur: 5.5 + (i % 4) * 0.7, amp: 2.4, delay: (i % 7) * 0.45 });
    x += w + GAP;
    i++;
  }

  const body = `
${breathe(sectionLabel(54, 52, "// SINYAL AKTIF"), { dur: 4.6, delay: 0.4 })}
${sway(
    `<text x="54" y="86" font-family='${FF_HEAD}' font-size="30" font-weight="700"
      fill="${T.text}" letter-spacing="-1">Yang kupakai sehari-hari</text>`,
    { dur: 12, amp: 2 }
  )}
${out}`;

  return { h: y + H + 28, body };
}

/* ───────────────────────── SEKSI: LINKS ───────────────────────── */

function linksSection() {
  const items = [
    { label: "github.com/Belliond", href: "https://github.com/Belliond" },
    { label: "virst132109@gmail.com", href: "mailto:virst132109@gmail.com" },
    { label: "task-vault", href: "https://belliond.github.io/task-vault/" },
  ];

  let x = 54;
  let out = "";
  let i = 0;
  for (const it of items) {
    const w = Math.round(it.label.length * 7.2 + 44);
    const btn = `<a href="${it.href}" target="_blank">
    <rect x="${x + 3}" y="33" width="${w}" height="38" rx="4" fill="${T.shadowHard}"/>
    <rect x="${x}" y="30" width="${w}" height="38" rx="4" fill="${T.panel}"
          stroke="${T.borderBright}" stroke-width="2"/>
    <text x="${x + 22}" y="54.4" font-family='${FF_MONO}' font-size="12" font-weight="700"
          fill="${T.textSoft}" letter-spacing="0.3">${esc(it.label)}</text>
  </a>`;
    out += bob(btn, { dur: 6 + i * 0.9, amp: 2.6, delay: i * 0.7 });
    x += w + 14;
    i++;
  }

  const body = `
${out}
${breathe(
    `<text x="846" y="54.4" text-anchor="end" font-family='${FF_MONO}' font-size="11" font-weight="700"
      fill="${T.textSoft}" letter-spacing="1.6">DIBANGUN · DIPERBAIKI · DIPAKAI</text>`,
    { dur: 5.5, from: 0.5, to: 1, delay: 1.5 }
  )}`;

  return { h: 104, body };
}

/* ───────────────────────── GABUNGKAN ───────────────────────── */

const SECTIONS = [heroSection(), stackSection(), linksSection()];
const SECTION_GAP = 40;
const BOTTOM_PAD = 28;

let y = 0;
let inner = "";
for (const s of SECTIONS) {
  // pemisah tipis antar seksi, kecuali sebelum seksi pertama
  if (y > 0) {
    inner += marchingLine(54, y - SECTION_GAP / 2, 846, y - SECTION_GAP / 2, {
      color: T.border,
      width: 1,
      dash: "8 8",
      dur: 4,
      opacity: 0.45,
    }) + "\n";
  }
  inner += `<g transform="translate(0,${y})">${s.body}</g>\n`;
  y += s.h + SECTION_GAP;
}

const TOTAL_H = y - SECTION_GAP + BOTTOM_PAD;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${TOTAL_H}" viewBox="0 0 900 ${TOTAL_H}" role="img" aria-label="Krisna D. Cristian — profil">
<defs>
  ${FONT_DEFS}
  <linearGradient id="snakeGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${T.borderBright}"/>
    <stop offset="50%" stop-color="${T.green}"/>
    <stop offset="100%" stop-color="${T.cyan}"/>
  </linearGradient>
  <radialGradient id="glowGreen" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0%" stop-color="${T.green}" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="${T.green}" stop-opacity="0"/>
  </radialGradient>
  <!-- .bg-photo: radial-gradient(rgba(77,255,178,0.13) 1.5px, transparent 1.5px) / 28px 28px -->
  <pattern id="dotField" width="28" height="28" patternUnits="userSpaceOnUse">
    <circle cx="1.5" cy="1.5" r="1.5" fill="${T.green}" opacity="0.13"/>
  </pattern>
</defs>

<rect width="900" height="${TOTAL_H}" fill="${T.bg}"/>
<rect width="900" height="${TOTAL_H}" fill="url(#dotField)">
  <animate attributeName="opacity" values="1;0.72;1" dur="7s" repeatCount="indefinite"/>
</rect>
<ellipse cx="450" cy="470" rx="440" ry="170" fill="url(#glowGreen)">
  <animate attributeName="opacity" values="0.65;1;0.65" dur="8s" repeatCount="indefinite"/>
</ellipse>

${snake()}
${inner}
</svg>
`;

mkdirSync("assets", { recursive: true });
writeFileSync("assets/profile.svg", svg);

console.log("✓ assets/profile.svg", `900x${TOTAL_H}`);
console.log("  font disematkan:", Math.round((FONT_GROTESK.length + FONT_MONO400.length + FONT_MONO700.length) / 1024), "KB base64");
console.log("  kontribusi     :", contrib.total);
console.log("  waypoint ular  :", buildPath(900, TOTAL_H).length, "· segmen:", SEGMENTS);
