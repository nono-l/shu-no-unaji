/*
  理解負債の点数。出題の文は持たない。
  通常は正解で少し戻り、誤答で大きく減る。
  -300 以下は反省室。落とした問いを返すあいだは、誤答と同じ幅だけ戻る。
*/

export const CHECK_ROUND = 40;
export const CHECK_GAIN = 10;
export const CHECK_LOSS = 30;
export const CHECK_ROOM = -300;
export const CHECK_DEBT_KEY = "shu-check-debt";
export const CHECK_MISSED_KEY = "shu-check-missed";

export function applyScore(debt: number, correct: boolean, room: boolean): number {
  if (room) return debt + (correct ? CHECK_LOSS : -CHECK_LOSS);
  return debt + (correct ? CHECK_GAIN : -CHECK_LOSS);
}

export function roomOpen(debt: number): boolean {
  return debt <= CHECK_ROOM;
}

export function drawIds(ids: readonly string[], count: number, random: () => number): string[] {
  const pool = [...ids];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = pool[i];
    pool[i] = pool[j];
    pool[j] = swap;
  }
  return pool.slice(0, Math.min(count, pool.length));
}
