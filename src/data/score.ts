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
  { t: 16.2, still: "/mv/tatami.jpg", ken: "left" },
  { t: 23.6, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "in" },
  { t: 28.2, still: "/mv/smile.jpg", ken: "right" },
  { t: 38.6, still: "/mv/blade.jpg", ken: "up" },
  { t: 44.2, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "left" },
  { t: 53, still: "/mv/thread.jpg", ken: "in" },
  { t: 65.5, still: "/mv/ember.jpg", video: "/mv/ember.mp4", ken: "in" },
  { t: 84, still: "/mv/mirror.jpg", ken: "left" },
  { t: 91.2, still: "/mv/kanzashi.jpg", video: "/mv/kanzashi.mp4", ken: "up" },
  { t: 98.2, still: "/mv/smile.jpg", ken: "out" },
  { t: 112.6, still: "/mv/nape.jpg", video: "/mv/nape.mp4", ken: "in" },
  { t: 123.6, still: "/mv/thread.jpg", ken: "right" },
  { t: 133.2, still: "/mv/ember.jpg", video: "/mv/ember.mp4", ken: "in" },
  { t: 150, still: "/mv/nape.jpg", ken: "left" },
  { t: 163, still: "/mv/petals.jpg", video: "/mv/petals.mp4", ken: "out" },
  { t: 172, still: "/mv/nape.jpg", ken: "up" },
  { t: 185, still: "/mv/ember.jpg", video: "/mv/ember.mp4", ken: "in" },
  { t: 197.4, still: "/mv/dawn.jpg", ken: "in" },
  { t: 208, still: "/mv/alley.jpg", video: "/mv/alley.mp4", ken: "out" },
];

export const CUES: Cue[] = [
  { t: 16.2, section: "一番", text: "畳の上で 指でなぞる輪" },
  { t: 19.8, section: "一番", text: "ほどける帯が また結び直す" },
  { t: 23.6, section: "一番", text: "朱のうなじに 月が落ちてる" },
  { t: 28.2, section: "一番", text: "笑ったままの 秘密が揺れる" },
  { t: 33.2, section: "一番", text: "あの花魁をゴールさせないために" },
  { t: 38.6, section: "一番", text: "武器を振り上げろ" },

  { t: 44.2, section: "足音", text: "息をひそめて" },
  { t: 46.4, section: "足音", text: "足音を消して" },
  { t: 48.6, section: "足音", text: "その背中まで" },
  { t: 50.8, section: "足音", text: "あと少しだろ" },
  { t: 53, section: "足音", text: "指先ひとつで" },
  { t: 56, section: "足音", text: "運命を裂いて" },
  { t: 59.2, section: "足音", text: "今夜だけはまだ" },
  { t: 62.6, section: "足音", text: "終わらせない" },

  { t: 65.5, section: "サビ", text: "まだ行かせない" },
  { t: 66.8, section: "サビ", text: "まだ行かせない" },
  { t: 68.2, section: "サビ", text: "朱のうなじが燃えてる" },
  { t: 70, section: "サビ", text: "まだ行かせない" },
  { t: 71.4, section: "サビ", text: "まだ行かせない" },
  { t: 72.9, section: "サビ", text: "この手で闇を止める" },

  { t: 84, section: "二番", text: "鏡の前で 目を伏せたまま" },
  { t: 87.6, section: "二番", text: "紅を引いたら 嘘も深くなる" },
  { t: 91.2, section: "二番", text: "簪ひとつが 落ちる音さえ" },
  { t: 94.8, section: "二番", text: "胸の奥では 鐘みたいだ" },
  { t: 98.2, section: "二番", text: "笑うなら今" },
  { t: 101, section: "二番", text: "泣くなら後で" },
  { t: 104.2, section: "二番", text: "選ぶのは誰だ" },
  { t: 107.6, section: "二番", text: "お前じゃない" },

  { t: 112.6, section: "足音", text: "息をひそめて" },
  { t: 114.6, section: "足音", text: "足音を消して" },
  { t: 117, section: "足音", text: "その背中まで" },
  { t: 119.2, section: "足音", text: "あと少しだろ" },
  { t: 121.2, section: "足音", text: "指先ひとつで" },
  { t: 124, section: "足音", text: "運命を裂いて" },
  { t: 126.6, section: "足音", text: "今夜だけはまだ" },
  { t: 129.6, section: "足音", text: "終わらせない" },

  { t: 133.2, section: "サビ", text: "まだ行かせない" },
  { t: 134.5, section: "サビ", text: "まだ行かせない" },
  { t: 135.9, section: "サビ", text: "朱のうなじが燃えてる" },
  { t: 137.6, section: "サビ", text: "まだ行かせない" },
  { t: 139, section: "サビ", text: "まだ行かせない" },
  { t: 140.5, section: "サビ", text: "この手で闇を止める" },

  { t: 163, section: "橋", text: "花びらみたいに" },
  { t: 165.2, section: "橋", text: "散るのが罪なら" },
  { t: 167.4, section: "橋", text: "この胸ごと" },
  { t: 169.4, section: "橋", text: "盾にしてやる" },
  { t: 172, section: "橋", text: "月が見ている" },
  { t: 175, section: "橋", text: "隠しきれない" },
  { t: 177.5, section: "橋", text: "名前も傷も" },
  { t: 180.2, section: "橋", text: "抱えて進め" },

  { t: 185, section: "最後", text: "まだ行かせない" },
  { t: 186.2, section: "最後", text: "まだ行かせない" },
  { t: 187.5, section: "最後", text: "朱のうなじが燃えてる" },
  { t: 189.2, section: "最後", text: "まだ行かせない" },
  { t: 190.6, section: "最後", text: "まだ行かせない" },
  { t: 192, section: "最後", text: "この手で闇を止める" },
  { t: 194.8, section: "最後", text: "まだ行かせない" },
  { t: 196, section: "最後", text: "まだ行かせない" },
  { t: 197.4, section: "最後", text: "朝が来るまで守る" },
  { t: 199.2, section: "最後", text: "まだ行かせない" },
  { t: 200.6, section: "最後", text: "まだ行かせない" },
  { t: 202.4, section: "最後", text: "あの花魁には渡さない" },
];

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
