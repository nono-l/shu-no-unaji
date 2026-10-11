/*
  終わりからは頭に戻す。止まっていれば鳴らす。鳴っていれば止める。
  シークの失敗はゲートにしない。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playIfPaused, playbackEvent, togglePlayback, type FilmPhase } from "./film-play.ts";

function deferred() {
  let resolve: () => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((ok, bad) => {
    resolve = ok;
    reject = bad;
  });
  return { promise, resolve, reject };
}

describe("再生", () => {
  it("止まっていれば鳴らし、鳴っていれば止める", async () => {
    const phases: FilmPhase[] = [];
    let videos = 0;
    let played = 0;
    let paused = 0;
    await togglePlayback({
      ended: false,
      phase: "live",
      paused: () => true,
      seekStart: () => {
        throw new Error("rewind");
      },
      play: async () => {
        played += 1;
      },
      pause: () => {
        paused += 1;
      },
      onPhase: (phase) => phases.push(phase),
      onVideos: () => {
        videos += 1;
      },
    });
    assert.deepEqual(phases, ["live"]);
    assert.equal(played, 1);
    assert.equal(videos, 1);
    await togglePlayback({
      ended: false,
      phase: "live",
      paused: () => false,
      seekStart: () => {
        throw new Error("rewind");
      },
      play: async () => {
        throw new Error("play");
      },
      pause: () => {
        paused += 1;
      },
      onPhase: (phase) => phases.push(phase),
      onVideos: () => {
        videos += 1;
      },
    });
    assert.equal(paused, 1);
    assert.equal(videos, 1);
  });

  it("終わりからは頭に戻し、失敗したらゲート", async () => {
    const phases: FilmPhase[] = [];
    let rewound = 0;
    let pausedAfter = true;
    const play = deferred();
    const run = togglePlayback({
      ended: true,
      phase: "ended",
      paused: () => pausedAfter,
      seekStart: () => {
        rewound += 1;
        pausedAfter = true;
      },
      play: () => play.promise,
      pause: () => {
        throw new Error("pause");
      },
      onPhase: (phase) => phases.push(phase),
      onVideos: () => {
        throw new Error("videos");
      },
    });
    assert.equal(rewound, 1);
    assert.deepEqual(phases, ["live"]);
    play.reject(new Error("no"));
    await run;
    assert.deepEqual(phases, ["live", "gate"]);
  });

  it("シークから鳴らす失敗は、ゲートに戻さない", async () => {
    let live = 0;
    await playIfPaused({
      paused: () => false,
      play: async () => {
        throw new Error("play");
      },
      onLive: () => {
        live += 1;
      },
    });
    await playIfPaused({
      paused: () => true,
      play: async () => {
        throw new Error("play");
      },
      onLive: () => {
        live += 1;
      },
    });
    assert.equal(live, 0);
    await playIfPaused({
      paused: () => true,
      play: async () => {},
      onLive: () => {
        live += 1;
      },
    });
    assert.equal(live, 1);
  });

  it("鳴り始めは再生中。終わりの停止は続きを残さない。終わりは消す", () => {
    assert.equal(playbackEvent("play").playing, true);
    assert.equal(playbackEvent("pause", false).saveResume, true);
    assert.equal(playbackEvent("pause", true).saveResume, false);
    const ended = playbackEvent("ended");
    assert.equal(ended.playing, false);
    assert.equal(ended.phase, "ended");
    assert.equal(ended.clearResume, true);
  });
});
