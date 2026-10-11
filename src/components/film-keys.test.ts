/*
  空白は再生。左右は5秒。入力欄では無視する。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KEY_STEP, filmKey } from "./film-keys.ts";

function key(over: { key?: string; code?: string; tag?: string }) {
  const target = over.tag ? { tagName: over.tag } : null;
  return filmKey({ key: over.key ?? "", code: over.code ?? "", target: target as EventTarget | null });
}

describe("キー", () => {
  it("空白は再生、左右は5秒", () => {
    assert.equal(key({ key: " " }), "play");
    assert.equal(key({ code: "Space" }), "play");
    assert.equal(key({ key: "ArrowRight" }), "forward");
    assert.equal(key({ key: "ArrowLeft" }), "back");
    assert.equal(KEY_STEP, 5);
  });

  it("入力欄とそれ以外のキーは無視する", () => {
    assert.equal(key({ key: " ", tag: "INPUT" }), null);
    assert.equal(key({ key: "ArrowLeft", tag: "TEXTAREA" }), null);
    assert.equal(key({ key: "k" }), null);
  });
});
