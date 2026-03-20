import crypto from "node:crypto";
import type { loadQuery } from "@sanity/react-loader";
import { createCookieSessionStorage } from "react-router";

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    httpOnly: true,
    name: "__sanity_preview",
    path: "/",
    sameSite: !import.meta.env.DEV ? "none" : "lax",
    secrets: [crypto.randomBytes(16).toString("hex")],
    secure: !import.meta.env.DEV,
  },
});

export async function getPreviewData(request: Request): Promise<{
  preview: boolean;
  options: Parameters<typeof loadQuery>[2];
}> {
  const session = await getSession(request.headers.get("Cookie"));
  const preview = session.get("previewMode");

  return {
    preview,
    options: preview
      ? {
          perspective: session.has("perspective")
            ? session.get("perspective").split(",")
            : "drafts",
          stega: true,
        }
      : {
          perspective: "published",
          stega: false,
        },
  };
}

export { commitSession, destroySession, getSession };
