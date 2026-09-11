const PREFERRED_AUDIO = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  latency: 0,
};

export async function requestPerformanceMic(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error("This browser cannot access a microphone."), {
      name: "NotSupportedError",
    });
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: PREFERRED_AUDIO,
    });
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw error;
    }
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

export function isPermissionDenied(error: unknown): boolean {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name: string }).name)
      : "";
  return name === "NotAllowedError" || name === "PermissionDeniedError";
}

export function micErrorMessage(
  error: unknown,
  kind: "monitor" | "record" = "monitor",
): string {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name: string }).name)
      : "";
  if (isPermissionDenied(error)) {
    return kind === "record"
      ? "Microphone permission was denied. Enable it in the browser to record."
      : "Microphone permission was denied. Enable it in the browser to monitor locally.";
  }
  if (name === "NotFoundError") {
    return "No microphone or instrument input was found.";
  }
  if (name === "NotSupportedError") {
    return error instanceof Error
      ? error.message
      : "This browser cannot access a microphone.";
  }
  if (kind === "record") {
    return error instanceof Error ? error.message : "Could not start recording.";
  }
  return error instanceof Error ? error.message : "Could not open local monitor.";
}
