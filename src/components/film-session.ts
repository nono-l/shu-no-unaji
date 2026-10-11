/*
  ロック画面の操作。再生そのものは持たない。
  再生と停止は同じ切り替え。前後は行。左右は秒。指定位置はその時刻。
*/
import { DURATION } from "../data/score.ts";

export const SESSION_STEP = 10;

const ACTIONS = ["play", "pause", "nexttrack", "previoustrack", "seekbackward", "seekforward", "seekto"] as const;

type Action = (typeof ACTIONS)[number];

type Details = { seekOffset?: number | null; seekTime?: number | null };

export function sessionMetadata(origin: string) {
  return {
    title: "朱のうなじ",
    artist: "朱のうなじ",
    album: "夜の映像",
    artwork: [{ src: `${origin}/mv/nape.jpg`, sizes: "512x512", type: "image/jpeg" }],
  };
}

export function sessionPosition(input: { paused: boolean; rate: number; time: number }) {
  return {
    playbackState: input.paused ? ("paused" as const) : ("playing" as const),
    duration: DURATION,
    playbackRate: input.rate || 1,
    position: Math.min(DURATION, Math.max(0, input.time || 0)),
  };
}

export function bindMediaSession(
  session: {
    setActionHandler: (action: Action, handler: ((details: Details) => void) | null) => void;
  } | null,
  input: {
    toggle: () => void;
    stepLine: (dir: number) => void;
    seekBy: (delta: number) => void;
    seekTo: (time: number) => void;
  },
): () => void {
  if (!session) return () => {};
  const handlers: Record<Action, (details: Details) => void> = {
    play: () => input.toggle(),
    pause: () => input.toggle(),
    nexttrack: () => input.stepLine(1),
    previoustrack: () => input.stepLine(-1),
    seekbackward: (details) => input.seekBy(-(details.seekOffset || SESSION_STEP)),
    seekforward: (details) => input.seekBy(details.seekOffset || SESSION_STEP),
    seekto: (details) => {
      if (typeof details.seekTime === "number") input.seekTo(details.seekTime);
    },
  };
  try {
    for (const action of ACTIONS) session.setActionHandler(action, handlers[action]);
  } catch {
    /* ignore */
  }
  return () => {
    try {
      for (const action of ACTIONS) session.setActionHandler(action, null);
    } catch {
      /* ignore */
    }
  };
}
