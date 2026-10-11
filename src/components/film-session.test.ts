/*
  位置は曲の中。再生と停止は同じ。左右の0秒は10秒。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DURATION } from "../data/score.ts";
import { bindMediaSession, sessionMetadata, sessionPosition } from "./film-session.ts";

describe("メディアセッション", () => {
  it("位置は曲の中。速度0は等速", () => {
    const paused = sessionPosition({ paused: true, rate: 0, time: -3 });
    assert.equal(paused.playbackState, "paused");
    assert.equal(paused.playbackRate, 1);
    assert.equal(paused.position, 0);
    assert.equal(paused.duration, DURATION);
    const playing = sessionPosition({ paused: false, rate: 0.5, time: Number.NaN });
    assert.equal(playing.playbackState, "playing");
    assert.equal(playing.position, 0);
    assert.equal(playing.playbackRate, 0.5);
  });

  it("題と絵は夜の一枚", () => {
    const meta = sessionMetadata("https://night.example");
    assert.equal(meta.title, "朱のうなじ");
    assert.equal(meta.album, "夜の映像");
    assert.equal(meta.artwork[0].src, "https://night.example/mv/nape.jpg");
  });

  it("再生と停止は同じ切り替え。前後は行。左右の0は10秒", () => {
    const seen: string[] = [];
    const handlers = new Map<string, ((details: { seekOffset?: number | null; seekTime?: number | null }) => void) | null>();
    const stop = bindMediaSession(
      {
        setActionHandler: (action, handler) => {
          handlers.set(action, handler);
        },
      },
      {
        toggle: () => seen.push("toggle"),
        stepLine: (dir) => seen.push(`line:${dir}`),
        seekBy: (delta) => seen.push(`by:${delta}`),
        seekTo: (time) => seen.push(`to:${time}`),
      },
    );
    handlers.get("play")?.({});
    handlers.get("pause")?.({});
    handlers.get("nexttrack")?.({});
    handlers.get("previoustrack")?.({});
    handlers.get("seekbackward")?.({ seekOffset: 0 });
    handlers.get("seekforward")?.({ seekOffset: 4 });
    handlers.get("seekto")?.({});
    handlers.get("seekto")?.({ seekTime: 12 });
    assert.deepEqual(seen, ["toggle", "toggle", "line:1", "line:-1", "by:-10", "by:4", "to:12"]);
    stop();
    assert.equal(handlers.get("play"), null);
    assert.equal(handlers.get("seekto"), null);
  });
});
