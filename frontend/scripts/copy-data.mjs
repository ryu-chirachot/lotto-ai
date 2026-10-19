// Copies the canonical datasets from backend/data into public/data so the
// static build (GitHub Pages) can fetch them. Runs before dev and build.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(root, "frontend", "public", "data");
mkdirSync(outDir, { recursive: true });

for (const lottery of ["thai", "lao"]) {
  const src = join(root, "backend", "data", `${lottery}_draws.json`);
  const data = JSON.parse(readFileSync(src, "utf8"));
  writeFileSync(join(outDir, `${lottery}.json`), JSON.stringify(data));
  console.log(`data: ${lottery} (${data.draws.length} draws)`);
}
