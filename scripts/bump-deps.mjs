#!/usr/bin/env node
/**
 * ビルドの直前に依存を上げる。
 * latest が別の直接依存の peer の外なら、その peer を満たす最新にする。
 * peer を無視しては入れない。満たす版が無いときはビルドを止めて理由を出す。
 * @tanstack/react-start が 1.168.60 未満のときも止める（CVE-2026-102989）。
 * typescript-eslint は tools/lint の TypeScript 6.0.3 に置く。ルートの typescript は 7 のまま戻さない。
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const semver = createRequire(import.meta.url)("semver");
const MIN_START = [1, 168, 60];
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const names = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
];

function versionOf(name) {
  const path = new URL(`../node_modules/${name}/package.json`, import.meta.url);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")).version;
}

function olderThan(version, min) {
  const parts = String(version)
    .split(".")
    .map((part) => parseInt(part, 10) || 0);
  for (let i = 0; i < min.length; i++) {
    if (parts[i] !== min[i]) return parts[i] < min[i];
  }
  return false;
}

function npmView(spec, field) {
  return new Promise((resolve, reject) => {
    const args = ["view", spec, "--json"];
    if (field) args.splice(2, 0, field);
    const child = spawn("npm", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("close", (code) => {
      const text = out.trim();
      if (!text) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        reject(code === 0 ? error : new Error(err || text));
      }
    });
  });
}

async function mapPool(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  });
  await Promise.all(workers);
}

const latest = new Map();
await mapPool(names, 8, async (name) => {
  const version = await npmView(`${name}@latest`, "version");
  if (typeof version !== "string") throw new Error(`${name} の latest が取れない`);
  latest.set(name, version);
});

const peersOf = new Map();
await mapPool(names, 8, async (name) => {
  const peers = await npmView(`${name}@${latest.get(name)}`, "peerDependencies");
  peersOf.set(name, peers && typeof peers === "object" && !Array.isArray(peers) ? peers : {});
});

const constraints = new Map();
for (const [from, peers] of peersOf) {
  for (const [dep, range] of Object.entries(peers)) {
    if (!latest.has(dep) || typeof range !== "string") continue;
    const list = constraints.get(dep) ?? [];
    list.push({ from, range });
    constraints.set(dep, list);
  }
}

const chosen = new Map(latest);
const notes = [];
for (const [name, ranges] of constraints) {
  const version = latest.get(name);
  const missed = ranges.filter((item) => !semver.satisfies(version, item.range, { includePrerelease: true }));
  if (missed.length === 0) continue;
  const published = await npmView(name, "versions");
  const list = (Array.isArray(published) ? published : [])
    .filter((item) => ranges.every((range) => semver.satisfies(item, range.range, { includePrerelease: true })))
    .sort(semver.rcompare);
  if (list.length === 0) {
    console.error(`${name}@${version} は次の peer を満たす版が無いのでビルドしない`);
    for (const item of missed) console.error(`  ${item.from} は ${item.range}`);
    process.exit(1);
  }
  chosen.set(name, list[0]);
  notes.push(
    `${name} ${version} は ${missed.map((item) => `${item.from} (${item.range})`).join(", ")} の外なので ${list[0]}`,
  );
}
if (notes.length) console.log(`[bump] peer\n${notes.join("\n")}`);

const before = new Map(names.map((name) => [name, versionOf(name)]));
const installed = spawnSync(
  "npm",
  [
    "install",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
    ...names.map((name) => `${name}@${chosen.get(name)}`),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, npm_config_omit: "", NPM_CONFIG_OMIT: "" },
  },
);
if (installed.status !== 0) process.exit(installed.status ?? 1);

const startVersion = versionOf("@tanstack/react-start");
if (!startVersion || olderThan(startVersion, MIN_START)) {
  console.error(`@tanstack/react-start ${startVersion ?? "不明"} は 1.168.60 未満なのでビルドしない`);
  process.exit(1);
}

const moved = names.flatMap((name) => {
  const next = versionOf(name);
  const prev = before.get(name);
  if (prev === next) return [];
  return [`${name} ${prev ?? "なし"} → ${next}`];
});
console.log(moved.length ? `[bump]\n${moved.join("\n")}` : "[bump] already latest");
