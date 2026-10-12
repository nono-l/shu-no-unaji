/*
  # shu-cues の行を score.ts の t に書く。
  行番号、節、歌詞が一致しないときは書かない。
*/
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CUE = /\{\s*t:\s*([0-9.]+),\s*section:\s*"([^"]*)",\s*text:\s*"([^"]*)"\s*\}/g;

export function parseCueSheet(sheet) {
  const rows = new Map();
  for (const line of sheet.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("\t");
    if (parts.length !== 4) throw new Error(`列が4つではない: ${trimmed}`);
    const index = Number(parts[0]);
    const t = Number(parts[1]);
    if (!Number.isInteger(index) || index < 0 || !Number.isFinite(t)) {
      throw new Error(`時刻が読めない: ${trimmed}`);
    }
    if (rows.has(index)) throw new Error(`行番号が重なっている: ${index}`);
    rows.set(index, { index, t, section: parts[2], text: parts[3] });
  }
  return rows;
}

export function applyCueSheet(source, sheet) {
  const rows = parseCueSheet(sheet);
  let index = 0;
  return source.replace(CUE, (full, _t, section, text) => {
    const row = rows.get(index);
    const at = index;
    index += 1;
    if (!row) return full;
    if (row.section !== section || row.text !== text) {
      throw new Error(`${at} は score.ts が「${section} ${text}」で、書き出しは「${row.section} ${row.text}」`);
    }
    return full.replace(/t:\s*[0-9.]+/, `t: ${row.t}`);
  });
}

function main() {
  const scorePath = new URL("../src/data/score.ts", import.meta.url);
  const sheet = readFileSync(0, "utf8");
  const source = readFileSync(scorePath, "utf8");
  writeFileSync(scorePath, applyCueSheet(source, sheet));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
