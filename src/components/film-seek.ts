/*
  シークの範囲と、くり返しを外すかどうか。
  音の要素も動画の要素も持たない。巻き戻しの時刻は film-paint。
*/
import { CUES, DURATION, SCENES, cueHeardAt, sceneIndexAt, sectionBounds } from "../data/score.ts";
import type { FilmLoop } from "./film-paint.ts";

export function seekWrite(want: number | null, at: number, busy: boolean): "wait" | "done" | "write" {
  if (want == null || busy) return "wait";
  if (!Number.isFinite(at) || Math.abs(at - want) < 0.08) return "done";
  return "write";
}

export function clampSeek(time: number): number {
  if (!Number.isFinite(time)) return 0;
  return Math.min(DURATION, Math.max(0, time));
}

export function sceneVideoInto(at: number, duration: number): number | null {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const scene = SCENES[sceneIndexAt(at)];
  if (!scene) return null;
  return Math.max(0, at - scene.t) % duration;
}

export function nextSceneTime(time: number, dir: number): number {
  const index = Math.min(SCENES.length - 1, Math.max(0, sceneIndexAt(time) + dir));
  return SCENES[index].t;
}

export function stepCue(heard: number, dir: number): number | null {
  if (heard < 0) return dir > 0 ? 0 : null;
  return Math.min(CUES.length - 1, Math.max(0, heard + dir));
}

export function sectionLoop(cueIndex: number, time: number, offsets: number[]): FilmLoop {
  const bounds = sectionBounds(cueIndex >= 0 ? cueIndex : 0);
  const start = cueHeardAt(bounds.from, offsets);
  const end = bounds.to + 1 < CUES.length ? cueHeardAt(bounds.to + 1, offsets) : DURATION;
  return {
    kind: "section",
    from: bounds.from,
    armed: time >= start - 0.05 && time < Math.max(start + 0.4, end),
  };
}

export function lineLoop(index: number): FilmLoop {
  return { kind: "line", from: index, armed: true };
}

export function loopAfterLine(loop: FilmLoop | null, next: number): FilmLoop | null {
  if (!loop) return null;
  if (loop.kind === "line") return loop.from === next ? loop : null;
  const bounds = sectionBounds(loop.from);
  if (next < bounds.from || next > bounds.to) return null;
  return loop;
}

export function loopAfterSection(loop: FilmLoop | null, sectionFrom: number): FilmLoop | null {
  if (!loop) return null;
  if (loop.kind === "line") return null;
  return loop.from === sectionFrom ? loop : null;
}

export function sectionStart(index: number): number {
  return sectionBounds(index).from;
}
