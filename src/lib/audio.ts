// Tactile Web-Audio cues (PRD §2.2). Optional and off by default; synthesized on
// the fly so there are no asset downloads. Respects a user toggle in localStorage.

let ctx: AudioContext | null = null;

function enabled(): boolean {
  return localStorage.getItem("decisionlens.sound") === "on";
}

export function setSoundEnabled(on: boolean) {
  localStorage.setItem("decisionlens.sound", on ? "on" : "off");
}

export function soundEnabled(): boolean {
  return enabled();
}

function tone(freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.04) {
  if (!enabled()) return;
  try {
    ctx = ctx ?? new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    osc.start(now);
    osc.stop(now + durMs / 1000);
  } catch {
    /* audio not available — silently ignore */
  }
}

export const sfx = {
  click: () => tone(520, 60, "triangle", 0.03),
  confirm: () => tone(720, 120, "sine", 0.05),
  dismiss: () => tone(220, 140, "sawtooth", 0.03),
  win: () => {
    tone(660, 120);
    setTimeout(() => tone(880, 160), 90);
    setTimeout(() => tone(1180, 220), 210);
  },
};
