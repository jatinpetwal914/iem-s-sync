export function LatencyDisclaimer() {
  return (
    <p className="text-xs leading-5 text-muted">
      IEM Sync locks the digital beat schedule to a shared start time. It cannot
      guarantee identical physical sound arrival because Bluetooth, drivers,
      hardware, and browsers add their own latency. Manual compensation can be
      added later from device telemetry.
    </p>
  );
}
