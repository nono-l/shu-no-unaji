/*
  夜の一曲。時計は audio の currentTime。場面は生の時刻、歌詞は行のずれを引いた時刻。
  白塗りは行全体を一本。行の中を範囲に割らない。塗るたびに再描画しない。--p を書く。
  ずれは lyric_lines。localStorage は届かなかったときの控え。届いたことにしない。
*/
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Link2,
  ListMusic,
  MicOff,
  MicVocal,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  CUES,
  DURATION,
  SCENES,
  clampOffset,
  cueHeardAt,
  cueIndexAt,
  sceneIndexAt,
  sceneSpan,
  sectionBounds,
  sectionMarks,
  zeroLocks,
  zeroOffsets,
} from "@/data/score";
import { createVocalGraph, type VocalGraph } from "@/lib/karaoke";
import { loadLyricLines, saveLyricLines } from "@/lib/lyric-sync";
import { TimingPanel } from "@/components/timing-panel";
import { TimelineEditor } from "@/components/timeline-editor";

const OFFSET_KEY = "shu-line-offsets";
const LOCK_KEY = "shu-line-locks";
const KARAOKE_KEY = "shu-karaoke";
const RESUME_KEY = "shu-resume";

type Loop = { kind: "line" | "section"; from: number; armed: boolean };
type StatusKind = "ok" | "bad" | "muted";

function fmt(t: number): string {
  const safe = Number.isFinite(t) ? Math.max(0, t) : 0;
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`;
}

function loadOffsets(): number[] {
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

function loadLocks(): boolean[] {
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

export function FilmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioHostRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const lyricRef = useRef<HTMLButtonElement>(null);
  const audioClockRef = useRef<HTMLElement>(null);
  const lyricClockRef = useRef<HTMLElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const scrubbing = useRef(false);
  const offsetsRef = useRef(zeroOffsets());
  const locksRef = useRef(zeroLocks());
  const pinRef = useRef<number | null>(null);
  const cueRef = useRef(-1);
  const sceneRef = useRef(0);
  const loopRef = useRef<Loop | null>(null);
  const remainRef = useRef(false);
  const karaokeRef = useRef(false);
  const graphRef = useRef<VocalGraph | null>(null);
  const swipeRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const resumeStamp = useRef(0);
  const paintRef = useRef<(t: number) => void>(() => {});
  const toggleRef = useRef<() => void>(() => {});
  const seekRef = useRef<(t: number) => void>(() => {});
  const stepLineRef = useRef<(dir: number) => void>(() => {});
  const replaceAudioRef = useRef<() => void>(() => {});
  const savedSigRef = useRef(new Map<number, string>());
  const pendingRef = useRef(new Map<number, number>());
  const touchedLocksRef = useRef(new Set<number>());
  const localDirtyRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const retryRef = useRef(false);
  const aliveRef = useRef(true);
  const flushRef = useRef<() => void>(() => {});

  const [cueIndex, setCueIndex] = useState(-1);
  const [pin, setPin] = useState(-1);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<"gate" | "live" | "ended">("gate");
  const [sheet, setSheet] = useState(false);
  const [muted, setMuted] = useState(false);
  const [offsets, setOffsets] = useState(zeroOffsets);
  const [locks, setLocks] = useState(zeroLocks);
  const [timing, setTiming] = useState(false);
  const [timeline, setTimeline] = useState(false);
  const [status, setStatus] = useState("行をタップすると、その行だけ動きます");
  const [statusKind, setStatusKind] = useState<StatusKind>("muted");
  const [loopMode, setLoopMode] = useState<"line" | "section" | null>(null);
  const [remain, setRemain] = useState(false);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const [karaoke, setKaraoke] = useState(false);

  function note(text: string, kind: StatusKind) {
    setStatus(text);
    setStatusKind(kind);
  }

  function queueSave(index: number) {
    const offsetMs = Math.round((offsetsRef.current[index] ?? 0) * 1000);
    pendingRef.current.set(index, offsetMs);
    localDirtyRef.current = true;
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      flushRef.current();
    }, 700);
  }

  async function flushSaves() {
    if (savingRef.current) {
      retryRef.current = true;
      return;
    }
    savingRef.current = true;
    retryRef.current = false;
    if (pendingRef.current.size === 0) {
      savingRef.current = false;
      return;
    }
    if (aliveRef.current) note("この行を残しています", "muted");
    let batch: { index: number; offsetMs: number; locked: boolean }[] = [];
    let failed = false;
    try {
      while (pendingRef.current.size > 0) {
        const lines = [...pendingRef.current.entries()]
          .filter(([index, offsetMs]) => savedSigRef.current.get(index) !== `${offsetMs}:${locksRef.current[index] ? 1 : 0}`)
          .map(([index, offsetMs]) => ({
            index,
            offsetMs,
            locked: locksRef.current[index] === true,
          }));
        pendingRef.current.clear();
        if (lines.length === 0) continue;
        batch = lines;
        await saveLyricLines({ data: { lines } });
        for (const line of lines) {
          savedSigRef.current.set(line.index, `${line.offsetMs}:${line.locked ? 1 : 0}`);
        }
        batch = [];
      }
      if (aliveRef.current) note("この行だけ残しました。次からもこの行だけずれます", "ok");
    } catch {
      failed = true;
      for (const line of batch) {
        if (!pendingRef.current.has(line.index)) pendingRef.current.set(line.index, line.offsetMs);
      }
      if (aliveRef.current) note("残せず、この画面だけ覚えています", "bad");
    } finally {
      savingRef.current = false;
      const followUp = retryRef.current;
      retryRef.current = false;
      if (!failed && (followUp || pendingRef.current.size > 0)) void flushSaves();
      else if (failed && followUp && saveTimerRef.current == null) {
        saveTimerRef.current = window.setTimeout(() => {
          saveTimerRef.current = null;
          flushRef.current();
        }, 700);
      }
    }
  }
  flushRef.current = () => {
    void flushSaves();
  };

  function saveOffsets(next: number[]) {
    offsetsRef.current = next;
    setOffsets(next);
    try {
      localStorage.setItem(OFFSET_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function saveLocks(next: boolean[]) {
    locksRef.current = next;
    setLocks(next);
    try {
      localStorage.setItem(LOCK_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function saveResume(time: number) {
    if (time > 1 && time < DURATION - 2) {
      try {
        localStorage.setItem(RESUME_KEY, String(Math.round(time * 10) / 10));
      } catch {
        /* ignore */
      }
    }
  }

  function clearResume() {
    try {
      localStorage.removeItem(RESUME_KEY);
    } catch {
      /* ignore */
    }
    setResumeAt(null);
  }

  function bindAudio(audio: HTMLAudioElement) {
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.onplay = () => {
      setPlaying(true);
      const current = audioRef.current;
      if (current) publishSession(current);
    };
    audio.onpause = () => {
      setPlaying(false);
      const current = audioRef.current;
      if (current && !current.ended) saveResume(current.currentTime);
      if (current) publishSession(current);
    };
    audio.onended = () => {
      setPlaying(false);
      setPhase("ended");
      clearResume();
    };
    audio.ontimeupdate = () => {
      const current = audioRef.current;
      if (!current) return;
      publishSession(current);
      if (document.visibilityState !== "visible") paintRef.current(current.currentTime);
    };
  }

  function publishSession(audio: HTMLAudioElement) {
    const session = navigator.mediaSession;
    if (!session?.setPositionState) return;
    try {
      session.playbackState = audio.paused ? "paused" : "playing";
      session.setPositionState({
        duration: DURATION,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(DURATION, Math.max(0, audio.currentTime || 0)),
      });
    } catch {
      /* some browsers reject a position past duration */
    }
  }

  function replaceAudio() {
    const current = audioRef.current;
    if (!current) return;
    const time = current.currentTime;
    const paused = current.paused;
    const wasMuted = current.muted;
    graphRef.current?.close();
    graphRef.current = null;
    current.onplay = null;
    current.onpause = null;
    current.onended = null;
    current.pause();
    current.removeAttribute("src");
    current.load();
    current.remove();
    const next = document.createElement("audio");
    next.src = "/audio/shu.m4a";
    bindAudio(next);
    next.muted = wasMuted;
    audioRef.current = next;
    audioHostRef.current?.appendChild(next);
    const apply = () => {
      try {
        next.currentTime = time;
      } catch {
        /* metadata not ready */
      }
    };
    if (next.readyState >= 1) apply();
    else next.addEventListener("loadedmetadata", apply, { once: true });
    if (!paused) void next.play().catch(() => {});
  }
  replaceAudioRef.current = replaceAudio;

  function ensureGraph() {
    const audio = audioRef.current;
    if (!audio || !karaokeRef.current) return;
    if (!graphRef.current) {
      try {
        graphRef.current = createVocalGraph(audio, false);
      } catch {
        return;
      }
    }
    void graphRef.current.context.resume();
  }

  function toggleKaraoke() {
    const next = !karaokeRef.current;
    karaokeRef.current = next;
    setKaraoke(next);
    try {
      localStorage.setItem(KARAOKE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (!next) {
      if (graphRef.current) replaceAudio();
      return;
    }
    const audio = audioRef.current;
    if (audio && !audio.paused) ensureGraph();
  }

  paintRef.current = (t: number) => {
    let time = Math.min(DURATION, Math.max(0, t));
    const offsetsNow = offsetsRef.current;
    const audio = audioRef.current;
    const loop = loopRef.current;
    if (audio && loop) {
      const endIndex = loop.kind === "line" ? loop.from : sectionBounds(loop.from).to;
      const start = cueHeardAt(loop.from, offsetsNow);
      const nextStart = endIndex + 1 < CUES.length ? cueHeardAt(endIndex + 1, offsetsNow) : DURATION;
      const end = Math.max(start + 0.4, nextStart);
      if (time > end + 0.25 || (loop.armed && time < start - 0.35)) {
        loopRef.current = null;
        setLoopMode(null);
      } else if (time >= end - 0.08) {
        audio.currentTime = start;
        time = start;
        loop.armed = true;
      } else if (time >= start - 0.05) {
        loop.armed = true;
      }
    }
    if (timeRef.current) {
      timeRef.current.textContent = remainRef.current
        ? `-${fmt(Math.max(0, DURATION - time))}`
        : fmt(time);
    }
    if (audioClockRef.current) audioClockRef.current.textContent = fmt(time);
    if (rangeRef.current && !scrubbing.current) {
      rangeRef.current.value = String(time);
      rangeRef.current.style.setProperty("--pct", `${(time / DURATION) * 100}%`);
    }
    const scene = sceneIndexAt(time);
    if (scene !== sceneRef.current) {
      sceneRef.current = scene;
      setSceneIndex(scene);
    }
    const heard = cueIndexAt(time, offsetsNow);
    if (pinRef.current !== null && heard >= 0 && heard !== pinRef.current) {
      const pinnedAt = CUES[pinRef.current].t - (offsetsNow[pinRef.current] ?? 0);
      const heardAt = CUES[heard].t - (offsetsNow[heard] ?? 0);
      if (heardAt > pinnedAt + 0.05) {
        pinRef.current = null;
        setPin(-1);
      }
    }
    const shown = pinRef.current === null ? heard : pinRef.current;
    const shownAt = shown >= 0 ? CUES[shown].t - (offsetsNow[shown] ?? 0) : 0;
    if (lyricClockRef.current) lyricClockRef.current.textContent = fmt(Math.max(0, shownAt));
    if (heard !== cueRef.current) {
      cueRef.current = heard;
      setCueIndex(heard);
    }
    if (lyricRef.current && heard >= 0) {
      const start = CUES[heard].t - (offsetsNow[heard] ?? 0);
      const nextCue = CUES[heard + 1];
      const end = nextCue ? nextCue.t - (offsetsNow[heard + 1] ?? 0) : start + 3.2;
      const span = Math.max(0.4, (end > start + 0.05 ? end : start + 3.2) - start);
      const p = Math.min(1, Math.max(0, (time - start) / span));
      lyricRef.current.style.setProperty("--p", `${p * 100}%`);
    } else if (lyricRef.current) {
      lyricRef.current.style.setProperty("--p", "100%");
    }
    if (audio && !audio.paused && time > 1 && time < DURATION - 2) {
      const now = performance.now();
      if (now - resumeStamp.current > 2000) {
        resumeStamp.current = now;
        saveResume(time);
      }
    }
  };

  function clearLoop() {
    if (!loopRef.current) return;
    loopRef.current = null;
    setLoopMode(null);
  }

  function seek(time: number, andPlay = false) {
    const audio = audioRef.current;
    if (!audio) return;
    const at = Math.min(DURATION, Math.max(0, time));
    audio.currentTime = at;
    if (rangeRef.current) rangeRef.current.style.setProperty("--pct", `${(at / DURATION) * 100}%`);
    paintRef.current(at);
    const video = document.querySelector(".frame-on video");
    if (video instanceof HTMLVideoElement && Number.isFinite(video.duration) && video.duration > 0) {
      const scene = SCENES[sceneIndexAt(at)];
      if (scene) {
        try {
          video.currentTime = Math.max(0, at - scene.t) % video.duration;
        } catch {
          /* ignore */
        }
      }
    }
    publishSession(audio);
    if (andPlay && audio.paused) {
      ensureGraph();
      void audio
        .play()
        .then(() => {
          setPhase("live");
          resumeVideos();
        })
        .catch(() => {});
    }
  }
  seekRef.current = (time) => seek(time);

  function resumeVideos() {
    document.querySelectorAll("video").forEach((node) => {
      const video = node as HTMLVideoElement;
      video.muted = true;
      void video.play().catch(() => {});
    });
  }

  function syncVideo(video: HTMLVideoElement | null, sceneStart: number) {
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    const audio = audioRef.current;
    const into = Math.max(0, (audio?.currentTime ?? sceneStart) - sceneStart);
    const place = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      try {
        video.currentTime = into % video.duration;
      } catch {
        /* ignore */
      }
    };
    if (video.readyState >= 1) place();
    else video.addEventListener("loadedmetadata", place, { once: true });
    if (audio && !audio.paused) void video.play().catch(() => {});
  }

  function goLine(index: number) {
    const cue = CUES[index];
    if (!cue) return;
    pinRef.current = index;
    setPin(index);
    seek(cueHeardAt(index, offsetsRef.current), true);
  }

  function goRelative(dir: number) {
    if (cueRef.current < 0) {
      if (dir > 0) goLine(0);
      return;
    }
    const loop = loopRef.current;
    const next = Math.min(CUES.length - 1, Math.max(0, cueRef.current + dir));
    if (loop?.kind === "line" && loop.from !== next) clearLoop();
    if (loop?.kind === "section") {
      const bounds = sectionBounds(loop.from);
      if (next < bounds.from || next > bounds.to) clearLoop();
    }
    goLine(next);
  }
  stepLineRef.current = goRelative;

  function goSection(index: number) {
    const bounds = sectionBounds(index);
    if (loopRef.current?.kind === "line") clearLoop();
    if (loopRef.current?.kind === "section" && loopRef.current.from !== bounds.from) clearLoop();
    goLine(bounds.from);
  }

  function locked(index: number): boolean {
    if (index < 0 || !locksRef.current[index]) return false;
    note("この行はロックしています", "muted");
    return true;
  }

  function writeOffset(index: number, value: number): boolean {
    if (index < 0 || index >= CUES.length) return false;
    if (locksRef.current[index]) {
      note("この行はロックしています", "muted");
      return false;
    }
    const next = offsetsRef.current.slice();
    next[index] = clampOffset(value);
    saveOffsets(next);
    queueSave(index);
    return true;
  }

  function nudgeShown(delta: number) {
    const index = pinRef.current === null ? cueRef.current : pinRef.current;
    if (index < 0 || locked(index)) return;
    if (writeOffset(index, (offsetsRef.current[index] ?? 0) + delta)) goLine(index);
  }

  function alignShown() {
    const audio = audioRef.current;
    if (!audio || phase === "gate") return;
    const index = pinRef.current === null ? cueRef.current : pinRef.current;
    if (index < 0 || locked(index)) return;
    const cue = CUES[index];
    if (cue) writeOffset(index, cue.t - audio.currentTime);
  }

  function resetShown() {
    const index = pinRef.current === null ? cueRef.current : pinRef.current;
    if (index < 0 || locked(index)) return;
    if (writeOffset(index, 0)) goLine(index);
  }

  function toggleLock(index = pinRef.current === null ? cueRef.current : pinRef.current) {
    if (index < 0) return;
    const next = locksRef.current.slice();
    next[index] = !next[index];
    saveLocks(next);
    touchedLocksRef.current.add(index);
    queueSave(index);
    note(next[index] ? "この行をロックしました" : "この行のロックを外しました", "ok");
  }

  function toggleSectionLoop() {
    if (loopRef.current?.kind === "section") {
      clearLoop();
      return;
    }
    const bounds = sectionBounds(cueRef.current >= 0 ? cueRef.current : 0);
    const time = audioRef.current?.currentTime ?? 0;
    const start = cueHeardAt(bounds.from, offsetsRef.current);
    const end = bounds.to + 1 < CUES.length ? cueHeardAt(bounds.to + 1, offsetsRef.current) : DURATION;
    loopRef.current = {
      kind: "section",
      from: bounds.from,
      armed: time >= start - 0.05 && time < Math.max(start + 0.4, end),
    };
    setLoopMode("section");
  }

  function toggleLineLoop() {
    const index = cueRef.current;
    if (index < 0) return;
    if (loopRef.current?.kind === "line" && loopRef.current.from === index) {
      clearLoop();
      return;
    }
    loopRef.current = { kind: "line", from: index, armed: true };
    setLoopMode("line");
  }

  function stepScene(dir: number) {
    const time = audioRef.current?.currentTime ?? 0;
    const index = Math.min(SCENES.length - 1, Math.max(0, sceneIndexAt(time) + dir));
    seek(SCENES[index].t);
  }

  async function shareLink() {
    const time = Math.round((audioRef.current?.currentTime ?? 0) * 10) / 10;
    const url = new URL(window.location.href);
    url.searchParams.set("t", String(Math.max(0, time)));
    const href = url.toString();
    try {
      if (navigator.share) await navigator.share({ title: "朱のうなじ", url: href });
      else await navigator.clipboard.writeText(href);
      setShared(true);
      window.setTimeout(() => setShared(false), 1200);
    } catch {
      /* dismissed share sheet */
    }
  }

  toggleRef.current = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.ended || phase === "ended") {
      audio.currentTime = 0;
      setPhase("live");
    }
    if (audio.paused) {
      ensureGraph();
      void audio
        .play()
        .then(() => {
          setPhase("live");
          resumeVideos();
        })
        .catch(() => setPhase("gate"));
    } else {
      audio.pause();
    }
  };

  useEffect(() => {
    aliveRef.current = true;
    const loadedOffsets = loadOffsets();
    const loadedLocks = loadLocks();
    offsetsRef.current = loadedOffsets;
    locksRef.current = loadedLocks;
    setOffsets(loadedOffsets);
    setLocks(loadedLocks);
    try {
      if (localStorage.getItem(KARAOKE_KEY) === "1") {
        karaokeRef.current = true;
        setKaraoke(true);
      }
    } catch {
      /* ignore */
    }
    let gone = false;
    void loadLyricLines()
      .then((result) => {
        if (gone || localDirtyRef.current) return;
        const nextOffsets = offsetsRef.current.slice();
        let nextLocks = locksRef.current.slice();
        let locksChanged = false;
        for (const line of result.lines) {
          if (line.index < 0 || line.index >= nextOffsets.length || pendingRef.current.has(line.index)) continue;
          nextOffsets[line.index] = clampOffset(line.offsetMs / 1000);
          if (!touchedLocksRef.current.has(line.index)) {
            if (nextLocks[line.index] !== line.locked) locksChanged = true;
            nextLocks[line.index] = line.locked;
          }
          savedSigRef.current.set(
            line.index,
            `${Math.round(nextOffsets[line.index] * 1000)}:${nextLocks[line.index] ? 1 : 0}`,
          );
        }
        saveOffsets(nextOffsets);
        if (locksChanged) saveLocks(nextLocks);
        note(
          result.lines.length > 0 ? "行ごとのずれを戻しました" : "行を選ぶと、その行だけ動きます",
          result.lines.length > 0 ? "ok" : "muted",
        );
      })
      .catch(() => {
        if (!gone) note("保存先に届かず、この画面の記憶です", "bad");
      });
    return () => {
      gone = true;
      aliveRef.current = false;
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (pendingRef.current.size > 0) flushRef.current();
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) paintRef.current(audio.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const audio = document.createElement("audio");
    audio.src = "/audio/shu.m4a";
    bindAudio(audio);
    audioRef.current = audio;
    audioHostRef.current?.appendChild(audio);
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      /* unsupported */
    }
    return () => {
      graphRef.current?.close();
      graphRef.current = null;
      audio.pause();
      audio.remove();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        toggleRef.current();
      } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const audio = audioRef.current;
        if (!audio) return;
        const delta = event.key === "ArrowRight" ? 5 : -5;
        seek(Math.min(DURATION, Math.max(0, audio.currentTime + delta)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!sheet) return;
    activeLineRef.current?.scrollIntoView({ block: "nearest" });
  }, [cueIndex, sheet]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        if (graphRef.current) replaceAudioRef.current();
        return;
      }
      if (!karaokeRef.current || graphRef.current) return;
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      try {
        const graph = createVocalGraph(audio, false);
        graphRef.current = graph;
        void graph.context.resume().then(() => {
          if (graph.context.state !== "running") replaceAudioRef.current();
        });
      } catch {
        /* autoplay graph blocked */
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => {
    let at: number | null = null;
    const fromUrl = Number(new URLSearchParams(window.location.search).get("t"));
    if (Number.isFinite(fromUrl) && fromUrl > 1 && fromUrl < DURATION - 2) at = fromUrl;
    else {
      try {
        const saved = Number(localStorage.getItem(RESUME_KEY));
        if (Number.isFinite(saved) && saved > 1 && saved < DURATION - 2) at = saved;
      } catch {
        /* ignore */
      }
    }
    if (at == null) return;
    setResumeAt(at);
    const audio = audioRef.current;
    const place = () => {
      if (!audio) return;
      audio.currentTime = at as number;
      paintRef.current(at as number);
    };
    if (audio && audio.readyState >= 1) place();
    else audio?.addEventListener("loadedmetadata", place, { once: true });
  }, []);

  useEffect(() => {
    if (!playing) return;
    document.querySelectorAll("video").forEach((node) => {
      const video = node as HTMLVideoElement;
      video.muted = true;
      void video.play().catch(() => {});
    });
  }, [sceneIndex, playing]);

  useEffect(() => {
    const session = navigator.mediaSession;
    if (!session) return;
    const origin = window.location.origin;
    session.metadata = new MediaMetadata({
      title: "朱のうなじ",
      artist: "朱のうなじ",
      album: "夜の映像",
      artwork: [{ src: `${origin}/mv/nape.jpg`, sizes: "512x512", type: "image/jpeg" }],
    });
    const play = () => toggleRef.current();
    const next = () => stepLineRef.current(1);
    const prev = () => stepLineRef.current(-1);
    const back = (details: MediaSessionActionDetails) => {
      const audio = audioRef.current;
      if (audio) seekRef.current(audio.currentTime - (details.seekOffset || 10));
    };
    const forward = (details: MediaSessionActionDetails) => {
      const audio = audioRef.current;
      if (audio) seekRef.current(audio.currentTime + (details.seekOffset || 10));
    };
    const to = (details: MediaSessionActionDetails) => {
      if (typeof details.seekTime === "number") seekRef.current(details.seekTime);
    };
    try {
      session.setActionHandler("play", play);
      session.setActionHandler("pause", play);
      session.setActionHandler("nexttrack", next);
      session.setActionHandler("previoustrack", prev);
      session.setActionHandler("seekbackward", back);
      session.setActionHandler("seekforward", forward);
      session.setActionHandler("seekto", to);
    } catch {
      /* ignore */
    }
    return () => {
      try {
        session.setActionHandler("play", null);
        session.setActionHandler("pause", null);
        session.setActionHandler("nexttrack", null);
        session.setActionHandler("previoustrack", null);
        session.setActionHandler("seekbackward", null);
        session.setActionHandler("seekforward", null);
        session.setActionHandler("seekto", null);
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const request = () => {
      if (!playing || gone || !("wakeLock" in navigator)) return;
      void navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (gone || !playing) void sentinel.release().catch(() => {});
          else lock = sentinel;
        })
        .catch(() => {});
    };
    const release = () => {
      void lock?.release().catch(() => {});
      lock = null;
    };
    if (playing) request();
    else release();
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      gone = true;
      release();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [playing]);

  const shown = pin >= 0 ? pin : cueIndex;
  const shownOffset = shown >= 0 ? (offsets[shown] ?? 0) : 0;
  const current = cueIndex >= 0 ? CUES[cueIndex] : null;
  const previous = cueIndex > 0 ? CUES[cueIndex - 1] : null;
  const upcoming = cueIndex >= 0 ? (CUES[cueIndex + 1] ?? null) : CUES[0];
  const section = current?.section ?? "序";
  const line = current?.text ?? "朱のうなじ";
  const marks = sectionMarks(offsets);

  return (
    <main
      className="film"
      onClick={(event) => {
        if (swiped.current) {
          swiped.current = false;
          return;
        }
        const el = event.target as HTMLElement;
        if (el.closest("button, input, a, [data-ui]")) return;
        toggleRef.current();
      }}
    >
      <header className="topbar">
        <h1 className="song-vert">朱のうなじ</h1>
        <button type="button" className="section-chip" onClick={() => goSection(cueIndex >= 0 ? cueIndex : 0)}>
          {section}
        </button>
      </header>
      <div ref={audioHostRef} className="bg-audio" />
      <div
        className="stage"
        aria-hidden="true"
        onPointerDown={(event) => {
          swipeRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
        }}
        onPointerUp={(event) => {
          const start = swipeRef.current;
          swipeRef.current = null;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) < 48) return;
          swiped.current = true;
          if (Math.abs(dx) > Math.abs(dy)) stepScene(dx < 0 ? 1 : -1);
          else seek((audioRef.current?.currentTime ?? 0) + (dy < 0 ? 10 : -10));
        }}
      >
        {SCENES.map((scene, index) => {
          const on = index === sceneIndex;
          return (
            <div key={`${scene.t}-${scene.still}`} className={on ? "frame frame-on" : "frame"}>
              <img
                src={scene.still}
                alt=""
                draggable={false}
                className={on ? `media ken-${scene.ken}` : "media"}
                style={on ? { animationDuration: `${sceneSpan(index)}s` } : undefined}
              />
              {scene.video && on ? (
                <video
                  key={`${scene.t}-v`}
                  ref={(node) => syncVideo(node, scene.t)}
                  className={`media ken-${scene.ken}`}
                  style={{ animationDuration: `${sceneSpan(index)}s` }}
                  src={scene.video}
                  poster={scene.still}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : null}
            </div>
          );
        })}
        <div className="vignette" />
        <div className="scrim" />
        <div className="grain" />
        <div className="petals" aria-hidden="true">
          {Array.from({ length: 14 }, (_, n) => (
            <span key={n} className={`petal petal-${n}`} />
          ))}
        </div>
      </div>

      {phase === "gate" ? (
        <div className="gate">
          <p className="eyebrow">夜の映像</p>
          <p className="gate-title">朱のうなじ</p>
          <p className="gate-sub">まだ、行かせない。</p>
          <button type="button" className="gate-play" onClick={() => toggleRef.current()}>
            <Play aria-hidden="true" size={18} strokeWidth={1.5} />
            <span>{resumeAt != null ? "続きから" : karaoke ? "歌なしで再生" : "再生"}</span>
          </button>
          <p className="gate-links">
            <a href="/terms" className="terms-link">
              配信規約
            </a>
          </p>
        </div>
      ) : null}

      {phase === "ended" && !playing ? (
        <div className="gate">
          <p className="eyebrow">余韻</p>
          <p className="gate-title">朝の手前</p>
          <p className="gate-sub">もう一度、夜を。</p>
          <button type="button" className="gate-play" onClick={() => toggleRef.current()}>
            <RotateCcw aria-hidden="true" size={18} strokeWidth={1.5} />
            <span>もう一度</span>
          </button>
          <p className="gate-links">
            <a href="/terms" className="terms-link">
              配信規約
            </a>
          </p>
        </div>
      ) : null}

      {timing ? (
        <TimingPanel
          offset={shownOffset}
          offsets={offsets}
          locks={locks}
          cueIndex={shown}
          canNudge={shown >= 0}
          canAlign={phase !== "gate" && shown >= 0 && !locks[shown]}
          locked={shown >= 0 && locks[shown] === true}
          status={status}
          statusKind={statusKind}
          audioTimeRef={audioClockRef}
          lyricTimeRef={lyricClockRef}
          onNudge={nudgeShown}
          onSeek={goLine}
          onAlign={alignShown}
          onReset={resetShown}
          onToggleLock={() => toggleLock()}
          onOpenTimeline={() => setTimeline(true)}
          onClose={() => setTiming(false)}
        />
      ) : null}

      {timeline ? (
        <TimelineEditor
          offsets={offsets}
          locks={locks}
          cueIndex={cueIndex}
          playing={playing}
          audioRef={audioRef}
          onSeekTime={(time) => seek(time, true)}
          onCommit={(index, offset) => {
            if (!locked(index) && writeOffset(index, offset)) goLine(index);
          }}
          onNudge={(index, delta) => {
            if (!locked(index) && writeOffset(index, (offsetsRef.current[index] ?? 0) + delta)) goLine(index);
          }}
          onReset={(index) => {
            if (!locked(index) && writeOffset(index, 0)) goLine(index);
          }}
          onToggleLock={toggleLock}
          onTogglePlay={() => toggleRef.current()}
          onClose={() => setTimeline(false)}
        />
      ) : null}

      <div className="dock" data-ui="">
        {sheet ? (
          <section className="sheet" aria-label="歌詞">
            <div className="sheet-head">
              <h2>歌詞</h2>
              <button
                type="button"
                className="text-btn sheet-nudge"
                onClick={() => nudgeShown(0.1)}
                disabled={shown < 0 || locks[shown] === true}
              >
                早める
              </button>
              <button
                type="button"
                className="text-btn sheet-nudge"
                onClick={() => nudgeShown(-0.1)}
                disabled={shown < 0 || locks[shown] === true}
              >
                遅らせる
              </button>
              <button type="button" className="text-btn" onClick={() => setSheet(false)}>
                閉じる
              </button>
            </div>
            <div className="sheet-scroll">
              {CUES.map((item, index) => (
                <button
                  key={`${item.t}-${index}`}
                  type="button"
                  ref={index === cueIndex ? activeLineRef : undefined}
                  className={[index === cueIndex ? "line line-on" : "line", locks[index] ? "line-lock" : ""].join(" ")}
                  onClick={() => goLine(index)}
                >
                  <span className="line-sec">{item.section}</span>
                  <span>{locks[index] ? `🔒 ${item.text}` : item.text}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="lyric-block">
            <button type="button" className="lyric-kicker" onClick={() => goSection(cueIndex >= 0 ? cueIndex : 0)}>
              {karaoke ? `${section} · 歌なし` : section}
            </button>
            <button type="button" className="lyric-prev" onClick={() => goRelative(-1)} disabled={!previous}>
              {previous ? previous.text : " "}
            </button>
            <button
              type="button"
              ref={lyricRef}
              className={loopMode === "line" ? "lyric-current lyric-loop" : "lyric-current"}
              onClick={toggleLineLoop}
            >
              {line}
            </button>
            <button type="button" className="lyric-next" onClick={() => goRelative(1)} disabled={!upcoming}>
              {upcoming ? upcoming.text : " "}
            </button>
          </div>
        )}

        <div className="transport">
          <div className="seek-wrap">
            <input
              ref={rangeRef}
              className="seek"
              type="range"
              min={0}
              max={DURATION}
              step={0.05}
              defaultValue={0}
              aria-label="再生位置"
              onPointerDown={() => {
                scrubbing.current = true;
              }}
              onPointerUp={() => {
                scrubbing.current = false;
              }}
              onPointerCancel={() => {
                scrubbing.current = false;
              }}
              onInput={(event) => seek(Number(event.currentTarget.value))}
            />
            <div className="seek-marks">
              {marks.map((mark) => (
                <button
                  key={mark.index}
                  type="button"
                  className="seek-mark"
                  style={{ left: `${(mark.t / DURATION) * 100}%` }}
                  aria-label={`${mark.name}へ`}
                  onClick={() => seek(mark.t)}
                />
              ))}
            </div>
          </div>
          <div className="transport-row">
            <button
              type="button"
              className="icon-btn"
              aria-label={playing ? "一時停止" : "再生"}
              onClick={() => toggleRef.current()}
            >
              {playing ? (
                <Pause aria-hidden="true" size={22} strokeWidth={1.5} />
              ) : phase === "ended" ? (
                <RotateCcw aria-hidden="true" size={20} strokeWidth={1.5} />
              ) : (
                <Play aria-hidden="true" size={22} strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              className={remain ? "time time-btn time-remain" : "time time-btn"}
              aria-label={remain ? "残り時間。タップで経過に戻す" : "経過時間。タップで残りに切替"}
              aria-pressed={remain}
              onClick={() => {
                remainRef.current = !remainRef.current;
                setRemain(remainRef.current);
                const audio = audioRef.current;
                if (audio) paintRef.current(audio.currentTime);
              }}
            >
              <span ref={timeRef}>0:00</span>
            </button>
            <span className="time time-dim">{fmt(DURATION)}</span>
            <span className="transport-gap" />
            <button
              type="button"
              className={loopMode === "section" ? "icon-btn icon-on" : "icon-btn"}
              aria-label={loopMode === "section" ? "くり返しをやめる" : "節をくり返す"}
              aria-pressed={loopMode === "section"}
              onClick={toggleSectionLoop}
            >
              <Repeat aria-hidden="true" size={20} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={shared ? "時刻つきリンクを渡しました" : "時刻つきリンクを渡す"}
              onClick={() => void shareLink()}
            >
              {shared ? (
                <Check aria-hidden="true" size={20} strokeWidth={1.5} />
              ) : (
                <Link2 aria-hidden="true" size={20} strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              className={karaoke ? "icon-btn icon-on" : "icon-btn"}
              aria-label={karaoke ? "ボーカルを戻す" : "ボーカルを消す"}
              aria-pressed={karaoke}
              onClick={toggleKaraoke}
            >
              {karaoke ? (
                <MicOff aria-hidden="true" size={20} strokeWidth={1.5} />
              ) : (
                <MicVocal aria-hidden="true" size={20} strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={muted ? "音を出す" : "音を消す"}
              aria-pressed={muted}
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? (
                <VolumeX aria-hidden="true" size={20} strokeWidth={1.5} />
              ) : (
                <Volume2 aria-hidden="true" size={20} strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              className={timing ? "icon-btn icon-on" : "icon-btn"}
              aria-label="タイミング"
              aria-pressed={timing}
              onClick={() => setTiming((open) => !open)}
            >
              <Timer aria-hidden="true" size={20} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className={sheet ? "icon-btn icon-on" : "icon-btn"}
              aria-label="歌詞"
              aria-pressed={sheet}
              onClick={() => setSheet((open) => !open)}
            >
              <ListMusic aria-hidden="true" size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
