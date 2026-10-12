/*
  歌詞のページで、文字を選んでから塗る。行の頭のボタンとは別。
*/
import { useEffect, useRef, useState } from "react";
import { applyWipe, covering, holdAfter, wipeLabel, type WipeEdit, type WipeSpan } from "@/lib/wipe-span";

export function WipePick({
  text,
  spans,
  disabled,
  end,
  room,
  onChange,
  onEnd,
}: {
  text: string;
  spans: WipeSpan[] | null;
  disabled: boolean;
  end: number | null;
  room: number;
  onChange: (next: WipeSpan[] | null) => void;
  onEnd: (next: number | null) => void;
}) {
  const chars = Array.from(text);
  const pickRef = useRef<HTMLParagraphElement>(null);
  const anchor = useRef<number | null>(null);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(chars.length);
  const covered = covering(chars.length, spans);

  useEffect(() => {
    anchor.current = null;
    setFrom(0);
    setTo(Array.from(text).length);
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
    const root = pickRef.current;
    if (!root) return null;
    const direct = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-wipe-i]");
    if (direct && root.contains(direct)) {
      const index = Number(direct.dataset.wipeI);
      if (Number.isInteger(index)) return index;
    }
    const box = root.getBoundingClientRect();
    if (clientX < box.left - 12 || clientX > box.right + 12 || clientY < box.top - 12 || clientY > box.bottom + 12) {
      return null;
    }
    let best: { index: number; dist: number } | null = null;
    for (const span of root.querySelectorAll<HTMLElement>("[data-wipe-i]")) {
      const rect = span.getBoundingClientRect();
      const x = Math.min(Math.max(clientX, rect.left), rect.right);
      const y = Math.min(Math.max(clientY, rect.top), rect.bottom);
      const dist = (clientX - x) ** 2 + (clientY - y) ** 2;
      const index = Number(span.dataset.wipeI);
      if (!Number.isInteger(index)) continue;
      if (!best || dist < best.dist) best = { index, dist };
    }
    return best?.index ?? null;
  }

  function edit(kind: WipeEdit) {
    if (disabled || to <= from) return;
    onChange(applyWipe(chars.length, spans, from, to, kind));
  }

  return (
    <div className="wipe-edit" data-ui="">
      <p
        className="wipe-pick"
        ref={pickRef}
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
          const speeded = span != null && span.speed !== 1;
          const shifted = span != null && span.offset !== 0;
          const className = [
            selected ? "wipe-sel" : "",
            marked ? "wipe-mark" : "",
            speeded ? "wipe-bold" : "",
            shifted ? "wipe-italic" : "",
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
        <button type="button" className="text-btn" disabled={disabled || to <= from} onClick={() => edit("earlierJump")}>
          1秒前
        </button>
        <button type="button" className="text-btn" disabled={disabled || to <= from} onClick={() => edit("earlier")}>
          前へ
        </button>
        <button type="button" className="text-btn" disabled={disabled || to <= from} onClick={() => edit("later")}>
          後ろへ
        </button>
        <button type="button" className="text-btn" disabled={disabled || to <= from} onClick={() => edit("laterJump")}>
          1秒後
        </button>
        <button type="button" className="text-btn" disabled={disabled || to <= 0 || to >= chars.length} onClick={() => onChange(holdAfter(chars.length, spans, to))}>
          タメ
        </button>
        <button type="button" className="text-btn" disabled={disabled || to <= from} onClick={() => edit("clear")}>
          クリア
        </button>
      </div>
      <div className="wipe-end">
        {end == null ? (
          <button type="button" className="text-btn" disabled={disabled || room < 0.4} onClick={() => onEnd(Math.round(room * 10) / 10)}>
            終端
          </button>
        ) : (
          <>
            <span className="wipe-label">終端 {end.toFixed(1)}秒</span>
            <button
              type="button"
              className="text-btn"
              disabled={disabled || end <= 0.4}
              onClick={() => onEnd(Math.round(Math.max(0.4, end - 0.1) * 10) / 10)}
            >
              短く
            </button>
            <button
              type="button"
              className="text-btn"
              disabled={disabled || end >= room - 0.05}
              onClick={() => onEnd(Math.round(Math.min(room, end + 0.1) * 10) / 10)}
            >
              長く
            </button>
            <button type="button" className="text-btn" disabled={disabled} onClick={() => onEnd(null)}>
              自動
            </button>
          </>
        )}
      </div>
    </div>
  );
}
