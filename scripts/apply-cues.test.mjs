import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCueSheet } from "./apply-cues.mjs";

const source = `export const CUES = [
  { t: 16.2, section: "一番", text: "畳の上で 指でなぞる輪" },
  { t: 19.8, section: "一番", text: "ほどける帯が また結び直す" },
];
`;

describe("score.ts へ反映", () => {
  it("一致した行の t だけを置き換える", () => {
    const next = applyCueSheet(source, "# shu-cues\n0\t15.7\t一番\t畳の上で 指でなぞる輪\n");
    assert.match(next, /t: 15\.7, section: "一番", text: "畳の上で 指でなぞる輪"/);
    assert.match(next, /t: 19\.8, section: "一番", text: "ほどける帯が また結び直す"/);
  });

  it("歌詞が違う行は書かない", () => {
    assert.throws(
      () => applyCueSheet(source, "0\t15.7\t一番\t別の歌詞\n"),
      /score\.ts/,
    );
  });
});
