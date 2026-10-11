/*
  再生中だけ画面を保持する。止めたあと届いたロックは離す。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWakeHold } from "./film-wake.ts";

function turn() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("スリープ", () => {
  it("再生中だけ取り、止めたら離す。見えたら取り直す", async () => {
    const released: number[] = [];
    let calls = 0;
    let onVisible = () => {};
    let stopped = false;
    const hold = createWakeHold({
      request: async () => {
        const id = ++calls;
        return { release: async () => void released.push(id) };
      },
      listenVisible: (fn) => {
        onVisible = fn;
        return () => {
          stopped = true;
        };
      },
    });
    hold.setPlaying(false);
    onVisible();
    await turn();
    assert.equal(calls, 0);
    hold.setPlaying(true);
    await turn();
    assert.equal(calls, 1);
    onVisible();
    await turn();
    assert.equal(calls, 2);
    hold.setPlaying(false);
    await turn();
    assert.deepEqual(released, [2]);
    hold.stop();
    assert.equal(stopped, true);
  });

  it("止めたあと届いたロックは、すぐ離す", async () => {
    let resolve: (sentinel: { release: () => Promise<void> }) => void = () => {};
    const released: string[] = [];
    const hold = createWakeHold({
      request: () =>
        new Promise((done) => {
          resolve = done;
        }),
      listenVisible: () => () => {},
    });
    hold.setPlaying(true);
    hold.stop();
    resolve({
      release: async () => {
        released.push("yes");
      },
    });
    await turn();
    assert.deepEqual(released, ["yes"]);
  });

  it("対応していないときは何もしない", () => {
    const hold = createWakeHold({
      request: null,
      listenVisible: () => () => {},
    });
    hold.setPlaying(true);
    hold.stop();
  });
});
