/*
  タイミングとタイムライン。夜を開いた直後には読まない。開いてから取る。
*/
import { Suspense, lazy, type RefObject } from "react";

const TimingPanel = lazy(() =>
  import("@/components/timing-panel").then((mod) => ({ default: mod.TimingPanel })),
);
const TimelineEditor = lazy(() =>
  import("@/components/timeline-editor").then((mod) => ({ default: mod.TimelineEditor })),
);

export function FilmTools({
  timing,
  timeline,
  shownOffset,
  offsets,
  locks,
  adjusted,
  shown,
  canAlign,
  status,
  statusKind,
  audioTimeRef,
  lyricTimeRef,
  cueIndex,
  playing,
  audioRef,
  onNudge,
  onSeekLine,
  onAlign,
  onReset,
  onToggleLock,
  onOpenTimeline,
  onCloseTiming,
  onSeekTime,
  onCommit,
  onNudgeLine,
  onResetLine,
  onTogglePlay,
  onCloseTimeline,
  rate,
  onRate,
}: {
  timing: boolean;
  timeline: boolean;
  shownOffset: number;
  offsets: number[];
  locks: boolean[];
  adjusted: number[];
  shown: number;
  canAlign: boolean;
  status: string;
  statusKind: "ok" | "bad" | "muted";
  audioTimeRef: RefObject<HTMLElement | null>;
  lyricTimeRef: RefObject<HTMLElement | null>;
  cueIndex: number;
  playing: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  onNudge: (delta: number) => void;
  onSeekLine: (index: number) => void;
  onAlign: () => void;
  onReset: () => void;
  onToggleLock: (index: number) => void;
  onOpenTimeline: () => void;
  onCloseTiming: () => void;
  onSeekTime: (time: number) => void;
  onCommit: (index: number, offset: number) => void;
  onNudgeLine: (index: number, delta: number) => void;
  onResetLine: (index: number) => void;
  onTogglePlay: () => void;
  onCloseTimeline: () => void;
  rate: number;
  onRate: (rate: number) => void;
}) {
  if (!timing && !timeline) return null;
  return (
    <>
      {timing ? (
        <Suspense fallback={null}>
          <TimingPanel
            offset={shownOffset}
            offsets={offsets}
            locks={locks}
            adjusted={adjusted}
            cueIndex={shown}
            canNudge={shown >= 0}
            canAlign={canAlign}
            locked={shown >= 0 && locks[shown] === true}
            status={status}
            statusKind={statusKind}
            audioTimeRef={audioTimeRef}
            lyricTimeRef={lyricTimeRef}
            onNudge={onNudge}
            onSeek={onSeekLine}
            onAlign={onAlign}
            onReset={onReset}
            onToggleLock={() => onToggleLock(shown)}
            onOpenTimeline={onOpenTimeline}
            onClose={onCloseTiming}
            rate={rate}
            onRate={onRate}
          />
        </Suspense>
      ) : null}
      {timeline ? (
        <Suspense fallback={null}>
          <TimelineEditor
            offsets={offsets}
            locks={locks}
            adjusted={adjusted}
            cueIndex={cueIndex}
            playing={playing}
            audioRef={audioRef}
            onSeekTime={onSeekTime}
            onCommit={onCommit}
            onNudge={onNudgeLine}
            onReset={onResetLine}
            onToggleLock={onToggleLock}
            onTogglePlay={onTogglePlay}
            onClose={onCloseTimeline}
            rate={rate}
            onRate={onRate}
          />
        </Suspense>
      ) : null}
    </>
  );
}
