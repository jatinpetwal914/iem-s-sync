export type AuthFormValues = {
  email: string;
  password: string;
};

export type AuthFormResult =
  | { ok: true; value: AuthFormValues }
  | { ok: false; issues: string[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseAuthForm(input: AuthFormValues): AuthFormResult {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const issues: string[] = [];

  if (!email) {
    issues.push("Email is required");
  } else if (!EMAIL_PATTERN.test(email)) {
    issues.push("Enter a valid email address");
  }

  if (!password) {
    issues.push("Password is required");
  } else if (password.length < 8) {
    issues.push("Password must be at least 8 characters");
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: { email, password } };
}
