/*
  再生中は画面を消さない。止めたら離す。
  タブに戻ったとき、まだ再生中なら取り直す。
  対応していないブラウザは何もしない。
*/

type Sentinel = { release: () => Promise<void> };

export function createWakeHold(env: {
  request: ((type: "screen") => Promise<Sentinel>) | null;
  listenVisible: (onVisible: () => void) => () => void;
}) {
  let sentinel: Sentinel | null = null;
  let holding = false;
  let gone = false;

  const request = () => {
    if (!holding || gone || !env.request) return;
    void env
      .request("screen")
      .then((next) => {
        if (gone || !holding) void next.release().catch(() => {});
        else sentinel = next;
      })
      .catch(() => {});
  };

  const release = () => {
    void sentinel?.release().catch(() => {});
    sentinel = null;
  };

  const stopListen = env.listenVisible(() => request());

  return {
    setPlaying(playing: boolean) {
      holding = playing;
      if (playing) request();
      else release();
    },
    stop() {
      gone = true;
      holding = false;
      release();
      stopListen();
    },
  };
}
