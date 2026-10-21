import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave de serviço — IGNORA a RLS.
 * Usar só em código de servidor e sempre depois de verificar
 * a permissão do usuário logado (ver lib/auth.ts).
 */
export function clienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
