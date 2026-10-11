import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adjustedAgo } from "./adjusted-ago.ts";

const at = 1_700_000_000_000;

describe("調整した時刻", () => {
  it("秒、分、時間、日、週、月、年", () => {
    assert.equal(adjustedAgo(at, at + 12_000), "12秒前に調整");
    assert.equal(adjustedAgo(at, at + 3 * 60_000), "3分前に調整");
    assert.equal(adjustedAgo(at, at + 5 * 3_600_000), "5時間前に調整");
    assert.equal(adjustedAgo(at, at + 2 * 86_400_000), "2日前に調整");
    assert.equal(adjustedAgo(at, at + 14 * 86_400_000), "2週前に調整");
    assert.equal(adjustedAgo(at, at + 40 * 86_400_000), "1か月前に調整");
    assert.equal(adjustedAgo(at, at + 400 * 86_400_000), "1年前に調整");
  });

  it("直した時刻が無い行は空", () => {
    assert.equal(adjustedAgo(0, at), "");
  });
});
