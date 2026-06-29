#!/usr/bin/env node
// Assembles loadable extension bundles for each browser by copying the shared
// `src/` + `icons/` trees and the browser-specific manifest into `dist/<browser>/`.
// No transpilation needed — the extension is plain JS.
//
// Usage:
//   node build.mjs         build unpacked dist/<browser>/ folders (for dev)
//   node build.mjs --pack  also zip each into dist/<browser>.zip (for stores)
import { cp, mkdir, rm, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = dirname(fileURLToPath(import.meta.url));
const pack = process.argv.includes("--pack");
const targets = [
  { name: "chrome", manifest: "manifest.chrome.json" },
  { name: "firefox", manifest: "manifest.firefox.json" },
];

for (const t of targets) {
  const out = join(root, "dist", t.name);
  await rm(out, { recursive: true, force: true });
  await rm(join(root, "dist", `${t.name}.zip`), { force: true });
  await mkdir(out, { recursive: true });
  await cp(join(root, "src"), join(out, "src"), { recursive: true });
  await cp(join(root, "icons"), join(out, "icons"), { recursive: true });
  await copyFile(join(root, t.manifest), join(out, "manifest.json"));
  console.log(`built dist/${t.name}`);

  if (pack) {
    // Zip the *contents* of the folder so manifest.json sits at the archive root,
    // which is what both stores require.
    await run("zip", ["-r", "-q", join("..", `${t.name}.zip`), "."], { cwd: out });
    console.log(`packed dist/${t.name}.zip`);
  }
}
