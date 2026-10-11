/*
  続きの位置。頭と終わりは残さない。?t= が先。再生中は2秒に一度。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DURATION } from "../data/score.ts";
import { createResumeClock, readResume, writeResume } from "./resume-at.ts";

function storage() {
  const bag = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => (bag.has(key) ? bag.get(key)! : null),
      setItem: (key: string, value: string) => {
        bag.set(key, value);
      },
      removeItem: (key: string) => {
        bag.delete(key);
      },
    },
  });
  return bag;
}

describe("続きの位置", () => {
  it("頭の1秒と終わりの2秒は残さず、0.1秒で書く", () => {
    const bag = storage();
    writeResume(1);
    writeResume(DURATION - 2);
    assert.equal(bag.size, 0);
    writeResume(10.26);
    assert.equal(bag.get("shu-resume"), "10.3");
    assert.equal(readResume(""), 10.3);
  });

  it("リンクの時刻が窓の中なら、控えより先で、丸めない", () => {
    storage();
    writeResume(40);
    assert.equal(readResume("?t=10.26"), 10.26);
    assert.equal(readResume("?t=0"), 40);
  });

  it("再生中は2秒に一度。停止はその時刻。終わりは消す", () => {
    const bag = storage();
    const clock = createResumeClock();
    clock.tick(2001, 20);
    clock.tick(4001, 21);
    assert.equal(bag.get("shu-resume"), "20");
    clock.tick(4002, 22);
    assert.equal(bag.get("shu-resume"), "22");
    clock.pause(30.04);
    assert.equal(bag.get("shu-resume"), "30");
    clock.end();
    assert.equal(bag.has("shu-resume"), false);
    assert.equal(readResume(""), null);
  });
});
