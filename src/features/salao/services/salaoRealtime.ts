import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const createSalaoAdminRealtime = (accessToken: string) => {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  client.realtime.setAuth(accessToken);
  return client;
};

export const salaoTenantTopic = (lojaId: string) => `salao:loja:${lojaId}`;
