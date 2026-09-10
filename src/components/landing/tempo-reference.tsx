import { createTempoSnapshot } from "@/lib/tempo";

const REFERENCE_BPM = 120;
const REFERENCE_SAMPLE_RATE = 44100;

export function TempoReference() {
  const snapshot = createTempoSnapshot(REFERENCE_BPM, REFERENCE_SAMPLE_RATE);

  const metrics = [
    { label: "BPM", value: String(snapshot.bpm) },
    { label: "BPS", value: snapshot.beatsPerSecond.toFixed(0) },
    { label: "Interval", value: `${snapshot.intervalMs} ms` },
    { label: "Samples / beat", value: snapshot.samplesPerBeat.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-2xl border border-white/8 bg-background/80 px-4 py-4"
        >
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted">
            {metric.label}
          </p>
          <p className="mt-2 font-mono text-xl text-foreground sm:text-2xl">
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}
