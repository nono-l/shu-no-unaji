/*
  塗りの判断。DOM は触らない。
  くり返しの端と、場面がずれを見ないこと。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CUES, DURATION, lyricWipeAt } from "../data/score.ts";
import { formatClock, stepFilmClock, type FilmLoop } from "./film-paint.ts";

const offsets = () => Array.from({ length: CUES.length }, () => 0);

function step(over: Partial<Parameters<typeof stepFilmClock>[0]> = {}) {
  return stepFilmClock({
    time: 0,
    offsets: offsets(),
    pin: null,
    loop: null,
    remain: false,
    scene: 0,
    heard: -1,
    hasAudio: true,
    ...over,
  });
}

describe("時刻の文字", () => {
  it("残りと経過を分け、音の時計は残りにしない", () => {
    assert.equal(formatClock(65), "1:05");
    const frame = step({ time: 65, remain: true });
    assert.equal(frame.timeText, `-${formatClock(DURATION - 65)}`);
    assert.equal(frame.audioText, "1:05");
  });
});

describe("場面と行", () => {
  it("同じ場面では描き直さない", () => {
    const frame = step({ time: 10, scene: 0, heard: -1 });
    assert.equal(frame.sceneChanged, false);
    assert.equal(frame.heardChanged, false);
  });

  it("行のずれは歌詞だけを早め、場面は生の時刻", () => {
    const shifted = offsets();
    shifted[0] = 1;
    const frame = step({ time: CUES[0].t - 0.5, offsets: shifted, scene: 0, heard: -1 });
    assert.equal(frame.heard, 0);
    assert.equal(frame.heardChanged, true);
    assert.equal(frame.scene, 0);
    assert.equal(frame.sceneChanged, false);
  });

  it("ピンは先の行へ進んだときだけ外れる", () => {
    const held = step({ time: CUES[0].t, pin: 1, heard: -1 });
    assert.equal(held.pin, 1);
    assert.equal(held.pinChanged, false);
    const dropped = step({ time: CUES[1].t, pin: 0, heard: 0 });
    assert.equal(dropped.pin, null);
    assert.equal(dropped.pinChanged, true);
  });
});

describe("くり返しと白塗り", () => {
  it("行の終わりで頭に戻り、飛び過ぎたら外す", () => {
    const loop: FilmLoop = { kind: "line", from: 0, armed: false };
    const back = step({ time: CUES[1].t - 0.08, loop });
    assert.equal(back.rewindTo, CUES[0].t);
    assert.equal(back.time, CUES[0].t);
    assert.equal(loop.armed, true);
    assert.equal(back.clearLoop, false);
    const gone = step({ time: CUES[1].t + 0.3, loop: { kind: "line", from: 0, armed: true } });
    assert.equal(gone.clearLoop, true);
    assert.equal(gone.rewindTo, null);
  });

  it("音が無いときはくり返さない", () => {
    const loop: FilmLoop = { kind: "line", from: 0, armed: true };
    const frame = step({ time: 1, loop, hasAudio: false });
    assert.equal(frame.clearLoop, false);
    assert.equal(frame.rewindTo, null);
    assert.equal(loop.armed, true);
  });

  it("白塗りは lyricWipeAt の一本", () => {
    const at = CUES[0].t + 1;
    const frame = step({ time: at, heard: -1 });
    assert.equal(frame.wipe, `${lyricWipeAt(0, at, offsets()) * 100}%`);
    const before = step({ time: 1, heard: -1 });
    assert.equal(before.wipe, "100%");
    assert.equal(before.heardChanged, false);
  });
});
