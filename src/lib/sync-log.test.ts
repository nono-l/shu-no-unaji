import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CUES, DURATION, formatCueTime, zeroOffsets } from "../data/score.ts";
import { dragSpot, offsetTrace, scoreStamp, syncFrame } from "./sync-log.ts";

describe("同期ログ", () => {
  it("譜面の時刻が分かると、公開版の譜面が特定できる", () => {
    const stamp = scoreStamp();
    assert.match(stamp, new RegExp(`n=${CUES.length}`));
    assert.match(stamp, new RegExp(`0@${CUES[0].t}`));
    assert.match(stamp, new RegExp(`DURATION=${DURATION}`));
  });

  it("ゼロでないずれだけを、出どころ付きで残す", () => {
    const offsets = zeroOffsets();
    offsets[1] = -0.8;
    assert.equal(offsetTrace("remote", offsets, 19), "offsets remote nonzero=1 rows=19 1:-0.8");
  });

  it("音の時刻、行の t、ずれ、聞こえ始めを同じ行に書く", () => {
    const offsets = zeroOffsets();
    offsets[1] = -0.8;
    const line = syncFrame({
      time: 20.6,
      duration: 227.1,
      rate: 1,
      ready: 4,
      index: 1,
      offsets,
    });
    assert.match(line, /cue=1/);
    assert.match(line, new RegExp(`t=${CUES[1].t}`));
    assert.match(line, /off=-0\.8/);
    assert.match(line, new RegExp(`heard=${formatCueTime(CUES[1].t - offsets[1]).replace(".", "\\.")}`));
    assert.match(line, /audio=227\.1/);
  });

  it("端へ寄せても、一部は画面に残る", () => {
    const frame = { width: 390, height: 800 };
    const size = { width: 120, height: 32 };
    assert.deepEqual(dragSpot({ left: 10, top: 10 }, { x: -400, y: -400 }, size, frame), {
      left: 36 - 120,
      top: 8,
    });
    assert.deepEqual(dragSpot({ left: 10, top: 10 }, { x: 900, y: 900 }, size, frame), {
      left: 390 - 36,
      top: 800 - 36,
    });
  });
});
