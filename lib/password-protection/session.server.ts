import { createCookieSessionStorage } from "react-router";
import { env } from "~/env.server";

type SessionData = {
  authenticated: boolean;
};

function getSecrets(): [string] {
  if (env.SESSION_SECRET) return [env.SESSION_SECRET];

  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production when SITE_PASSWORD is set");
  }

  // Dev-only fallback — never used in production
  return ["dev-only-insecure-secret"];
}

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData>({
  cookie: {
    name: "__site_password",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
    sameSite: "lax",
    secrets: getSecrets(),
    secure: env.NODE_ENV === "production",
  },
});

export { getSession, commitSession, destroySession };
