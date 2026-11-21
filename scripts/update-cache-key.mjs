import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const hash = createHash("sha256")
  .update(readFileSync("assets/profile.svg"))
  .digest("hex")
  .slice(0, 12);

const path = "README.md";
let readme = readFileSync(path, "utf8");
readme = readme
  .replace(
    /alt="[^"]*"/,
    'alt="Krisna D. Cristian — developer profile card with a moving snake"',
  )
  .replace(/assets\/profile\.svg\?v=[\da-f]{12}/, `assets/profile.svg?v=${hash}`);

writeFileSync(path, readme);
console.log(hash);
