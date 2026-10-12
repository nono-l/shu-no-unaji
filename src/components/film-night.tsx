/*
  夜のゲート、歌詞、輸送。クラス名と並びは変えない。
  キー、共有の中身、スワイプ、スリープは持たない。押した先は殻が決める。
*/
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type Ref } from "react";
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
import { CUES, DURATION } from "@/data/score";
import { formatClock } from "@/components/film-paint";
import { WipePick } from "@/components/film-wipe";
import type { WipeSpan } from "@/lib/wipe-span";
import { covering } from "@/lib/wipe-span";

function placeLyricBlock(block: HTMLElement, spot: { left: number; top: number; width: number }) {
  block.dataset.placed = "1";
  block.style.position = "fixed";
  block.style.left = `${spot.left}px`;
  block.style.top = `${spot.top}px`;
  block.style.width = `${spot.width}px`;
  block.style.right = "auto";
  block.style.bottom = "auto";
  block.style.zIndex = "7";
  block.style.margin = "0";
}

export function FilmGate({
  ended,
  resume,
  karaoke,
  onPlay,
}: {
  ended: boolean;
  resume: boolean;
  karaoke: boolean;
  onPlay: () => void;
}) {
  return (
    <div className="gate">
      <p className="eyebrow">{ended ? "余韻" : "夜の映像"}</p>
      <p className="gate-title">{ended ? "朝の手前" : "朱のうなじ"}</p>
      <p className="gate-sub">{ended ? "もう一度、夜を。" : "まだ、行かせない。"}</p>
      <button type="button" className="gate-play" onClick={onPlay}>
        {ended ? (
          <RotateCcw aria-hidden="true" size={18} strokeWidth={1.5} />
        ) : (
          <Play aria-hidden="true" size={18} strokeWidth={1.5} />
        )}
        <span>{ended ? "もう一度" : resume ? "続きから" : karaoke ? "歌なしで再生" : "再生"}</span>
      </button>
      <p className="gate-links">
        <a href="/terms" className="terms-link">
          配信規約
        </a>
      </p>
    </div>
  );
}

export function FilmDock({
  sheet,
  karaoke,
  section,
  previous,
  line,
  upcoming,
  lineLoop,
  lyricRef,
  cueIndex,
  shown,
  locks,
  wipes,
  wipeEnd,
  wipeRoom,
  onWipe,
  onWipeEnd,
  onToggleLock,
  onRepeatLine,
  lineRepeating,
  activeLineRef,
  marks,
  rangeRef,
  timeRef,
  playing,
  ended,
  remain,
  sectionLoop,
  shared,
  muted,
  timing,
  onSection,
  onPrev,
  onLineLoop,
  onNext,
  onNudge,
  onGoLine,
  onCloseSheet,
  onScrubStart,
  onScrubEnd,
  onSeek,
  onToggle,
  onRemain,
  onSectionLoop,
  onShare,
  onKaraoke,
  onMute,
  onTiming,
  onSheet,
}: {
  sheet: boolean;
  karaoke: boolean;
  section: string;
  previous: string | null;
  line: string;
  upcoming: string | null;
  lineLoop: boolean;
  lyricRef: Ref<HTMLButtonElement>;
  cueIndex: number;
  shown: number;
  locks: boolean[];
  wipes: (WipeSpan[] | null)[];
  wipeEnd: number | null;
  wipeRoom: number;
  onWipe: (index: number, spans: WipeSpan[] | null) => void;
  onWipeEnd: (end: number | null) => void;
  onToggleLock: () => void;
  onRepeatLine: () => void;
  lineRepeating: boolean;
  activeLineRef: Ref<HTMLButtonElement>;
  marks: { index: number; name: string; t: number }[];
  rangeRef: Ref<HTMLInputElement>;
  timeRef: Ref<HTMLSpanElement>;
  playing: boolean;
  ended: boolean;
  remain: boolean;
  sectionLoop: boolean;
  shared: boolean;
  muted: boolean;
  timing: boolean;
  onSection: () => void;
  onPrev: () => void;
  onLineLoop: () => void;
  onNext: () => void;
  onNudge: (delta: number) => void;
  onGoLine: (index: number) => void;
  onCloseSheet: () => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  onSeek: (time: number) => void;
  onToggle: () => void;
  onRemain: () => void;
  onSectionLoop: () => void;
  onShare: () => void;
  onKaraoke: () => void;
  onMute: () => void;
  onTiming: () => void;
  onSheet: () => void;
}) {
  const nudgeOff = shown < 0 || locks[shown] === true;
  const heardCover = cueIndex >= 0 ? covering(Array.from(line).length, wipes[cueIndex] ?? null) : [];
  const lyricBlockRef = useRef<HTMLDivElement>(null);
  const lyricSpot = useRef<{ left: number; top: number; width: number } | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const sheetSpot = useRef<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    const block = lyricBlockRef.current;
    const spot = lyricSpot.current;
    if (!block || !spot) return;
    placeLyricBlock(block, spot);
  });

  useEffect(() => {
    const sheet = sheetRef.current;
    const spot = sheetSpot.current;
    if (!sheet || !spot) return;
    placeLyricBlock(sheet, spot);
    sheet.style.zIndex = "8";
  }, [sheet]);

  function dragSheet(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = sheet.getBoundingClientRect();
    const originLeft = sheetSpot.current?.left ?? rect.left;
    const originTop = sheetSpot.current?.top ?? rect.top;
    const width = sheetSpot.current?.width ?? rect.width;
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (next: PointerEvent) => {
      const keep = 48;
      const left = Math.min(window.innerWidth - keep, Math.max(keep - width, originLeft + next.clientX - startX));
      const top = Math.min(window.innerHeight - keep, Math.max(8, originTop + next.clientY - startY));
      const spot = { left, top, width };
      sheetSpot.current = spot;
      placeLyricBlock(sheet, spot);
      sheet.style.zIndex = "8";
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function dragLyrics(event: ReactPointerEvent<HTMLDivElement>) {
    const block = lyricBlockRef.current;
    if (!block) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = block.getBoundingClientRect();
    const line = block.querySelector(".lyric-current")?.getBoundingClientRect();
    const originLeft = lyricSpot.current?.left ?? line?.left ?? rect.left;
    const originTop = lyricSpot.current?.top ?? rect.top;
    const width = lyricSpot.current?.width ?? line?.width ?? rect.width;
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (next: PointerEvent) => {
      const keep = 36;
      const left = Math.min(window.innerWidth - keep, Math.max(keep - width, originLeft + next.clientX - startX));
      const top = Math.min(window.innerHeight - keep, Math.max(8, originTop + next.clientY - startY));
      const spot = { left, top, width };
      lyricSpot.current = spot;
      placeLyricBlock(block, spot);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    move(event.nativeEvent);
  }

  return (
    <div className="dock" data-ui="">
      {sheet ? (
        <section ref={sheetRef} className="sheet" aria-label="歌詞">
          <div className="sheet-head" onPointerDown={dragSheet}>
            <h2>歌詞</h2>
            <button type="button" className="text-btn sheet-nudge" onClick={() => onNudge(6)} disabled={nudgeOff}>
              6秒前
            </button>
            <button type="button" className="text-btn sheet-nudge" onClick={() => onNudge(0.1)} disabled={nudgeOff}>
              早める
            </button>
            <button type="button" className="text-btn sheet-nudge" onClick={() => onNudge(-0.1)} disabled={nudgeOff}>
              遅らせる
            </button>
            <button type="button" className="text-btn" onClick={onCloseSheet}>
              閉じる
            </button>
          </div>
          {shown >= 0 ? (
            <>
              <WipePick
                text={CUES[shown].text}
                spans={wipes[shown] ?? null}
                disabled={locks[shown] === true}
                end={wipeEnd}
                room={wipeRoom}
                onChange={(next) => onWipe(shown, next)}
                onEnd={onWipeEnd}
              />
              <div className="sheet-acts">
                <button type="button" className="text-btn" onClick={onToggleLock}>
                  {locks[shown] ? "解除" : "ロック"}
                </button>
                <button type="button" className="text-btn" aria-pressed={lineRepeating} onClick={onRepeatLine}>
                  {lineRepeating ? "リピート中" : "リピート"}
                </button>
              </div>
            </>
          ) : null}
          <div className="sheet-scroll">
            {CUES.map((item, index) => (
              <button
                key={`${item.t}-${index}`}
                type="button"
                ref={index === cueIndex ? activeLineRef : undefined}
                className={[index === cueIndex ? "line line-on" : "line", locks[index] ? "line-lock" : ""].join(" ")}
                onClick={() => onGoLine(index)}
              >
                <span className="line-sec">{item.section}</span>
                <span>{locks[index] ? `🔒 ${item.text}` : item.text}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className="lyric-block" ref={lyricBlockRef}>
        {timing || sheet ? (
          <div className="lyric-grip" role="button" aria-label="歌詞を動かす" onPointerDown={dragLyrics} />
        ) : null}
          <button type="button" className="lyric-kicker" onClick={onSection}>
            {karaoke ? `${section} · 歌なし` : section}
          </button>
          <button type="button" className="lyric-prev" onClick={onPrev} disabled={!previous}>
            {previous ? previous : " "}
          </button>
          <button
            type="button"
            ref={lyricRef}
            className={["lyric-current", cueIndex >= 0 ? "lyric-chars" : "", lineLoop ? "lyric-loop" : ""].filter(Boolean).join(" ")}
            onClick={onLineLoop}
          >
            {cueIndex >= 0
              ? Array.from(line).map((char, index) => {
                  const span = heardCover.find((item) => index >= item.from && index < item.to);
                  const className = [
                    "wipe-ch",
                    span && span.speed !== 1 ? "wipe-bold" : "",
                    span && span.offset !== 0 ? "wipe-italic" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <span key={index} className={className}>
                      {char === " " ? "\u00a0" : char}
                    </span>
                  );
                })
              : line}
          </button>
          <button type="button" className="lyric-next" onClick={onNext} disabled={!upcoming}>
            {upcoming ? upcoming : " "}
          </button>
        </div>

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
            onPointerDown={onScrubStart}
            onPointerUp={onScrubEnd}
            onPointerCancel={onScrubEnd}
            onInput={(event) => onSeek(Number(event.currentTarget.value))}
          />
          <div className="seek-marks">
            {marks.map((mark) => (
              <button
                key={mark.index}
                type="button"
                className="seek-mark"
                style={{ left: `${(mark.t / DURATION) * 100}%` }}
                aria-label={`${mark.name}へ`}
                onClick={() => onSeek(mark.t)}
              />
            ))}
          </div>
        </div>
        <div className="transport-row">
          <button type="button" className="icon-btn" aria-label={playing ? "一時停止" : "再生"} onClick={onToggle}>
            {playing ? (
              <Pause aria-hidden="true" size={22} strokeWidth={1.5} />
            ) : ended ? (
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
            onClick={onRemain}
          >
            <span ref={timeRef}>0:00</span>
          </button>
          <span className="time time-dim">{formatClock(DURATION)}</span>
          <span className="transport-gap" />
          <button
            type="button"
            className={sectionLoop ? "icon-btn icon-on" : "icon-btn"}
            aria-label={sectionLoop ? "くり返しをやめる" : "節をくり返す"}
            aria-pressed={sectionLoop}
            onClick={onSectionLoop}
          >
            <Repeat aria-hidden="true" size={20} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={shared ? "時刻つきリンクを渡しました" : "時刻つきリンクを渡す"}
            onClick={onShare}
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
            onClick={onKaraoke}
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
            onClick={onMute}
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
            onClick={onTiming}
          >
            <Timer aria-hidden="true" size={20} strokeWidth={1.5} />
          </button>
          <button type="button" className={sheet ? "icon-btn icon-on" : "icon-btn"} aria-label="歌詞" aria-pressed={sheet} onClick={onSheet}>
            <ListMusic aria-hidden="true" size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
