import { describe, expect, it } from "vitest";
import {
  extensionForMime,
  formatDurationMs,
  pickRecordingMimeType,
  recordingStoragePath,
} from "@/lib/audio/recording";

describe("pickRecordingMimeType", () => {
  it("returns null when MediaRecorder is unavailable", () => {
    expect(pickRecordingMimeType(undefined)).toBeNull();
  });

  it("picks the first supported candidate", () => {
    const supported = new Set(["audio/mp4"]);
    expect(pickRecordingMimeType((type) => supported.has(type))).toBe("audio/mp4");
  });

  it("falls back to the browser default when none of the candidates match", () => {
    expect(pickRecordingMimeType(() => false)).toBe("");
  });
});

describe("recording helpers", () => {
  it("formats mm:ss from milliseconds", () => {
    expect(formatDurationMs(0)).toBe("00:00");
    expect(formatDurationMs(84000)).toBe("01:24");
  });

  it("maps MIME types to file extensions", () => {
    expect(extensionForMime("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionForMime("audio/mp4")).toBe("m4a");
  });

  it("builds a team/song/user storage path", () => {
    expect(
      recordingStoragePath({
        teamId: "team",
        songId: "song",
        userId: "user",
        recordingId: "take",
        mimeType: "audio/webm",
      }),
    ).toBe("team/song/user/take.webm");
  });
});
