/*
  毎フレームの塗り。React には場面と行が変わったときだけ知らせる。
  rAF の開始は持たない。続きの保存も持たない。
  白塗りの窓は lyricWipeSpan。範囲が無い進みは lyricWipeAt。範囲があるときは文字ごと。
*/
import {
  CUES,
  DURATION,
  cueHeardAt,
  cueIndexAt,
  lyricWipeAt,
  lyricWipeSpan,
  sceneIndexAt,
  sectionBounds,
} from "../data/score.ts";
import { charProgress, type WipeSpan } from "../lib/wipe-span.ts";

export type FilmLoop = { kind: "line" | "section"; from: number; armed: boolean };

export type ClockInput = {
  time: number;
  offsets: number[];
  pin: number | null;
  loop: FilmLoop | null;
  remain: boolean;
  scene: number;
  heard: number;
  hasAudio: boolean;
  wipes?: (WipeSpan[] | null)[] | null;
  ends?: (number | null)[] | null;
};

export type ClockStep = {
  time: number;
  rewindTo: number | null;
  clearLoop: boolean;
  scene: number;
  sceneChanged: boolean;
  heard: number;
  heardChanged: boolean;
  pin: number | null;
  pinChanged: boolean;
  timeText: string;
  audioText: string;
  lyricText: string;
  seekPct: string;
  wipe: string;
};

export function formatClock(t: number): string {
  const safe = Number.isFinite(t) ? Math.max(0, t) : 0;
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`;
}

export function stepFilmClock(input: ClockInput): ClockStep {
  let time = Math.min(DURATION, Math.max(0, input.time));
  let rewindTo: number | null = null;
  let clearLoop = false;
  const loop = input.loop;
  if (input.hasAudio && loop) {
    const endIndex = loop.kind === "line" ? loop.from : sectionBounds(loop.from).to;
    const start = cueHeardAt(loop.from, input.offsets);
    const nextStart = endIndex + 1 < CUES.length ? cueHeardAt(endIndex + 1, input.offsets) : DURATION;
    const end = Math.max(start + 0.4, nextStart);
    if (time > end + 0.25 || (loop.armed && time < start - 0.35)) {
      clearLoop = true;
    } else if (time >= end - 0.08) {
      rewindTo = start;
      time = start;
      loop.armed = true;
    } else if (time >= start - 0.05) {
      loop.armed = true;
    }
  }
  const scene = sceneIndexAt(time);
  let pin = input.pin;
  const heard = cueIndexAt(time, input.offsets);
  if (pin !== null && heard >= 0 && heard !== pin) {
    const pinnedAt = CUES[pin].t - (input.offsets[pin] ?? 0);
    const heardAt = CUES[heard].t - (input.offsets[heard] ?? 0);
    if (heardAt > pinnedAt + 0.05) pin = null;
  }
  const shown = pin === null ? heard : pin;
  const shownAt = shown >= 0 ? CUES[shown].t - (input.offsets[shown] ?? 0) : 0;
  return {
    time,
    rewindTo,
    clearLoop,
    scene,
    sceneChanged: scene !== input.scene,
    heard,
    heardChanged: heard !== input.heard,
    pin,
    pinChanged: pin !== input.pin,
    timeText: input.remain ? `-${formatClock(Math.max(0, DURATION - time))}` : formatClock(time),
    audioText: formatClock(time),
    lyricText: formatClock(Math.max(0, shownAt)),
    seekPct: `${(time / DURATION) * 100}%`,
    wipe: heard >= 0 ? `${lyricWipeAt(heard, time, input.offsets, input.ends?.[heard] ?? null) * 100}%` : "100%",
  };
}

type PaintView = {
  time: HTMLElement | null;
  audioClock: HTMLElement | null;
  lyricClock: HTMLElement | null;
  range: HTMLInputElement | null;
  lyric: HTMLElement | null;
  scrubbing: boolean;
};

export function paintFilmFrame(input: ClockInput, view: PaintView): ClockStep {
  const frame = stepFilmClock(input);
  if (view.time) view.time.textContent = frame.timeText;
  if (view.audioClock) view.audioClock.textContent = frame.audioText;
  if (view.lyricClock) view.lyricClock.textContent = frame.lyricText;
  if (view.range && !view.scrubbing) {
    view.range.value = String(frame.time);
    view.range.style.setProperty("--pct", frame.seekPct);
  }
  if (view.lyric) {
    view.lyric.style.setProperty("--p", frame.wipe);
    const nodes = view.lyric.querySelectorAll<HTMLElement>(".wipe-ch");
    if (nodes.length > 0 && frame.heard >= 0) {
      const { start, span } = lyricWipeSpan(frame.heard, input.offsets, input.ends?.[frame.heard] ?? null);
      const progress = charProgress(nodes.length, input.wipes?.[frame.heard] ?? null, frame.time, start, span);
      if (progress.length === nodes.length) {
        nodes.forEach((node, index) => node.style.setProperty("--p", `${progress[index] * 100}%`));
      }
    }
  }
  return frame;
}
