import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "t" || value === "true";
}

export type LyricLine = { index: number; offsetMs: number; locked: boolean };

export const loadLyricLines = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ line_index: number; offset_ms: number; locked: boolean }>`
    select line_index, offset_ms, locked from lyric_lines order by line_index
  `;
  return {
    lines: rows.map((row) => ({
      index: Number(row.line_index),
      offsetMs: Number(row.offset_ms),
      locked: asBool(row.locked),
    })),
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
      })),
    };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    for (const line of data.lines) {
      await sql`
        insert into lyric_lines (line_index, offset_ms, locked)
        values (${line.index}, ${line.offsetMs}, ${line.locked})
        on conflict (line_index) do update
        set offset_ms = excluded.offset_ms,
            locked = excluded.locked
      `;
    }
    return { ok: true as const };
  });