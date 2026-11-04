// Runtime-neutral pieces shared by the edge functions. Handlers take a Request and a Ctx and
// return a Response, so the same code runs on Supabase (Deno) and in the local dev server (Node).

export interface Ctx {
  /** Verified user id from the request's bearer token; null when signed out. */
  userId(req: Request): Promise<string | null>;
  /** Calls a database function with the service role. Rejects with Error(code) on failure. */
  rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T>;
  env(name: string): string | undefined;
}

export type Handler = (req: Request, ctx: Ctx) => Promise<Response>;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

export class HttpError extends Error {
  readonly status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.status = status;
  }
}

/** Wraps a handler with CORS, POST-only and error mapping to `{ error: code }`. */
export function endpoint(fn: Handler): Handler {
  return async (req, ctx) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      const message = e instanceof Error ? e.message : String(e);
      // Database functions raise short codes such as 'wrong_otp'; anything else is unexpected.
      if (/^[a-z_]+$/.test(message)) return json({ error: message }, 400);
      console.error(e);
      return json({ error: 'server_error' }, 500);
    }
  };
}

export async function requireUser(req: Request, ctx: Ctx): Promise<string> {
  const id = await ctx.userId(req);
  if (!id) throw new HttpError('not_signed_in', 401);
  return id;
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError('bad_request');
  }
}
