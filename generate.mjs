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
const DEPTH = 4;
const COLS = contrib.cols;
const ROWS = 7;
const GRID_W = COLS * PITCH - (PITCH - CELL);
const GRID_X = Math.round((900 - GRID_W) / 2);
// Pilar tertinggi = 10 + 4*13 = 62px di atas dasar sel, plus 4px sisi atas.
const GRID_Y = 520;

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

function terrain() {
  let flat = "";
  let pillars = "";

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = cellX(c);
      const y = cellY(r);
      const lvl = contrib.matrix[r][c];
      if (lvl === 0) {
        flat += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="#0b1411" stroke="#123026" stroke-width="0.8"/>`;
      } else {
        flat += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="#123026"/>`;
      }
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const lvl = contrib.matrix[r][c];
      if (lvl === 0) continue;
      const x = cellX(c);
      const baseBottom = cellY(r) + CELL;
      const h = 10 + lvl * 13;
      const yTop = baseBottom - h;
      const base = LEVELS[lvl];
      const { front, top, side } = box(
        x,
        yTop,
        CELL,
        h,
        DEPTH,
        shade(base, 0.3),
        base,
        shade(base, -0.45),
        "#0b1411"
      );
      pillars += `<g>${front}${side}${top}</g>`;
    }
  }

  return flat + pillars;
}

/* ───────────────────── JALUR ULAR ───────────────────── */

function buildPath() {
  const pts = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    const ltr = (ROWS - 1 - r) % 2 === 0;
    if (ltr) for (let c = 0; c < COLS; c++) pts.push([c, r]);
    else for (let c = COLS - 1; c >= 0; c--) pts.push([c, r]);
  }
  for (let r = 1; r < ROWS; r++) pts.push([COLS - 1, r]);
  for (let c = COLS - 2; c >= 1; c--) pts.push([c, ROWS - 1]);
  return pts;
}

const PATH = buildPath();
const N = PATH.length;
const PATH_XY = PATH.map(([c, r]) => [cellX(c) + CELL / 2, cellY(r) + CELL / 2]);

const DUR = 40;
// Badan ular = deretan kubus 3D yang saling menimpa, bukan satu garis tebal.
// Tiap segmen tertinggal 1 waypoint dari segmen di depannya; karena jarak
// antar waypoint = PITCH (15px) dan lebar segmen 15px, kubusnya bersambung.
const SEGMENTS = 26;

function snake() {
  const track = (lag) => {
    const out = [];
    for (let j = 0; j <= N; j++) {
      const [x, y] = PATH_XY[(j + lag) % N];
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

    out += `<g opacity="${(1 - tt * 0.25).toFixed(2)}">
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
    { n: contrib.total, l: "CONTRIBUTIONS", c: "sepanjang setahun" },
    { n: contrib.active, l: "ACTIVE DAYS", c: "hari ada commit" },
    { n: contrib.best, l: "DAY STREAK", c: "berturut-turut" },
  ];

  const cardW = 249;
  const cardH = 152;
  const gap = 22;
  const startX = 54;
  const cardY = 200;

  const statCards = stats
    .map((s, i) => {
      const x = startX + i * (cardW + gap);
      const idx = String(i + 1).padStart(2, "0");
      return `<g>
      ${card(x, cardY, cardW, cardH)}
      <text x="${x + 24}" y="${cardY + 36}" font-family='${FF_HEAD}' font-size="12" font-weight="700"
            fill="${T.textSoft}" letter-spacing="3">${s.l}</text>
      <text x="${x + cardW - 24}" y="${cardY + 36}" text-anchor="end" font-family='${FF_MONO}' font-size="11"
            font-weight="700" fill="${T.greenDark}" letter-spacing="1">${idx}</text>
      <text x="${x + 24}" y="${cardY + 94}" font-family='${FF_HEAD}' font-size="48" font-weight="700"
            fill="${T.text}" letter-spacing="-1">${s.n}</text>
      <text x="${x + 24}" y="${cardY + 124}" font-family='${FF_HEAD}' font-size="14"
            fill="${T.textSoft}">${s.c}</text>
    </g>`;
    })
    .join("\n    ");

  // Rata kanan: swatch 5 x 11px pitch 15 = 71px, berakhir di 812, "MORE" di 846.
  const legend = LEVELS.map((c, i) => {
    const x = 741 + i * 15;
    return `<rect x="${x}" y="662" width="11" height="11" rx="2" fill="${c}" stroke="#0b1411" stroke-width="1"/>`;
  }).join("");

  const body = `
${sectionLabel(54, 60, "// MISSION CONTROL")}

<text x="54" y="122" font-family='${FF_HEAD}' font-size="52" font-weight="700"
      fill="${T.text}" letter-spacing="-1">Krisna D. Cristian</text>

<text x="54" y="158" font-family='${FF_HEAD}' font-size="17"
      fill="${T.textSoft}">Informatics Engineering · Institut Teknologi Sumatera · Lampung</text>

${statCards}

<line x1="54" y1="396" x2="846" y2="396" stroke="${T.border}" stroke-width="2"/>
${sectionLabel(54, 428, "// CONTRIBUTION TERRAIN")}
<text x="846" y="428" text-anchor="end" font-family='${FF_MONO}' font-size="11"
      fill="${T.textSoft}" letter-spacing="0.5">365 DAYS · ${contrib.total} TOTAL</text>

<g>${terrain()}</g>
${snake()}

<text x="54" y="671" font-family='${FF_MONO}' font-size="10" font-weight="700"
      fill="${T.textSoft}" letter-spacing="1.4">LESS</text>
${legend}
<text x="846" y="671" text-anchor="end" font-family='${FF_MONO}' font-size="10" font-weight="700"
      fill="${T.textSoft}" letter-spacing="1.4">MORE</text>`;

  return { h: 700, body };
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

  for (const name of TECH) {
    const w = Math.round(name.length * 7.4 + PAD * 2);
    if (x + w > 846) {
      x = 54;
      y += H + GAP;
    }
    // chip: border 2px + hard shadow kecil (2px 2px 0)
    out += `<g>
      <rect x="${x + 2}" y="${y + 2}" width="${w}" height="${H}" rx="4" fill="${T.shadowHard}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${H}" rx="4" fill="${T.panel}"
            stroke="${T.border}" stroke-width="2"/>
      <text x="${x + PAD}" y="${y + H / 2 + 4.6}" font-family='${FF_MONO}' font-size="12" font-weight="700"
            fill="${T.textSoft}" letter-spacing="0.4">${esc(name)}</text>
    </g>`;
    x += w + GAP;
  }

  const body = `
${sectionLabel(54, 52, "// ACTIVE SIGNALS")}
<text x="54" y="86" font-family='${FF_HEAD}' font-size="30" font-weight="700"
      fill="${T.text}" letter-spacing="-1">Tools I actually use</text>
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
  for (const it of items) {
    const w = Math.round(it.label.length * 7.2 + 44);
    out += `<a href="${it.href}" target="_blank">
    <rect x="${x + 3}" y="33" width="${w}" height="38" rx="4" fill="${T.shadowHard}"/>
    <rect x="${x}" y="30" width="${w}" height="38" rx="4" fill="${T.panel}"
          stroke="${T.borderBright}" stroke-width="2"/>
    <text x="${x + 22}" y="54.4" font-family='${FF_MONO}' font-size="12" font-weight="700"
          fill="${T.textSoft}" letter-spacing="0.3">${esc(it.label)}</text>
  </a>`;
    x += w + 14;
  }

  const body = `
${out}
<text x="846" y="54.4" text-anchor="end" font-family='${FF_MONO}' font-size="11" font-weight="700"
      fill="${T.textSoft}" letter-spacing="1.6">BUILT · BROKEN · REBUILT</text>`;

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
    inner += `<line x1="54" y1="${y - SECTION_GAP / 2}" x2="846" y2="${y - SECTION_GAP / 2}"
      stroke="${T.border}" stroke-width="1" opacity="0.35"/>\n`;
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
<rect width="900" height="${TOTAL_H}" fill="url(#dotField)"/>
<ellipse cx="450" cy="540" rx="440" ry="170" fill="url(#glowGreen)"/>

${inner}
</svg>
`;

mkdirSync("assets", { recursive: true });
writeFileSync("assets/profile.svg", svg);

console.log("✓ assets/profile.svg", `900x${TOTAL_H}`);
console.log("  font disematkan:", Math.round((FONT_GROTESK.length + FONT_MONO400.length + FONT_MONO700.length) / 1024), "KB base64");
console.log("  kontribusi     :", contrib.total);
console.log("  waypoint ular  :", N, "· segmen:", SEGMENTS);
