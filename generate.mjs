// generate.mjs — README profil, kartu "developer profile" bergaya terminal.
//
// Output: satu SVG utuh (assets/profile.svg). GitHub menampilkan SVG lewat
// <img>, jadi tidak ada JS/CSS halaman: semua gerak memakai SMIL.
//
// Anggaran performa (penting — SVG ini dibuka di HP):
//   • nol filter (feTurbulence sangat mahal dan dihitung ulang tiap frame)
//   • hanya ular + lensa + dua kedip kecil yang beranimasi
//   • efek tabrakan = lensa pembesar yang bergerak di atas salinan konten,
//     bukan menghapus elemen. Kartu tetap utuh, hanya bagian yang dilewati
//     ular yang terlihat terdistorsi.

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";

const contrib = JSON.parse(readFileSync("contrib.json", "utf8"));

/* ─────────────────────── TOKEN DESAIN ─────────────────────── */

const T = {
  bg: "#050a08",
  panel: "#0b1411",
  bar: "#08120e",

  green: "#4dffb2",
  greenDark: "#19d991",
  greenDeep: "#0f7a55",
  cyan: "#4fe6ff",

  text: "#eafef4",
  textSoft: "#9ac9bb",
  textDim: "#5f8d7e",

  borderW: 3,
};

// Font disematkan base64: SVG tetap benar walau dirender lewat <img>.
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

/* ─────────────────────── GEOMETRI ─────────────────────── */

const W = 900;
const H = 660;

const WIN = { x: 90, y: 140, w: 760, h: 470 }; // jendela utama
const TITLE_H = 34;
const FOOT_H = 40;
const PANEL_X = 290; // batas panel kiri/kanan
const PAD_X = 310; // awal teks panel kanan
const RIGHT = WIN.x + WIN.w - 20; // 830

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const lastDate = new Date(
  `${contrib.cells.map((c) => c.date).sort().at(-1)}T00:00:00Z`,
);
const LAST_COMMIT = `${String(lastDate.getUTCDate()).padStart(2, "0")} ${MONTHS[lastDate.getUTCMonth()]} ${lastDate.getUTCFullYear()}`;

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
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return `#${((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, "0")}`;
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sa, sb) => Math.round(sa * (1 - t) + sb * t);
  return `#${((ch((pa >> 16) & 255, (pb >> 16) & 255) << 16) | (ch((pa >> 8) & 255, (pb >> 8) & 255) << 8) | ch(pa & 255, pb & 255)).toString(16).padStart(6, "0")}`;
}

/* ─────────────────────── JALUR ULAR ─────────────────────── */

const ROUTE_DUR = 112; // detik per putaran — pelan, tidak menyilaukan

function buildPath(width, height) {
  const left = 18, right = width - 18, top = 24, bottom = height - 24;
  const cx = width / 2, cy = height / 2;
  const ax = Math.min(cx - left - 16, right - cx - 16);
  const ay = cy - top - 20;
  const waves = [
    (t) => [ax * Math.sin(t), ay * Math.sin(2 * t)],
    (t) => [ax * Math.sin(2 * t), ay * 0.82 * Math.sin(3 * t)],
    (t) => [ax * 0.82 * Math.sin(3 * t), ay * Math.sin(2 * t)],
    (t) => [ax * (0.88 * Math.sin(t) + 0.12 * Math.sin(4 * t)), ay * 0.78 * Math.sin(3 * t)],
    (t) => [ax * 0.76 * Math.sin(2 * t), ay * (0.82 * Math.sin(t) + 0.18 * Math.sin(4 * t))],
    (t) => [ax * Math.sin(t), ay * 0.9 * Math.sin(5 * t)],
  ];
  const points = [];
  for (const wave of waves) {
    // 32 sampel per gelombang: cukup halus untuk 900px, jauh lebih ringan
    // dihitung/dirender di HP daripada 96.
    for (let i = 0; i <= 32; i++) {
      const [x, y] = wave((i / 32) * Math.PI * 2);
      points.push([cx + x, cy + y]);
    }
  }
  // Dibalik supaya kepala memimpin di awal rute.
  points.reverse();
  const d = `M${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")}`;

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return { points, d, length };
}

// Jalur "delta" untuk lensa: titik (I - A)·p dengan A = skala·rotasi.
// Dipakai sebagai animateMotion, sehingga salinan konten di dalam lensa
// terlihat diperbesar/diputar tepat di sekitar posisi ular (titik p tetap
// di p). Karena A hanya skala seragam + rotasi, panjang busur jalur delta
// sebanding dengan jalur asli → kedua gerak tetap sinkron sepanjang loop.
const LENS_SCALE = 1.6;
const LENS_ROT = 4;
const LENS_R = 64;

function deltaPath(points) {
  const a = (LENS_ROT * Math.PI) / 180;
  const cos = Math.cos(a) * LENS_SCALE;
  const sin = Math.sin(a) * LENS_SCALE;
  const pts = points.map(([x, y]) => {
    const ax = cos * x - sin * y;
    const ay = sin * x + cos * y;
    return [x - ax, y - ay];
  });
  return `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")}`;
}

// Badan ular = deretan kubus 3D yang saling menimpa. 12 segmen cukup untuk
// siluet yang utuh dan jauh lebih ringan saat dihitung ulang tiap frame.
const SEGMENTS = 12;
const PITCH = 15;

function snake(route) {
  let out = "";
  for (let i = SEGMENTS - 1; i >= 0; i--) {
    const isHead = i === 0;
    const tt = i / (SEGMENTS - 1);

    const col =
      tt < 0.55
        ? mix(T.green, T.greenDark, tt / 0.55)
        : mix(T.greenDark, T.cyan, (tt - 0.55) / 0.45);

    const s = isHead ? 15 : 15 - tt * 7;
    const k = isHead ? 7 : 4 + (1 - tt) * 2;
    const half = s / 2;

    const { front, top, side } = box(-half, -half, s, s, k, shade(col, 0.3), col, shade(col, -0.45), "#050a08");
    const sh = box(-half + 3, -half + 3, s, s, k, T.greenDeep, T.greenDeep, T.greenDeep);
    const eyes = isHead
      ? `<circle cx="${-half + s * 0.3}" cy="${-half + s * 0.3}" r="2.2" fill="#050a08"/>
         <circle cx="${-half + s * 0.7}" cy="${-half + s * 0.3}" r="2.2" fill="#050a08"/>`
      : "";

    const lag = (i * PITCH / route.length * ROUTE_DUR).toFixed(3);
    out += `<g data-role="snake-segment" data-segment-index="${i}" opacity="${(1 - tt * 0.25).toFixed(2)}">
      <animateMotion dur="${ROUTE_DUR}s" begin="${(-ROUTE_DUR + Number(lag)).toFixed(3)}s" rotate="auto" repeatCount="indefinite"><mpath href="#snake-route" xlink:href="#snake-route"/></animateMotion>
      ${sh.front}${sh.side}${sh.top}${front}${side}${top}${eyes}
    </g>`;
  }
  return out;
}

/* ─────────────────────── KOMPONEN ─────────────────────── */

function chip(x, y, w, h, label, { fill = T.green, color = T.bg, size = 9, weight = 700, stroke } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2"` : ""}/>
    <text x="${x + w / 2}" y="${y + h / 2 + size * 0.36}" text-anchor="middle" font-family='${FF_MONO}'
      font-size="${size}" font-weight="${weight}" fill="${color}" letter-spacing="0.8">${esc(label)}</text>`;
}

function label(x, y, text, { fill = T.green, size = 9, ls = 2.6, weight = 700, anchor = "start" } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family='${FF_MONO}' font-size="${size}"
    font-weight="${weight}" fill="${fill}" letter-spacing="${ls}">${esc(text)}</text>`;
}

/* ─────────────────────── POTONGAN KARTU ─────────────────────── */

function tape() {
  return `<g transform="rotate(-4 16 40)">
    <rect x="6" y="22" width="252" height="34" fill="${T.green}" stroke="${T.bg}" stroke-width="2"/>
    <text x="22" y="44" font-family='${FF_MONO}' font-size="12" font-weight="700" fill="${T.bg}" letter-spacing="2.2">ROOT ACCESS GRANTED</text>
  </g>`;
}

function header() {
  return `
  ${label(150, 62, "GITHUB IDENTITY / 001", { size: 10, ls: 3 })}
  <text x="153" y="107" font-family='${FF_HEAD}' font-size="40" font-weight="700" fill="${T.greenDeep}" letter-spacing="-1">DEVELOPER PROFILE</text>
  <text x="150" y="104" font-family='${FF_HEAD}' font-size="40" font-weight="700" fill="${T.text}" letter-spacing="-1">DEVELOPER PROFILE</text>
  <rect x="716" y="80" width="134" height="26" fill="${T.bar}" stroke="${T.greenDark}" stroke-width="2"/>
  <rect x="728" y="90" width="7" height="7" fill="${T.green}">
    <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite"/>
  </rect>
  ${label(744, 98, "SYSTEM ONLINE", { size: 9, ls: 1.6 })}`;
}

function titleBar() {
  const y = WIN.y;
  return `
  <rect x="${WIN.x}" y="${y}" width="${WIN.w}" height="${TITLE_H}" fill="${T.bar}"/>
  <rect x="${WIN.x + 14}" y="${y + 12}" width="9" height="9" fill="${T.green}"/>
  <rect x="${WIN.x + 28}" y="${y + 12}" width="9" height="9" fill="${T.greenDark}"/>
  <rect x="${WIN.x + 42}" y="${y + 12}" width="9" height="9" fill="${T.greenDeep}"/>
  ${label(WIN.x + WIN.w - 16, y + 21, "PROFILE.EXE", { size: 9, ls: 1.8, anchor: "end" })}`;
}

function leftPanel() {
  const px = WIN.x, pw = 200, py = WIN.y + TITLE_H;
  const ph = WIN.h - TITLE_H - FOOT_H;
  const fx = px + 18, fw = pw - 36, fy = py + 18, fh = 188;

  // Garis-garis pemindai di dalam bingkai foto.
  let scan = "";
  for (let y = fy + 6; y < fy + fh; y += 7) {
    scan += `<line x1="${fx}" y1="${y}" x2="${fx + fw}" y2="${y}" stroke="${T.green}" stroke-width="1" opacity="0.10"/>`;
  }

  return `
  <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="${T.green}"/>
  <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="${T.bar}" stroke="${T.greenDark}" stroke-width="2"/>
  <g transform="rotate(8 ${fx + fw - 8} ${fy + 4})">
    <rect x="${fx + fw - 22}" y="${fy - 10}" width="28" height="28" fill="${T.green}" stroke="${T.bg}" stroke-width="2"/>
    ${label(fx + fw - 8, fy + 8, "ID", { size: 9, ls: 0, anchor: "middle", fill: T.bg })}
  </g>
  ${scan}
  <text x="${px + pw / 2}" y="${fy + 108}" text-anchor="middle" font-family='${FF_HEAD}' font-size="58" font-weight="700" fill="${T.green}" letter-spacing="2">KD</text>
  <line x1="${px + pw / 2 - 42}" y1="${fy + 130}" x2="${px + pw / 2 + 42}" y2="${fy + 130}" stroke="${T.green}" stroke-width="1.5"/>
  ${label(px + pw / 2, fy + 148, "WHITE HAT", { size: 9, ls: 4, anchor: "middle" })}

  <rect x="${fx}" y="${fy + fh + 22}" width="${fw}" height="28" fill="${T.bar}" stroke="${T.greenDark}" stroke-width="1.5"/>
  ${label(fx + 10, fy + fh + 40, "THREAT LEVEL", { size: 8, ls: 1.4, fill: T.textSoft })}
  ${chip(fx + fw - 46, fy + fh + 27, 38, 18, "LOW", { size: 8 })}

  ${label(fx, fy + fh + 82, "> SESSION ACTIVE", { size: 8.5, ls: 1.2, fill: "#0a3a28" })}
  ${label(fx, fy + fh + 100, "> UPTIME 99.98%", { size: 8.5, ls: 1.2, fill: "#0a3a28" })}`;
}

function rightPanel() {
  const py = WIN.y + TITLE_H;
  const ph = WIN.h - TITLE_H - FOOT_H;
  const stats = [
    { n: contrib.total, l: "CONTRIBUTIONS" },
    { n: contrib.active, l: "ACTIVE DAYS" },
    { n: contrib.best, l: "BEST STREAK" },
  ];

  const statBoxes = stats
    .map((s, i) => {
      const x = PAD_X + i * 172;
      return `<rect x="${x}" y="322" width="160" height="74" fill="none" stroke="${T.greenDeep}" stroke-width="2"/>
        <text x="${x + 14}" y="362" font-family='${FF_HEAD}' font-size="30" font-weight="700" fill="${T.text}">${s.n}</text>
        ${label(x + 14, 382, s.l, { size: 8, ls: 1.4, fill: T.textSoft })}`;
    })
    .join("\n");

  // Bar kontribusi: 26 minggu terakhir, tinggi dari jumlah commit per minggu.
  const weekly = Array.from({ length: contrib.cols }, (_, c) =>
    contrib.counts.reduce((sum, row) => sum + row[c], 0),
  );
  const shown = weekly.slice(-26);
  const peak = Math.max(...shown, 1);
  const bars = shown
    .map((v, i) => {
      const h = v === 0 ? 6 : Math.round(8 + Math.sqrt(v / peak) * 40);
      const x = PAD_X + i * 15;
      const fill = v === 0 ? "#123026" : i === shown.length - 1 ? T.green : mix(T.greenDeep, T.green, v / peak);
      return `<rect x="${x}" y="${486 - h}" width="9" height="${h}" fill="${fill}"/>`;
    })
    .join("");

  const tags = ["#TYPESCRIPT", "#NEXTJS", "#SUPABASE"];
  const tagChips = tags
    .map((t, i) => {
      const w = Math.round(t.length * 5.4 + 16);
      return chip(RIGHT - w, 430 + i * 21, w, 17, t, { fill: "none", color: T.green, size: 8, stroke: T.greenDeep });
    })
    .join("");

  return `
  <rect x="${PANEL_X}" y="${py}" width="${WIN.x + WIN.w - PANEL_X}" height="${ph}" fill="${T.panel}"/>
  <line x1="${PANEL_X}" y1="${py}" x2="${PANEL_X}" y2="${py + ph}" stroke="${T.greenDeep}" stroke-width="2"/>

  <text x="${PAD_X}" y="220" font-family='${FF_HEAD}' font-size="26" font-weight="700" fill="${T.text}" letter-spacing="-0.4">KRISNA D. CRISTIAN</text>
  ${chip(612, 200, 68, 20, "VERIFIED", { size: 8 })}
  ${chip(690, 198, 96, 24, "+ FOLLOW", { size: 9.5 })}
  <rect x="796" y="198" width="26" height="24" fill="${T.bar}" stroke="${T.greenDark}" stroke-width="2"/>
  ${label(809, 214, "GH", { size: 9, ls: 0, anchor: "middle" })}

  ${label(PAD_X, 248, "@belliond // click to copy", { size: 10, ls: 0.6 })}
  <rect x="${PAD_X + 232}" y="240" width="8" height="11" fill="${T.green}">
    <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.45;0.5;0.95;1" dur="1.2s" repeatCount="indefinite"/>
  </rect>

  <text x="${PAD_X}" y="284" font-family='${FF_HEAD}' font-size="15" fill="${T.textSoft}">Computer science student building open-source tools</text>
  <text x="${PAD_X}" y="306" font-family='${FF_HEAD}' font-size="15" fill="${T.textSoft}">for the web — one commit at a time.</text>

  ${statBoxes}

  ${label(PAD_X, 420, "CONTRIBUTION STREAM", { size: 8.5, ls: 1.8 })}
  ${label(RIGHT, 420, `${contrib.total} THIS YEAR`, { size: 8.5, ls: 1.2, fill: T.textSoft, anchor: "end" })}
  <line x1="${PAD_X}" y1="486" x2="${PAD_X + 26 * 15 - 6}" y2="486" stroke="${T.greenDeep}" stroke-width="2"/>
  ${bars}
  ${tagChips}

  ${label(PAD_X, 528, "> status: available for collaboration", { size: 9, ls: 0.4, fill: T.textDim })}`;
}

function footer() {
  const y = WIN.y + WIN.h - FOOT_H;
  return `
  <rect x="${WIN.x}" y="${y}" width="${WIN.w}" height="${FOOT_H}" fill="${T.bar}"/>
  <line x1="${WIN.x}" y1="${y}" x2="${WIN.x + WIN.w}" y2="${y}" stroke="${T.greenDark}" stroke-width="2"/>
  ${label(WIN.x + 20, y + 24, "LAMPUNG, ID", { size: 9.5, ls: 1.6, fill: T.text })}
  ${label(WIN.x + 300, y + 24, "GPS: -5.35 / 105.26", { size: 8.5, ls: 1.2, fill: T.textSoft })}
  ${label(WIN.x + WIN.w - 20, y + 24, `LAST COMMIT: ${LAST_COMMIT}`, { size: 8.5, ls: 1.2, fill: T.textSoft, anchor: "end" })}`;
}

function windowFrame() {
  return `
  <rect x="${WIN.x + 7}" y="${WIN.y + 7}" width="${WIN.w}" height="${WIN.h}" fill="${T.greenDeep}"/>
  <rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" fill="${T.panel}" stroke="${T.greenDark}" stroke-width="${T.borderW}"/>
  ${titleBar()}
  ${leftPanel()}
  ${rightPanel()}
  ${footer()}`;
}

/* ─────────────────────── LATAR ─────────────────────── */

function backdrop() {
  return `
  <rect width="${W}" height="${H}" fill="${T.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#vignette)"/>`;
}

/* ─────────────────────── RAKIT ─────────────────────── */

const route = buildPath(W, H);

const content = `
  ${tape()}
  ${header()}
  ${windowFrame()}
  <text x="872" y="600" transform="rotate(-90 872 600)" font-family='${FF_MONO}' font-size="9"
    fill="${T.greenDark}" letter-spacing="3.4" opacity="0.75">SECURED / SECURE // ONLINE</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Krisna D. Cristian — developer profile card">
<defs>
  ${FONT_DEFS}
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
    <path d="M24 0 H0 V24" fill="none" stroke="${T.green}" stroke-width="1" opacity="0.07"/>
  </pattern>
  <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.75">
    <stop offset="0%" stop-color="${T.green}" stop-opacity="0.07"/>
    <stop offset="100%" stop-color="${T.green}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lensEdge" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0.62" stop-color="#fff"/>
    <stop offset="1" stop-color="#000"/>
  </radialGradient>
  <path id="snake-route" d="${route.d}" fill="none"/>
  <path id="lens-route" d="${deltaPath(route.points)}" fill="none"/>
  <!-- clip-path lebih murah daripada mask. Lingkaran klip mengikuti ular;
       salinan konten di dalamnya memakai lens-route = (I-A)·p sehingga titik
       di bawah ular tetap di tempatnya, hanya diperbesar/diputar. -->
  <clipPath id="lensClip" clipPathUnits="userSpaceOnUse">
    <circle r="${LENS_R}" cx="0" cy="0">
      <animateMotion dur="${ROUTE_DUR}s" repeatCount="indefinite"><mpath href="#snake-route" xlink:href="#snake-route"/></animateMotion>
    </circle>
  </clipPath>
</defs>

${backdrop()}

<g id="card-content">${content}
</g>

<!-- Distorsi = lensa pembesar yang bergerak bersama ular. Isi kartu tidak
     pernah hilang: hanya bagian yang dilewati ular yang tampak tertekuk. -->
<g clip-path="url(#lensClip)">
  <g transform="rotate(${LENS_ROT}) scale(${LENS_SCALE})" opacity="1">
    <use href="#card-content" xlink:href="#card-content"/>
    <animateMotion dur="${ROUTE_DUR}s" repeatCount="indefinite"><mpath href="#lens-route" xlink:href="#lens-route"/></animateMotion>
  </g>
  <circle r="${LENS_R}" fill="${T.green}" opacity="0.05">
    <animateMotion dur="${ROUTE_DUR}s" repeatCount="indefinite"><mpath href="#snake-route" xlink:href="#snake-route"/></animateMotion>
  </circle>
</g>
<circle r="${LENS_R - 4}" fill="none" stroke="${T.green}" stroke-width="2" opacity="0.7">
  <animateMotion dur="${ROUTE_DUR}s" repeatCount="indefinite"><mpath href="#snake-route" xlink:href="#snake-route"/></animateMotion>
</circle>
<circle r="${LENS_R - 12}" fill="none" stroke="${T.green}" stroke-width="1" opacity="0.25">
  <animateMotion dur="${ROUTE_DUR}s" repeatCount="indefinite"><mpath href="#snake-route" xlink:href="#snake-route"/></animateMotion>
</circle>

${snake(route)}
</svg>
`;

mkdirSync("assets", { recursive: true });
// Buang spasi ekor baris supaya diff/commit tetap bersih.
const output = svg.replace(/[ \t]+$/gm, "");
writeFileSync("assets/profile.svg", output);

const kb = Math.round(Buffer.byteLength(output) / 1024);
console.log("✓ assets/profile.svg", `${W}x${H}`, `· ${kb} KB`);
console.log("  snake :", route.points.length, "waypoints ·", SEGMENTS, "segments ·", `${ROUTE_DUR}s/loop`);
console.log("  distorsi: 1 lensa (tanpa filter) · data:", contrib.total, "kontribusi");
