// Local development backend that speaks the subset of the Supabase API the Thozhan apps use,
// so the mobile app and admin dashboard run on this machine with no Docker and no account:
//
//   /auth/v1      phone OTP sign-in (OTP is always DEV_OTP), refresh, user, logout
//   /rest/v1/rpc  database functions, called with the caller's role and JWT claims
//   /functions/v1 the edge functions in supabase/functions, run in-process
//   /storage/v1   uploads and signed URLs for the private driver-documents bucket
//   /dev/pay      a test payment page that sends a correctly signed Razorpay webhook
//
// The apps use the official supabase-js client against it; pointing them at a hosted Supabase
// project needs only a different URL and anon key.
//
// Usage: node supabase/dev/server.ts [--fresh] [--bots] [--port 54321] [--seed extra.sql]
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { FUNCTIONS } from '../functions/registry.ts';
import { signature } from '../functions/razorpay-webhook/handler.ts';
import type { Ctx } from '../functions/_shared/http.ts';
import { RpcError, createDatabase, type Caller, type Database } from './db.ts';
import { startBots } from './bots.ts';

export const JWT_SECRET = process.env.DEV_JWT_SECRET ?? 'thozhan-local-dev-secret-not-for-production';
export const DEV_OTP = process.env.DEV_OTP ?? '123456';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'thozhan-dev-webhook-secret';

// ---------------------------------------------------------------- JWT (HS256)

const b64 = (data: string | Buffer) => Buffer.from(data).toString('base64url');

export function signJwt(claims: Record<string, unknown>): string {
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify(claims));
  return `${head}.${body}.${createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url')}`;
}

export function verifyJwt(token: string): Record<string, any> | null {
  const [head, body, sig] = token.split('.');
  if (!head || !body || !sig) return null;
  const want = createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest();
  const got = Buffer.from(sig, 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (typeof claims.exp === 'number' && claims.exp < Date.now() / 1000) return null;
  return claims;
}

/** Fixed anon key for local dev: a JWT with role anon that never expires. */
export const ANON_KEY = signJwt({ iss: 'thozhan-dev', role: 'anon' });

// ---------------------------------------------------------------- app

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-expose-headers': 'content-range, x-supabase-api-version',
};
const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json', ...headers },
  });
const authError = (msg: string, status = 400) => reply({ code: status, error_code: msg, msg, error: msg, error_description: msg }, status);

export function normalizePhone(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export interface AppOptions {
  storageDir: string;
  publicUrl: string;
}

export function createApp(db: Database, options: AppOptions) {
  const env = (name: string): string | undefined =>
    ({
      THOZHAN_DEV: '1',
      THOZHAN_PUBLIC_URL: options.publicUrl,
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    })[name] ?? process.env[name];

  function caller(req: Request): Caller {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? req.headers.get('apikey') ?? '';
    const claims = token ? verifyJwt(token) : null;
    if (!claims) return { role: 'anon' };
    const role = claims.role === 'authenticated' || claims.role === 'service_role' ? claims.role : 'anon';
    return { role, claims };
  }
  const userId = (req: Request) => {
    const c = caller(req);
    return c.role === 'authenticated' ? String(c.claims!.sub) : null;
  };

  const ctx: Ctx = {
    userId: async (req) => userId(req),
    rpc: <T>(fn: string, args: Record<string, unknown>) =>
      db.rpc<T>(fn, args, { role: 'service_role' }).catch((e: Error): never => {
        throw new Error(e.message);
      }),
    env,
  };

  async function findOrCreateUser(phone: string) {
    const found = await db.pg.query<{
      id: string;
      phone: string;
      created_at: Date;
    }>(`select id, phone, created_at from auth.users where phone = $1`, [phone]);
    if (found.rows[0]) return found.rows[0];
    const made = await db.pg.query<{
      id: string;
      phone: string;
      created_at: Date;
    }>(`insert into auth.users (phone) values ($1) returning id, phone, created_at`, [phone]);
    return made.rows[0]!;
  }
  const userJson = (u: { id: string; phone: string; created_at: Date }) => ({
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    phone: u.phone,
    phone_confirmed_at: new Date(u.created_at).toISOString(),
    confirmed_at: new Date(u.created_at).toISOString(),
    app_metadata: { provider: 'phone', providers: ['phone'] },
    user_metadata: {},
    identities: [],
    created_at: new Date(u.created_at).toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  });
  function session(u: { id: string; phone: string; created_at: Date }) {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;
    const claims = {
      sub: u.id,
      role: 'authenticated',
      aud: 'authenticated',
      phone: u.phone,
      iat: now,
      exp,
      session_id: randomUUID(),
    };
    return {
      access_token: signJwt(claims),
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: exp,
      refresh_token: signJwt({
        sub: u.id,
        typ: 'refresh',
        exp: now + 30 * 86400,
        jti: randomUUID(),
      }),
      user: userJson(u),
    };
  }

  async function auth(req: Request, path: string): Promise<Response> {
    if (path === '/otp' && req.method === 'POST') {
      const { phone } = (await req.json()) as { phone?: string };
      const normalized = normalizePhone(phone);
      if (!normalized) return authError('validation_failed');
      console.log(`[auth] OTP for +${normalized}: ${DEV_OTP}`);
      return reply({ message_id: randomUUID() });
    }
    if (path === '/verify' && req.method === 'POST') {
      const { phone, token } = (await req.json()) as {
        phone?: string;
        token?: string;
      };
      const normalized = normalizePhone(phone);
      if (!normalized || token !== DEV_OTP) return authError('otp_expired', 403);
      return reply(session(await findOrCreateUser(normalized)));
    }
    if (path === '/token' && req.method === 'POST') {
      const { refresh_token } = (await req.json()) as {
        refresh_token?: string;
      };
      const claims = refresh_token ? verifyJwt(refresh_token) : null;
      if (!claims || claims.typ !== 'refresh') return authError('refresh_token_not_found');
      const user = await db.pg.query<{
        id: string;
        phone: string;
        created_at: Date;
      }>(`select id, phone, created_at from auth.users where id = $1`, [claims.sub]);
      if (!user.rows[0]) return authError('user_not_found', 404);
      return reply(session(user.rows[0]));
    }
    if (path === '/user' && req.method === 'GET') {
      const id = userId(req);
      const user = id
        ? await db.pg.query<{ id: string; phone: string; created_at: Date }>(`select id, phone, created_at from auth.users where id = $1`, [id])
        : null;
      return user?.rows[0] ? reply(userJson(user.rows[0])) : authError('bad_jwt', 401);
    }
    if (path === '/logout') return new Response(null, { status: 204, headers: CORS });
    if (path === '/settings') return reply({ external: { phone: true }, disable_signup: false });
    return authError('not_found', 404);
  }

  // Storage: only the private driver-documents bucket, with the same rules as the SQL policies.
  const objectPath = (bucket: string, key: string) => join(options.storageDir, bucket, ...key.split('/'));
  async function canRead(id: string | null, key: string) {
    if (!id) return false;
    if (key.split('/')[0] === id) return true;
    return db.rpc<boolean>('can_read_driver_documents', {}, { role: 'authenticated', claims: { sub: id, role: 'authenticated' } });
  }
  function serveFile(bucket: string, key: string) {
    const file = objectPath(bucket, key);
    if (!existsSync(file)) return reply({ statusCode: '404', error: 'not_found', message: 'Object not found' }, 404);
    const meta = existsSync(file + '.type') ? readFileSync(file + '.type', 'utf8') : 'application/octet-stream';
    return new Response(readFileSync(file), {
      headers: { ...CORS, 'content-type': meta },
    });
  }

  async function storage(req: Request, path: string): Promise<Response> {
    const m = /^\/object\/(?:(sign|authenticated|public)\/)?(driver-documents)\/(.+)$/.exec(path);
    if (!m) return reply({ statusCode: '404', error: 'not_found', message: 'Bucket not found' }, 404);
    const [, mode, bucket, rawKey] = m as unknown as [string, string | undefined, string, string];
    const key = decodeURIComponent(rawKey);
    if (key.split('/').some((part) => part === '..' || part === '')) return reply({ statusCode: '400', error: 'invalid_key', message: 'Invalid key' }, 400);
    const id = userId(req);

    if (mode === 'sign' && req.method === 'GET') {
      const claims = verifyJwt(new URL(req.url).searchParams.get('token') ?? '');
      if (!claims || claims.url !== `${bucket}/${key}`)
        return reply(
          {
            statusCode: '400',
            error: 'invalid_signature',
            message: 'Invalid signature',
          },
          400,
        );
      return serveFile(bucket, key);
    }
    if (mode === 'sign' && req.method === 'POST') {
      if (!(await canRead(id, key)))
        return reply(
          {
            statusCode: '403',
            error: 'unauthorized',
            message: 'new row violates row-level security policy',
          },
          403,
        );
      const { expiresIn } = (await req.json()) as { expiresIn?: number };
      const token = signJwt({
        url: `${bucket}/${key}`,
        exp: Math.floor(Date.now() / 1000) + Math.min(expiresIn ?? 60, 86400),
      });
      return reply({
        signedURL: `/object/sign/${bucket}/${encodeURI(key)}?token=${token}`,
      });
    }
    if ((mode === 'authenticated' || !mode) && req.method === 'GET') {
      return (await canRead(id, key))
        ? serveFile(bucket, key)
        : reply(
            {
              statusCode: '404',
              error: 'not_found',
              message: 'Object not found',
            },
            404,
          );
    }
    if (!mode && (req.method === 'POST' || req.method === 'PUT')) {
      if (!id || key.split('/')[0] !== id)
        return reply(
          {
            statusCode: '403',
            error: 'unauthorized',
            message: 'new row violates row-level security policy',
          },
          403,
        );
      const file = objectPath(bucket, key);
      if (existsSync(file) && req.method === 'POST' && req.headers.get('x-upsert') !== 'true') {
        return reply(
          {
            statusCode: '409',
            error: 'Duplicate',
            message: 'The resource already exists',
          },
          409,
        );
      }
      let bytes: Buffer;
      let type = req.headers.get('content-type') ?? 'application/octet-stream';
      if (type.startsWith('multipart/form-data')) {
        const form = await req.formData();
        const part = [...form.values()].find((v): v is File => typeof v !== 'string');
        if (!part) return reply({ statusCode: '400', error: 'no_file', message: 'No file' }, 400);
        bytes = Buffer.from(await part.arrayBuffer());
        type = part.type || 'application/octet-stream';
      } else {
        bytes = Buffer.from(await req.arrayBuffer());
      }
      if (bytes.length > 10 * 1024 * 1024)
        return reply(
          {
            statusCode: '413',
            error: 'too_large',
            message: 'Payload too large',
          },
          413,
        );
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, bytes);
      writeFileSync(file + '.type', type);
      return reply({ Key: `${bucket}/${key}`, Id: randomUUID() });
    }
    return reply(
      {
        statusCode: '405',
        error: 'method_not_allowed',
        message: 'Method not allowed',
      },
      405,
    );
  }

  async function devPay(req: Request, id: string): Promise<Response> {
    const { rows } = await db.pg.query<{
      amount_paise: number;
      status: string;
    }>(`select amount_paise, status from payments where id = $1`, [id]);
    const p = rows[0];
    const page = (inner: string) =>
      new Response(
        `<!doctype html><meta name="viewport" content="width=device-width"><title>Test payment</title><body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px">${inner}</body>`,
        { headers: { 'content-type': 'text/html; charset=utf-8' } },
      );
    if (!p) return page('<h2>Payment not found</h2>');
    const amount = `₹${(p.amount_paise / 100).toFixed(2)}`;
    if (req.method === 'POST' && p.status === 'created') {
      const raw = JSON.stringify({
        event: 'payment_link.paid',
        payload: {
          payment_link: {
            entity: { reference_id: id, amount_paid: p.amount_paise },
          },
          payment: {
            entity: {
              id: 'pay_dev_' + randomUUID().slice(0, 8),
              amount: p.amount_paise,
            },
          },
        },
      });
      const hook = new Request(options.publicUrl + '/functions/v1/razorpay-webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-razorpay-signature': await signature(WEBHOOK_SECRET, raw),
        },
        body: raw,
      });
      const res = await FUNCTIONS['razorpay-webhook']!(hook, ctx);
      return page(
        res.ok
          ? `<h2>Paid ${amount}</h2><p>Test payment recorded. You can close this page and return to the app.</p>`
          : `<h2>Webhook failed</h2><pre>${await res.text()}</pre>`,
      );
    }
    if (p.status !== 'created') return page(`<h2>Already ${p.status}</h2>`);
    return page(`<h2>Thozhan day fee</h2><p>Amount due: <b>${amount}</b></p><p style="color:#a15c00">Test mode: no money moves.</p>
      <form method="post"><button style="font-size:18px;padding:12px 20px;border-radius:10px;border:0;background:#174a3b;color:#fff">Pay ${amount} (test)</button></form>`);
  }

  return async function app(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (path.startsWith('/auth/v1')) return await auth(req, path.slice('/auth/v1'.length));
      if (path.startsWith('/rest/v1/rpc/') && req.method === 'POST') {
        const fn = path.slice('/rest/v1/rpc/'.length);
        const text = await req.text();
        const args = text ? (JSON.parse(text) as Record<string, unknown>) : {};
        try {
          return reply(await db.rpc(fn, args, caller(req)));
        } catch (e) {
          if (e instanceof RpcError) return reply({ code: e.code, message: e.message, details: null, hint: null }, e.status);
          throw e;
        }
      }
      if (path.startsWith('/functions/v1/')) {
        const handler = FUNCTIONS[path.slice('/functions/v1/'.length)];
        if (!handler) return reply({ error: 'not_found' }, 404);
        const res = await handler(req, ctx);
        return res;
      }
      if (path.startsWith('/storage/v1')) return await storage(req, path.slice('/storage/v1'.length));
      if (path.startsWith('/dev/pay/')) return await devPay(req, path.slice('/dev/pay/'.length));
      if (path === '/' || path === '/health') return reply({ ok: true, service: 'thozhan-dev-backend' });
      return reply({ error: 'not_found' }, 404);
    } catch (e) {
      console.error(e);
      return reply({ error: 'server_error', message: String(e) }, 500);
    }
  };
}

// ---------------------------------------------------------------- main

function lanAddress(): string {
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) return a.address;
  }
  return 'localhost';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const port = Number(args[args.indexOf('--port') + 1]) || 54321;
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dataDir = join(root, '.dev-data');
  const storageDir = join(root, '.dev-storage');
  if (args.includes('--fresh')) {
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(storageDir, { recursive: true, force: true });
  }
  const db = await createDatabase({ dataDir, seed: true });
  // --seed FILE runs extra SQL at startup; the browser tests use it for fixtures with --fresh.
  if (args.includes('--seed')) await db.pg.exec(readFileSync(args[args.indexOf('--seed') + 1]!, 'utf8'));
  const host = lanAddress();
  const publicUrl = `http://${host}:${port}`;
  const app = createApp(db, { storageDir, publicUrl });

  createServer(async (req, res) => {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
      method: req.method,
      headers,
      ...(hasBody ? { body: Readable.toWeb(req) as ReadableStream, duplex: 'half' } : {}),
    } as RequestInit);
    const response = await app(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body as any).pipe(res);
    else res.end();
  }).listen(port, '0.0.0.0', () => {
    console.log(`Thozhan dev backend on http://localhost:${port} (phones on this Wi-Fi: ${publicUrl})`);
    console.log(`Anon key: ${ANON_KEY}`);
    console.log(`Sign in with any phone number and OTP ${DEV_OTP}. Admin: 9000000001, department: 9000000002.`);
  });
  if (args.includes('--bots')) startBots(db, app, publicUrl);
}
