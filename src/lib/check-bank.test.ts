/*
  題は重複せず、正答は四つのうち一つ。
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHECK_QUESTIONS } from "./check-bank.ts";

describe("理解負債の題", () => {
  it("六百問を超え、正答は選択肢にある", () => {
    assert.ok(CHECK_QUESTIONS.length >= 600);
    const ids = new Set<string>();
    for (const question of CHECK_QUESTIONS) {
      assert.equal(ids.has(question.id), false);
      ids.add(question.id);
      assert.equal(new Set(question.choices).size, 4);
      assert.equal(question.choices.includes(question.answer), true);
    }
  });

  it("時計の担当は film-player で、正のずれは score", () => {
    assert.equal(CHECK_QUESTIONS.find((question) => question.id === "clock:who")?.answer, "film-player.tsx");
    assert.equal(CHECK_QUESTIONS.find((question) => question.id === "off-sign:who")?.answer, "score.ts");
    assert.equal(CHECK_QUESTIONS.find((question) => question.id === "mem-700:who")?.answer, "line-memory.ts");
  });
});
