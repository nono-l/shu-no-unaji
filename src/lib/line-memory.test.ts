/*
  保存の契約。文言、700ms、未送信、触ったロック。
  サーバには繋がない。
*/
import assert from "node:assert/strict";
import { after, describe, it, mock } from "node:test";
import { createLineMemory, type LineStatus } from "./line-memory.ts";

type Line = { index: number; offsetMs: number; locked: boolean; adjustedAt?: number | null };

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
}

async function turn() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("行の保存", () => {
  after(() => {
    mock.timers.reset();
  });

  it("読み戻しと失敗の文言を変えない", async () => {
    storage();
    const notes: string[] = [];
    let load: (result: { lines: Line[] }) => void = () => {};
    const memory = createLineMemory(listen(notes), {
      load: () => new Promise((resolve) => {
        load = resolve;
      }),
      save: async () => {},
    });
    const stop = memory.start();
    load({ lines: [{ index: 0, offsetMs: 500, locked: true }] });
    await turn();
    assert.equal(notes.at(-1), "行ごとのずれを戻しました");
    stop();

    notes.length = 0;
    const empty = createLineMemory(listen(notes), {
      load: async () => ({ lines: [] }),
      save: async () => {},
    });
    const stopEmpty = empty.start();
    await turn();
    assert.equal(notes.at(-1), "行を選ぶと、その行だけ動きます");
    stopEmpty();

    notes.length = 0;
    const broken = createLineMemory(listen(notes), {
      load: async () => {
        throw new Error("down");
      },
      save: async () => {},
    });
    const stopBroken = broken.start();
    await turn();
    assert.equal(notes.at(-1), "保存先に届かず、この画面の記憶です");
    stopBroken();
  });

  it("触ったあとの読み戻しは捨て、未送信の行とロックは潰さない", async () => {
    storage();
    const notes: string[] = [];
    const seen: { offsets: number[]; locks: boolean[] } = { offsets: [], locks: [] };
    let load: (result: { lines: Line[] }) => void = () => {};
    const memory = createLineMemory(
      {
        note: (text) => notes.push(text),
        offsets: (next) => {
          seen.offsets = next;
        },
        locks: (next) => {
          seen.locks = next;
        },
      },
      {
        load: () => new Promise((resolve) => {
          load = resolve;
        }),
        save: async () => {},
      },
    );
    memory.start();
    const dirty = seen.offsets.slice();
    dirty[1] = 0.2;
    memory.commitOffsets(dirty);
    memory.queue(1);
    const locks = seen.locks.slice();
    locks[2] = true;
    memory.commitLocks(locks);
    memory.touch(2);
    load({
      lines: [
        { index: 1, offsetMs: 900, locked: false },
        { index: 2, offsetMs: 300, locked: false },
      ],
    });
    await turn();
    assert.equal(seen.offsets[1], 0.2);
    assert.equal(notes.includes("行ごとのずれを戻しました"), false);
  });

  it("ロックを触った行は、ずれだけサーバの値を受ける", async () => {
    storage();
    const seen: { offsets: number[]; locks: boolean[] } = { offsets: [], locks: [] };
    let load: (result: { lines: Line[] }) => void = () => {};
    const memory = createLineMemory(
      {
        note: () => {},
        offsets: (next) => {
          seen.offsets = next;
        },
        locks: (next) => {
          seen.locks = next;
        },
      },
      {
        load: () => new Promise((resolve) => {
          load = resolve;
        }),
        save: async () => {},
      },
    );
    memory.start();
    const locks = seen.locks.slice();
    locks[2] = true;
    memory.commitLocks(locks);
    memory.touch(2);
    load({ lines: [{ index: 2, offsetMs: 400, locked: false }] });
    await turn();
    assert.equal(seen.offsets[2], 0.4);
    assert.equal(seen.locks[2], true);
  });

  it("700ms より前には送らず、失敗したら同じ行をもう一度送る", async () => {
    storage();
    mock.timers.enable({ apis: ["setTimeout"] });
    const notes: string[] = [];
    const calls: Line[][] = [];
    let fail = true;
    const seen = { offsets: [] as number[] };
    const memory = createLineMemory(
      {
        note: (text) => notes.push(text),
        offsets: (next) => {
          seen.offsets = next;
        },
        locks: () => {},
      },
      {
        load: async () => ({ lines: [] }),
        save: async (lines) => {
          calls.push(lines);
          if (fail) throw new Error("down");
        },
      },
    );
    const stop = memory.start();
    await turn();
    const next = seen.offsets.slice();
    next[0] = 0.25;
    memory.commitOffsets(next);
    memory.queue(0);
    mock.timers.tick(699);
    await turn();
    assert.equal(calls.length, 0);
    mock.timers.tick(1);
    await turn();
    await turn();
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0].index, 0);
    assert.equal(calls[0][0].offsetMs, 250);
    assert.equal(calls[0][0].locked, false);
    assert.equal(typeof calls[0][0].adjustedAt, "number");
    assert.equal(notes.at(-1), "残せず、この画面だけ覚えています");
    fail = false;
    stop();
    await turn();
    await turn();
    assert.equal(calls.length, 2);
    assert.equal(calls[1][0].offsetMs, 250);
    mock.timers.reset();
  });

  it("残った文言は成功のときだけ", async () => {
    storage();
    mock.timers.enable({ apis: ["setTimeout"] });
    const notes: string[] = [];
    const seen = { offsets: [] as number[] };
    const memory = createLineMemory(
      {
        note: (text) => notes.push(text),
        offsets: (next) => {
          seen.offsets = next;
        },
        locks: () => {},
      },
      {
        load: async () => ({ lines: [] }),
        save: async () => {},
      },
    );
    memory.start();
    await turn();
    const next = seen.offsets.slice();
    next[0] = -0.1;
    memory.commitOffsets(next);
    memory.queue(0);
    mock.timers.tick(700);
    await turn();
    await turn();
    assert.equal(notes.at(-1), "この行だけ残しました。次からもこの行だけずれます");
    mock.timers.reset();
  });

  it("ロックだけでは調整時刻を進めず、直前のずれの時刻は残す", async () => {
    storage();
    mock.timers.enable({ apis: ["setTimeout"] });
    const calls: Line[][] = [];
    const seen = { offsets: [] as number[] };
    const memory = createLineMemory(
      {
        note: () => {},
        offsets: (next) => {
          seen.offsets = next;
        },
        locks: () => {},
      },
      {
        load: async () => ({ lines: [] }),
        save: async (lines) => {
          calls.push(lines);
        },
      },
    );
    memory.start();
    await turn();
    memory.queue(0, false);
    mock.timers.tick(700);
    await turn();
    await turn();
    assert.equal(calls[0][0].adjustedAt, null);
    const next = seen.offsets.slice();
    next[0] = 0.2;
    memory.commitOffsets(next);
    memory.queue(0);
    memory.queue(0, false);
    mock.timers.tick(700);
    await turn();
    await turn();
    assert.equal(typeof calls[1][0].adjustedAt, "number");
    mock.timers.reset();
  });
});

function listen(notes: string[]) {
  return {
    note: (text: string, _kind: LineStatus) => notes.push(text),
    offsets: () => {},
    locks: () => {},
  };
}
