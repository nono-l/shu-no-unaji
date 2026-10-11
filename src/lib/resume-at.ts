/*
  続きの位置。この画面だけ。サーバには書かない。
  頭の1秒と、終わりの2秒は残さない。保存は0.1秒。
  再生中は2秒に一度。止めたときはその時刻。終わったら消す。
  リンクの ?t= があるときは、丸めずにそちらを先に置く。
*/
import { DURATION } from "../data/score.ts";

const KEY = "shu-resume";

export function inResumeWindow(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > 1 && seconds < DURATION - 2;
}

export function readResume(search: string): number | null {
  const fromUrl = Number(new URLSearchParams(search).get("t"));
  if (inResumeWindow(fromUrl)) return fromUrl;
  try {
    const saved = Number(localStorage.getItem(KEY));
    if (inResumeWindow(saved)) return saved;
  } catch {
    /* private mode */
  }
  return null;
}

export function writeResume(seconds: number): void {
  if (!inResumeWindow(seconds)) return;
  try {
    localStorage.setItem(KEY, String(Math.round(seconds * 10) / 10));
  } catch {
    /* ignore */
  }
}

export function clearResume(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function createResumeClock() {
  let last = 0;
  return {
    tick(now: number, seconds: number) {
      if (!inResumeWindow(seconds) || now - last <= 2000) return;
      last = now;
      writeResume(seconds);
    },
    pause(seconds: number) {
      writeResume(seconds);
    },
    end() {
      clearResume();
    },
  };
}
