/*
  タイミングを聞くための速度。夜の再生そのものではない。
  0.01 秒は、0.1 秒の文字に潰さない。
  いつ直したかは、開いているあいだ秒で進む。
*/
import { useEffect, useState } from "react";
import { adjustedAgo } from "@/lib/adjusted-ago";

const SPEEDS = [0.1, 0.25, 0.5, 0.8] as const;
export function offsetDigits(offset: number): string {
  const abs = Math.abs(offset);
  const tenth = Math.round(abs * 10) / 10;
  return abs.toFixed(Math.abs(abs - tenth) >= 0.005 ? 2 : 1);
}

export function SpeedPick({ rate, onRate }: { rate: number; onRate: (rate: number) => void }) {
  return (
    <div className="speed-pick" role="group" aria-label="再生速度">
      {SPEEDS.map((speed) => (
        <button
          key={speed}
          type="button"
          className={rate === speed ? "text-btn speed-on" : "text-btn"}
          aria-pressed={rate === speed}
          onClick={() => onRate(speed)}
        >
          {Math.round(speed * 100)}%
        </button>
      ))}
      <button
        type="button"
        className={rate === 1 ? "text-btn speed-on" : "text-btn"}
        aria-pressed={rate === 1}
        onClick={() => onRate(1)}
      >
        等速
      </button>
    </div>
  );
}

export function WhenLine({ at, className }: { at: number; className: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!at) return null;
  return <span className={className}>{adjustedAgo(at, now)}</span>;
}
