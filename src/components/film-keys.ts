/*
  キーの意味。入力欄では何もしない。
  再生もシークも持たない。左右は5秒。
*/

export type FilmKey = "play" | "back" | "forward";

export const KEY_STEP = 5;

export function filmKey(event: { key: string; code: string; target: EventTarget | null }): FilmKey | null {
  const tag = event.target && "tagName" in event.target ? event.target.tagName : "";
  if (tag === "INPUT" || tag === "TEXTAREA") return null;
  if (event.key === " " || event.code === "Space") return "play";
  if (event.key === "ArrowRight") return "forward";
  if (event.key === "ArrowLeft") return "back";
  return null;
}
