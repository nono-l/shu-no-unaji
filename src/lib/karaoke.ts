const LOW = 150;
const HIGH = 6500;
const STAGES = 3;
const GAIN = 1.6;
const SMOOTH = 0.02;

export type VocalGraph = {
  context: AudioContext;
  setVocals: (on: boolean) => void;
  close: () => void;
};

function chain(
  context: AudioContext,
  input: AudioNode,
  type: BiquadFilterType,
  frequency: number,
): AudioNode {
  let node = input;
  for (let i = 0; i < STAGES; i++) {
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.7071;
    node.connect(filter);
    node = filter;
  }
  return node;
}

/** Center-cancel the vocal, keeping the low and high bands of the mix. */
export function createVocalGraph(audio: HTMLMediaElement, vocals: boolean): VocalGraph {
  const context = new AudioContext({ latencyHint: "interactive" });
  const source = context.createMediaElementSource(audio);
  const dry = context.createGain();
  const wet = context.createGain();
  dry.gain.value = vocals ? 1 : 0;
  wet.gain.value = vocals ? 0 : 1;
  source.connect(dry);
  dry.connect(context.destination);

  const split = context.createChannelSplitter(2);
  const merge = context.createChannelMerger(2);
  source.connect(split);

  const sides = context.createGain();
  sides.gain.value = 0.5;
  split.connect(sides, 0);
  split.connect(sides, 1);
  const low = chain(context, sides, "lowpass", LOW);
  const high = chain(context, sides, "highpass", HIGH);
  low.connect(merge, 0, 0);
  low.connect(merge, 0, 1);
  high.connect(merge, 0, 0);
  high.connect(merge, 0, 1);

  const mid = context.createGain();
  const left = context.createGain();
  const right = context.createGain();
  left.gain.value = 0.5;
  right.gain.value = -0.5;
  split.connect(left, 0);
  split.connect(right, 1);
  left.connect(mid);
  right.connect(mid);
  mid.connect(merge, 0, 0);
  const invert = context.createGain();
  invert.gain.value = -1;
  mid.connect(invert);
  invert.connect(merge, 0, 1);

  const makeup = context.createGain();
  makeup.gain.value = GAIN;
  merge.connect(makeup);
  makeup.connect(wet);
  wet.connect(context.destination);

  return {
    context,
    setVocals(on) {
      const now = context.currentTime;
      dry.gain.setTargetAtTime(on ? 1 : 0, now, SMOOTH);
      wet.gain.setTargetAtTime(on ? 0 : 1, now, SMOOTH);
    },
    close() {
      try {
        source.disconnect();
      } catch {
        /* already torn down */
      }
      context.close().catch(() => {});
    },
  };
}
