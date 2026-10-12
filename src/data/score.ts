/*
  長さ、場面、歌詞、聞こえる時刻。描画も保存も持たない。
  正のずれは行が早い。cue.t から引く。場面の時刻には足さない。
*/
export const DURATION = 227.33;

export type Ken = "in" | "out" | "left" | "right" | "up";

export type Scene = {
  t: number;
  still: string;
  video?: string;
  ken: Ken;
};

export type Cue = {
  t: number;
  section: string;
  text: string;
};

export const SCENES: Scene[] = [
  { t: 0, still: "/mv/alley.jpg", video: "/mv/alley.mp4", ken: "in" },
  { t: 16.2, still: "/mv/tatami.jpg", video: "/mv/tatami.mp4", ken: "left" },
  { t: 23.6, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "in" },
  { t: 28.2, still: "/mv/smile.jpg", video: "/mv/smile.mp4", ken: "right" },
  { t: 38.6, still: "/mv/blade.jpg", video: "/mv/blade.mp4", ken: "up" },
  { t: 44.2, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "left" },
  { t: 53, still: "/mv/thread.jpg", video: "/mv/thread.mp4", ken: "in" },
  { t: 63, still: "/mv/hold.jpg", video: "/mv/hold.mp4", ken: "in" },
  { t: 65.5, still: "/mv/ember.jpg", video: "/mv/ember.mp4", ken: "in" },
  { t: 67.8, still: "/mv/hold.jpg", video: "/mv/hold.mp4", ken: "left" },
  { t: 70.1, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "up" },
  { t: 84, still: "/mv/mirror.jpg", video: "/mv/mirror.mp4", ken: "left" },
  { t: 91.2, still: "/mv/kanzashi.jpg", video: "/mv/kanzashi.mp4", ken: "up" },
  { t: 98.2, still: "/mv/smile.jpg", video: "/mv/smile.mp4", ken: "out" },
  { t: 105.2, still: "/mv/blade.jpg", video: "/mv/blade.mp4", ken: "right" },
  { t: 112.6, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "in" },
  { t: 123.6, still: "/mv/thread.jpg", video: "/mv/thread.mp4", ken: "right" },
  { t: 133.4, still: "/mv/hold.jpg", video: "/mv/hold.mp4", ken: "right" },
  { t: 135.9, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "in" },
  { t: 138.1, still: "/mv/hold.jpg", video: "/mv/hold.mp4", ken: "up" },
  { t: 140.5, still: "/mv/blade.jpg", video: "/mv/blade.mp4", ken: "up" },
  { t: 150, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "left" },
  { t: 163, still: "/mv/petals.jpg", video: "/mv/petals.mp4", ken: "out" },
  { t: 172, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "up" },
  { t: 178.7, still: "/mv/thread.jpg", video: "/mv/thread.mp4", ken: "left" },
  { t: 185.3, still: "/mv/hold.jpg", video: "/mv/hold.mp4", ken: "in" },
  { t: 187.5, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "right" },
  { t: 190.2, still: "/mv/hold.jpg", video: "/mv/hold.mp4", ken: "left" },
  { t: 192.3, still: "/mv/ember.jpg", video: "/mv/ember.mp4", ken: "in" },
  { t: 194.8, still: "/mv/hold.jpg", video: "/mv/hold.mp4", ken: "up" },
  { t: 197.4, still: "/mv/dawn.jpg", video: "/mv/dawn.mp4", ken: "in" },
  { t: 199.5, still: "/mv/hold.jpg", video: "/mv/hold.mp4", ken: "out" },
  { t: 201.9, still: "/mv/blade.jpg", video: "/mv/blade.mp4", ken: "left" },
  { t: 208, still: "/mv/alley.jpg", video: "/mv/alley.mp4", ken: "out" },
];

export const CUES: Cue[] = [
  { t: 16.2, section: "一番", text: "畳の上で 指でなぞる輪" },
  { t: 20.6, section: "一番", text: "ほどける帯が また結び直す" },
  { t: 25.4, section: "一番", text: "朱のうなじに 月が落ちてる" },
  { t: 29.7, section: "一番", text: "笑ったままの 秘密が揺れる" },
  { t: 34.6, section: "一番", text: "あの花魁をゴールさせないために" },
  { t: 39.4, section: "一番", text: "武器を振り上げろ" },

  { t: 44.7, section: "足音", text: "息をひそめて" },
  { t: 46.2, section: "足音", text: "足音を消して" },
  { t: 48.5, section: "足音", text: "その背中まで" },
  { t: 51.2, section: "足音", text: "あと少しだろ" },
  { t: 54.1, section: "足音", text: "指先ひとつで" },
  { t: 56, section: "足音", text: "運命を裂いて" },
  { t: 58.3, section: "足音", text: "今夜だけはまだ" },
  { t: 60.9, section: "足音", text: "終わらせない" },

  { t: 63, section: "サビ", text: "まだ行かせない" },
  { t: 64.1, section: "サビ", text: "まだ行かせない" },
  { t: 65.4, section: "サビ", text: "朱のうなじが燃えてる" },
  { t: 67.8, section: "サビ", text: "まだ行かせない" },
  { t: 69.1, section: "サビ", text: "まだ行かせない" },
  { t: 70.1, section: "サビ", text: "この手で闇を止める" },

  { t: 82.02, section: "二番", text: "鏡の前で 目を伏せたまま" },
  { t: 86.4, section: "二番", text: "紅を引いたら 嘘も深くなる" },
  { t: 91.2, section: "二番", text: "簪ひとつが 落ちる音さえ" },
  { t: 95.9, section: "二番", text: "胸の奥では 鐘みたいだ" },
  { t: 100.9, section: "二番", text: "笑うなら今" },
  { t: 102.96, section: "二番", text: "泣くなら後で" },
  { t: 105.2, section: "二番", text: "選ぶのは誰だ" },
  { t: 108.1, section: "二番", text: "お前じゃない" },

  { t: 112.7, section: "足音", text: "息をひそめて" },
  { t: 114.6, section: "足音", text: "足音を消して" },
  { t: 117, section: "足音", text: "その背中まで" },
  { t: 119.2, section: "足音", text: "あと少しだろ" },
  { t: 122, section: "足音", text: "指先ひとつで" },
  { t: 123.8, section: "足音", text: "運命を裂いて" },
  { t: 126.6, section: "足音", text: "今夜だけはまだ" },
  { t: 129.6, section: "足音", text: "終わらせない" },

  { t: 133.4, section: "サビ", text: "まだ行かせない" },
  { t: 134.9, section: "サビ", text: "まだ行かせない" },
  { t: 135.9, section: "サビ", text: "朱のうなじが燃えてる" },
  { t: 138.1, section: "サビ", text: "まだ行かせない" },
  { t: 139.4, section: "サビ", text: "まだ行かせない" },
  { t: 140.5, section: "サビ", text: "この手で闇を止める" },

  { t: 162.3, section: "橋", text: "花びらみたいに" },
  { t: 164.5, section: "橋", text: "散るのが罪なら" },
  { t: 166.9, section: "橋", text: "この胸ごと" },
  { t: 168.9, section: "橋", text: "盾にしてやる" },
  { t: 171.6, section: "橋", text: "月が見ている" },
  { t: 173.9, section: "橋", text: "隠しきれない" },
  { t: 176.4, section: "橋", text: "名前も傷も" },
  { t: 178.7, section: "橋", text: "抱えて進め" },

  { t: 185.3, section: "最後", text: "まだ行かせない" },
  { t: 186.6, section: "最後", text: "まだ行かせない" },
  { t: 187.5, section: "最後", text: "朱のうなじが燃えてる" },
  { t: 190.2, section: "最後", text: "まだ行かせない" },
  { t: 191.3, section: "最後", text: "まだ行かせない" },
  { t: 192.3, section: "最後", text: "この手で闇を止める" },
  { t: 194.8, section: "最後", text: "まだ行かせない" },
  { t: 196, section: "最後", text: "まだ行かせない" },
  { t: 197.4, section: "最後", text: "朝が来るまで守る" },
  { t: 199.5, section: "最後", text: "まだ行かせない" },
  { t: 200.7, section: "最後", text: "まだ行かせない" },
  { t: 201.9, section: "最後", text: "あの花魁には渡さない" },
];

export function formatCueTime(seconds: number): string {
  const rounded = Math.round(seconds * 1000) / 1000;
  return rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/** ずれた行だけ。時刻は出だしそのもの。index は CUES の並び。 */
export function cueSheet(offsets: number[]): string {
  const lines = ["# shu-cues"];
  for (let index = 0; index < CUES.length; index++) {
    if (Math.abs(offsets[index] ?? 0) < 0.0005) continue;
    const cue = CUES[index];
    lines.push([index, formatCueTime(cueHeardAt(index, offsets)), cue.section, cue.text].join("\t"));
  }
  return `${lines.join("\n")}\n`;
}

export function sceneSpan(index: number): number {
  const start = SCENES[index]?.t ?? 0;
  const end = SCENES[index + 1]?.t ?? DURATION;
  return Math.max(4, end - start);
}

export const OFFSET_MIN = -8;
export const OFFSET_MAX = 8;

export function clampOffset(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  const ms = Math.round(Math.max(OFFSET_MIN * 1000, Math.min(OFFSET_MAX * 1000, seconds * 1000)));
  return ms / 1000;
}

export function zeroOffsets(): number[] {
  return Array.from({ length: CUES.length }, () => 0);
}

export function zeroLocks(): boolean[] {
  return Array.from({ length: CUES.length }, () => false);
}

export function sceneIndexAt(t: number): number {
  let i = 0;
  for (let k = 0; k < SCENES.length; k++) {
    if (SCENES[k].t <= t) i = k;
    else break;
  }
  return i;
}

/** 正のずれは行が早い。場面の時刻には使わない。 */
export function cueHeardAt(index: number, offsets: number[]): number {
  const cue = CUES[index];
  if (!cue) return 0;
  return Math.min(DURATION, Math.max(0, cue.t - (offsets[index] ?? 0)));
}

export function cueIndexAt(t: number, offsets: number[]): number {
  let index = -1;
  let heard = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < CUES.length; i++) {
    const at = CUES[i].t - (offsets[i] ?? 0);
    if (at <= t + 0.0001 && at >= heard) {
      heard = at;
      index = i;
    }
  }
  return index;
}

/**
 * 仮の白塗りの窓。行が聞こえてから次の行まで。最短 0.4 秒。
 * 次が近すぎるか、最後の行なら 3.2 秒。範囲の速度はここでは足さない。
 * end があるときは、その秒で塗り切る。次の行より先には延ばさない。
 */
export function lyricWipeSpan(index: number, offsets: number[], end?: number | null): { start: number; span: number } {
  const cue = CUES[index];
  if (!cue) return { start: 0, span: 0.4 };
  const start = cue.t - (offsets[index] ?? 0);
  const next = CUES[index + 1];
  const autoEnd = next ? next.t - (offsets[index + 1] ?? 0) : start + 3.2;
  const span = Math.max(0.4, (autoEnd > start + 0.05 ? autoEnd : start + 3.2) - start);
  if (end == null || !Number.isFinite(end)) return { start, span };
  return { start, span: Math.max(0.4, Math.min(span, end)) };
}

/** 範囲が無いときの進み。式は lyricWipeSpan だけ。 */
export function lyricWipeAt(index: number, time: number, offsets: number[], end?: number | null): number {
  if (!CUES[index]) return 1;
  const { start, span } = lyricWipeSpan(index, offsets, end);
  return Math.min(1, Math.max(0, (time - start) / span));
}

export function sectionBounds(index: number): { from: number; to: number } {
  const at = Math.min(CUES.length - 1, Math.max(0, index));
  const name = CUES[at].section;
  let from = at;
  let to = at;
  while (from > 0 && CUES[from - 1].section === name) from -= 1;
  while (to + 1 < CUES.length && CUES[to + 1].section === name) to += 1;
  return { from, to };
}

export function sectionMarks(offsets: number[]): { index: number; name: string; t: number }[] {
  const marks: { index: number; name: string; t: number }[] = [];
  for (let i = 0; i < CUES.length; i++) {
    if (i > 0 && CUES[i].section === CUES[i - 1].section) continue;
    marks.push({ index: i, name: CUES[i].section, t: cueHeardAt(i, offsets) });
  }
  return marks;
}
