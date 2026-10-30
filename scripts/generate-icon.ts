// Writes src/app/icon.svg (the browser tab icon) from the same knot as the logo and the home animation,
// with bolder strands so it reads at 16px. Usage: npx tsx scripts/generate-icon.ts
import { writeFileSync } from "fs";
import path from "path";
import { knotStrands } from "../src/lib/knot";

const strands = knotStrands({ cx: 16, cy: 16, entryRadius: 15, maxRadius: 11, turns: 0.9, approachSteps: 5, knotSteps: 26 });

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke-linecap="round" stroke-linejoin="round">',
  '  <rect width="32" height="32" rx="7" fill="#fbfbfd" />',
  ...strands.map((s) => `  <path d="${s.d}" stroke="${s.color}" stroke-width="1.7" />`),
  "</svg>",
  "",
].join("\n");

writeFileSync(path.join(process.cwd(), "src", "app", "icon.svg"), svg);
console.log("Wrote src/app/icon.svg");
