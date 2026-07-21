import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
let sharedClient: ReturnType<typeof createClient> | null = null;
let sharedAccessToken = "";

export const createAdminRealtimeClient = (accessToken: string) => {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return null;

  if (!sharedClient || sharedAccessToken !== accessToken) {
    if (sharedClient) sharedClient.realtime.disconnect();
    sharedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    sharedAccessToken = accessToken;
  }

  sharedClient.realtime.setAuth(accessToken);
  return sharedClient;
};
