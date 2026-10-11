/*
  使っていない。歌なしは karaoke.ts。
  ここを再生経路に戻すと、MediaElementSource が同じ要素に二度付く。
*/
const LOW = 150;
const HIGH = 6500;

function band(ctx: AudioContext, input: AudioNode, type: BiquadFilterType, freq: number) {
  let node = input;
  for (let i = 0; i < 3; i++) {
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = 0.7071;
    node.connect(filter);
    node = filter;
  }
  return node;
}

export type VocalSplit = {
  context: AudioContext;
  setVocals: (on: boolean) => void;
  close: () => void;
};

export function splitVocals(audio: HTMLAudioElement, vocals: boolean): VocalSplit {
  const ctx = new AudioContext({ latencyHint: "interactive" });
  const source = ctx.createMediaElementSource(audio);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = vocals ? 1 : 0;
  wet.gain.value = vocals ? 0 : 1;
  source.connect(dry);
  dry.connect(ctx.destination);

  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  source.connect(split);
  const midIn = ctx.createGain();
  midIn.gain.value = 0.5;
  split.connect(midIn, 0);
  split.connect(midIn, 1);
  const low = band(ctx, midIn, "lowpass", LOW);
  const high = band(ctx, midIn, "highpass", HIGH);
  low.connect(merge, 0, 0);
  low.connect(merge, 0, 1);
  high.connect(merge, 0, 0);
  high.connect(merge, 0, 1);

  const side = ctx.createGain();
  const left = ctx.createGain();
  const right = ctx.createGain();
  left.gain.value = 0.5;
  right.gain.value = -0.5;
  split.connect(left, 0);
  split.connect(right, 1);
  left.connect(side);
  right.connect(side);
  side.connect(merge, 0, 0);
  const invert = ctx.createGain();
  invert.gain.value = -1;
  side.connect(invert);
  invert.connect(merge, 0, 1);

  const makeup = ctx.createGain();
  makeup.gain.value = 1.6;
  merge.connect(makeup);
  makeup.connect(wet);
  wet.connect(ctx.destination);

  return {
    context: ctx,
    setVocals(on: boolean) {
      const t = ctx.currentTime;
      dry.gain.setTargetAtTime(on ? 1 : 0, t, 0.02);
      wet.gain.setTargetAtTime(on ? 0 : 1, t, 0.02);
    },
    close() {
      try {
        source.disconnect();
      } catch {
        /* already gone */
      }
      ctx.close().catch(() => {});
    },
  };
}