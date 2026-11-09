import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@/utils/supabase/server";
import { callbackDestination } from "@/features/auth/validation";
export default async function callback(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end(); }
  const code = req.query.code;
  if (typeof code === "string" && code.length > 0 && code.length < 4096) {
    try {
      const { error } = await createClient(req, res).auth.exchangeCodeForSession(code);
      if (!error) return res.redirect(303, callbackDestination(req.query.flow));
    } catch { /* Invalid or unavailable provider: show a retryable error. */ }
  }
  return res.redirect(303, "/?auth=login&error=callback");
}
