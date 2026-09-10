const STORAGE_KEY = "iem-sync-device-id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return createId();
  }

  const existing = window.sessionStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const id = createId();
  window.sessionStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function parseUserAgent(userAgent: string): {
  platform: string;
  browser: string;
  label: string;
} {
  const ua = userAgent.toLowerCase();
  const platform = ua.includes("android")
    ? "Android"
    : ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")
      ? "iPhone"
      : ua.includes("mac")
        ? "macOS"
        : ua.includes("win")
          ? "Windows"
          : ua.includes("linux")
            ? "Linux"
            : "Unknown";

  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome")
      ? "Chrome"
      : ua.includes("safari")
        ? "Safari"
        : ua.includes("firefox")
          ? "Firefox"
          : "Browser";

  return {
    platform,
    browser,
    label: `${browser} / ${platform}`,
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dev-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
