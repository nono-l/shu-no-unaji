/*
  選んだ範囲だけ速く、遅く、前へ、後ろへ。外は残す。
  何も無ければ、行全体の進みは一本と同じ。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CUES, lyricWipeAt, lyricWipeSpan, zeroOffsets } from "../data/score.ts";
import { applyWipe, charProgress, isPlain, unpackWipe } from "./wipe-span.ts";

describe("白い塗りの範囲", () => {
  it("何も無ければ、行の真ん中は半分白い", () => {
    const offsets = zeroOffsets();
    const { start, span } = lyricWipeSpan(0, offsets);
    const text = Array.from(CUES[0].text);
    const mid = charProgress(text.length, null, start + span / 2, start, span);
    const filled = mid.reduce((sum, value) => sum + value, 0) / text.length;
    assert.ok(Math.abs(filled - lyricWipeAt(0, start + span / 2, offsets)) < 1e-9);
    assert.equal(isPlain(text.length, null), true);
  });

  it("選んだ範囲だけ速くし、もう一度で戻る", () => {
    const faster = applyWipe(6, null, 2, 4, "faster");
    assert.deepEqual(faster, [
      { from: 0, to: 2, speed: 1, offset: 0 },
      { from: 2, to: 4, speed: 1.25, offset: 0 },
      { from: 4, to: 6, speed: 1, offset: 0 },
    ]);
    assert.equal(applyWipe(6, faster, 2, 4, "slower"), null);
  });

  it("始まりを前にずらすと、その文字だけ早く白くなる", () => {
    const spans = applyWipe(4, null, 1, 2, "earlier");
    const plain = charProgress(4, null, 1.96, 1, 4);
    const moved = charProgress(4, spans, 1.96, 1, 4);
    assert.equal(plain[1], 0);
    assert.ok(moved[1] > 0);
    assert.equal(moved[0], plain[0]);
  });

  it("保存した範囲を戻す。空は一本", () => {
    const spans = unpackWipe([{ from: 0, to: 2, speed: 1.25, offsetMs: 50 }], 4);
    assert.equal(spans?.[0].offset, 0.05);
    assert.equal(spans?.[0].speed, 1.25);
    assert.equal(unpackWipe([], 4), null);
  });
});
