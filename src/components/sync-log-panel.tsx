/*
  公開版でコピーできる同期ログ。再生は持たない。
  ボタンとログは別々に動かせる。それぞれ閉じられる。
  ボタンを閉じると、読み直すまで出さない。位置は残す。
*/
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { dragSpot, subscribeSync, syncText } from "@/lib/sync-log";

const BTN_KEY = "shu-sync-btn";
const LOG_KEY = "shu-sync-log";

type Spot = { left: number; top: number };

function readSpot(key: string): Spot | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "") as Partial<Spot>;
    if (typeof parsed.left !== "number" || typeof parsed.top !== "number") return null;
    return { left: parsed.left, top: parsed.top };
  } catch {
    return null;
  }
}

function writeSpot(key: string, spot: Spot) {
  try {
    localStorage.setItem(key, JSON.stringify(spot));
  } catch {
    /* private mode */
  }
}

function place(node: HTMLElement, spot: Spot) {
  node.dataset.placed = "1";
  node.style.position = "fixed";
  node.style.left = `${spot.left}px`;
  node.style.top = `${spot.top}px`;
  node.style.right = "auto";
  node.style.bottom = "auto";
  node.style.margin = "0";
}

function drag(
  event: ReactPointerEvent<HTMLElement>,
  node: HTMLElement,
  spot: { current: Spot | null },
  key: string,
  onTap: (() => void) | null,
) {
  if ((event.target as HTMLElement).closest("[data-nodrag]")) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = node.getBoundingClientRect();
  const origin = spot.current ?? { left: rect.left, top: rect.top };
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  const move = (next: PointerEvent) => {
    const delta = { x: next.clientX - startX, y: next.clientY - startY };
    if (Math.abs(delta.x) + Math.abs(delta.y) > 4) moved = true;
    const nextSpot = dragSpot(origin, delta, { width: node.offsetWidth, height: node.offsetHeight }, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    spot.current = nextSpot;
    place(node, nextSpot);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    if (spot.current) writeSpot(key, spot.current);
    if (!moved) onTap?.();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

export function SyncLogPanel() {
  const [ready, setReady] = useState(false);
  const [buttonOn, setButtonOn] = useState(true);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const btnSpot = useRef<Spot | null>(null);
  const logSpot = useRef<Spot | null>(null);

  useEffect(() => subscribeSync(() => setText(syncText())), []);

  useEffect(() => {
    btnSpot.current = readSpot(BTN_KEY);
    logSpot.current = readSpot(LOG_KEY);
    setReady(true);
  }, []);

  useEffect(() => {
    const btn = btnRef.current;
    if (btn && btnSpot.current) place(btn, btnSpot.current);
    const log = logRef.current;
    if (log && logSpot.current) place(log, logSpot.current);
  });

  function copy() {
    const next = syncText();
    setText(next);
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    };
    if (!navigator.clipboard) {
      window.prompt("同期ログ", next);
      return;
    }
    void navigator.clipboard.writeText(next).then(done, () => {
      window.prompt("同期ログ", next);
    });
  }

  function hideButton() {
    setOpen(false);
    setButtonOn(false);
  }

  if (!ready || !buttonOn) return null;

  return (
    <>
      <div
        ref={btnRef}
        className="sync-btn"
        data-ui=""
        onPointerDown={(event) => {
          const node = btnRef.current;
          if (!node) return;
          drag(event, node, btnSpot, BTN_KEY, () => setOpen((value) => !value));
        }}
      >
        <span>同期ログ</span>
        <button type="button" className="text-btn" data-nodrag="" aria-label="同期ログのボタンを閉じる" onClick={hideButton}>
          閉じる
        </button>
      </div>
      {open ? (
        <div
          ref={logRef}
          className="sync-log"
          data-ui=""
          onPointerDown={(event) => {
            const node = logRef.current;
            if (!node) return;
            drag(event, node, logSpot, LOG_KEY, null);
          }}
        >
          <button type="button" className="text-btn" data-nodrag="" onClick={copy}>
            {copied ? "コピーした" : "コピー"}
          </button>
          <button type="button" className="text-btn" data-nodrag="" onClick={() => setOpen(false)}>
            閉じる
          </button>
          <pre>{text || "まだ出ていません"}</pre>
        </div>
      ) : null}
    </>
  );
}
