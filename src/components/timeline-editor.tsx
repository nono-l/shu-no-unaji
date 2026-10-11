import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Pause, Play } from "lucide-react";
import { CUES, DURATION, cueHeardAt, clampOffset } from "@/data/score";

const PAD = 28;
const ZOOMS = [14, 24, 40, 64];

type Props = {
  offsets: number[];
  locks: boolean[];
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
};

function fmt(t: number): string {
  const safe = Number.isFinite(t) ? Math.max(0, t) : 0;
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`;
}

function phrase(offset: number, active: boolean, locked: boolean): string {
  if (!active) return "行を選ぶと、その行だけずれます";
  if (locked) return "この行はロックしています";
  if (Math.abs(offset) < 0.05) return "この行は音と揃っている";
  if (offset > 0) return `この行が ${offset.toFixed(1)}秒 早い`;
  return `この行が ${Math.abs(offset).toFixed(1)}秒 遅い`;
}

export function TimelineEditor({
  offsets,
  locks,
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
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(ZOOMS[1]);
  const followRef = useRef(true);
  const followUntil = useRef(0);
  const dragged = useRef(false);
  const [follow, setFollow] = useState(true);
  const [zoom, setZoom] = useState(ZOOMS[1]);
  const [draft, setDraft] = useState<{ index: number; offset: number } | null>(null);
  const [wave, setWave] = useState<Float32Array | null>(null);

  zoomRef.current = zoom;
  followRef.current = follow;

  const shown = offsets.map((offset, index) =>
    draft?.index === index ? draft.offset : offset,
  );
  const active = draft?.index ?? cueIndex;
  const activeOffset = active >= 0 ? (shown[active] ?? 0) : 0;
  const activeCue = active >= 0 ? CUES[active] : null;
  const locked = active >= 0 && locks[active] === true;
  const width = PAD + DURATION * zoom;
  const step = zoom >= 48 ? 1 : zoom >= 24 ? 5 : 10;

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
    const pixelWidth = Math.max(1, Math.ceil(DURATION * zoom));
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(pixelWidth * ratio);
    canvas.height = Math.floor(96 * ratio);
    canvas.style.width = `${pixelWidth}px`;
    canvas.style.height = "96px";
    const ctx = canvas.getContext("2d");
    if (!ctx || !wave || wave.length === 0) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, 96);
    ctx.fillStyle = "rgba(212, 180, 131, 0.38)";
    const bar = pixelWidth / wave.length;
    for (let i = 0; i < wave.length; i++) {
      const height = Math.max(1, wave[i] * 88);
      ctx.fillRect(i * bar, (96 - height) / 2, Math.max(1, bar - 0.4), height);
    }
  }, [wave, zoom]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const bytes = await (await fetch("/audio/shu.m4a")).arrayBuffer();
        const context = new AudioContext();
        const buffer = await context.decodeAudioData(bytes.slice(0));
        await context.close();
        if (cancelled) return;
        const channel = buffer.getChannelData(0);
        const buckets = 720;
        const size = Math.max(1, Math.floor(channel.length / buckets));
        const peaks = new Float32Array(buckets);
        let max = 0;
        for (let i = 0; i < buckets; i++) {
          let sum = 0;
          let count = 0;
          const start = i * size;
          for (let sample = 0; sample < size; sample += 24) {
            sum += Math.abs(channel[start + sample] ?? 0);
            count += 1;
          }
          peaks[i] = count > 0 ? sum / count : 0;
          if (peaks[i] > max) max = peaks[i];
        }
        const scale = max > 0 ? max : 1;
        for (let i = 0; i < buckets; i++) peaks[i] /= scale;
        if (!cancelled) setWave(peaks);
      } catch {
        /* waveform is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onScroll() {
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
  for (let t = 0; t <= DURATION; t += step) ticks.push(t);

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
                {fmt(tick)}
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
