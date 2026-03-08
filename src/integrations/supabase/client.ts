import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ieelvlmhbpfypbjmjezq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_og_Ms4bP8mZHMoIdnEm8Jg_tnZLVfTd";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
