/*
  今の行の頭だけを動かす。行の中の速度は持たない。
  保存の通信は親。ロック中の行は早める・遅らせるを出さない。
*/
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { CUES } from "@/data/score";
import { SpeedPick, WhenLine, offsetDigits } from "@/components/film-speed";

type Props = {
  offset: number;
  offsets: number[];
  locks: boolean[];
  adjusted: number[];
  cueIndex: number;
  canNudge: boolean;
  canAlign: boolean;
  locked: boolean;
  status: string;
  statusKind: "ok" | "bad" | "muted";
  audioTimeRef: RefObject<HTMLElement | null>;
  lyricTimeRef: RefObject<HTMLElement | null>;
  onNudge: (delta: number) => void;
  onSeek: (index: number) => void;
  onAlign: () => void;
  onReset: () => void;
  onToggleLock: () => void;
  onOpenTimeline: () => void;
  onClose: () => void;
  rate: number;
  onRate: (rate: number) => void;
};

function phrase(offset: number, canNudge: boolean, locked: boolean): string {
  if (!canNudge) return "行をタップすると、その行だけ動きます";
  if (locked) return "この行はロックしています";
  if (Math.abs(offset) < 0.005) return "この行は音と揃っている";
  if (offset > 0) return `この行が ${offsetDigits(offset)}秒 早い`;
  return `この行が ${offsetDigits(offset)}秒 遅い`;
}

function shiftLabel(offset: number): string {
  if (Math.abs(offset) < 0.005) return "";
  return `${offset > 0 ? "+" : "−"}${offsetDigits(offset)}`;
}

function stepText(step: number): string {
  if (Math.abs(step) >= 1) return step > 0 ? `+${step}` : String(step);
  const text = Math.abs(step) < 0.1 ? step.toFixed(2) : step.toFixed(1);
  return step > 0 ? `+${text}` : text;
}

export function TimingPanel({
  offset,
  offsets,
  locks,
  adjusted,
  cueIndex,
  canNudge,
  canAlign,
  locked,
  status,
  statusKind,
  audioTimeRef,
  lyricTimeRef,
  onNudge,
  onSeek,
  onAlign,
  onReset,
  onToggleLock,
  onOpenTimeline,
  onClose,
  rate,
  onRate,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const list = listRef.current;
    if (!row || !list) return;
    list.scrollTop = Math.max(0, row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2);
  }, [cueIndex]);

  function dragPanel(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const panel = panelRef.current;
    const parent = panel?.offsetParent as HTMLElement | null;
    if (!panel || !parent) return;
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const originLeft = rect.left - parentRect.left;
    const originTop = rect.top - parentRect.top;
    const startX = event.clientX;
    const startY = event.clientY;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${rect.width}px`;
    const keep = 48;
    const move = (next: PointerEvent) => {
      const left = originLeft + next.clientX - startX;
      const top = originTop + next.clientY - startY;
      const minLeft = keep - panel.offsetWidth;
      const maxLeft = parent.clientWidth - keep;
      const maxTop = Math.max(0, parent.clientHeight - keep);
      panel.style.left = `${Math.min(maxLeft, Math.max(minLeft, left))}px`;
      panel.style.top = `${Math.min(maxTop, Math.max(0, top))}px`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <section ref={panelRef} className="timing-float" data-ui="" aria-label="歌詞のタイミング">
      <div className="timing-handle" onPointerDown={dragPanel}>
        <h2>タイミング</h2>
        <button type="button" className="text-btn" onClick={onClose}>
          閉じる
        </button>
      </div>
      <div className="timing-clocks">
        <p className="timing-clock">
          <span>音</span>
          <strong ref={audioTimeRef}>0:00</strong>
        </p>
        <p className="timing-clock">
          <span>出だし</span>
          <strong ref={lyricTimeRef}>0:00</strong>
        </p>
      </div>
      <SpeedPick rate={rate} onRate={onRate} />
      {cueIndex >= 0 ? <p className="timing-now">{CUES[cueIndex].text}</p> : null}
      <p className="timing-phrase">{phrase(offset, canNudge, locked)}</p>
      <div className="timing-nudge">
        {[-6, -0.5, -0.1, -0.01, 0.01, 0.1, 0.5, 6].map((step) => (
          <button
            key={step}
            type="button"
            className="timing-step"
            onClick={() => onNudge(step)}
            disabled={!canNudge || locked}
          >
            {stepText(step)}
          </button>
        ))}
      </div>
      <div ref={listRef} className="timing-lines">
        {CUES.map((cue, index) => (
          <button
            key={`${cue.t}-${index}`}
            type="button"
            ref={index === cueIndex ? rowRef : undefined}
            className={[
              index === cueIndex ? "timing-row timing-row-on" : "timing-row",
              locks[index] ? "timing-row-lock" : "",
            ].join(" ")}
            onClick={() => onSeek(index)}
          >
            <span>{cue.section}</span>
            <span>{locks[index] ? `🔒 ${cue.text}` : cue.text}</span>
            <span className="timing-shift">
              {shiftLabel(offsets[index] ?? 0)}
              <WhenLine at={adjusted[index] ?? 0} className="timing-when" />
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="timing-align" onClick={onAlign} disabled={!canAlign || locked}>
        この行の出だしを今の音に
      </button>
      <button type="button" className="timing-align" onClick={onOpenTimeline}>
        タイムラインで直す
      </button>
      <div className="timing-foot">
        <p
          className={
            statusKind === "bad"
              ? "timing-status timing-status-bad"
              : statusKind === "ok"
                ? "timing-status timing-status-ok"
                : "timing-status"
          }
        >
          {status}
        </p>
        <button type="button" className="text-btn" onClick={onReset} disabled={!canNudge || locked}>
          この行を0に
        </button>
        <button
          type="button"
          className={locked ? "text-btn timing-lock-on" : "text-btn"}
          onClick={onToggleLock}
          disabled={!canNudge}
        >
          {locked ? "🔒 解除" : "ロック"}
        </button>
      </div>
    </section>
  );
}
