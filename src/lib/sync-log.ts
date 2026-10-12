/*
  公開版で歌詞と音がずれたとき、時刻の出どころを残す。
  再生の計算はしない。
*/
import { CUES, DURATION, cueHeardAt, formatCueTime } from "../data/score.ts";

const lines: string[] = [];
const listeners = new Set<() => void>();

export function scoreStamp(): string {
  const body = CUES.map((cue) => String(cue.t)).join(",");
  let hash = 5381;
  for (let i = 0; i < body.length; i++) hash = Math.imul(hash, 33) + body.charCodeAt(i);
  const pins = [0, 1, 14]
    .filter((index) => CUES[index])
    .map((index) => `${index}@${CUES[index].t}`)
    .join(" ");
  return `score n=${CUES.length} ${pins} #${(hash >>> 0).toString(16)} DURATION=${DURATION}`;
}

export function offsetTrace(source: string, offsets: number[], remoteRows?: number): string {
  const hit = offsets
    .map((offset, index) => ({ index, offset }))
    .filter((row) => Math.abs(row.offset) >= 0.0005);
  const shown = hit
    .slice(0, 12)
    .map((row) => `${row.index}:${formatCueTime(row.offset)}`)
    .join(" ");
  const rows = remoteRows == null ? "" : ` rows=${remoteRows}`;
  return `offsets ${source} nonzero=${hit.length}${rows}${shown ? ` ${shown}` : ""}`;
}

export function syncFrame(input: {
  time: number;
  duration: number | null;
  rate: number;
  ready: number;
  index: number;
  offsets: number[];
}): string {
  const cue = input.index >= 0 ? CUES[input.index] : null;
  const heard = cue ? cueHeardAt(input.index, input.offsets) : null;
  const into = heard == null ? null : input.time - heard;
  const where = cue
    ? `cue=${input.index} t=${formatCueTime(cue.t)} off=${formatCueTime(input.offsets[input.index] ?? 0)} heard=${formatCueTime(heard ?? 0)} into=${formatCueTime(into ?? 0)} 「${cue.text}」`
    : "cue=-";
  const audio = input.duration == null ? "audio=?" : `audio=${formatCueTime(input.duration)}`;
  const delta = input.duration == null ? "?" : formatCueTime(input.duration - DURATION);
  return `${formatCueTime(input.time)} ${where} ${audio} Δ=${delta} rate=${input.rate} ready=${input.ready}`;
}

export function pushSync(line: string) {
  const stamp = new Date().toISOString().slice(11, 23);
  const text = `${stamp} ${line}`;
  lines.push(text);
  if (lines.length > 80) lines.shift();
  console.info("[shu-sync]", text);
  for (const listen of listeners) listen();
}

export function syncText(): string {
  return lines.join("\n");
}

export function subscribeSync(listen: () => void): () => void {
  listeners.add(listen);
  return () => listeners.delete(listen);
}
