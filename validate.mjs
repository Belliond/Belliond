// Validate the live contribution snapshot and the SVG it generated.
import { readFileSync } from "node:fs";

const freshCheck = process.argv.includes("--check-fresh");
const contrib = JSON.parse(readFileSync("contrib.json", "utf8"));
const svg = readFileSync("assets/profile.svg", "utf8");
const readme = readFileSync("README.md", "utf8");
const fail = (message) => { throw new Error(message); };

if (!Array.isArray(contrib.cells) || contrib.cells.length < 365) fail("Contribution calendar is missing days.");
const sorted = [...contrib.cells].sort((a, b) => a.date.localeCompare(b.date));
const occupied = new Set();
let total = 0, active = 0, best = 0, run = 0, current = 0;
const levels = Array.from({ length: contrib.rows }, () => Array(contrib.cols).fill(null));
const counts = Array.from({ length: contrib.rows }, () => Array(contrib.cols).fill(null));
for (let i = 0; i < sorted.length; i++) {
  const c = sorted[i];
  const day = new Date(`${c.date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date) || Number.isNaN(day.valueOf()) || day.toISOString().slice(0, 10) !== c.date) fail(`Invalid date: ${c.date}`);
  if (i && day - new Date(`${sorted[i - 1].date}T00:00:00Z`) !== 86_400_000) fail(`Calendar gap or duplicate at ${c.date}`);
  if (day.getUTCDay() !== c.dow || c.dow < 0 || c.dow >= contrib.rows || c.week < 0 || c.week >= contrib.cols) fail(`Invalid grid location for ${c.date}`);
  const slot = `${c.dow}:${c.week}`;
  if (occupied.has(slot)) fail(`Duplicate grid location for ${c.date}`);
  occupied.add(slot);
  if (!Number.isSafeInteger(c.count) || c.count < 0 || !Number.isInteger(c.level) || c.level < 0 || c.level > 4) fail(`Invalid contribution values for ${c.date}`);
  levels[c.dow][c.week] = c.level;
  counts[c.dow][c.week] = c.count;
  total += c.count;
  active += Number(c.count > 0);
  run = c.count > 0 ? run + 1 : 0;
  best = Math.max(best, run);
}
for (let r = 0; r < contrib.rows; r++) for (let c = 0; c < contrib.cols; c++) {
  if (levels[r][c] === null) {
    if (contrib.matrix[r][c] !== 0 || contrib.counts[r][c] !== 0) fail(`Unexpected data in empty matrix slot at row ${r}, week ${c}`);
  } else if (contrib.matrix[r][c] !== levels[r][c] || contrib.counts[r][c] !== counts[r][c]) {
    fail(`Matrix mismatch at row ${r}, week ${c}`);
  }
}
for (let i = sorted.length - 1; i >= 0 && sorted[i].count > 0; i--) current++;
if (total !== contrib.total || active !== contrib.active || best !== contrib.best || current !== contrib.cur) fail("Contribution summary does not match daily values.");
if (freshCheck) {
  const age = Math.floor((Date.now() - Date.parse(`${sorted.at(-1).date}T00:00:00Z`)) / 86_400_000);
  if (age < -1 || age > 3) fail(`Contribution data is stale (${sorted.at(-1).date}).`);
}

const size = svg.match(/<svg\b[^>]*width="(\d+)"[^>]*height="(\d+)"[^>]*viewBox="([^"]+)"/);
if (!size || size[3] !== `0 0 ${size[1]} ${size[2]}`) fail("SVG dimensions/viewBox are invalid.");
const height = Number(size[2]);
const segments = [...svg.matchAll(/data-role="snake-segment"/g)];
if (segments.length !== 12) fail(`Expected 12 animated snake segments; found ${segments.length}.`);
if (!svg.includes('<path id="snake-route"') || !/<animateMotion\b[^>]*dur="112s"/.test(svg)) fail("Snake route or variable-motion animation is missing.");
const head = svg.match(/data-segment-index="0"[^>]*>[\s\S]*?<animateMotion\b[^>]*begin="([^"]+)"/);
const tail = svg.match(/data-segment-index="11"[^>]*>[\s\S]*?<animateMotion\b[^>]*begin="([^"]+)"/);
if (!head || !tail || Number(head[1].replace("s", "")) !== -112 || Number(tail[1].replace("s", "")) <= -112) fail("Snake tail must trail behind the head along the route.");
const route = svg.match(/<path id="snake-route" d="([^"]+)"/);
const routePoints = [...(route?.[1] || "").matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [+m[1], +m[2]]);
if (routePoints.length < 150) fail("Snake route is missing its varied interior path.");
const bounds = routePoints.reduce((b, [x, y]) => ({ minX: Math.min(b.minX, x), maxX: Math.max(b.maxX, x), minY: Math.min(b.minY, y), maxY: Math.max(b.maxY, y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
if (bounds.minX > 40 || bounds.maxX < 860 || bounds.minY > 64 || bounds.maxY < height - 64) fail("Snake route does not sweep across the card and interior.");

// Distorsi: lensa (clip-path) di atas salinan konten, bukan elemen yang dihapus.
if (!svg.includes('<clipPath id="lensClip"') || !/<use\b[^>]*href="#card-content"/.test(svg) || !svg.includes('id="card-content"')) fail("Distortion lens over a copy of the card content is missing.");
if (!/<animateMotion\b[^>]*dur="112s"[^>]*><mpath href="#lens-route"/.test(svg)) fail("Distortion lens is not following the snake.");
if (!svg.includes('clip-path="url(#lensClip)"')) fail("Distortion lens is not clipped.");

// Anggaran performa: tanpa filter dan animasi seminimal mungkin (penyebab lag di HP).
if (/<filter\b|feTurbulence|feDisplacementMap/.test(svg)) fail("SVG filters are banned: they make the card lag on mobile.");
const animations = [...svg.matchAll(/<animate(?:Transform|Motion)?\b/g)];
if (animations.length > 30) fail(`Too many animations (${animations.length}); keep the card light for mobile.`);
const bytes = Buffer.byteLength(svg);
if (bytes > 200 * 1024) fail(`SVG is ${Math.round(bytes / 1024)} KB; keep it under 200 KB for mobile.`);

const textContent = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]*>/g, " ").replace(/&(?:amp|lt|gt|quot|apos);/g, " ").trim()).join(" ");
if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]|\b(?:kontribusi|hari|streak terbaik|peta|sinyal|sedikit|banyak|yang kupakai|dibangun|diperbaiki|dipakai|teknik informatika|sumatera|dan|dengan)\b/i.test(textContent)) fail("Visible profile copy must be English-only.");
for (const required of ["ROOT ACCESS GRANTED", "DEVELOPER PROFILE", "PROFILE.EXE", "SYSTEM ONLINE", "VERIFIED", "FOLLOW", "CONTRIBUTION STREAM", "THREAT LEVEL"]) {
  if (!textContent.includes(required)) fail(`Missing profile element: ${required}`);
}
if ((svg.match(/data:font\/woff2;base64,/g) || []).length !== 3) fail("Expected all three embedded fonts.");
for (const [, file] of readme.matchAll(/assets\/([a-z-]+\.svg)/g)) if (!svg || !readFileSync(`assets/${file}`, "utf8")) fail(`README SVG is missing: ${file}`);
const { createHash } = await import("node:crypto");
const svgHash = createHash("sha256").update(svg).digest("hex").slice(0, 12);
if (!readme.includes(`assets/profile.svg?v=${svgHash}`)) fail("README cache-buster does not match the generated SVG.");
const tags = [...svg.matchAll(/<\/?[A-Za-z][^>]*>/g)].map((m) => m[0]);
const stack = [];
for (const tag of tags) {
  const close = tag.match(/^<\/([\w:-]+)/);
  if (close) { if (stack.pop() !== close[1]) fail(`Malformed SVG closing tag ${tag}`); }
  else if (!/^<[^>]+\/>$/.test(tag)) stack.push(tag.match(/^<([\w:-]+)/)[1]);
}
if (stack.length) fail(`Unclosed SVG tag: ${stack.at(-1)}`);

console.log(`✓ data ${contrib.total} contributions · ${contrib.active} active days · best streak ${contrib.best} · current ${contrib.cur}`);
console.log(`✓ SVG 900x${height} · ${segments.length} snake segments, ${animations.length} animations, ${Math.round(bytes / 1024)} KB, no filters · English-only text`);
