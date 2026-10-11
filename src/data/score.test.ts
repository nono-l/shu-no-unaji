/*
  時計の固定。分割の前に落とす。
  くり返しの端は別の式。ここには入れない。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CUES, SCENES, clampOffset, cueHeardAt, cueIndexAt, lyricWipeAt, sceneIndexAt } from "./score.ts";

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} は ${expected} ではない`);
}

describe("行の頭", () => {
  it("正のずれは行を早める", () => {
    const offsets = Array.from({ length: CUES.length }, () => 0);
    offsets[0] = 0.5;
    assert.equal(cueHeardAt(0, offsets), CUES[0].t - 0.5);
    assert.equal(cueIndexAt(CUES[0].t - 0.5, offsets), 0);
    assert.equal(cueIndexAt(CUES[0].t - 0.6, offsets), -1);
  });

  it("負のずれは行を遅らせる", () => {
    const offsets = Array.from({ length: CUES.length }, () => 0);
    offsets[0] = -0.5;
    assert.equal(cueHeardAt(0, offsets), CUES[0].t + 0.5);
    assert.equal(cueIndexAt(CUES[0].t, offsets), -1);
    assert.equal(cueIndexAt(CUES[0].t + 0.5, offsets), 0);
  });

  it("ずれは -8 から 8 秒、ミリ秒で丸める", () => {
    assert.equal(clampOffset(8.2), 8);
    assert.equal(clampOffset(-9), -8);
    assert.equal(clampOffset(Number.NaN), 0);
    assert.equal(clampOffset(0.0006), 0.001);
  });
});

describe("場面", () => {
  it("生の時刻だけを見る", () => {
    assert.equal(sceneIndexAt(0), 0);
    assert.equal(sceneIndexAt(SCENES[1].t - 0.001), 0);
    assert.equal(sceneIndexAt(SCENES[1].t), 1);
    const offsets = Array.from({ length: CUES.length }, () => 0);
    offsets[0] = 1;
    assert.equal(cueIndexAt(SCENES[1].t - 0.5, offsets), 0);
    assert.equal(sceneIndexAt(SCENES[1].t - 0.5), 0);
  });
});

describe("白塗り", () => {
  it("次の行までを一本で塗る", () => {
    const offsets = Array.from({ length: CUES.length }, () => 0);
    const start = CUES[0].t;
    const span = CUES[1].t - start;
    assert.ok(span > 0.4);
    assert.equal(lyricWipeAt(0, start, offsets), 0);
    near(lyricWipeAt(0, start + span / 2, offsets), 0.5);
    assert.equal(lyricWipeAt(0, start + span, offsets), 1);
  });

  it("次が近すぎるときは 0.4 秒、重なるときは 3.2 秒", () => {
    const offsets = Array.from({ length: CUES.length }, () => 0);
    const start = CUES[0].t;
    offsets[1] = CUES[1].t - start - 0.1;
    near(lyricWipeAt(0, start + 0.2, offsets), 0.5);
    offsets[1] = CUES[1].t - start + 1;
    near(lyricWipeAt(0, start + 1.6, offsets), 0.5);
  });

  it("最後の行は 3.2 秒", () => {
    const offsets = Array.from({ length: CUES.length }, () => 0);
    const last = CUES.length - 1;
    assert.equal(lyricWipeAt(last, CUES[last].t + 1.6, offsets), 0.5);
  });
});
