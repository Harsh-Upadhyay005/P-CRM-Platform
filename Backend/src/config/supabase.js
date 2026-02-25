import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

let supabase = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  console.log("[supabase] Storage client initialized");
} else {
  console.warn("[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — file uploads disabled");
}

export { supabase };
export const BUCKET = env.SUPABASE_STORAGE_BUCKET;
