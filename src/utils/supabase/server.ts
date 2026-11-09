import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getSupabaseConfig } from "./config";

export function createClient(req: IncomingMessage, res: ServerResponse) {
  const { url, publishableKey } = getSupabaseConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? "");
      },
      setAll(cookiesToSet, headers) {
        const currentSetCookie = res.getHeader("Set-Cookie");
        const existingCookies = Array.isArray(currentSetCookie)
          ? currentSetCookie.map(String)
          : currentSetCookie
            ? [String(currentSetCookie)]
            : [];

        res.setHeader("Set-Cookie", [
          ...existingCookies,
          ...cookiesToSet.map(({ name, value, options }) =>
            serializeCookieHeader(name, value, options),
          ),
        ]);

        for (const [name, value] of Object.entries(headers)) {
          res.setHeader(name, value);
        }
      },
    },
  });
}
