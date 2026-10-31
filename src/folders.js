import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Newest draft folder (YYYY-MM-DD) inside the output directory, or the one asked for.
export async function resolveDraftDate(outDir, wanted) {
  if (wanted) return wanted;
  const entries = await readdir(path.join(root, outDir), { withFileTypes: true }).catch(() => []);
  const dates = entries.filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name)).map((e) => e.name).sort();
  if (!dates.length) throw new Error(`No drafts found in ${outDir}/. Run: npm run draft`);
  return dates[dates.length - 1];
}

export function argValue(args, name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
