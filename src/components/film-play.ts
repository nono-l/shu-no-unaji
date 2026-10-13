/*
  再生の切り替え。音の要素は持たない。
  終わりから押したら頭に戻してから鳴らす。続きが残っていれば、その時刻から鳴らす。
  シークから鳴らすときは、失敗してもゲートに戻さない。
  鳴り始めたら再生中。止めたら、終わりでなければ続きを残す。終わったら消す。
*/

export type FilmPhase = "gate" | "live" | "ended";

export async function togglePlayback(input: {
  ended: boolean;
  phase: FilmPhase;
  paused: () => boolean;
  seekStart: () => void;
  play: () => Promise<void>;
  pause: () => void;
  onPhase: (phase: FilmPhase) => void;
  onVideos: () => void;
}): Promise<void> {
  if (input.ended || input.phase === "ended") {
    input.seekStart();
    input.onPhase("live");
  }
  if (input.paused()) {
    try {
      await input.play();
      input.onPhase("live");
      input.onVideos();
    } catch {
      input.onPhase("gate");
    }
    return;
  }
  input.pause();
}

export type PlaybackEvent = {
  playing: boolean;
  phase: FilmPhase | null;
  saveResume: boolean;
  clearResume: boolean;
};

export function playbackEvent(kind: "play" | "pause" | "ended", ended = false): PlaybackEvent {
  if (kind === "play") return { playing: true, phase: null, saveResume: false, clearResume: false };
  if (kind === "ended") return { playing: false, phase: "ended", saveResume: false, clearResume: true };
  return { playing: false, phase: null, saveResume: !ended, clearResume: false };
}

export async function playIfPaused(input: {
  paused: () => boolean;
  play: () => Promise<void>;
  onLive: () => void;
}): Promise<void> {
  if (!input.paused()) return;
  try {
    await input.play();
    input.onLive();
  } catch {
    /* シークからの再生は、失敗してもゲートに戻さない */
  }
}

/** ゲートの続きは、その時刻。終わりは頭。途中ならシークしない。 */
export function playbackOrigin(phase: FilmPhase, ended: boolean, resumeAt: number | null): number | null {
  if (ended || phase === "ended") return 0;
  if (phase === "gate" && resumeAt != null && Number.isFinite(resumeAt)) return resumeAt;
  return null;
}

/** 再生が続きの時刻から離れていたら、そこへ戻す。 */
export function catchResume(want: number | null, at: number): number | null {
  if (want == null || !Number.isFinite(want)) return null;
  if (!Number.isFinite(at) || Math.abs(at - want) > 0.25) return want;
  return null;
}

/**
 * 途中から鳴らす。先に play を呼ぶ。シークの完了を待ってから鳴らすと、
 * iPhone はタップの外になり、頭から鳴る。
 */
export async function playAt(input: {
  at: number;
  play: () => Promise<void>;
  place: (time: number) => void;
  read: () => number;
  whenPlaying?: (fix: () => void) => void;
}): Promise<void> {
  const pending = input.play();
  input.place(input.at);
  const fix = () => {
    if (catchResume(input.at, input.read()) != null) input.place(input.at);
  };
  input.whenPlaying?.(fix);
  await pending;
  fix();
}
