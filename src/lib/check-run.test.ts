/*
  誤答は大きく減る。-300 で反省室。取り直しは同じ幅だけ戻る。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyScore, drawIds, roomOpen } from "./check-run.ts";

describe("理解負債の点数", () => {
  it("通常は正解 +10、誤答 -30", () => {
    assert.equal(applyScore(0, true, false), 10);
    assert.equal(applyScore(0, false, false), -30);
  });

  it("-300 以下で反省室、取り直しの正解は +30", () => {
    assert.equal(roomOpen(-299), false);
    assert.equal(roomOpen(-300), true);
    assert.equal(applyScore(-300, true, true), -270);
    assert.equal(applyScore(-300, false, true), -330);
    assert.equal(roomOpen(applyScore(-300, true, true)), false);
  });

  it("四十問は重複しない", () => {
    const ids = Array.from({ length: 100 }, (_, index) => String(index));
    let n = 0;
    const drawn = drawIds(ids, 40, () => {
      n += 1;
      return (n * 17) % 100 / 100;
    });
    assert.equal(drawn.length, 40);
    assert.equal(new Set(drawn).size, 40);
  });
});
