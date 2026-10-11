/*
  歌詞のページで、文字を選んでから塗る。行の頭のボタンとは別。
*/
import { useEffect, useRef, useState } from "react";
import { applyWipe, covering, wipeLabel, type WipeEdit, type WipeSpan } from "@/lib/wipe-span";

export function WipePick({
  text,
  spans,
  disabled,
  onChange,
}: {
  text: string;
  spans: WipeSpan[] | null;
  disabled: boolean;
  onChange: (next: WipeSpan[] | null) => void;
}) {
  const chars = Array.from(text);
  const anchor = useRef<number | null>(null);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const covered = covering(chars.length, spans);

  useEffect(() => {
    anchor.current = null;
    setFrom(0);
    setTo(0);
  }, [text]);

  useEffect(() => {
    const stop = () => {
      anchor.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  function choose(index: number) {
    const start = anchor.current ?? index;
    setFrom(Math.min(start, index));
    setTo(Math.max(start, index) + 1);
  }

  function indexAt(clientX: number, clientY: number): number | null {
    const node = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-wipe-i]");
    if (!node) return null;
    const index = Number(node.dataset.wipeI);
    return Number.isInteger(index) ? index : null;
  }

  function edit(kind: WipeEdit) {
    if (disabled || to <= from) return;
    onChange(applyWipe(chars.length, spans, from, to, kind));
  }

  return (
    <div className="wipe-edit" data-ui="">
      <p
        className="wipe-pick"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const index = indexAt(event.clientX, event.clientY);
          if (index == null) return;
          event.preventDefault();
          anchor.current = index;
          choose(index);
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* 指がもう離れている */
          }
        }}
        onPointerMove={(event) => {
          if (anchor.current == null) return;
          const index = indexAt(event.clientX, event.clientY);
          if (index == null) return;
          choose(index);
        }}
      >
        {chars.map((char, index) => {
          const span = covered.find((item) => index >= item.from && index < item.to);
          const marked = span != null && (span.speed !== 1 || span.offset !== 0);
          const selected = index >= from && index < to;
          const className = [
            selected ? "wipe-sel" : "",
            marked ? "wipe-mark" : "",
            marked && span != null && span.speed < 1 ? "wipe-slow" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <span key={index} data-wipe-i={index} className={className}>
              {char === " " ? "\u00a0" : char}
            </span>
          );
        })}
      </p>
      <p className="wipe-label">{wipeLabel(chars.length, spans, from, to)}</p>
      <div className="wipe-tools">
        <button type="button" className="text-btn" disabled={disabled || to <= from} onClick={() => edit("slower")}>
          遅く
        </button>
        <button type="button" className="text-btn" disabled={disabled || to <= from} onClick={() => edit("faster")}>
          速く
        </button>
        <button type="button" className="text-btn" disabled={disabled || to <= from} onClick={() => edit("earlier")}>
          前へ
        </button>
        <button type="button" className="text-btn" disabled={disabled || to <= from} onClick={() => edit("later")}>
          後ろへ
        </button>
      </div>
    </div>
  );
}
