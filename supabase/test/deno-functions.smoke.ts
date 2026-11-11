// Serves the real edge function entrypoints on Deno and calls them over HTTP. Supabase itself is
// replaced by a small fake of its auth and RPC endpoints, so supabase-js runs unmodified.
// Needs Deno (set DENO_BIN if it is not on PATH): npm run test:deno
import assert from 'node:assert/strict';
import { type ChildProcess, spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { type Server, createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { measureTrack, priceTrip } from '../functions/_shared/fare.ts';

const DENO = process.env.DENO_BIN ?? 'deno';
const WEBHOOK_SECRET = 'whsec_test';
const SERVICE_KEY = 'service-role-test';
const DRIVER = '11111111-1111-4111-8111-111111111111';
const AUTH = { authorization: 'Bearer good-token', 'content-type': 'application/json' };

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
  apikey: string | undefined;
}
const rpcCalls: RpcCall[] = [];
const callsTo = (fn: string) => rpcCalls.filter((c) => c.fn === fn);

const startedAt = Date.now() - 3_600_000;
const tripRow = {
  category: 'auto',
  flow: 'ride',
  status: 'in_progress',
  started_at: new Date(startedAt).toISOString(),
  estimate_meters: 5000,
  terrain: 'plain',
  parcel: null,
};

function rpcResult(fn: string, args: Record<string, unknown>): { status: number; body: unknown } {
  if (args.p_otp === '000000') return { status: 400, body: { message: 'wrong_otp', code: 'P0001' } };
  if (args.p_otp === '111111') return { status: 500, body: { message: 'Database is on fire', code: 'XX000' } };
  if (fn === 'trip_for_finish_internal') return { status: 200, body: { trip: tripRow, fixes: [] } };
  if (fn === 'fee_payment_create_internal') {
    return { status: 200, body: { id: 'pay_1', amountPaise: 1000, phone: '919000000000', name: null } };
  }
  return { status: 200, body: { ok: true, fn } };
}

function fakeSupabase(): Server {
  return createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.url === '/auth/v1/user') {
        if (req.headers.authorization !== 'Bearer good-token') return send(401, { message: 'invalid JWT', code: 401 });
        return send(200, { id: DRIVER, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' });
      }
      const rpc = req.url?.match(/^\/rest\/v1\/rpc\/(\w+)/);
      if (req.method === 'POST' && rpc?.[1]) {
        const args = JSON.parse(raw) as Record<string, unknown>;
        const apikey = req.headers.apikey;
        rpcCalls.push({ fn: rpc[1], args, apikey: typeof apikey === 'string' ? apikey : undefined });
        const result = rpcResult(rpc[1], args);
        return send(result.status, result.body);
      }
      send(404, { message: `fake supabase: no route for ${req.url}` });
    });
  });
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      assert.ok(address && typeof address === 'object');
      probe.close(() => resolve(address.port));
    });
  });
}

const children: ChildProcess[] = [];

/** Starts one function exactly as deployed: its own deno.json and its unmodified index.ts. */
async function serveFunction(name: string, supabaseUrl: string, extraEnv: Record<string, string>): Promise<string> {
  const port = await freePort();
  const dir = new URL(`../functions/${name}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const child = spawn(DENO, ['run', '--allow-net', '--allow-env', '--config', `${dir}deno.json`, `${dir}index.ts`], {
    env: {
      ...process.env,
      NO_COLOR: '1',
      DENO_SERVE_ADDRESS: `tcp:127.0.0.1:${port}`,
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
      ...extraEnv,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  children.push(child);
  let stderr = '';
  child.stderr?.on('data', (chunk) => (stderr += chunk));
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 90_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`${name} exited on Deno:\n${stderr}`);
    if (Date.now() > deadline) throw new Error(`${name} did not start on Deno:\n${stderr}`);
    const ready = await fetch(url, { method: 'OPTIONS' }).then(() => true, () => false);
    if (ready) return url;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function call(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { method: 'POST', ...init });
  const text = await res.text();
  return { res, status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

const sign = (payload: string) => createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');

function postWebhook(url: string, payload: string, signature: string | null) {
  return call(url, { body: payload, headers: signature === null ? {} : { 'x-razorpay-signature': signature } });
}

function assertPreflightAndPostOnly(fns: () => string) {
  it('answers the CORS preflight with 204', async () => {
    const res = await fetch(fns(), {
      method: 'OPTIONS',
      headers: { origin: 'https://admin.example', 'access-control-request-method': 'POST' },
    });
    assert.equal(res.status, 204);
    assert.ok(res.headers.get('access-control-allow-origin'));
    assert.match(res.headers.get('access-control-allow-methods') ?? '', /POST/);
    assert.match(res.headers.get('access-control-allow-headers') ?? '', /authorization/i);
  });
  it('rejects anything but POST with 405', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const { status, body } = await call(fns(), { method });
      assert.equal(status, 405, method);
      assert.deepEqual(body, { error: 'method_not_allowed' });
    }
  });
}

describe('edge functions on Deno', { concurrency: false }, () => {
  const server = fakeSupabase();
  const urls: Record<string, string> = {};

  before(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const supabaseUrl = `http://127.0.0.1:${address.port}`;
    const started = await Promise.all([
      serveFunction('razorpay-webhook', supabaseUrl, { RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET }),
      serveFunction('finish-trip', supabaseUrl, {}),
      serveFunction('sync-meter', supabaseUrl, {}),
      serveFunction('fee-payment-link', supabaseUrl, {}),
    ]);
    [urls.webhook, urls.finish, urls.sync, urls.fee] = started;
    urls.webhookNoSecret = await serveFunction('razorpay-webhook', supabaseUrl, {});
  });

  after(async () => {
    for (const child of children) child.kill();
    await new Promise((resolve) => server.close(resolve));
  });

  describe('razorpay-webhook', () => {
    const paid = JSON.stringify({
      event: 'payment_link.paid',
      payload: {
        payment_link: { entity: { reference_id: 'pay_1', amount_paid: 1000 } },
        payment: { entity: { id: 'rzp_1', amount: 1000 } },
      },
    });

    assertPreflightAndPostOnly(() => urls.webhook!);

    it('rejects a missing or wrong signature with 401 and touches nothing', async () => {
      const before = rpcCalls.length;
      for (const given of [null, 'deadbeef', sign(paid + ' ')]) {
        const { status, body } = await postWebhook(urls.webhook!, paid, given);
        assert.equal(status, 401);
        assert.deepEqual(body, { error: 'bad_signature' });
      }
      assert.equal(rpcCalls.length, before);
    });

    it('records a correctly signed payment with the service role', async () => {
      const { status, body } = await postWebhook(urls.webhook!, paid, sign(paid));
      assert.equal(status, 200);
      assert.deepEqual(body, { ok: true, fn: 'fee_payment_paid_internal' });
      const [call_] = callsTo('fee_payment_paid_internal');
      assert.deepEqual(call_?.args, { p_payment: 'pay_1', p_provider_payment_id: 'rzp_1', p_amount: 1000 });
      assert.equal(call_?.apikey, SERVICE_KEY);
    });

    it('ignores other signed events', async () => {
      const other = JSON.stringify({ event: 'payment.failed', payload: {} });
      const { status, body } = await postWebhook(urls.webhook!, other, sign(other));
      assert.equal(status, 200);
      assert.deepEqual(body, { ok: true, ignored: 'payment.failed' });
    });

    it('rejects a signed paid event with no entities as 400', async () => {
      const empty = JSON.stringify({ event: 'payment_link.paid', payload: {} });
      const { status, body } = await postWebhook(urls.webhook!, empty, sign(empty));
      assert.equal(status, 400);
      assert.deepEqual(body, { error: 'bad_request' });
    });

    it('returns 503 when the webhook secret is not set', async () => {
      const { status, body } = await postWebhook(urls.webhookNoSecret!, paid, sign(paid));
      assert.equal(status, 503);
      assert.deepEqual(body, { error: 'payments_not_configured' });
    });
  });

  describe('finish-trip', () => {
    const finish = (payload: unknown) => call(urls.finish!, { headers: AUTH, body: JSON.stringify(payload) });
    const tripId = 'trip-1';

    assertPreflightAndPostOnly(() => urls.finish!);

    it('needs a valid bearer token', async () => {
      const payload = JSON.stringify({ tripId, action: 'complete' });
      const unsigned: Record<string, string>[] = [{}, { authorization: 'Bearer bad-token' }];
      for (const headers of unsigned) {
        const { status, body } = await call(urls.finish!, { headers, body: payload });
        assert.equal(status, 401);
        assert.deepEqual(body, { error: 'not_signed_in' });
      }
    });

    it('maps bad input to 400', async () => {
      const malformed = await call(urls.finish!, { headers: AUTH, body: '{nope' });
      assert.equal(malformed.status, 400);
      assert.deepEqual(malformed.body, { error: 'bad_request' });
      const badAction = await finish({ tripId, action: 'teleport' });
      assert.equal(badAction.status, 400);
      assert.deepEqual(badAction.body, { error: 'bad_request' });
    });

    it('prices the trip on the server and finishes it as the signed-in driver', async () => {
      const { status, body } = await finish({ tripId, action: 'complete', otp: '123456' });
      assert.equal(status, 200);
      assert.deepEqual(body, { ok: true, fn: 'finish_trip_internal' });
      const finished = callsTo('finish_trip_internal').at(-1)?.args;
      assert.equal(finished?.p_driver, DRIVER);
      assert.equal(finished?.p_distance, 5000);
      assert.deepEqual(finished?.p_flags, ['no-gps-track']);
      assert.equal(typeof finished?.p_fare, 'object');
    });

    it('passes a database error code through as 400', async () => {
      const { status, body } = await finish({ tripId, action: 'complete', otp: '000000' });
      assert.equal(status, 400);
      assert.deepEqual(body, { error: 'wrong_otp' });
    });

    it('hides an unexpected database error behind 500', async () => {
      const { status, body } = await finish({ tripId, action: 'complete', otp: '111111' });
      assert.equal(status, 500);
      assert.deepEqual(body, { error: 'server_error' });
    });
  });

  describe('sync-meter', () => {
    assertPreflightAndPostOnly(() => urls.sync!);

    it('needs a signed-in rider', async () => {
      const { status, body } = await call(urls.sync!, { body: '{}' });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'not_signed_in' });
    });

    it('rejects a bad client key', async () => {
      const { status, body } = await call(urls.sync!, {
        headers: AUTH,
        body: JSON.stringify({ clientKey: 'x', startedAt, endedAt: startedAt, fixes: [] }),
      });
      assert.equal(status, 400);
      assert.deepEqual(body, { error: 'bad_request' });
    });

    it('prices a track on Deno exactly as the shared code does on Node', async () => {
      const fixes = Array.from({ length: 120 }, (_, i) => ({
        lat: 13.0 + i * 0.0001,
        lon: 80.2,
        accuracyMeters: 5,
        timestamp: startedAt + i * 1000,
      }));
      const endedAt = startedAt + 120_000;
      const { status } = await call(urls.sync!, {
        headers: AUTH,
        body: JSON.stringify({ clientKey: 'client-key-1', startedAt, endedAt, fixes }),
      });
      assert.equal(status, 200);
      const recorded = callsTo('record_meter_trip_internal').at(-1)?.args;
      const measured = measureTrack(fixes, null);
      assert.equal(recorded?.p_rider, DRIVER);
      assert.equal(recorded?.p_distance, measured.distanceMeters);
      assert.ok(measured.distanceMeters > 0);
      assert.deepEqual(recorded?.p_fare, JSON.parse(JSON.stringify(priceTrip({ category: 'auto', startedAt, endedAt, measured, terrain: 'plain' }))));
    });
  });

  describe('fee-payment-link', () => {
    assertPreflightAndPostOnly(() => urls.fee!);

    it('needs a signed-in driver', async () => {
      const { status, body } = await call(urls.fee!, { body: '{}' });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'not_signed_in' });
    });

    it('returns 503 when Razorpay keys are not set', async () => {
      const { status, body } = await call(urls.fee!, { headers: AUTH, body: '{}' });
      assert.equal(status, 503);
      assert.deepEqual(body, { error: 'payments_not_configured' });
    });
  });
});
