export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment:\n${issues.join("\n")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function parsePublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  const supabaseUrl = source.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabasePublishableKey =
    source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  const issues: string[] = [];

  if (!supabaseUrl) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL is required");
  } else if (!isHttpsUrl(supabaseUrl)) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL must be an https URL");
  }

  if (!supabasePublishableKey) {
    issues.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required");
  }

  if (issues.length > 0) {
    throw new EnvValidationError(issues);
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}
