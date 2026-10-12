/*
  夜の一曲。時計は audio の currentTime。場面は生の時刻、歌詞は行のずれを引いた時刻。
  白塗りは、行の中の範囲ごとの速さと始まり。範囲が無い行は仮の一本。行の頭のずれとは別。
  毎フレームの塗りは film-paint。ここは rAF を回すだけ。場面か行が変わったときだけ描き直す。
  音と歌なしは film-audio。同じ要素にグラフを二度付けない。vocal.ts は戻さない。
  夜の題と場面は film-stage。歌詞と輸送は film-night。クラス名は変えない。
  タイミングとタイムラインは film-tools。開くまで読まない。
  ずれのまとめは line-memory。lyric_lines が正。届かなかったときの控えは localStorage。届いたことにしない。
  続きの位置は resume-at。この画面だけ。サーバには書かない。
  シークの範囲とくり返しを外す判断は film-seek。巻き戻しの時刻は film-paint。音を動かすのはここ。
  キーの意味は film-keys。入力欄では何もしない。
  共有リンクは film-share。開くのはここ。行のずれは載せない。
  画面を消さないのは film-wake。再生中だけ。
  再生の切り替えは film-play。終わりからは頭に戻す。音を鳴らすのはここ。
  ロック画面は film-session。再生そのものはここ。
  動画の頭は film-video。音に合わせ、音は消す。
*/
import { useEffect, useRef, useState } from "react";
import {
  CUES,
  DURATION,
  clampOffset,
  cueHeardAt,
  lyricWipeSpan,
  sectionMarks,
  zeroLocks,
  zeroOffsets,
} from "@/data/score";
import { createLineMemory } from "@/lib/line-memory";
import { pushSync, scoreStamp, syncFrame } from "@/lib/sync-log";
import { SyncLogPanel } from "@/components/sync-log-panel";
import type { WipeSpan } from "@/lib/wipe-span";
import { createResumeClock, readResume } from "@/lib/resume-at";
import { paintFilmFrame, type FilmLoop } from "@/components/film-paint";
import { playIfPaused, playbackEvent, togglePlayback, type FilmPhase } from "@/components/film-play";
import { bindMediaSession, sessionMetadata, sessionPosition } from "@/components/film-session";
import { resumeVideo, syncSceneVideo } from "@/components/film-video";
import {
  clampSeek,
  seekLanded,
  seekWrite,
  lineLoop,
  loopAfterLine,
  loopAfterSection,
  nextSceneTime,
  sceneVideoInto,
  sectionLoop,
  sectionStart,
  stepCue,
} from "@/components/film-seek";
import { createFilmDeck } from "@/components/film-audio";
import { filmKey, KEY_STEP } from "@/components/film-keys";
import { SHARE_FLASH, SHARE_TITLE, shareHref } from "@/components/film-share";
import { createWakeHold } from "@/components/film-wake";
import { FilmDock, FilmGate } from "@/components/film-night";
import { FilmStage, FilmTitle } from "@/components/film-stage";
import { FilmTools } from "@/components/film-tools";

const KARAOKE_KEY = "shu-karaoke";

type StatusKind = "ok" | "bad" | "muted";

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
  const wipesRef = useRef<(WipeSpan[] | null)[]>(zeroOffsets().map(() => null));
  const endsRef = useRef<(number | null)[]>(zeroOffsets().map(() => null));
  const locksRef = useRef(zeroLocks());
  const pinRef = useRef<number | null>(null);
  const cueRef = useRef(-1);
  const sceneRef = useRef(0);
  const loopRef = useRef<FilmLoop | null>(null);
  const remainRef = useRef(false);
  const swiped = useRef(false);
  const syncMark = useRef(0);
  const seekWant = useRef<number | null>(null);
  const seekBusy = useRef(false);
  const seekResume = useRef(false);
  const flushSeekRef = useRef<() => void>(() => {});
  const resumeRef = useRef<ReturnType<typeof createResumeClock> | null>(null);
  const paintRef = useRef<(t: number) => void>(() => {});
  const toggleRef = useRef<() => void>(() => {});
  const seekRef = useRef<(t: number) => void>(() => {});
  const stepLineRef = useRef<(dir: number) => void>(() => {});
  const noteRef = useRef<(text: string, kind: StatusKind) => void>(() => {});
  const memoryRef = useRef<ReturnType<typeof createLineMemory> | null>(null);
  const deckRef = useRef<ReturnType<typeof createFilmDeck> | null>(null);
  const audioListenRef = useRef<{
    onPlay: (audio: HTMLAudioElement) => void;
    onPause: (audio: HTMLAudioElement) => void;
    onEnded: () => void;
    onTick: (audio: HTMLAudioElement) => void;
    onElement: (audio: HTMLAudioElement | null) => void;
  }>({
    onPlay: () => {},
    onPause: () => {},
    onEnded: () => {},
    onTick: () => {},
    onElement: () => {},
  });
  if (deckRef.current === null) {
    deckRef.current = createFilmDeck({
      onPlay: (audio) => audioListenRef.current.onPlay(audio),
      onPause: (audio) => audioListenRef.current.onPause(audio),
      onEnded: () => audioListenRef.current.onEnded(),
      onTick: (audio) => audioListenRef.current.onTick(audio),
      onElement: (audio) => audioListenRef.current.onElement(audio),
    });
  }
  const deck = deckRef.current;

  const [cueIndex, setCueIndex] = useState(-1);
  const [pin, setPin] = useState(-1);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<FilmPhase>("gate");
  const [sheet, setSheet] = useState(false);
  const [muted, setMuted] = useState(false);
  const [offsets, setOffsets] = useState(zeroOffsets);
  const [wipes, setWipes] = useState<(WipeSpan[] | null)[]>(() => zeroOffsets().map(() => null));
  const [ends, setEnds] = useState<(number | null)[]>(() => zeroOffsets().map(() => null));
  const [locks, setLocks] = useState(zeroLocks);
  const [adjusted, setAdjusted] = useState<number[]>(() => zeroOffsets().map(() => 0));
  const [timing, setTiming] = useState(false);
  const [timeline, setTimeline] = useState(false);
  const [status, setStatus] = useState("行をタップすると、その行だけ動きます");
  const [statusKind, setStatusKind] = useState<StatusKind>("muted");
  const [loopMode, setLoopMode] = useState<"line" | "section" | null>(null);
  const [loopLine, setLoopLine] = useState<number | null>(null);
  const [remain, setRemain] = useState(false);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const [karaoke, setKaraoke] = useState(false);
  const [rate, setRate] = useState(1);

  if (memoryRef.current === null) {
    memoryRef.current = createLineMemory({
      note: (text, kind) => noteRef.current(text, kind),
      offsets: (next) => {
        offsetsRef.current = next;
        setOffsets(next);
      },
      wipes: (next) => {
        wipesRef.current = next;
        setWipes(next);
      },
      ends: (next) => {
        endsRef.current = next;
        setEnds(next);
      },
      locks: (next) => {
        locksRef.current = next;
        setLocks(next);
      },
      adjusted: (next) => setAdjusted(next),
      trace: (line) => pushSync(line),
    });
  }
  const memory = memoryRef.current;
  if (resumeRef.current === null) resumeRef.current = createResumeClock();
  const resumeClock = resumeRef.current;

  function note(text: string, kind: StatusKind) {
    setStatus(text);
    setStatusKind(kind);
  }
  noteRef.current = note;

  function clearResumeAt() {
    resumeClock.end();
    setResumeAt(null);
  }

  function publishSession(audio: HTMLAudioElement) {
    const session = navigator.mediaSession;
    if (!session?.setPositionState) return;
    const state = sessionPosition({
      paused: audio.paused,
      rate: audio.playbackRate,
      time: audio.currentTime,
    });
    try {
      session.playbackState = state.playbackState;
      session.setPositionState({
        duration: state.duration,
        playbackRate: state.playbackRate,
        position: state.position,
      });
    } catch {
      /* some browsers reject a position past duration */
    }
  }

  audioListenRef.current = {
    onPlay: (audio) => {
      setPlaying(playbackEvent("play").playing);
      publishSession(audio);
    },
    onPause: (audio) => {
      if (seekBusy.current) return;
      const next = playbackEvent("pause", audio.ended);
      setPlaying(next.playing);
      if (next.saveResume) resumeClock.pause(audio.currentTime);
      publishSession(audio);
    },
    onEnded: () => {
      const next = playbackEvent("ended");
      setPlaying(next.playing);
      if (next.phase) setPhase(next.phase);
      if (next.clearResume) clearResumeAt();
    },
    onTick: (audio) => {
      publishSession(audio);
      if (document.visibilityState !== "visible") paintRef.current(audio.currentTime);
    },
    onElement: (audio) => {
      audioRef.current = audio;
      if (!audio) return;
      audio.addEventListener("seeked", () => {
        seekBusy.current = false;
        const want = seekWant.current;
        pushSync(`seeked at=${audio.currentTime.toFixed(2)} want=${want == null ? "-" : want.toFixed(2)}`);
        if (want != null && Math.abs(audio.currentTime - want) < 0.15) seekWant.current = null;
        flushSeekRef.current();
      });
      const logAudio = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : null;
        pushSync(
          syncFrame({
            time: audio.currentTime,
            duration,
            rate: audio.playbackRate,
            ready: audio.readyState,
            index: -1,
            offsets: offsetsRef.current,
          }).replace("cue=-", `src=${audio.currentSrc || audio.src}`),
        );
      };
      audio.addEventListener("loadedmetadata", logAudio);
      audio.addEventListener("durationchange", logAudio);
    },
  };

  function toggleKaraoke() {
    const next = deck.toggle();
    setKaraoke(next);
    try {
      localStorage.setItem(KARAOKE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  paintRef.current = (t: number) => {
    const audio = audioRef.current;
    const frame = paintFilmFrame(
      {
        time: t,
        offsets: offsetsRef.current,
        pin: pinRef.current,
        loop: loopRef.current,
        remain: remainRef.current,
        scene: sceneRef.current,
        heard: cueRef.current,
        hasAudio: audio != null,
        wipes: wipesRef.current,
        ends: endsRef.current,
      },
      {
        time: timeRef.current,
        audioClock: audioClockRef.current,
        lyricClock: lyricClockRef.current,
        range: rangeRef.current,
        lyric: lyricRef.current,
        scrubbing: scrubbing.current,
      },
    );
    if (audio && frame.rewindTo != null) audio.currentTime = frame.rewindTo;
    if (frame.clearLoop) {
      loopRef.current = null;
      setLoopMode(null);
      setLoopLine(null);
    }
    if (frame.sceneChanged) {
      sceneRef.current = frame.scene;
      setSceneIndex(frame.scene);
    }
    if (frame.pinChanged) {
      pinRef.current = frame.pin;
      setPin(frame.pin == null ? -1 : frame.pin);
    }
    if (frame.heardChanged) {
      cueRef.current = frame.heard;
      setCueIndex(frame.heard);
    }
    if (audio && !audio.paused && (frame.heardChanged || performance.now() - syncMark.current > 2000)) {
      syncMark.current = performance.now();
      const duration = Number.isFinite(audio.duration) ? audio.duration : null;
      pushSync(
        syncFrame({
          time: frame.time,
          duration,
          rate: audio.playbackRate,
          ready: audio.readyState,
          index: frame.heard,
          offsets: offsetsRef.current,
        }),
      );
    }
    if (audio && !audio.paused) resumeClock.tick(performance.now(), frame.time);
  };

  function clearLoop() {
    if (!loopRef.current) return;
    loopRef.current = null;
    setLoopMode(null);
    setLoopLine(null);
  }

  function flushSeek() {
    const audio = audioRef.current;
    if (!audio) return;
    const decision = seekWrite(seekWant.current, audio.currentTime, seekBusy.current);
    if (decision === "wait") {
      if (!seekLanded(seekWant.current, seekBusy.current, seekResume.current)) return;
    }
    if (decision === "wait" || decision === "done") {
      seekWant.current = null;
      if (seekResume.current) {
        seekResume.current = false;
        void playIfPaused({
          paused: () => audio.paused,
          play: () => {
            deck.ensureGraph();
            return audio.play();
          },
          onLive: () => {
            setPhase("live");
            resumeVideos();
          },
        });
      }
      return;
    }
    const want = seekWant.current as number;
    seekBusy.current = true;
    if (!audio.paused) {
      seekResume.current = true;
      audio.pause();
    }
    pushSync(`seek ${audio.currentTime.toFixed(2)} → ${want.toFixed(2)}`);
    try {
      audio.currentTime = want;
    } catch {
      seekBusy.current = false;
    }
  }
  flushSeekRef.current = flushSeek;

  function previewSeek(time: number) {
    const at = clampSeek(time);
    seekWant.current = at;
    if (rangeRef.current) rangeRef.current.style.setProperty("--pct", `${(at / DURATION) * 100}%`);
    paintRef.current(at);
  }

  function seek(time: number, andPlay = false) {
    const audio = audioRef.current;
    if (!audio) return;
    previewSeek(time);
    if (andPlay) seekResume.current = true;
    const video = document.querySelector(".frame-on video");
    if (video instanceof HTMLVideoElement) {
      const into = sceneVideoInto(seekWant.current ?? 0, video.duration);
      if (into != null) {
        try {
          video.currentTime = into;
        } catch {
          /* ignore */
        }
      }
    }
    publishSession(audio);
    flushSeek();
  }
  seekRef.current = (time) => seek(time);

  function resumeVideos() {
    document.querySelectorAll("video").forEach((node) => {
      if (node instanceof HTMLVideoElement) resumeVideo(node);
    });
  }

  function syncVideo(video: HTMLVideoElement | null, sceneStart: number) {
    const audio = audioRef.current;
    syncSceneVideo(video, {
      sceneStart,
      audioTime: audio ? audio.currentTime : null,
      audioPlaying: audio != null && !audio.paused,
    });
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
    const next = stepCue(cueRef.current, dir);
    if (next == null) return;
    if (loopAfterLine(loopRef.current, next) == null) clearLoop();
    goLine(next);
  }
  stepLineRef.current = goRelative;

  function goSection(index: number) {
    const from = sectionStart(index);
    if (loopAfterSection(loopRef.current, from) == null) clearLoop();
    goLine(from);
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
    memory.commitOffsets(next);
    memory.queue(index);
    return true;
  }

  function writeWipe(index: number, spans: WipeSpan[] | null) {
    if (index < 0 || locked(index)) return;
    memory.setWipe(index, spans);
  }

  function writeEnd(index: number, end: number | null) {
    if (index < 0 || locked(index)) return;
    memory.setEnd(index, end);
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
    memory.commitLocks(next);
    memory.touch(index);
    memory.queue(index, false);
    note(next[index] ? "この行をロックしました" : "この行のロックを外しました", "ok");
  }

  function toggleSectionLoop() {
    if (loopRef.current?.kind === "section") {
      clearLoop();
      return;
    }
    const time = audioRef.current?.currentTime ?? 0;
    loopRef.current = sectionLoop(cueRef.current, time, offsetsRef.current);
    setLoopMode("section");
    setLoopLine(null);
  }

  function repeatLine(index: number, andPlay = false) {
    if (index < 0) return;
    if (loopRef.current?.kind === "line" && loopRef.current.from === index) {
      clearLoop();
      return;
    }
    loopRef.current = lineLoop(index);
    setLoopMode("line");
    setLoopLine(index);
    if (!andPlay) return;
    const cue = CUES[index];
    if (cue) seek(cueHeardAt(index, offsetsRef.current), true);
  }

  function toggleLineLoop() {
    repeatLine(cueRef.current);
  }

  function stepScene(dir: number) {
    seek(nextSceneTime(audioRef.current?.currentTime ?? 0, dir));
  }

  async function shareLink() {
    const href = shareHref(window.location.href, audioRef.current?.currentTime ?? 0);
    try {
      if (navigator.share) await navigator.share({ title: SHARE_TITLE, url: href });
      else await navigator.clipboard.writeText(href);
      setShared(true);
      window.setTimeout(() => setShared(false), SHARE_FLASH);
    } catch {
      /* dismissed share sheet */
    }
  }

  toggleRef.current = () => {
    const audio = audioRef.current;
    if (!audio) return;
    void togglePlayback({
      ended: audio.ended,
      phase,
      paused: () => audio.paused,
      seekStart: () => {
        audio.currentTime = 0;
      },
      play: () => {
        deck.ensureGraph();
        return audio.play();
      },
      pause: () => audio.pause(),
      onPhase: setPhase,
      onVideos: resumeVideos,
    });
  };

  useEffect(() => {
    if (timing || timeline) return;
    setRate(1);
    deck.setRate(1);
  }, [timing, timeline, deck]);

  useEffect(() => {
    pushSync(scoreStamp());
    const stop = memory.start();
    try {
      if (localStorage.getItem(KARAOKE_KEY) === "1") {
        deck.arm(true);
        setKaraoke(true);
      }
    } catch {
      /* ignore */
    }
    return stop;
  }, [memory]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !scrubbing.current) paintRef.current(seekWant.current ?? audio.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return deck.mount(audioHostRef.current);
  }, [deck]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = filmKey(event);
      if (!action) return;
      event.preventDefault();
      if (action === "play") {
        toggleRef.current();
        return;
      }
      const audio = audioRef.current;
      if (!audio) return;
      seek(clampSeek(audio.currentTime + (action === "forward" ? KEY_STEP : -KEY_STEP)));
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
    const at = readResume(window.location.search);
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
    resumeVideos();
  }, [sceneIndex, playing]);

  useEffect(() => {
    const session = navigator.mediaSession;
    if (!session) return;
    session.metadata = new MediaMetadata(sessionMetadata(window.location.origin));
    return bindMediaSession(session, {
      toggle: () => toggleRef.current(),
      stepLine: (dir) => stepLineRef.current(dir),
      seekBy: (delta) => {
        const audio = audioRef.current;
        if (audio) seekRef.current(audio.currentTime + delta);
      },
      seekTo: (time) => seekRef.current(time),
    });
  }, []);

  useEffect(() => {
    const hold = createWakeHold({
      request: "wakeLock" in navigator ? (type) => navigator.wakeLock.request(type) : null,
      listenVisible: (onVisible) => {
        const onChange = () => {
          if (document.visibilityState === "visible") onVisible();
        };
        document.addEventListener("visibilitychange", onChange);
        return () => document.removeEventListener("visibilitychange", onChange);
      },
    });
    hold.setPlaying(playing);
    return () => hold.stop();
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
      <SyncLogPanel />
      <FilmTitle section={section} onSection={() => goSection(cueIndex >= 0 ? cueIndex : 0)} />
      <div ref={audioHostRef} className="bg-audio" />
      <FilmStage
        sceneIndex={sceneIndex}
        syncVideo={syncVideo}
        onSwipe={(dx, dy) => {
          swiped.current = true;
          if (Math.abs(dx) > Math.abs(dy)) stepScene(dx < 0 ? 1 : -1);
          else seek((audioRef.current?.currentTime ?? 0) + (dy < 0 ? 10 : -10));
        }}
      />

      {phase === "gate" ? (
        <FilmGate ended={false} resume={resumeAt != null} karaoke={karaoke} onPlay={() => toggleRef.current()} />
      ) : null}

      {phase === "ended" && !playing ? (
        <FilmGate ended resume={false} karaoke={karaoke} onPlay={() => toggleRef.current()} />
      ) : null}

      <FilmTools
        timing={timing}
        timeline={timeline}
        shownOffset={shownOffset}
        offsets={offsets}
        locks={locks}
        adjusted={adjusted}
        shown={shown}
        canAlign={phase !== "gate" && shown >= 0 && !locks[shown]}
        status={status}
        statusKind={statusKind}
        audioTimeRef={audioClockRef}
        lyricTimeRef={lyricClockRef}
        cueIndex={cueIndex}
        playing={playing}
        audioRef={audioRef}
        onNudge={nudgeShown}
        onSeekLine={goLine}
        onAlign={alignShown}
        onReset={resetShown}
        onToggleLock={toggleLock}
        onOpenTimeline={() => setTimeline(true)}
        onCloseTiming={() => setTiming(false)}
        onSeekTime={(time) => seek(time, true)}
        onCommit={(index, offset) => {
          if (!locked(index) && writeOffset(index, offset)) goLine(index);
        }}
        onNudgeLine={(index, delta) => {
          if (!locked(index) && writeOffset(index, (offsetsRef.current[index] ?? 0) + delta)) goLine(index);
        }}
        onResetLine={(index) => {
          if (!locked(index) && writeOffset(index, 0)) goLine(index);
        }}
        onTogglePlay={() => toggleRef.current()}
        onCloseTimeline={() => setTimeline(false)}
        rate={rate}
        onRate={(next) => {
          setRate(next);
          deck.setRate(next);
        }}
      />

      <FilmDock
        sheet={sheet}
        karaoke={karaoke}
        section={section}
        previous={previous ? previous.text : null}
        line={line}
        upcoming={upcoming ? upcoming.text : null}
        lineLoop={loopMode === "line"}
        lineRepeating={loopMode === "line" && loopLine === shown}
        lyricRef={lyricRef}
        cueIndex={cueIndex}
        shown={shown}
        locks={locks}
        wipes={wipes}
        wipeEnd={shown >= 0 ? (ends[shown] ?? null) : null}
        wipeRoom={shown >= 0 ? lyricWipeSpan(shown, offsets).span : 0.4}
        onWipe={writeWipe}
        onWipeEnd={(end) => writeEnd(shown, end)}
        onToggleLock={() => toggleLock(shown)}
        onRepeatLine={() => repeatLine(shown, true)}
        activeLineRef={activeLineRef}
        marks={marks}
        rangeRef={rangeRef}
        timeRef={timeRef}
        playing={playing}
        ended={phase === "ended"}
        remain={remain}
        sectionLoop={loopMode === "section"}
        shared={shared}
        muted={muted}
        timing={timing}
        onSection={() => goSection(cueIndex >= 0 ? cueIndex : 0)}
        onPrev={() => goRelative(-1)}
        onLineLoop={toggleLineLoop}
        onNext={() => goRelative(1)}
        onNudge={nudgeShown}
        onGoLine={goLine}
        onCloseSheet={() => setSheet(false)}
        onScrubStart={() => {
          scrubbing.current = true;
        }}
        onScrubEnd={() => {
          const at = Number(rangeRef.current?.value ?? seekWant.current ?? 0);
          scrubbing.current = false;
          seek(at);
        }}
        onSeek={(time) => {
          if (scrubbing.current) previewSeek(time);
          else seek(time);
        }}
        onToggle={() => toggleRef.current()}
        onRemain={() => {
          remainRef.current = !remainRef.current;
          setRemain(remainRef.current);
          const audio = audioRef.current;
          if (audio) paintRef.current(audio.currentTime);
        }}
        onSectionLoop={toggleSectionLoop}
        onShare={() => void shareLink()}
        onKaraoke={toggleKaraoke}
        onMute={() => setMuted((value) => !value)}
        onTiming={() => setTiming((open) => !open)}
        onSheet={() => setSheet((open) => !open)}
      />
    </main>
  );
}
