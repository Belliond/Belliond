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
const segments = [...svg.matchAll(/<g data-role="snake-segment"[\s\S]*?<animateTransform\b[^>]*values="([^"]+)"/g)];
if (segments.length !== 26) fail(`Expected 26 animated snake segments; found ${segments.length}.`);
const points = segments.flatMap(([, values]) => [...values.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [+m[1], +m[2]]));
const bounds = points.reduce((b, [x, y]) => ({ minX: Math.min(b.minX, x), maxX: Math.max(b.maxX, x), minY: Math.min(b.minY, y), maxY: Math.max(b.maxY, y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
if (bounds.minX !== 24 || bounds.maxX !== 876 || bounds.minY !== 24 || bounds.maxY !== height - 24) fail("Snake path does not go around the full profile card.");
if ((svg.match(/data:font\/woff2;base64,/g) || []).length !== 3) fail("Expected all three embedded fonts.");
for (const [, file] of readme.matchAll(/assets\/([a-z-]+\.svg)/g)) if (!svg || !readFileSync(`assets/${file}`, "utf8")) fail(`README SVG is missing: ${file}`);
const tags = [...svg.matchAll(/<\/?[A-Za-z][^>]*>/g)].map((m) => m[0]);
const stack = [];
for (const tag of tags) {
  const close = tag.match(/^<\/([\w:-]+)/);
  if (close) { if (stack.pop() !== close[1]) fail(`Malformed SVG closing tag ${tag}`); }
  else if (!/^<[^>]+\/>$/.test(tag)) stack.push(tag.match(/^<([\w:-]+)/)[1]);
}
if (stack.length) fail(`Unclosed SVG tag: ${stack.at(-1)}`);

console.log(`✓ data ${contrib.total} contributions · ${contrib.active} active days · best streak ${contrib.best} · current ${contrib.cur}`);
console.log(`✓ SVG 900x${height} · ${segments.length} snake segments around full profile · embedded fonts and balanced tags`);
