/*
  動画は音を出さない。頭は場面の頭からの余り。再生中だけ鳴らす。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resumeVideo, syncSceneVideo } from "./film-video.ts";

function fake(over: { duration?: number; ready?: number } = {}) {
  const calls: string[] = [];
  let onMeta: (() => void) | null = null;
  const video = {
    muted: false,
    playsInline: false,
    duration: over.duration ?? 8,
    readyState: over.ready ?? 1,
    currentTime: -1,
    play: async () => {
      calls.push("play");
    },
    addEventListener: (_type: "loadedmetadata", fn: () => void) => {
      onMeta = fn;
      calls.push("wait");
    },
  };
  return { video, calls, fire: () => onMeta?.() };
}

describe("動画の同期", () => {
  it("場面の頭からの余り。音は消す。再生中だけ鳴らす", () => {
    const ready = fake();
    syncSceneVideo(ready.video, { sceneStart: 16.2, audioTime: 18.2, audioPlaying: true });
    assert.equal(ready.video.muted, true);
    assert.equal(ready.video.playsInline, true);
    assert.equal(ready.video.currentTime, 2);
    assert.deepEqual(ready.calls, ["play"]);
    const quiet = fake();
    syncSceneVideo(quiet.video, { sceneStart: 16.2, audioTime: 18.2, audioPlaying: false });
    assert.deepEqual(quiet.calls, []);
    syncSceneVideo(null, { sceneStart: 0, audioTime: null, audioPlaying: true });
  });

  it("音が無いときは場面の頭。長さが来るまで待ってから余りを置く", () => {
    const waiting = fake({ duration: 0, ready: 0 });
    syncSceneVideo(waiting.video, { sceneStart: 10, audioTime: null, audioPlaying: false });
    assert.equal(waiting.video.currentTime, -1);
    assert.deepEqual(waiting.calls, ["wait"]);
    waiting.video.duration = 6;
    waiting.fire();
    assert.equal(waiting.video.currentTime, 0);
  });

  it("続きの再生は、音を消してから鳴らす", async () => {
    let played = 0;
    const video = {
      muted: false,
      play: async () => {
        played += 1;
      },
    };
    resumeVideo(video);
    await Promise.resolve();
    assert.equal(video.muted, true);
    assert.equal(played, 1);
    resumeVideo({
      muted: false,
      play: async () => {
        throw new Error("no");
      },
    });
  });
});
