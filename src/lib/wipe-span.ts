/*
  行の中の白い塗り。文字を選んでから、速さと始まりを付ける。
  行の頭のずれとは別。何も付けていなければ、行全体が速度 1。
*/

export type WipeSpan = { from: number; to: number; speed: number; offset: number };

export type WipeEdit = "faster" | "slower" | "earlier" | "later" | "earlierJump" | "laterJump" | "clear";

export type WipeStored = { from: number; to: number; speed: number; offsetMs: number };

const SPEED_MIN = 0.25;
const SPEED_MAX = 4;
const OFFSET_MIN = -12;
const OFFSET_MAX = 12;
const SPEED_STEP = 1.25;
const OFFSET_STEP = 0.05;
const OFFSET_JUMP = 1;

function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) return 1;
  const stepped = Math.round(speed * 1000) / 1000;
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, stepped));
}

function clampWipeOffset(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  const stepped = Math.round(offset * 1000) / 1000;
  return Math.min(OFFSET_MAX, Math.max(OFFSET_MIN, stepped));
}

function merge(spans: WipeSpan[]): WipeSpan[] {
  const out: WipeSpan[] = [];
  for (const span of spans) {
    const prev = out[out.length - 1];
    if (prev && prev.to === span.from && prev.speed === span.speed && prev.offset === span.offset) prev.to = span.to;
    else out.push({ ...span });
  }
  return out;
}

export function covering(length: number, spans: WipeSpan[] | null): WipeSpan[] {
  if (length <= 0) return [];
  const source = spans && spans.length > 0 ? spans : [{ from: 0, to: length, speed: 1, offset: 0 }];
  const cuts = source
    .map((span) => ({
      from: Math.max(0, Math.min(length, Math.round(span.from))),
      to: Math.max(0, Math.min(length, Math.round(span.to))),
      speed: clampSpeed(span.speed),
      offset: clampWipeOffset(span.offset),
    }))
    .filter((span) => span.to > span.from)
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const filled: WipeSpan[] = [];
  let at = 0;
  for (const span of cuts) {
    if (span.from > at) filled.push({ from: at, to: span.from, speed: 1, offset: 0 });
    const from = Math.max(span.from, at);
    if (span.to > from) filled.push({ ...span, from });
    at = Math.max(at, span.to);
  }
  if (at < length) filled.push({ from: at, to: length, speed: 1, offset: 0 });
  return merge(filled);
}

export function isPlain(length: number, spans: WipeSpan[] | null): boolean {
  const covered = covering(length, spans);
  return covered.length === 1 && covered[0].speed === 1 && covered[0].offset === 0;
}

function editSpan(span: WipeSpan, edit: WipeEdit): WipeSpan {
  if (edit === "clear") return { ...span, speed: 1, offset: 0 };
  if (edit === "faster") return { ...span, speed: clampSpeed(span.speed * SPEED_STEP) };
  if (edit === "slower") return { ...span, speed: clampSpeed(span.speed / SPEED_STEP) };
  if (edit === "earlier") return { ...span, offset: clampWipeOffset(span.offset + OFFSET_STEP) };
  if (edit === "earlierJump") return { ...span, offset: clampWipeOffset(span.offset + OFFSET_JUMP) };
  if (edit === "laterJump") return { ...span, offset: clampWipeOffset(span.offset - OFFSET_JUMP) };
  return { ...span, offset: clampWipeOffset(span.offset - OFFSET_STEP) };
}

export function applyWipe(
  length: number,
  spans: WipeSpan[] | null,
  from: number,
  to: number,
  edit: WipeEdit,
): WipeSpan[] | null {
  const start = Math.max(0, Math.min(length, Math.round(from)));
  const end = Math.max(start, Math.min(length, Math.round(to)));
  if (end <= start) return isPlain(length, spans) ? null : covering(length, spans);
  const next = covering(length, spans).flatMap((span) => {
    if (span.to <= start || span.from >= end) return [span];
    const parts: WipeSpan[] = [];
    if (span.from < start) parts.push({ ...span, to: start });
    const midFrom = Math.max(span.from, start);
    const midTo = Math.min(span.to, end);
    if (midTo > midFrom) parts.push(editSpan({ ...span, from: midFrom, to: midTo }, edit));
    if (span.to > end) parts.push({ ...span, from: end });
    return parts;
  });
  const merged = merge(next);
  return isPlain(length, merged) ? null : merged;
}

/** 選んだ文字のうしろだけを、1秒遅らせる。早口のあとのタメ。 */
export function holdAfter(length: number, spans: WipeSpan[] | null, at: number): WipeSpan[] | null {
  const cut = Math.max(0, Math.min(length, Math.round(at)));
  if (cut <= 0 || cut >= length) return isPlain(length, spans) ? null : covering(length, spans);
  return applyWipe(length, spans, cut, length, "laterJump");
}

export function charProgress(
  length: number,
  spans: WipeSpan[] | null,
  time: number,
  start: number,
  span: number,
): number[] {
  const out = Array.from({ length }, () => 0);
  if (length <= 0 || !(span > 0)) return out;
  for (const range of covering(length, spans)) {
    const width = range.to - range.from;
    const dur = (span * (width / length)) / range.speed;
    const begin = start + span * (range.from / length) - range.offset;
    for (let i = range.from; i < range.to; i++) {
      const charStart = begin + dur * ((i - range.from) / width);
      const charDur = dur / width;
      out[i] = Math.min(1, Math.max(0, (time - charStart) / charDur));
    }
  }
  return out;
}

export function packWipe(spans: WipeSpan[] | null): WipeStored[] | null {
  if (!spans || spans.length === 0) return null;
  return spans.map((span) => ({
    from: span.from,
    to: span.to,
    speed: span.speed,
    offsetMs: Math.round(span.offset * 1000),
  }));
}

/** 終端が無いときは、これまでの配列のまま。あるときだけ秒を添える。 */
export function packWipeLine(spans: WipeSpan[] | null, end: number | null): unknown {
  const packed = packWipe(spans);
  if (end == null || !Number.isFinite(end)) return packed;
  return { spans: packed, endMs: Math.round(end * 1000) };
}

export function unpackWipeLine(value: unknown, length: number): { spans: WipeSpan[] | null; end: number | null } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as { spans?: unknown; endMs?: unknown };
    const endMs = Math.round(Number(row.endMs));
    const end = Number.isFinite(endMs) && endMs >= 400 && endMs <= 30000 ? endMs / 1000 : null;
    return { spans: unpackWipe(row.spans, length), end };
  }
  return { spans: unpackWipe(value, length), end: null };
}

export function unpackWipe(value: unknown, length: number): WipeSpan[] | null {
  if (!Array.isArray(value)) return null;
  const spans = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Partial<WipeStored>;
    return [{ from: Number(row.from), to: Number(row.to), speed: Number(row.speed), offset: Number(row.offsetMs) / 1000 }];
  });
  const covered = covering(length, spans);
  return isPlain(length, covered) ? null : covered;
}

export function wipeLabel(length: number, spans: WipeSpan[] | null, from: number, to: number): string {
  if (to <= from) return "文字をなぞると、その部分だけ";
  const inside = covering(length, spans).filter((span) => span.to > from && span.from < to);
  if (inside.length === 0) return "文字をなぞると、その部分だけ";
  const speed = inside[0].speed;
  const offset = inside[0].offset;
  if (inside.some((span) => span.speed !== speed || span.offset !== offset)) return "混ざった範囲";
  const shift = offset === 0 ? "始まりはそのまま" : offset > 0 ? `始まり ${offset.toFixed(2)}秒 早い` : `始まり ${Math.abs(offset).toFixed(2)}秒 遅い`;
  const rate = speed === 1 ? "1倍" : `${speed}倍`;
  const scope = from === 0 && to === length ? "この行" : "選んだ文字";
  return `${scope} · ${rate} · ${shift}`;
}
