/*
  共有リンクは再生位置だけ。0.1秒。すでにある ?t= は置き換える。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SHARE_FLASH, SHARE_TITLE, shareHref } from "./film-share.ts";

describe("共有", () => {
  it("再生位置を0.1秒で ?t= に置く", () => {
    const href = shareHref("https://night.example/film", 12.26);
    const url = new URL(href);
    assert.equal(url.searchParams.get("t"), "12.3");
    assert.equal(SHARE_TITLE, "朱のうなじ");
    assert.equal(SHARE_FLASH, 1200);
  });

  it("負は0。すでにある時刻は置き換える", () => {
    const href = shareHref("https://night.example/film?t=9&v=1", -0.2);
    const url = new URL(href);
    assert.equal(url.searchParams.get("t"), "0");
    assert.equal(url.searchParams.get("v"), "1");
  });
});
