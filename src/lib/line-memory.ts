/*
  行のずれの控えと、700ms でまとめる送信。
  調整した時刻は行ごと。ロックだけ触ったときは進めない。直前のずれがまだ送れていなければ、その時刻を残す。
  認証は持たない。塗りの式は持たない。範囲の控えは、行の頭と一緒に送る。
*/
import { CUES, clampOffset, zeroLocks, zeroOffsets } from "../data/score.ts";
import { packWipe, unpackWipe, type WipeSpan, type WipeStored } from "./wipe-span.ts";
import { offsetTrace } from "./sync-log.ts";

const OFFSET_KEY = "shu-line-offsets";
const LOCK_KEY = "shu-line-locks";
const ADJUSTED_KEY = "shu-line-adjusted";
const WIPE_KEY = "shu-line-wipes";

export type LineStatus = "ok" | "bad" | "muted";

type Line = {
  index: number;
  offsetMs: number;
  locked: boolean;
  adjustedAt?: number | null;
  wipe?: WipeStored[] | null;
};

type Listen = {
  note: (text: string, kind: LineStatus) => void;
  offsets: (next: number[]) => void;
  locks: (next: boolean[]) => void;
  adjusted?: (next: number[]) => void;
  wipes?: (next: (WipeSpan[] | null)[]) => void;
  trace?: (line: string) => void;
};

type Io = {
  load: () => Promise<{ lines: Line[] }>;
  save: (lines: Line[]) => Promise<unknown>;
};

function readStoredOffsets(): number[] {
  const base = zeroOffsets();
  try {
    const raw = localStorage.getItem(OFFSET_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return base;
    for (let i = 0; i < base.length; i++) {
      const n = Number(parsed[i]);
      if (Number.isFinite(n)) base[i] = clampOffset(n);
    }
  } catch {
    /* private mode */
  }
  return base;
}

function readStoredAdjusted(): number[] {
  const base = zeroOffsets().map(() => 0);
  try {
    const raw = localStorage.getItem(ADJUSTED_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return base;
    for (let i = 0; i < base.length; i++) {
      const n = Number(parsed[i]);
      if (Number.isFinite(n) && n > 0) base[i] = Math.round(n);
    }
  } catch {
    /* private mode */
  }
  return base;
}

function wipeKey(wipe: WipeStored[] | null | undefined): string {
  return wipe && wipe.length > 0 ? JSON.stringify(wipe) : "";
}

function readStoredWipes(): (WipeSpan[] | null)[] {
  const base = zeroOffsets().map(() => null as WipeSpan[] | null);
  try {
    const raw = localStorage.getItem(WIPE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return base;
    for (let i = 0; i < base.length; i++) {
      base[i] = unpackWipe(parsed[i], Array.from(CUES[i]?.text ?? "").length);
    }
  } catch {
    /* private mode */
  }
  return base;
}

function readStoredLocks(): boolean[] {
  const base = zeroLocks();
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return base;
    for (let i = 0; i < base.length; i++) base[i] = parsed[i] === true;
  } catch {
    /* private mode */
  }
  return base;
}

async function remoteLoad(): Promise<{ lines: Line[] }> {
  const { loadLyricLines } = await import("./lyric-sync.ts");
  return loadLyricLines();
}

async function remoteSave(lines: Line[]): Promise<unknown> {
  const { saveLyricLines } = await import("./lyric-sync.ts");
  return saveLyricLines({
    data: {
      lines: lines.map((line) => ({
        index: line.index,
        offsetMs: line.offsetMs,
        locked: line.locked,
        adjustedAt: line.adjustedAt ?? null,
        wipe: line.wipe ?? null,
      })),
    },
  });
}

export function createLineMemory(listen: Listen, io?: Io) {
  let offsets = zeroOffsets();
  let locks = zeroLocks();
  let adjusted = readStoredAdjusted();
  let wipes = readStoredWipes();
  const savedSig = new Map<number, string>();
  const pending = new Map<number, { offsetMs: number; adjustedAt: number | null; wipe: WipeStored[] | null }>();
  const touchedLocks = new Set<number>();
  let localDirty = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let saving = false;
  let retry = false;
  let alive = true;

  function publishOffsets(next: number[]) {
    offsets = next;
    listen.offsets(next);
    try {
      localStorage.setItem(OFFSET_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function publishLocks(next: boolean[]) {
    locks = next;
    listen.locks(next);
    try {
      localStorage.setItem(LOCK_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function publishAdjusted(next: number[]) {
    adjusted = next;
    listen.adjusted?.(next);
    try {
      localStorage.setItem(ADJUSTED_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function publishWipes(next: (WipeSpan[] | null)[]) {
    wipes = next;
    listen.wipes?.(next);
    try {
      localStorage.setItem(WIPE_KEY, JSON.stringify(next.map((spans) => packWipe(spans))));
    } catch {
      /* ignore */
    }
  }

  function queue(index: number, stamp = true) {
    const offsetMs = Math.round((offsets[index] ?? 0) * 1000);
    const prev = pending.get(index);
    const at = stamp ? Date.now() : (prev?.adjustedAt ?? null);
    if (stamp) {
      const next = adjusted.slice();
      next[index] = at ?? Date.now();
      publishAdjusted(next);
    }
    pending.set(index, { offsetMs, adjustedAt: at, wipe: packWipe(wipes[index] ?? null) });
    localDirty = true;
    if (saveTimer != null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void flushSaves();
    }, 700);
  }

  async function flushSaves() {
    if (saving) {
      retry = true;
      return;
    }
    saving = true;
    retry = false;
    if (pending.size === 0) {
      saving = false;
      return;
    }
    if (alive) listen.note("この行を残しています", "muted");
    let batch: Line[] = [];
    let failed = false;
    try {
      while (pending.size > 0) {
        const lines = [...pending.entries()]
          .filter(([index, line]) => savedSig.get(index) !== `${line.offsetMs}:${locks[index] ? 1 : 0}:${wipeKey(line.wipe)}`)
          .map(([index, line]) => ({
            index,
            offsetMs: line.offsetMs,
            locked: locks[index] === true,
            adjustedAt: line.adjustedAt,
            wipe: line.wipe ?? null,
          }));
        pending.clear();
        if (lines.length === 0) continue;
        batch = lines;
        await (io ? io.save(lines) : remoteSave(lines));
        for (const line of lines) {
          savedSig.set(line.index, `${line.offsetMs}:${line.locked ? 1 : 0}:${wipeKey(line.wipe)}`);
        }
        batch = [];
      }
      if (alive) listen.note("この行だけ残しました。次からもこの行だけずれます", "ok");
    } catch {
      failed = true;
      for (const line of batch) {
        if (!pending.has(line.index)) {
          pending.set(line.index, { offsetMs: line.offsetMs, adjustedAt: line.adjustedAt ?? null, wipe: line.wipe ?? null });
        }
      }
      if (alive) listen.note("残せず、この画面だけ覚えています", "bad");
    } finally {
      saving = false;
      const followUp = retry;
      retry = false;
      if (!failed && (followUp || pending.size > 0)) void flushSaves();
      else if (failed && followUp && saveTimer == null) {
        saveTimer = setTimeout(() => {
          saveTimer = null;
          void flushSaves();
        }, 700);
      }
    }
  }

  function start() {
    alive = true;
    publishOffsets(readStoredOffsets());
    publishLocks(readStoredLocks());
    publishAdjusted(adjusted.slice());
    publishWipes(wipes.map((spans) => (spans ? spans.map((span) => ({ ...span })) : null)));
    listen.trace?.(offsetTrace("local", offsets));
    let gone = false;
    void (io ? io.load() : remoteLoad())
      .then((result) => {
        if (gone || localDirty) {
          listen.trace?.("offsets remote skipped");
          return;
        }
        const nextOffsets = offsets.slice();
        const nextLocks = locks.slice();
        const nextAdjusted = adjusted.slice();
        const nextWipes = wipes.slice();
        let locksChanged = false;
        let adjustedChanged = false;
        let wipesChanged = false;
        for (const line of result.lines) {
          if (line.index < 0 || line.index >= nextOffsets.length || pending.has(line.index)) continue;
          nextOffsets[line.index] = clampOffset(line.offsetMs / 1000);
          if (!touchedLocks.has(line.index)) {
            if (nextLocks[line.index] !== line.locked) locksChanged = true;
            nextLocks[line.index] = line.locked;
          }
          const at = line.adjustedAt ?? 0;
          if (nextAdjusted[line.index] !== at) adjustedChanged = true;
          nextAdjusted[line.index] = at;
          const unpacked = unpackWipe(line.wipe ?? null, Array.from(CUES[line.index]?.text ?? "").length);
          const packedNext = wipeKey(packWipe(unpacked));
          if (wipeKey(packWipe(nextWipes[line.index])) !== packedNext) wipesChanged = true;
          nextWipes[line.index] = unpacked;
          savedSig.set(
            line.index,
            `${Math.round(nextOffsets[line.index] * 1000)}:${nextLocks[line.index] ? 1 : 0}:${wipeKey(line.wipe)}`,
          );
        }
        publishOffsets(nextOffsets);
        if (locksChanged) publishLocks(nextLocks);
        if (adjustedChanged) publishAdjusted(nextAdjusted);
        if (wipesChanged) publishWipes(nextWipes);
        listen.trace?.(offsetTrace("remote", nextOffsets, result.lines.length));
        listen.note(
          result.lines.length > 0 ? "行ごとのずれを戻しました" : "行を選ぶと、その行だけ動きます",
          result.lines.length > 0 ? "ok" : "muted",
        );
      })
      .catch(() => {
        listen.trace?.("offsets remote failed");
        if (!gone) listen.note("保存先に届かず、この画面の記憶です", "bad");
      });
    return () => {
      gone = true;
      alive = false;
      if (saveTimer != null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      if (pending.size > 0) void flushSaves();
    };
  }

  return {
    commitOffsets: publishOffsets,
    commitLocks: publishLocks,
    touch(index: number) {
      touchedLocks.add(index);
    },
    queue,
    setWipe(index: number, spans: WipeSpan[] | null) {
      if (index < 0 || index >= wipes.length) return;
      const next = wipes.slice();
      next[index] = spans;
      publishWipes(next);
      queue(index);
    },
    start,
  };
}
