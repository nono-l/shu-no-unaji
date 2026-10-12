/*
  シークは曲の中だけ。行を出ると、そのくり返しは外れる。
  巻き戻しの時刻はここではない。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CUES, DURATION, SCENES, zeroOffsets } from "../data/score.ts";
import {
  clampSeek,
  lineLoop,
  loopAfterLine,
  loopAfterSection,
  nextSceneTime,
  sceneVideoInto,
  sectionLoop,
  sectionStart,
  seekWrite,
  seekLanded,
  stepCue,
} from "./film-seek.ts";

describe("シークとくり返し", () => {
  it("シークは曲の中に収める", () => {
    assert.equal(clampSeek(Number.NaN), 0);
    assert.equal(clampSeek(-4), 0);
    assert.equal(clampSeek(DURATION + 3), DURATION);
    assert.equal(clampSeek(10.5), 10.5);
  });

  it("移動中は次を書かず、着いたら終える", () => {
    assert.equal(seekWrite(12, 1, true), "wait");
    assert.equal(seekWrite(null, 1, false), "wait");
    assert.equal(seekWrite(12, 12.02, false), "done");
    assert.equal(seekWrite(12, 1, false), "write");
  });

  it("着地したあとだけ、止めた再生を戻す", () => {
    assert.equal(seekLanded(null, false, true), true);
    assert.equal(seekLanded(12, false, true), false);
    assert.equal(seekLanded(null, true, true), false);
    assert.equal(seekLanded(null, false, false), false);
  });

  it("場面の動画は、その場面の頭からの余り", () => {
    assert.equal(sceneVideoInto(18.2, 8), 2);
    assert.equal(sceneVideoInto(10, 0), null);
  });

  it("隣の場面の頭へ行く", () => {
    assert.equal(nextSceneTime(0, 1), SCENES[1].t);
    assert.equal(nextSceneTime(0, -1), SCENES[0].t);
  });

  it("行が無いとき、先だけ最初の行へ行く", () => {
    assert.equal(stepCue(-1, 1), 0);
    assert.equal(stepCue(-1, -1), null);
    assert.equal(stepCue(0, -1), 0);
  });

  it("節のくり返しは、今がその節の中なら武装する", () => {
    const offsets = zeroOffsets();
    const index = CUES.findIndex((cue) => cue.section === "二番");
    const start = CUES[index].t;
    const inside = sectionLoop(index, start, offsets);
    assert.equal(inside.kind, "section");
    assert.equal(inside.from, sectionStart(index));
    assert.equal(inside.armed, true);
    assert.equal(sectionLoop(index, start - 1, offsets).armed, false);
  });

  it("行を出たら行のくり返しを外し、節を出たら節のくり返しを外す", () => {
    const line = lineLoop(3);
    assert.equal(loopAfterLine(line, 3), line);
    assert.equal(loopAfterLine(line, 4), null);
    const section = sectionLoop(CUES.findIndex((cue) => cue.section === "二番"), CUES[0].t, zeroOffsets());
    const inside = section.from;
    assert.equal(loopAfterLine(section, inside), section);
    assert.equal(loopAfterLine(section, CUES.findIndex((cue) => cue.section === "橋")), null);
    assert.equal(loopAfterSection(line, inside), null);
    assert.equal(loopAfterSection(section, inside), section);
    assert.equal(loopAfterSection(section, inside + 8), null);
  });
});
