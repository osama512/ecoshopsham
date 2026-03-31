import { createClient } from "@supabase/supabase-js";
import type { Database } from "./db-types";

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

if (SUPABASE_URL === "YOUR_SUPABASE_URL" || SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
  console.warn(
    "⚠️ Supabase credentials not configured. Update src/integrations/supabase/client.ts with your project URL and anon key."
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
