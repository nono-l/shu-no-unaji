/*
  波形の上で行の頭を掴む。離した位置は clampOffset だけを通す。別の丸めをしない。
  ロック中の行は動かさない。
  波形は見える範囲だけ、音のサンプルから描く。粗い棒に潰すと、寄せても山が分からない。
*/
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Pause, Play } from "lucide-react";
import { CUES, DURATION, cueHeardAt, clampOffset } from "@/data/score";
import { SpeedPick, WhenLine, offsetDigits } from "@/components/film-speed";

const PAD = 28;
const ZOOMS = [14, 24, 40, 64, 120, 220, 480, 960, 1600];

type Props = {
  offsets: number[];
  locks: boolean[];
  adjusted: number[];
  cueIndex: number;
  playing: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  onSeekTime: (time: number) => void;
  onCommit: (index: number, offset: number) => void;
  onNudge: (index: number, delta: number) => void;
  onReset: (index: number) => void;
  onToggleLock: (index: number) => void;
  onTogglePlay: () => void;
  onClose: () => void;
  rate: number;
  onRate: (rate: number) => void;
};

function fmt(t: number, fine = false): string {
  const safe = Number.isFinite(t) ? Math.max(0, t) : 0;
  const head = `${Math.floor(safe / 60)}:`;
  const sec = safe % 60;
  if (!fine) return head + Math.floor(sec).toString().padStart(2, "0");
  return head + sec.toFixed(1).padStart(4, "0");
}

function phrase(offset: number, active: boolean, locked: boolean): string {
  if (!active) return "行を選ぶと、その行だけずれます";
  if (locked) return "この行はロックしています";
  if (Math.abs(offset) < 0.005) return "この行は音と揃っている";
  if (offset > 0) return `この行が ${offsetDigits(offset)}秒 早い`;
  return `この行が ${offsetDigits(offset)}秒 遅い`;
}

export function TimelineEditor({
  offsets,
  locks,
  adjusted,
  cueIndex,
  playing,
  audioRef,
  onSeekTime,
  onCommit,
  onNudge,
  onReset,
  onToggleLock,
  onTogglePlay,
  onClose,
  rate,
  onRate,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(ZOOMS[1]);
  const samplesRef = useRef<Float32Array | null>(null);
  const rateRef = useRef(48000);
  const followRef = useRef(true);
  const followUntil = useRef(0);
  const dragged = useRef(false);
  const [follow, setFollow] = useState(true);
  const [zoom, setZoom] = useState(ZOOMS[1]);
  const [draft, setDraft] = useState<{ index: number; offset: number } | null>(null);
  const [wave, setWave] = useState<Float32Array | null>(null);

  zoomRef.current = zoom;
  followRef.current = follow;

  function drawWave() {
    const canvas = canvasRef.current;
    const scroller = scrollRef.current;
    const samples = samplesRef.current;
    if (!canvas || !scroller) return;
    const view = Math.max(1, Math.floor(scroller.clientWidth));
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(view * ratio);
    canvas.height = Math.floor(96 * ratio);
    canvas.style.width = `${view}px`;
    canvas.style.height = "96px";
    canvas.style.left = `${scroller.scrollLeft}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx || !samples || samples.length === 0) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, view, 96);
    ctx.fillStyle = "rgba(212, 180, 131, 0.92)";
    const zoomNow = zoomRef.current;
    const rate = rateRef.current;
    const origin = scroller.scrollLeft;
    const mid = 48;
    const amp = 44;
    for (let x = 0; x < view; x++) {
      const t0 = (origin + x - PAD) / zoomNow;
      const t1 = (origin + x + 1 - PAD) / zoomNow;
      let i0 = Math.floor(t0 * rate);
      let i1 = Math.floor(t1 * rate);
      if (i1 <= i0) i1 = i0 + 1;
      if (i0 < 0) i0 = 0;
      if (i1 > samples.length) i1 = samples.length;
      const span = i1 - i0;
      const stride = span > 48 ? Math.floor(span / 24) : 1;
      let min = 0;
      let max = 0;
      for (let i = i0; i < i1; i += stride) {
        const value = samples[i] ?? 0;
        if (value < min) min = value;
        if (value > max) max = value;
      }
      const top = mid - max * amp;
      const bottom = mid - min * amp;
      ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
    }
  }

  const shown = offsets.map((offset, index) =>
    draft?.index === index ? draft.offset : offset,
  );
  const active = draft?.index ?? cueIndex;
  const activeOffset = active >= 0 ? (shown[active] ?? 0) : 0;
  const activeCue = active >= 0 ? CUES[active] : null;
  const locked = active >= 0 && locks[active] === true;
  const width = PAD + DURATION * zoom;
  const step = zoom >= 800 ? 0.1 : zoom >= 360 ? 0.5 : zoom >= 48 ? 1 : zoom >= 24 ? 5 : 10;

  function place(time: number, center: boolean) {
    const x = PAD + time * zoomRef.current;
    if (playheadRef.current) playheadRef.current.style.transform = `translateX(${x}px)`;
    if (clockRef.current) clockRef.current.textContent = fmt(time);
    const scroller = scrollRef.current;
    if (center && scroller) {
      followUntil.current = performance.now() + 160;
      scroller.scrollLeft = x - scroller.clientWidth / 2;
    }
  }

  function timeAt(clientX: number): number {
    const scroller = scrollRef.current;
    if (!scroller) return 0;
    const x = clientX - scroller.getBoundingClientRect().left + scroller.scrollLeft - PAD;
    return Math.min(DURATION, Math.max(0, x / zoomRef.current));
  }

  function seekAt(clientX: number) {
    followRef.current = true;
    setFollow(true);
    const time = timeAt(clientX);
    place(time, true);
    onSeekTime(time);
  }

  useEffect(() => {
    const scroller = scrollRef.current;
    const audio = audioRef.current;
    if (!scroller || !audio) return;
    followUntil.current = performance.now() + 160;
    scroller.scrollLeft = PAD + audio.currentTime * zoom - scroller.clientWidth / 2;
  }, [zoom, audioRef]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      const time = audio?.currentTime ?? 0;
      const x = PAD + time * zoomRef.current;
      if (playheadRef.current) playheadRef.current.style.transform = `translateX(${x}px)`;
      if (clockRef.current) clockRef.current.textContent = fmt(time);
      const scroller = scrollRef.current;
      if (scroller && followRef.current && audio && !audio.paused) {
        const target = x - scroller.clientWidth / 2;
        if (Math.abs(scroller.scrollLeft - target) > 1) {
          followUntil.current = performance.now() + 160;
          scroller.scrollLeft = target;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWave();
  }, [wave, zoom]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const bytes = await (await fetch("/audio/shu.m4a")).arrayBuffer();
        const context = new AudioContext();
        const buffer = await context.decodeAudioData(bytes.slice(0));
        const channel = buffer.getChannelData(0);
        const copy = new Float32Array(channel.length);
        copy.set(channel);
        const rate = buffer.sampleRate;
        await context.close();
        if (cancelled) return;
        samplesRef.current = copy;
        rateRef.current = rate;
        setWave(copy);
      } catch {
        /* waveform is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onScroll() {
    drawWave();
    if (performance.now() < followUntil.current) return;
    if (followRef.current) {
      followRef.current = false;
      setFollow(false);
    }
  }

  function jumpToNow() {
    const audio = audioRef.current;
    if (!audio) return;
    followRef.current = true;
    setFollow(true);
    place(audio.currentTime, true);
  }

  function onSheetDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    const move = (next: PointerEvent) => {
      if (!moved && Math.hypot(next.clientX - startX, next.clientY - startY) > 6) {
        moved = true;
        followRef.current = false;
        setFollow(false);
      }
    };
    const up = (next: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) seekAt(next.clientX);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function onClipDown(event: ReactPointerEvent<HTMLButtonElement>, index: number) {
    event.stopPropagation();
    if (locks[index]) return;
    const startX = event.clientX;
    const origin = offsets[index] ?? 0;
    let moved = false;
    let nextOffset = origin;
    const move = (next: PointerEvent) => {
      const delta = (next.clientX - startX) / zoomRef.current;
      if (Math.abs(next.clientX - startX) > 5) moved = true;
      nextOffset = clampOffset(Math.round((origin - delta) * 10) / 10);
      setDraft({ index, offset: nextOffset });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDraft(null);
      if (moved) {
        dragged.current = true;
        window.setTimeout(() => {
          dragged.current = false;
        }, 0);
        onCommit(index, nextOffset);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const ticks: number[] = [];
  if (step < 1) {
    const parts = Math.round(1 / step);
    for (let i = 0; i <= Math.floor(DURATION * parts); i++) ticks.push(i / parts);
  } else {
    for (let t = 0; t <= DURATION; t += step) ticks.push(t);
  }

  return (
    <section className="timeline-editor" data-ui="" role="dialog" aria-label="歌詞のタイムライン">
      <div className="tl-head">
        <h2>タイムライン</h2>
        <button type="button" className="text-btn" onClick={onClose}>
          閉じる
        </button>
      </div>
      <p className="tl-now">{activeCue ? activeCue.text : "朱のうなじ"}</p>
      <p className={locked ? "tl-phrase tl-phrase-lock" : "tl-phrase"}>
        {phrase(activeOffset, active >= 0, locked)}
      </p>
      <div className="tl-tools">
        <button
          type="button"
          className="icon-btn"
          aria-label={playing ? "一時停止" : "再生"}
          onClick={onTogglePlay}
        >
          {playing ? <Pause aria-hidden="true" size={18} strokeWidth={1.5} /> : <Play aria-hidden="true" size={18} strokeWidth={1.5} />}
        </button>
        <span ref={clockRef} className="tl-clock">
          0:00
        </span>
        <SpeedPick rate={rate} onRate={onRate} />
        <button
          type="button"
          className="timing-step"
          onClick={() => active >= 0 && onNudge(active, -0.1)}
          disabled={active < 0 || locked}
        >
          −0.1
        </button>
        <button
          type="button"
          className="timing-step"
          onClick={() => active >= 0 && onNudge(active, -0.01)}
          disabled={active < 0 || locked}
        >
          −0.01
        </button>
        <button
          type="button"
          className="timing-step"
          onClick={() => active >= 0 && onNudge(active, 0.01)}
          disabled={active < 0 || locked}
        >
          +0.01
        </button>
        <button
          type="button"
          className="timing-step"
          onClick={() => active >= 0 && onNudge(active, 0.1)}
          disabled={active < 0 || locked}
        >
          +0.1
        </button>
        <button
          type="button"
          className="text-btn"
          onClick={() => active >= 0 && onReset(active)}
          disabled={active < 0 || locked}
        >
          この行を0に
        </button>
        <button
          type="button"
          className={locked ? "text-btn timing-lock-on" : "text-btn"}
          onClick={() => active >= 0 && onToggleLock(active)}
          disabled={active < 0}
        >
          {locked ? "🔒 解除" : "ロック"}
        </button>
        <span className="transport-gap" />
        <button
          type="button"
          className="text-btn"
          onClick={() => setZoom((value) => ZOOMS[Math.max(0, ZOOMS.indexOf(value) - 1)] ?? value)}
          disabled={zoom === ZOOMS[0]}
        >
          引く
        </button>
        <button
          type="button"
          className="text-btn"
          onClick={() =>
            setZoom((value) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(value) + 1)] ?? value)
          }
          disabled={zoom === ZOOMS[ZOOMS.length - 1]}
        >
          寄る
        </button>
        <button type="button" className={follow ? "text-btn tl-follow" : "text-btn"} onClick={jumpToNow}>
          今へ
        </button>
      </div>
      <div ref={scrollRef} className="tl-scroll" onScroll={onScroll}>
        <div className="tl-sheet" style={{ width }} onPointerDown={onSheetDown}>
          <canvas ref={canvasRef} className="tl-wave" />
          <div className="tl-ruler">
            {ticks.map((tick) => (
              <span key={tick} className="tl-tick" style={{ left: PAD + tick * zoom }}>
                {fmt(tick, step < 1)}
              </span>
            ))}
          </div>
          <div className="tl-lane">
            {CUES.map((cue, index) => {
              const start = cueHeardAt(index, shown);
              const end = index + 1 < CUES.length ? cueHeardAt(index + 1, shown) : Math.min(DURATION, start + 4);
              const span = Math.max(0.35, end - start);
              const on = index === active;
              const lock = locks[index] === true;
              return (
                <button
                  key={`${cue.t}-${index}`}
                  type="button"
                  className={["tl-clip", on ? "tl-clip-on" : "", lock ? "tl-clip-lock" : ""].join(" ")}
                  style={{ left: PAD + start * zoom, width: Math.max(18, span * zoom - 3) }}
                  aria-label={`${cue.section} ${cue.text}。${lock ? "ロック中。" : ""}横にドラッグして出だしをずらす`}
                  onPointerDown={(event) => onClipDown(event, index)}
                  onClick={(event) => {
                    if (!dragged.current) seekAt(event.clientX);
                  }}
                >
                  <span>{lock ? `🔒 ${cue.section}` : cue.section}</span>
                  <span>{cue.text}</span>
                  <WhenLine at={adjusted[index] ?? 0} className="tl-when" />
                </button>
              );
            })}
          </div>
          <div ref={playheadRef} className="tl-playhead" />
        </div>
      </div>
      <p className="tl-hint">タップした位置から再生します。行を横にドラッグすると、その行の出だしだけ動きます</p>
    </section>
  );
}
