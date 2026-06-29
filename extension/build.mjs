#!/usr/bin/env node
// Assembles loadable extension bundles for each browser by copying the shared
// `src/` tree and the browser-specific manifest into `dist/<browser>/`.
// No transpilation needed — the extension is plain JS.
import { cp, mkdir, rm, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const targets = [
  { name: "chrome", manifest: "manifest.chrome.json" },
  { name: "firefox", manifest: "manifest.firefox.json" },
];

for (const t of targets) {
  const out = join(root, "dist", t.name);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(join(root, "src"), join(out, "src"), { recursive: true });
  await copyFile(join(root, t.manifest), join(out, "manifest.json"));
  console.log(`built dist/${t.name}`);
}
