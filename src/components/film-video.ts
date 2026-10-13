/*
  場面の動画を音に合わせる。要素の探し方は持たない。
  音は消す。再生中なら動画も鳴らす。頭は場面の頭からの余り。
  置きたい時刻が残っていれば、音の要素より先に使う。要素はまだ頭のことがある。
*/

/** 続きの時刻が残っていればそれを使う。音の要素は、まだ 0 のことがある。 */
export function videoClock(want: number | null, audioTime: number | null): number | null {
  if (want != null && Number.isFinite(want)) return want;
  return audioTime;
}

type SceneVideo = {
  muted: boolean;
  playsInline: boolean;
  duration: number;
  readyState: number;
  currentTime: number;
  play: () => Promise<void>;
  addEventListener: (type: "loadedmetadata", fn: () => void, options: { once: true }) => void;
};

export function syncSceneVideo(
  video: SceneVideo | null,
  input: { sceneStart: number; audioTime: number | null; audioPlaying: boolean },
): void {
  if (!video) return;
  video.muted = true;
  video.playsInline = true;
  const at = input.audioTime ?? input.sceneStart;
  const into = Math.max(0, at - input.sceneStart);
  const place = () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    try {
      video.currentTime = into % video.duration;
    } catch {
      /* ignore */
    }
  };
  if (video.readyState >= 1) place();
  else video.addEventListener("loadedmetadata", place, { once: true });
  if (input.audioPlaying) void video.play().catch(() => {});
}

export function resumeVideo(video: { muted: boolean; play: () => Promise<void> }): void {
  video.muted = true;
  void video.play().catch(() => {});
}
