// Ctx for Supabase Edge Functions (Deno). Not loaded by Node, and type-checked by `deno check`.
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { Ctx, Handler } from './http.ts';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function serve(handler: Handler) {
  const service = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  const ctx: Ctx = {
    async userId(req) {
      const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
      if (!token) return null;
      const { data } = await service.auth.getUser(token);
      return data.user?.id ?? null;
    },
    async rpc(fn, args) {
      const { data, error } = await service.rpc(fn, args);
      if (error) throw new Error(error.message);
      return data;
    },
    env: (name) => Deno.env.get(name),
  };
  Deno.serve((req) => handler(req, ctx));
}
