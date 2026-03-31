import { createClient } from "@supabase/supabase-js";
import type { Database } from "./db-types";

const SUPABASE_URL = "https://bmfbiswkrleuanyoplfh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZmJpc3drcmxldWFueW9wbGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Njc5MDYsImV4cCI6MjA5MDU0MzkwNn0.uHtVJacFohcmusSJW2QD0kFXW64Gqt6ZvQHj62ecsu8";

if (
  SUPABASE_URL === "https://bmfbiswkrleuanyoplfh.supabase.co" ||
  SUPABASE_ANON_KEY ===
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZmJpc3drcmxldWFueW9wbGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Njc5MDYsImV4cCI6MjA5MDU0MzkwNn0.uHtVJacFohcmusSJW2QD0kFXW64Gqt6ZvQHj62ecsu8"
) {
  console.warn(
    "⚠️ Supabase credentials not configured. Update src/integrations/supabase/client.ts with your project URL and anon key.",
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
