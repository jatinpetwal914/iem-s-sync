import type { CompatibleAudioContext } from "@/lib/audio/types";

const ACCENT_HZ = 1760;
const NORMAL_HZ = 988;
const ACCENT_GAIN = 0.9;
const NORMAL_GAIN = 0.55;
const ACCENT_MS = 42;
const NORMAL_MS = 32;

export function createClickBuffer(
  context: CompatibleAudioContext,
  kind: "accent" | "normal",
): AudioBuffer {
  const durationMs = kind === "accent" ? ACCENT_MS : NORMAL_MS;
  const frequency = kind === "accent" ? ACCENT_HZ : NORMAL_HZ;
  const peak = kind === "accent" ? ACCENT_GAIN : NORMAL_GAIN;
  const length = Math.max(1, Math.floor((context.sampleRate * durationMs) / 1000));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  const twoPi = Math.PI * 2;

  for (let index = 0; index < length; index += 1) {
    const t = index / context.sampleRate;
    const envelope = Math.exp(-t * 48) * peak;
    data[index] = Math.sin(twoPi * frequency * t) * envelope;
  }

  return buffer;
}
