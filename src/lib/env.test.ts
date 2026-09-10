import { describe, expect, it } from "vitest";
import { EnvValidationError, parsePublicEnv } from "@/lib/env";

describe("parsePublicEnv", () => {
  it("accepts the public Supabase URL and publishable key", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://czobetskfzwmnqpsiapd.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
    });

    expect(env.supabaseUrl).toBe("https://czobetskfzwmnqpsiapd.supabase.co");
    expect(env.supabasePublishableKey).toBe("sb_publishable_test_key");
  });

  it("rejects missing or non-https values", () => {
    expect(() => parsePublicEnv({})).toThrow(EnvValidationError);
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
      }),
    ).toThrow(/https URL/);
  });

  it("does not read a service-role key from the public env", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-must-be-ignored",
    });

    expect(env).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_test_key",
    });
  });
});
