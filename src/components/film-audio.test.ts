/*
  グラフは要素につき一度。付け直すときは要素を替える。
  vocal.ts には繋がない。
*/
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { createFilmDeck } from "./film-audio.ts";

const previousDocument = (globalThis as { document?: unknown }).document;
after(() => {
  if (previousDocument === undefined) delete (globalThis as { document?: unknown }).document;
  else Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
});

type Fake = {
  paused: boolean;
  removed: boolean;
  muted: boolean;
  currentTime: number;
  playbackRate: number;
};

function fakeAudio(paused = true): Fake {
  const el = {
    src: "",
    muted: false,
    paused,
    ended: false,
    currentTime: 12,
    readyState: 1,
    preload: "",
    playbackRate: 1,
    removed: false,
    onplay: null as null | (() => void),
    onpause: null as null | (() => void),
    onended: null as null | (() => void),
    ontimeupdate: null as null | (() => void),
    setAttribute() {},
    removeAttribute() {},
    load() {},
    pause() {
      el.paused = true;
    },
    play() {
      el.paused = false;
      return Promise.resolve();
    },
    remove() {
      el.removed = true;
    },
    addEventListener() {},
  };
  return el;
}

function harness(resumeState = "running") {
  const made: Fake[] = [];
  const graphs: { audio: Fake; closed: boolean; state: string }[] = [];
  let hidden = false;
  let onVis: (() => void) | null = null;
  const doc = {
    get visibilityState() {
      return hidden ? "hidden" : "visible";
    },
    addEventListener(_type: string, fn: () => void) {
      onVis = fn;
    },
    removeEventListener() {
      onVis = null;
    },
  };
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  const deck = createFilmDeck(
    {
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {},
      onTick: () => {},
      onElement: () => {},
    },
    {
      createAudio: () => {
        const el = fakeAudio(true);
        made.push(el);
        return el as unknown as HTMLAudioElement;
      },
      createGraph: (audio) => {
        const host = audio as unknown as Fake;
        if (graphs.some((graph) => graph.audio === host && !graph.closed)) {
          throw new Error("same element");
        }
        const row = { audio: host, closed: false, state: resumeState };
        graphs.push(row);
        return {
          context: {
            get state() {
              return row.state;
            },
            resume: async () => {},
          },
          setVocals() {},
          close() {
            row.closed = true;
          },
        };
      },
    },
  );
  const stop = deck.mount({ appendChild() {} });
  return {
    deck,
    made,
    graphs,
    stop,
    hide() {
      hidden = true;
      onVis?.();
    },
    show() {
      hidden = false;
      onVis?.();
    },
  };
}

describe("歌なし", () => {
  it("同じ要素にはグラフを一度だけ付ける", () => {
    const { deck, made, graphs, stop } = harness();
    const el = made[0];
    el.paused = false;
    deck.arm(true);
    deck.ensureGraph();
    deck.ensureGraph();
    assert.equal(graphs.length, 1);
    assert.equal(graphs[0].audio, el);
    stop();
  });

  it("歌を戻すときは要素を替え、前のグラフを閉じる", () => {
    const { deck, made, graphs, stop } = harness();
    made[0].paused = false;
    deck.arm(true);
    deck.ensureGraph();
    assert.equal(deck.toggle(), false);
    assert.equal(graphs[0].closed, true);
    assert.equal(made.length, 2);
    assert.equal(made[0].removed, true);
    assert.equal(graphs.length, 1);
    stop();
    assert.equal(made[1].removed, true);
  });

  it("歌なしで要素を替えても、タイミングの速度は残る", () => {
    const { deck, made, stop } = harness();
    made[0].paused = false;
    deck.arm(true);
    deck.ensureGraph();
    deck.setRate(0.1);
    assert.equal(made[0].playbackRate, 0.1);
    deck.toggle();
    assert.equal(made[1].playbackRate, 0.1);
    stop();
  });

  it("止まっているあいだはグラフを作らない", () => {
    const { deck, graphs, stop } = harness();
    assert.equal(deck.toggle(), true);
    assert.equal(graphs.length, 0);
    stop();
  });

  it("隠したときは要素を替え、戻して再生中なら新しい要素に付け直す", async () => {
    const { deck, made, graphs, hide, show, stop } = harness();
    made[0].paused = false;
    deck.arm(true);
    deck.ensureGraph();
    hide();
    assert.equal(graphs[0].closed, true);
    assert.equal(made.length, 2);
    made[1].paused = false;
    show();
    await Promise.resolve();
    assert.equal(graphs.length, 2);
    assert.equal(graphs[1].audio, made[1]);
    assert.equal(graphs[1].closed, false);
    stop();
  });

  it("グラフが走らないときは、その要素を捨てる", async () => {
    const { deck, made, graphs, hide, show, stop } = harness("suspended");
    made[0].paused = false;
    deck.arm(true);
    hide();
    show();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(made.length, 2);
    assert.equal(graphs[0].closed, true);
    assert.equal(made[0].removed, true);
    stop();
  });
});
