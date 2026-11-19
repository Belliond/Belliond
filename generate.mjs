// generate.mjs — README profil dengan ular 3D di atas terrain kontribusi
// Desain: isometric-ish 3D blocks, tanpa terminal chrome.
// Data kontribusi diambil dari contrib.json (hasil fetch-contrib.mjs).

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";

const contrib = JSON.parse(readFileSync("contrib.json", "utf8"));

/* ───────────────────────── PALET ───────────────────────── */

const THEMES = {
  dark: {
    bg: "#08060f",
    bg2: "#0e0a1f",
    gridEmpty: "#1b1832",
    gridEmptyEdge: "#241f42",
    levels: ["#1b1832", "#332a63", "#54409e", "#8b5cf6", "#c4b5fd"],
    text: "#f1f5f9",
    muted: "#8b93b0",
    dim: "#5a6080",
    accent: "#22d3ee",
    accentDim: "#0e7490",
    snakeHead: "#67e8f9",
    snakeTail: "#4338ca",
    pillBg: "#12102a",
    pillEdge: "#2a2450",
    glow: true,
  },
  light: {
    bg: "#ffffff",
    bg2: "#f7f5ff",
    gridEmpty: "#efeaf9",
    gridEmptyEdge: "#e2dcf3",
    levels: ["#efeaf9", "#c4b2f2", "#9478e8", "#6d3fd4", "#43148f"],
    text: "#1a1625",
    muted: "#5c5675",
    dim: "#8b85a3",
    accent: "#0891b2",
    accentDim: "#67e8f9",
    snakeHead: "#0891b2",
    snakeTail: "#3b0f7a",
    pillBg: "#f4f2fc",
    pillEdge: "#ddd7f0",
    glow: false,
  },
};

const MONO = "'JetBrains Mono','Fira Code','SF Mono',Consolas,monospace";
const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ───────────────────── GEOMETRI GRID ───────────────────── */

const PITCH = 15;
const CELL = 11;
const DEPTH = 4;
const COLS = contrib.cols; // 53
const ROWS = 7;
const GRID_W = COLS * PITCH - (PITCH - CELL);
const GRID_X = Math.round((900 - GRID_W) / 2);
const GRID_Y = 280;

const cellX = (c) => GRID_X + c * PITCH;
const cellY = (r) => GRID_Y + r * PITCH;

/* ─────────────── KOTAK 3D (front + top + side) ─────────────── */

function box(x, y, w, h, k, cTop, cFront, cSide) {
  const front = `<path d="M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z" fill="${cFront}"/>`;
  const top = `<path d="M${x},${y} L${x + k},${y - k} L${x + w + k},${y - k} L${x + w},${y} Z" fill="${cTop}"/>`;
  const side = `<path d="M${x + w},${y} L${x + w + k},${y - k} L${x + w + k},${y - k + h} L${x + w},${y + h} Z" fill="${cSide}"/>`;
  return { front, top, side };
}

/* ─────────────────── TERRAIN KONTRIBUSI ─────────────────── */

function terrain(t) {
  let flat = "";
  let pillars = "";

  // Sel kosong / datar: gambar semua dulu, lalu pilar di atasnya
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const lvl = contrib.matrix[r][c];
      const x = cellX(c);
      const y = cellY(r);
      if (lvl === 0) {
        flat += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${t.gridEmpty}"/>`;
      } else {
        // alas gelap supaya pilar punya kaki
        flat += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${t.gridEmptyEdge}"/>`;
      }
    }
  }

  // Pilar 3D, urut dari baris atas ke bawah (belakang → depan)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const lvl = contrib.matrix[r][c];
      if (lvl === 0) continue;

      const x = cellX(c);
      const baseBottom = cellY(r) + CELL;
      const h = 10 + lvl * 13; // tinggi ekstrusi
      const yTop = baseBottom - h;

      const base = t.levels[lvl];
      const { front, top, side } = box(
        x,
        yTop,
        CELL,
        h,
        DEPTH,
        base,
        shade(base, -0.18),
        shade(base, -0.42)
      );
      pillars += `<g>${front}${side}${top}</g>`;
    }
  }

  return flat + pillars;
}

// Geser kecerahan hex
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  r = f(r);
  g = f(g);
  b = f(b);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ─────────────────── JALUR ULAR (serpentine) ─────────────────── */

function buildPath() {
  const pts = [];
  // Serpentine: baris 6 → 0, zig-zag
  for (let r = ROWS - 1; r >= 0; r--) {
    const leftToRight = (ROWS - 1 - r) % 2 === 0;
    if (leftToRight) {
      for (let c = 0; c < COLS; c++) pts.push([c, r]);
    } else {
      for (let c = COLS - 1; c >= 0; c--) pts.push([c, r]);
    }
  }
  // Kembali menyusuri kolom kanan lalu baris bawah supaya loop menutup
  for (let r = 1; r < ROWS; r++) pts.push([COLS - 1, r]);
  for (let c = COLS - 2; c >= 1; c--) pts.push([c, ROWS - 1]);
  return pts;
}

const PATH = buildPath();
const N = PATH.length;

// Titik tengah kubus untuk tiap waypoint
const PATH_XY = PATH.map(([c, r]) => [
  cellX(c) + CELL / 2,
  cellY(r) + CELL / 2,
]);

/* ───────────────────────── ULAR ───────────────────────── */

const DUR = 40; // detik per putaran
const BODY_PCT = 5.2; // panjang badan sebagai % keliling loop

function snake(t) {
  // Satu path tertutup yang menyusuri seluruh waypoint.
  // pathLength dinormalkan ke 1000 supaya dasharray konsisten.
  const d =
    PATH_XY.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

  // Ekstrusi 3D: salinan path yang digeser, warna lebih gelap
  const extrude = `<path d="${d}" pathLength="1000" fill="none"
      stroke="${shade(t.snakeTail, -0.55)}" stroke-width="9"
      stroke-linecap="round" stroke-linejoin="round"
      stroke-dasharray="${BODY_PCT} 1000" opacity="0.85">
      <animate attributeName="stroke-dashoffset" from="0" to="-1000"
        dur="${DUR}s" repeatCount="indefinite"/>
    </path>
    <path d="${d}" pathLength="1000" fill="none"
      stroke="${shade(t.snakeTail, -0.55)}" stroke-width="9"
      stroke-linecap="round" stroke-linejoin="round"
      stroke-dasharray="${BODY_PCT} 1000" opacity="0.85"
      transform="translate(4,4)">
      <animate attributeName="stroke-dashoffset" from="0" to="-1000"
        dur="${DUR}s" repeatCount="indefinite"/>
    </path>`;

  // Badan utama dengan gradien
  const body = `<path d="${d}" pathLength="1000" fill="none"
      stroke="url(#snakeGrad)" stroke-width="9"
      stroke-linecap="round" stroke-linejoin="round"
      stroke-dasharray="${BODY_PCT} 1000">
      <animate attributeName="stroke-dashoffset" from="0" to="-1000"
        dur="${DUR}s" repeatCount="indefinite"/>
    </path>`;

  // Kepala: kubus yang mengikuti waypoint, sinkron dengan dashoffset
  const vals = [];
  for (let j = 0; j <= N; j++) {
    const [x, y] = PATH_XY[j % N];
    vals.push(`${x},${y}`);
  }

  const hs = CELL + 4;
  const half = hs / 2;
  const k = DEPTH + 3;
  const headCol = t.snakeHead;
  const { front, top, side } = box(
    -half,
    -half,
    hs,
    hs,
    k,
    shade(headCol, 0.35),
    headCol,
    shade(headCol, -0.4)
  );

  const eyes = `
    <circle cx="${-half + hs * 0.3}" cy="${-half + hs * 0.28}" r="2" fill="#ffffff"/>
    <circle cx="${-half + hs * 0.7}" cy="${-half + hs * 0.28}" r="2" fill="#ffffff"/>
    <circle cx="${-half + hs * 0.3}" cy="${-half + hs * 0.28}" r="0.9" fill="#0b1020"/>
    <circle cx="${-half + hs * 0.7}" cy="${-half + hs * 0.28}" r="0.9" fill="#0b1020"/>`;

  const head = `<g>
    <animateTransform attributeName="transform" type="translate"
      values="${vals.join(";")}" dur="${DUR}s" repeatCount="indefinite"/>
    ${front}${side}${top}${eyes}
  </g>`;

  return extrude + body + head;
}

function mix(a, b, t2) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t2) + ((pb >> 16) & 255) * t2);
  const g = Math.round(((pa >> 8) & 255) * (1 - t2) + ((pb >> 8) & 255) * t2);
  const bl = Math.round((pa & 255) * (1 - t2) + (pb & 255) * t2);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

/* ───────────────────────── HERO ───────────────────────── */

function hero(t) {
  const stats = [
    { n: contrib.total, l: "CONTRIBUTIONS" },
    { n: contrib.active, l: "ACTIVE DAYS" },
    { n: contrib.best, l: "DAY STREAK" },
  ];

  const statSvg = stats
    .map((s, i) => {
      const x = 54 + i * 128;
      return `<text x="${x}" y="152" font-family="${SANS}" font-size="30" font-weight="800"
        fill="${i === 0 ? t.accent : t.text}" letter-spacing="-0.5">${s.n}</text>
    <text x="${x}" y="170" font-family="${MONO}" font-size="8.5" font-weight="600"
        fill="${t.dim}" letter-spacing="1.6">${s.l}</text>`;
    })
    .join("\n    ");

  const glow = t.glow
    ? `<filter id="snakeGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="pillarGlow" x="-120%" y="-120%" width="340%" height="340%">
      <feGaussianBlur stdDeviation="2.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`
    : "";

  // Legenda
  const legendX = 846;
  const legend = t.levels
    .map((c, i) => {
      const x = legendX - (4 - i) * 13;
      return `<rect x="${x}" y="442" width="9" height="9" rx="1.5" fill="${c}"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="470" viewBox="0 0 900 470" role="img" aria-label="Krisna D. Cristian — contribution terrain">
<defs>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0%" stop-color="${t.bg}"/>
    <stop offset="100%" stop-color="${t.bg2}"/>
  </linearGradient>
  <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.9"/>
    <stop offset="60%" stop-color="${t.accent}" stop-opacity="0.05"/>
    <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="snakeGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${t.snakeHead}"/>
    <stop offset="55%" stop-color="${mix(t.snakeHead, t.snakeTail, 0.5)}"/>
    <stop offset="100%" stop-color="${t.snakeTail}"/>
  </linearGradient>
  ${glow}
</defs>

<rect width="900" height="470" fill="url(#bgGrad)"/>

<!-- garis aksen tipis di atas -->
<rect x="0" y="0" width="900" height="2" fill="url(#accentLine)"/>

<!-- nama -->
<text x="54" y="72" font-family="${SANS}" font-size="40" font-weight="800"
      fill="${t.text}" letter-spacing="-1.2">Krisna D. Cristian</text>

<text x="54" y="98" font-family="${MONO}" font-size="11.5" font-weight="500"
      fill="${t.muted}" letter-spacing="0.3">Informatics Engineering · Institut Teknologi Sumatera · Lampung</text>

<!-- statistik -->
${statSvg}

<!-- label terrain -->
<line x1="54" y1="196" x2="846" y2="196" stroke="${t.gridEmptyEdge}" stroke-width="1"/>
<text x="54" y="216" font-family="${MONO}" font-size="9" font-weight="700"
      fill="${t.dim}" letter-spacing="2.4">CONTRIBUTION TERRAIN</text>
<text x="846" y="216" text-anchor="end" font-family="${MONO}" font-size="9"
      fill="${t.dim}" letter-spacing="0.6">365 DAYS · ${contrib.total} TOTAL</text>

<!-- terrain -->
<g>${terrain(t)}</g>

<!-- ular 3D -->
<g filter="url(#snakeGlow)">${snake(t)}</g>

<!-- legenda -->
<text x="54" y="450" font-family="${MONO}" font-size="9" fill="${t.dim}" letter-spacing="1.2">LESS</text>
${legend}
<text x="864" y="450" font-family="${MONO}" font-size="9" fill="${t.dim}" letter-spacing="1.2">MORE</text>


</svg>
`;
}

/* ───────────────────────── STACK ───────────────────────── */

const TECH = [
  "TypeScript", "JavaScript", "React", "Next.js", "Tailwind",
  "Supabase", "PostgreSQL", "Prisma", "Node.js",
  "PHP", "Laravel", "C#", ".NET",
  "Three.js", "Playwright", "LaTeX", "Git", "GitHub Actions",
];

function stack(t) {
  const ROW_Y = 56;
  const H = 34;
  const GAP = 9;
  const PAD = 16;

  // ukur lebar kasar: mono 10.5px ≈ 6.3px per char
  let x = 54;
  let y = ROW_Y;
  let out = "";
  const MAX_X = 846;

  for (const name of TECH) {
    const w = Math.round(name.length * 6.6 + PAD * 2);
    if (x + w > MAX_X) {
      x = 54;
      y += H + GAP;
    }
    out += `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${H}" rx="7" fill="${t.pillBg}" stroke="${t.pillEdge}" stroke-width="1"/>
      <rect x="${x}" y="${y}" width="2.5" height="${H}" rx="1.2" fill="${t.accent}" opacity="0.55"/>
      <text x="${x + PAD}" y="${y + H / 2 + 3.8}" font-family="${MONO}" font-size="10.5" font-weight="600"
            fill="${t.muted}">${esc(name)}</text>
    </g>`;
    x += w + GAP;
  }

  const height = y + H + 34;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${height}" viewBox="0 0 900 ${height}" role="img" aria-label="Tech stack">
<defs>
  <linearGradient id="bgGrad2" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0%" stop-color="${t.bg}"/>
    <stop offset="100%" stop-color="${t.bg2}"/>
  </linearGradient>
</defs>
<rect width="900" height="${height}" fill="url(#bgGrad2)"/>
<text x="54" y="30" font-family="${MONO}" font-size="9" font-weight="700"
      fill="${t.dim}" letter-spacing="2.4">TOOLS I ACTUALLY USE</text>
${out}
</svg>
`;
}

/* ───────────────────────── LINKS ───────────────────────── */

function links(t) {
  const items = [
    { label: "github.com/Belliond", href: "https://github.com/Belliond" },
    { label: "virst132109@gmail.com", href: "mailto:virst132109@gmail.com" },
  ];

  let x = 54;
  let out = "";
  for (const it of items) {
    const w = Math.round(it.label.length * 6.4 + 34);
    out += `<a href="${it.href}" target="_blank">
    <rect x="${x}" y="30" width="${w}" height="28" rx="14" fill="${t.pillBg}" stroke="${t.pillEdge}" stroke-width="1"/>
    <circle cx="${x + 15}" cy="44" r="3" fill="${t.accent}"/>
    <text x="${x + 26}" y="47.8" font-family="${MONO}" font-size="10" font-weight="600"
          fill="${t.muted}">${esc(it.label)}</text>
  </a>`;
    x += w + 10;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="88" viewBox="0 0 900 88" role="img" aria-label="Links">
<defs>
  <linearGradient id="bgGrad3" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0%" stop-color="${t.bg}"/>
    <stop offset="100%" stop-color="${t.bg2}"/>
  </linearGradient>
</defs>
<rect width="900" height="88" fill="url(#bgGrad3)"/>
${out}
<text x="846" y="47.8" text-anchor="end" font-family="${MONO}" font-size="9"
      fill="${t.dim}" letter-spacing="1.4">BUILT, BROKEN, REBUILT</text>
<rect x="0" y="86" width="900" height="2" fill="url(#accentLine)" opacity="0.5"/>
</svg>
`;
}

/* ───────────────────────── TULIS ───────────────────────── */

mkdirSync("assets", { recursive: true });

for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(`assets/hero-${name}.svg`, hero(t));
  writeFileSync(`assets/stack-${name}.svg`, stack(t));
  writeFileSync(`assets/links-${name}.svg`, links(t));
  console.log(`✓ ${name}`);
}

console.log("\nwaypoint ular :", N);
console.log("panjang badan :", BODY_PCT + "% loop");
console.log("total kontrib :", contrib.total);
