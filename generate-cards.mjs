// generate-cards.mjs — kartu profil SVG, gaya terminal
// Palet & struktur mengikuti gaya card-based (900px, full-width, dark/light).
// Data diambil dari profil GitHub: Belliond (Krisna D. Cristian)

import { writeFileSync, mkdirSync } from "node:fs";

const themes = {
  dark: {
    bg: "#0a0c10",
    panel: "#12151b",
    panel2: "#0d1015",
    border: "#30363d",
    line: "#21262d",
    text: "#e6edf3",
    muted: "#8b949e",
    dim: "#6e7681",
    accent: "#39d353",
    accentBg: "#0f2a18",
    accentBg2: "#0d2114",
    purple: "#d2a8ff",
    purpleBg: "#1a1530",
    glow: true,
  },
  light: {
    bg: "#ffffff",
    panel: "#f6f8fa",
    panel2: "#f6f8fa",
    border: "#d0d7de",
    line: "#e1e4e8",
    text: "#1f2328",
    muted: "#57606a",
    dim: "#8c959f",
    accent: "#1a7f37",
    accentBg: "#dafbe1",
    accentBg2: "#dafbe1",
    purple: "#8250df",
    purpleBg: "#fbefff",
    glow: false,
  },
};

const MONO = "'Courier New',Consolas,monospace";
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ───────────────────────────── DATA ───────────────────────────── */

const DATA = {
  handle: "belliond",
  name: "Krisna D. Cristian",
  subtitle:
    "Institut Teknologi Sumatera | Informatics Engineering | Web Systems & Automation",
  badge: "BUILDING",
  typing: [
    ">_Building Projects: Web Development | Automation | Coursework",
    ">_System Focus: TypeScript, Supabase, Laravel",
    ">_Location: Indonesia | Lampung | UTC+7",
  ],

  aboutBold: [
    "I build small systems that solve my own problems -",
    "dashboards, bots, and tools nobody asked for.",
  ],
  aboutBlocks: [
    [
      "Informatics Engineering student at ITERA.",
      "Most of what I know came from breaking things",
      "at 3 AM and reading the error message twice.",
    ],
    [
      "My focus leans toward web systems and automation -",
      "interfaces that stay simple, backends that stay",
      "predictable, and scripts that remove the boring part",
      "of doing the same thing forty times.",
    ],
    [
      "I care less about looking impressive and more",
      "about whether the thing still runs tomorrow.",
    ],
  ],
  bullets: [
    "Web Systems | Automation | Backend",
    "JavaScript | TypeScript | Supabase | Laravel",
  ],

  stats: [
    { icon: "\u25C6", label: "Total Stars", value: "0" },
    { icon: "\u25C6", label: "Commits (2026)", value: "118" },
    { icon: "\u25C6", label: "Pull Requests", value: "10" },
    { icon: "!", label: "Issues", value: "0" },
  ],
  tags: ["ITERA Student", "UTC+7 | ID"],

  // Agregat byte dari 5 repo (3 milik sendiri + 2 kontribusi tim)
  languages: [
    { name: "JavaScript", pct: 34.0, bytes: "477KB", color: "#f1e05a" },
    { name: "TypeScript", pct: 32.0, bytes: "450KB", color: "#3178c6" },
    { name: "CSS", pct: 11.0, bytes: "156KB", color: "#8b5cf6" },
    { name: "TeX", pct: 8.6, bytes: "121KB", color: "#008080" },
    { name: "PLpgSQL", pct: 6.8, bytes: "95KB", color: "#336790" },
  ],

  tech: [
    "HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js",
    "Tailwind", "PHP", "Laravel", "C#", ".NET", "Node.js",
    "Supabase", "PostgreSQL", "Prisma", "Three.js", "LaTeX", "Playwright",
    "Git", "GitHub Actions", "Bash", "Python", "n8n", "Telegram Bot",
  ],

  links: [
    { label: "GitHub", href: "https://github.com/Belliond" },
    { label: "Email", href: "mailto:virst132109@gmail.com" },
    { label: "Repos", href: "https://github.com/Belliond?tab=repositories" },
  ],
  footerStatus: "BUILDING",
  footerTitle: "connect  \u00B7  collaborate  \u00B7  build",
};

/* ───────────────────────────── HEADER ───────────────────────────── */

function header(t) {
  const clips = DATA.typing
    .map((_, i) => {
      const n = DATA.typing.length;
      const slot = 1 / n;
      const s = i * slot;
      // Konstanta 0.125 / 0.325 mengikuti pola referensi: 0.125 = durasi mengetik,
      // 0.325 = akhir jendela tampil, slot = saat baris dibersihkan.
      const t1 = (s + 0.125).toFixed(6);
      const t2 = (s + 0.325).toFixed(6);
      const t3 = i === n - 1 ? "1" : ((i + 1) * slot).toFixed(6);
      return `      <clipPath id="type-clip-${i}">
        <rect x="28" y="144" height="30" width="0">
          <animate attributeName="width" values="0; 0; 800; 800; 0; 0" keyTimes="0; ${s.toFixed(6)}; ${t1}; ${t2}; ${t3}; 1" dur="12s" repeatCount="indefinite" />
        </rect>
      </clipPath>`;
    })
    .join("\n");

  const texts = DATA.typing
    .map((line, i) => {
      const n = DATA.typing.length;
      const slot = 1 / n;
      const s = i * slot;
      const t1 = (s + 0.125).toFixed(6);
      const t2 = (s + 0.325).toFixed(6);
      const t3 = i === n - 1 ? "1" : ((i + 1) * slot).toFixed(6);
      return `      <text x="28" y="164"
            font-family="${MONO}" font-size="14" font-weight="700"
            fill="${t.accent}"
            clip-path="url(#type-clip-${i})"
            opacity="0">
        ${esc(line)}
        <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" keyTimes="0; ${s.toFixed(6)}; ${t1}; ${t2}; ${t3}; 1" dur="12s" repeatCount="indefinite" />
      </text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="196" viewBox="0 0 900 196" role="img" aria-label="${esc(DATA.name)}">
<defs>
  <clipPath id="bc"><rect width="900" height="196" rx="8"/></clipPath>
  <linearGradient id="typeBarGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${t.bg}"/>
    <stop offset="5%" stop-color="${t.panel}"/>
    <stop offset="100%" stop-color="${t.bg}"/>
  </linearGradient>
${clips}
</defs>
<g clip-path="url(#bc)">
  <rect width="900" height="196" fill="${t.bg}"/>
  <rect width="900" height="32" fill="${t.panel}"/>
  <rect y="32" width="900" height="1" fill="${t.border}" opacity="0.5"/>

  <circle cx="20" cy="16" r="5" fill="#ff5f56"/>
  <circle cx="36" cy="16" r="5" fill="#ffbd2e"/>
  <circle cx="52" cy="16" r="5" fill="#27c93f"/>
  <text x="72" y="20" font-family="${MONO}" font-size="11" fill="${t.dim}">~/${DATA.handle} - zsh</text>

  <text x="28" y="80" font-family="monospace" font-size="28" font-weight="bold" fill="${t.text}">${esc(DATA.name)}</text>
  <text x="28" y="104" font-family="${MONO}" font-size="11" font-weight="700" fill="${t.muted}">${esc(DATA.subtitle)}</text>

  <rect x="28" y="116" width="${26 + DATA.badge.length * 7.2}" height="18" rx="9" fill="${t.accentBg}"/>
  <circle cx="41" cy="125" r="3.5" fill="${t.accent}"/>
  <text x="53" y="128.5"
        font-family="${MONO}"
        font-size="9.5" font-weight="700"
        fill="${t.accent}" letter-spacing="0.5">${esc(DATA.badge)}</text>

  <rect x="0" y="140" width="900" height="40" fill="url(#typeBarGrad)"/>
  <line x1="0" y1="140" x2="900" y2="140" stroke="${t.border}" stroke-width="0.5" opacity="0.8"/>

${texts}

  <rect x="0" y="0" width="3" height="196" fill="${t.accent}" opacity="0.7"/>
</g>
</svg>
`;
}

/* ───────────────────────────── PROFILE ───────────────────────────── */

function profile(t) {
  const glow = t.glow
    ? `  <filter id="numGlow" x="-40%" y="-60%" width="180%" height="220%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>`
    : "";

  const boldLines = DATA.aboutBold
    .map(
      (l, i) => `<text x="24" y="${44 + i * 15}"
      font-family="${MONO}"
      font-size="12.5" font-weight="700"
      fill="${t.text}">${esc(l)}</text>`
    )
    .join("\n");

  // Blok paragraf: y mulai 89, jarak antar-blok 60 (mengikuti referensi)
  const blockYs = [89, 149, 224];
  const blocks = DATA.aboutBlocks
    .map((lines, bi) =>
      lines
        .map(
          (l, li) => `<text x="24" y="${blockYs[bi] + li * 15}"
      font-family="${MONO}"
      font-size="11" font-weight="400"
      fill="${t.muted}">${esc(l)}</text>`
        )
        .join("\n")
    )
    .join("\n");

  const bullets = DATA.bullets
    .map(
      (b, i) => `<circle cx="29" cy="${269 + i * 16}" r="2.5" fill="${t.accent}" opacity="0.75"/>
  <text x="40" y="${274 + i * 16}"
        font-family="${MONO}" font-size="11" fill="${t.dim}">${esc(b)}</text>`
    )
    .join("\n  ");

  const rows = DATA.stats
    .map((s, i) => {
      const y = 52 + i * 46;
      const glowAttr = t.glow ? `\n        filter="url(#numGlow)"` : "";
      return `  <text x="480" y="${y}"
        font-family="${MONO}"
        font-size="10" fill="${t.accent}">${esc(s.icon)}</text>
  <text x="496" y="${y}"
        font-family="${MONO}"
        font-size="10" fill="${t.muted}">${esc(s.label)}</text>
  <text x="876" y="${y}" text-anchor="end"
        font-family="${MONO}"
        font-size="20" font-weight="700" fill="${t.accent}"${glowAttr}>${esc(s.value)}</text>
  <text x="876" y="${y}" text-anchor="end"
        font-family="${MONO}"
        font-size="20" font-weight="700" fill="${t.accent}">${esc(s.value)}</text>`;
    })
    .join("\n");

  const tagColors = [
    { bg: t.accentBg2, fg: t.accent },
    { bg: t.purpleBg, fg: t.purple },
  ];
  const tags = DATA.tags
    .map((tag, i) => {
      const x = 690 + i * 98;
      return `  <rect x="${x}" y="232" width="88" height="20" rx="10"
        fill="${tagColors[i].bg}" stroke="${t.border}" stroke-width="0.5"/>
  <text x="${x + 44}" y="245" text-anchor="middle"
        font-family="${MONO}"
        font-size="9.5" font-weight="700" fill="${tagColors[i].fg}">${esc(tag)}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="306" viewBox="0 0 900 306" role="img" aria-label="About and GitHub stats">
<defs>
  <clipPath id="pc"><rect width="900" height="306"/></clipPath>
${glow}
  <linearGradient id="divGrad" x1="0" x2="0"
                  gradientUnits="userSpaceOnUse"
                  y1="24" y2="294">
    <stop offset="0%"   stop-color="${t.accent}" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
  </linearGradient>
</defs>
<g clip-path="url(#pc)">

  <rect width="900" height="306" fill="${t.bg}"/>
  <rect width="900" height="0.5" fill="${t.border}"/>

  <text x="24" y="16"
        font-family="${MONO}"
        font-size="9" font-weight="700" letter-spacing="2" fill="${t.dim}">// ABOUT</text>
  <line x1="24" y1="24" x2="436" y2="24"
        stroke="${t.border}" stroke-width="0.5"/>

${boldLines}

${blocks}

  <line x1="24" y1="262" x2="436" y2="262"
        stroke="${t.line}" stroke-width="0.5"/>

  ${bullets}

  <rect x="456" y="24" width="1" height="270"
        fill="url(#divGrad)"/>

  <rect x="456" y="0" width="444" height="306"
        fill="${t.panel2}" opacity="0.6"/>

  <text x="480" y="16"
        font-family="${MONO}"
        font-size="9" font-weight="700" letter-spacing="2" fill="${t.dim}">// GITHUB STATS</text>
  <line x1="480" y1="24" x2="876" y2="24"
        stroke="${t.border}" stroke-width="0.5"/>

${rows}

${tags}

  <rect x="0" y="0" width="3" height="306" fill="${t.accent}" opacity="0.7"/>

  <rect y="305" width="900" height="1" fill="${t.border}"/>
</g>
</svg>
`;
}

/* ───────────────────────────── SKILLS ───────────────────────────── */

function skills(t) {
  const BAR_X = 174;
  const BAR_W = 616;

  const rows = DATA.languages
    .map((l, i) => {
      const y = 60 + i * 30;
      const w = (BAR_W * l.pct) / 100;
      const pctLabel = (Math.round(l.pct * 10) / 10).toString() + "%";
      return `  <circle cx="34" cy="${y + 4}" r="3.5" fill="${l.color}"/>
  <text x="158" y="${y + 8}" text-anchor="end"
        font-family="${MONO}"
        font-size="11.5" font-weight="700" fill="${t.text}">${esc(l.name)}</text>
  <rect x="${BAR_X}" y="${y}" width="${BAR_W}" height="8" rx="4" fill="${t.line}"/>
  <rect x="${BAR_X}" y="${y}" width="${w.toFixed(1)}" height="8" rx="4" fill="${l.color}"/>
  <rect x="${BAR_X}" y="${y}" width="${w.toFixed(1)}" height="3.5" rx="1.5" fill="white" opacity="0.12"/>
  <text x="806" y="${y + 8}"
        font-family="${MONO}"
        font-size="11" font-weight="700" fill="${l.color}">${esc(pctLabel)}</text>
  <text x="850" y="${y + 8}"
        font-family="${MONO}"
        font-size="10" fill="${t.dim}">${esc(l.bytes)}</text>`;
    })
    .join("\n");

  // Bar bertumpuk: lebar proporsional terhadap 844px
  let acc = 0;
  const segs = DATA.languages
    .map((l) => {
      const w = (844 * l.pct) / 100;
      const x = 28 + acc;
      acc += w;
      return `<rect x="${x.toFixed(1)}" y="228" width="${w.toFixed(1)}" height="10" rx="0" fill="${l.color}" opacity="0.9"/>`;
    })
    .join("");

  const CHIP_W = 134;
  const CHIP_GAP = 8;
  const chips = DATA.tech
    .map((name, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = 28 + col * (CHIP_W + CHIP_GAP);
      const y = 306 + row * 34;
      const cx = x + CHIP_W / 2;
      return `  <rect x="${x}" y="${y}" width="${CHIP_W}" height="26" rx="4"
        fill="${t.panel}" stroke="${t.border}" stroke-width="0.5"/>
  <circle cx="${x + 12}" cy="${y + 13}" r="2" fill="${t.accent}" opacity="0.7"/>
  <text x="${cx}" y="${y + 16.5}" text-anchor="middle"
        font-family="${MONO}"
        font-size="10.5" font-weight="700" fill="${t.muted}">${esc(name)}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="450" viewBox="0 0 900 450" role="img" aria-label="Languages and technologies">
<defs>
  <clipPath id="canvasClip"><rect width="900" height="450"/></clipPath>
</defs>
<g clip-path="url(#canvasClip)">
  <rect width="900" height="450" fill="${t.bg}"/>
  <rect width="900" height="0.5" fill="${t.border}"/>

  <text x="28" y="22"
        font-family="${MONO}"
        font-size="9" font-weight="700" letter-spacing="2" fill="${t.dim}">// AUTOMATED LANGUAGE METRICS</text>
  <text x="872" y="22" text-anchor="end"
        font-family="${MONO}"
        font-size="8" font-weight="700" fill="${t.accent}" opacity="0.8">5 repos &#183; owned + contributed</text>
  <line x1="28" y1="30" x2="872" y2="30" stroke="${t.border}" stroke-width="0.5"/>

  <text x="158" y="44" text-anchor="end"
        font-family="${MONO}"
        font-size="8.5" letter-spacing="1" fill="${t.dim}">LANGUAGE</text>
  <text x="174" y="44"
        font-family="${MONO}"
        font-size="8.5" letter-spacing="1" fill="${t.dim}">ACCUMULATED VOLUME BYTES</text>

${rows}

  <rect x="28" y="228" width="844" height="10" rx="5" fill="${t.line}"/>
  ${segs}
  <rect x="28" y="228" width="844" height="4" rx="5" fill="white" opacity="0.12"/>

  <line x1="28" y1="270" x2="872" y2="270" stroke="${t.border}" stroke-width="0.5"/>
  <text x="28" y="290"
        font-family="${MONO}"
        font-size="9" font-weight="700" letter-spacing="2" fill="${t.dim}">// TECHNOLOGIES &amp; FRAMEWORKS</text>

${chips}

  <rect x="0" y="0" width="3" height="450" fill="${t.accent}" opacity="0.7"/>
  <rect y="449" width="900" height="1" fill="${t.border}"/>
</g>
</svg>
`;
}

/* ───────────────────────────── FOOTER ───────────────────────────── */

function footer(t) {
  let x = 35;
  const pills = DATA.links
    .map((l) => {
      const w = 30 + l.label.length * 7.2;
      const cx = x + w / 2;
      const out = `    <a href="${l.href}" target="_blank">
      <rect x="${x.toFixed(1)}" y="52" width="${w.toFixed(1)}" height="26" rx="13"
            fill="${t.panel}" stroke="${t.border}" stroke-width="0.5"/>
      <circle cx="${(x + 11).toFixed(1)}" cy="65" r="2.5" fill="${t.accent}" opacity="0.65"/>
      <text x="${cx.toFixed(1)}" y="69" text-anchor="middle"
            font-family="${MONO}"
            font-size="10" font-weight="700"
            fill="${t.muted}" letter-spacing="0.5">${esc(l.label)}</text>
    </a>`;
      x += w + 10;
      return out;
    })
    .join("\n");

  const statusX = x + 8;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="92" viewBox="0 0 900 92" role="img" aria-label="Links">
<defs>
  <clipPath id="fc"><rect width="900" height="92" rx="8"/></clipPath>
  <linearGradient id="fBarGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="${t.panel}"/>
    <stop offset="100%" stop-color="${t.bg}"/>
  </linearGradient>
  <style>
    .status-dot { animation: pulse 2s ease-in-out infinite; transform-origin: center; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
  </style>
</defs>
<g clip-path="url(#fc)">

  <rect width="900" height="92" fill="${t.bg}"/>

  <rect width="900" height="34" fill="url(#fBarGrad)"/>
  <rect y="34" width="900" height="0.5" fill="${t.border}" opacity="0.6"/>

  <circle cx="22" cy="17" r="4.5" fill="#ff5f57"/>
  <circle cx="38" cy="17" r="4.5" fill="#febc2e"/>
  <circle cx="54" cy="17" r="4.5" fill="#28c840"/>
  <text x="74" y="21"
        font-family="${MONO}"
        font-size="11" font-weight="600"
        fill="${t.dim}" letter-spacing="1">${esc(DATA.footerTitle)}</text>

${pills}

  <circle cx="${statusX.toFixed(1)}" cy="65" r="4" fill="${t.accent}" class="status-dot"/>
  <text x="${(statusX + 13).toFixed(1)}" y="69"
        font-family="${MONO}"
        font-size="10.5" font-weight="700"
        fill="${t.accent}" letter-spacing="1">${esc(DATA.footerStatus)}</text>

  <text x="871" y="69" text-anchor="end"
        font-family="${MONO}"
        font-size="12" font-weight="800"
        fill="${t.text}" letter-spacing="0.5">${esc(DATA.name)}</text>

  <rect x="0" y="0" width="3" height="92" fill="${t.accent}" opacity="0.7"/>

  <rect x="899" y="0" width="1" height="92" fill="${t.border}"/>
  <rect y="0" width="900" height="1" fill="${t.border}"/>
  <rect y="91" width="900" height="1" fill="${t.border}"/>

</g>
</svg>
`;
}

/* ───────────────────────────── WRITE ───────────────────────────── */

mkdirSync("assets", { recursive: true });

for (const [name, t] of Object.entries(themes)) {
  writeFileSync(`assets/header-${name}.svg`, header(t));
  writeFileSync(`assets/profile-${name}.svg`, profile(t));
  writeFileSync(`assets/skills-${name}.svg`, skills(t));
  writeFileSync(`assets/footer-${name}.svg`, footer(t));
  console.log(`✓ ${name}: header, profile, skills, footer`);
}
