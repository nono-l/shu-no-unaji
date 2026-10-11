/*
  音の要素と、歌なしのグラフ。
  MediaElementSource は要素につき一度。付け直すときは要素を作り直す。同じ要素に二度作らない。
  vocal.ts は使わない。続きの保存もメディアセッションも持たない。
*/
import { createVocalGraph } from "../lib/karaoke.ts";

const SRC = "/audio/shu.m4a";

type DeckGraph = {
  context: { readonly state: string; resume: () => Promise<void> };
  close: () => void;
};

type Listen = {
  onPlay: (audio: HTMLAudioElement) => void;
  onPause: (audio: HTMLAudioElement) => void;
  onEnded: () => void;
  onTick: (audio: HTMLAudioElement) => void;
  onElement: (audio: HTMLAudioElement | null) => void;
};

type Io = {
  createAudio: () => HTMLAudioElement;
  createGraph: (audio: HTMLMediaElement) => DeckGraph;
};

function defaultAudio(): HTMLAudioElement {
  return document.createElement("audio");
}

export function createFilmDeck(listen: Listen, io?: Io) {
  let host: { appendChild: (node: Node) => void } | null = null;
  let audio: HTMLAudioElement | null = null;
  let graph: DeckGraph | null = null;
  let karaoke = false;
  let rate = 1;

  function makeAudio(): HTMLAudioElement {
    return io ? io.createAudio() : defaultAudio();
  }

  function makeGraph(target: HTMLAudioElement): DeckGraph {
    return io ? io.createGraph(target) : createVocalGraph(target, false);
  }

  function bind(target: HTMLAudioElement) {
    target.preload = "auto";
    target.setAttribute("playsinline", "true");
    target.onplay = () => {
      if (audio) listen.onPlay(audio);
    };
    target.onpause = () => {
      if (audio) listen.onPause(audio);
    };
    target.onended = () => {
      listen.onEnded();
    };
    target.ontimeupdate = () => {
      if (audio) listen.onTick(audio);
    };
  }

  function place(next: HTMLAudioElement, time: number, paused: boolean, muted: boolean) {
    next.src = SRC;
    bind(next);
    next.muted = muted;
    next.playbackRate = rate;
    audio = next;
    listen.onElement(next);
    host?.appendChild(next);
    if (time > 0) {
      const apply = () => {
        try {
          next.currentTime = time;
        } catch {
          /* metadata not ready */
        }
      };
      if (next.readyState >= 1) apply();
      else next.addEventListener("loadedmetadata", apply, { once: true });
    }
    if (!paused) void next.play().catch(() => {});
  }

  function replace() {
    const current = audio;
    if (!current) return;
    const time = current.currentTime;
    const paused = current.paused;
    const muted = current.muted;
    graph?.close();
    graph = null;
    current.onplay = null;
    current.onpause = null;
    current.onended = null;
    current.ontimeupdate = null;
    current.pause();
    current.removeAttribute("src");
    current.load();
    current.remove();
    place(makeAudio(), time, paused, muted);
  }

  function ensureGraph() {
    if (!audio || !karaoke) return;
    if (!graph) {
      try {
        graph = makeGraph(audio);
      } catch {
        return;
      }
    }
    void graph.context.resume();
  }

  function onVisibility() {
    if (document.visibilityState === "hidden") {
      if (graph) replace();
      return;
    }
    if (!karaoke || graph) return;
    if (!audio || audio.paused) return;
    try {
      const next = makeGraph(audio);
      graph = next;
      void next.context.resume().then(() => {
        if (next.context.state !== "running") replace();
      });
    } catch {
      /* autoplay graph blocked */
    }
  }

  function mount(parent: { appendChild: (node: Node) => void } | null) {
    host = parent;
    place(makeAudio(), 0, true, false);
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      /* unsupported */
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      graph?.close();
      graph = null;
      if (audio) {
        audio.pause();
        audio.remove();
        audio = null;
        listen.onElement(null);
      }
    };
  }

  return {
    mount,
    ensureGraph,
    arm(on: boolean) {
      karaoke = on;
    },
    toggle(): boolean {
      karaoke = !karaoke;
      if (!karaoke) {
        if (graph) replace();
        return false;
      }
      if (audio && !audio.paused) ensureGraph();
      return true;
    },
    setRate(next: number) {
      // 要素を作り直しても速度は残す。等速へ戻すのは、タイミングを閉じた殻。
      rate = next;
      if (audio) audio.playbackRate = next;
    },
    get current() {
      return audio;
    },
  };
}
