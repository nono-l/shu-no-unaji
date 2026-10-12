/*
  行ごとのずれとロックと、いつ直したか。所有者はいない。誰の行も同じ表。
  認証を足して行を人に紐づけない。塗りの範囲は wipe。行の頭とは別に上書きする。
*/
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { WipeStored } from "@/lib/wipe-span";

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "t" || value === "true";
}

function asWipe(value: unknown): WipeStored[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;
  const spans: WipeStored[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Partial<WipeStored>;
    const from = Math.round(Number(row.from));
    const to = Math.round(Number(row.to));
    const speed = Number(row.speed);
    const offsetMs = Math.round(Number(row.offsetMs));
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || from < 0 || to > 80) return null;
    if (!Number.isFinite(speed) || speed < 0.25 || speed > 4) return null;
    if (!Number.isFinite(offsetMs) || offsetMs < -12000 || offsetMs > 12000) return null;
    spans.push({ from, to, speed, offsetMs });
  }
  return spans;
}

function asWipePack(value: unknown): { wipe: WipeStored[] | null; endMs: number | null } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as { spans?: unknown; endMs?: unknown };
    return { wipe: asWipe(row.spans), endMs: asEnd(row.endMs) };
  }
  return { wipe: asWipe(value), endMs: null };
}

function asEnd(value: unknown): number | null {
  const endMs = Math.round(Number(value));
  if (!Number.isFinite(endMs) || endMs < 400 || endMs > 30000) return null;
  return endMs;
}

function asTime(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed =
    typeof value === "number"
      ? value
      : value instanceof Date
        ? value.getTime()
        : Date.parse(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export type LyricLine = {
  index: number;
  offsetMs: number;
  locked: boolean;
  adjustedAt: number | null;
  wipe: WipeStored[] | null;
  endMs: number | null;
};

export const loadLyricLines = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ line_index: number; offset_ms: number; locked: boolean; adjusted_at: unknown; wipe: unknown }>`
    select line_index, offset_ms, locked, adjusted_at, wipe from lyric_lines order by line_index
  `;
  return {
    lines: rows.map((row) => {
      const packed = asWipePack(row.wipe);
      return {
        index: Number(row.line_index),
        offsetMs: Number(row.offset_ms),
        locked: asBool(row.locked),
        adjustedAt: asTime(row.adjusted_at),
        wipe: packed.wipe,
        endMs: packed.endMs,
      };
    }),
  };
});

export const saveLyricLines = createServerFn({ method: "POST" })
  .validator((input: { lines: LyricLine[] }) => {
    if (!input || !Array.isArray(input.lines) || input.lines.length > 80) {
      throw new Error("invalid lines");
    }
    return {
      lines: input.lines.map((line) => ({
        index: Math.max(0, Math.min(79, Math.round(Number(line.index)))),
        offsetMs: Math.max(-8000, Math.min(8000, Math.round(Number(line.offsetMs) || 0))),
        locked: line.locked === true,
        adjustedAt: asTime(line.adjustedAt),
        wipe: asWipe(line.wipe),
        endMs: asEnd(line.endMs),
      })),
    };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    for (const line of data.lines) {
      const adjusted = line.adjustedAt == null ? null : new Date(line.adjustedAt);
      const wipe =
        line.endMs == null
          ? line.wipe == null
            ? null
            : JSON.stringify(line.wipe)
          : JSON.stringify({ spans: line.wipe, endMs: line.endMs });
      await sql`
        insert into lyric_lines (line_index, offset_ms, locked, adjusted_at, wipe)
        values (${line.index}, ${line.offsetMs}, ${line.locked}, ${adjusted}, ${wipe}::jsonb)
        on conflict (line_index) do update
        set offset_ms = excluded.offset_ms,
            locked = excluded.locked,
            adjusted_at = coalesce(excluded.adjusted_at, lyric_lines.adjusted_at),
            wipe = excluded.wipe
      `;
    }
    return { ok: true as const };
  });