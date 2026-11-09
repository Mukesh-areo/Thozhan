import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createErrorReporter, rpcSender, scrubErrorText, type ErrorReport, type SendResult } from '../src/index.ts';

function memoryStore(initial: string | null = null) {
  return {
    value: initial,
    read() {
      return this.value;
    },
    write(v: string) {
      this.value = v;
    },
  };
}

function reporter(result: () => SendResult, store = memoryStore(), now: () => number = Date.now) {
  const sent: ErrorReport[] = [];
  const r = createErrorReporter({
    store,
    screen: () => 'receipt/[id]',
    now,
    send: async (report) => {
      const outcome = result();
      if (outcome === 'sent') sent.push(report);
      return outcome;
    },
  });
  return { r, sent, store };
}

test('scrubbing keeps stack positions but removes private values', () => {
  const stack = 'at render (index.android.bundle:1:234567)\nat foo (http://192.168.1.5:8081/app.js:44:12)';
  assert.equal(scrubErrorText(stack), stack);
  assert.equal(scrubErrorText('Call +91 90000 00001 now'), 'Call [phone] now');
  assert.equal(scrubErrorText('at 13.0837, 80.2707'), 'at [coord], [coord]');
  assert.equal(scrubErrorText('OTP is 123456'), 'OTP [otp]');
  assert.equal(scrubErrorText('bad value 4821 given'), 'bad value [num] given');
});

test('a report keeps its code, and its text is scrubbed before it is queued', async () => {
  const { r, store } = reporter(() => 'wait');
  await r.capture('uncaught', Object.assign(new Error('wrong otp: 123456 for 9000000001'), { code: 'wrong_otp' }));
  const [saved] = JSON.parse(store.value!) as ErrorReport[];
  assert.equal(saved!.code, 'wrong_otp');
  assert.equal(saved!.screen, 'receipt/[id]');
  assert.ok(!saved!.message.includes('123456'));
  assert.ok(!saved!.message.includes('9000000001'));
  assert.ok(saved!.stack && !saved!.stack.includes('9000000001'));
});

test('offline reports stay queued, survive a restart and are sent later', async () => {
  let online = false;
  const first = reporter(() => (online ? 'sent' : 'retry'));
  await first.r.capture('rejection', new Error('one'));
  await first.r.flush();
  assert.equal(first.sent.length, 0);
  assert.equal((JSON.parse(first.store.value!) as ErrorReport[]).length, 1);

  online = true;
  const second = reporter(() => 'sent', memoryStore(first.store.value));
  await second.r.flush();
  assert.deepEqual(second.sent.map((s) => s.message), ['one']);
  assert.equal(second.store.value, '[]');
});

test('the same message is not reported twice within a minute', async () => {
  let time = 1_000_000;
  const { r, sent } = reporter(() => 'sent', memoryStore(), () => time);
  await r.capture('uncaught', new Error('same'));
  await r.capture('boundary', new Error('same'));
  await r.flush();
  assert.equal(sent.length, 1);
  time += 61_000;
  await r.capture('uncaught', new Error('same'));
  await r.flush();
  assert.equal(sent.length, 2);
});

test('the queue is capped and keeps the newest reports', async () => {
  const { r, store } = reporter(() => 'wait');
  for (let i = 0; i < 40; i++) await r.capture('uncaught', new Error(`error ${String.fromCharCode(65 + i)}`));
  const saved = JSON.parse(store.value!) as ErrorReport[];
  assert.equal(saved.length, 30);
  assert.equal(saved.at(-1)!.message, `error ${String.fromCharCode(65 + 39)}`);
});

test('capture never rejects, even when storage and send both fail', async () => {
  const r = createErrorReporter({
    store: {
      read: () => {
        throw new Error('no storage');
      },
      write: () => {
        throw new Error('no storage');
      },
    },
    screen: () => null,
    send: async () => {
      throw new Error('no network');
    },
  });
  await r.capture('uncaught', undefined);
  await r.capture('uncaught', { circular: 'object' });
  await r.flush();
});

test('rpcSender separates signed-out, rate-limited, invalid and network outcomes', async () => {
  const report: ErrorReport = { kind: 'uncaught', message: 'x', stack: null, code: null, screen: null, occurredAt: new Date().toISOString() };
  const sender = (session: boolean, response: { data: unknown; error: { message: string } | null; status: number }) =>
    rpcSender({ app: 'mobile', appVersion: '1', platform: 'web', hasSession: async () => session, rpc: async () => response })(report);
  assert.equal(await sender(false, { data: null, error: null, status: 200 }), 'wait');
  assert.equal(await sender(true, { data: true, error: null, status: 200 }), 'sent');
  assert.equal(await sender(true, { data: false, error: null, status: 200 }), 'drop');
  assert.equal(await sender(true, { data: null, error: { message: 'bad_request' }, status: 400 }), 'drop');
  assert.equal(await sender(true, { data: null, error: { message: 'no_profile' }, status: 400 }), 'retry');
  assert.equal(await sender(true, { data: null, error: { message: 'TypeError: Failed to fetch' }, status: 0 }), 'retry');
  assert.equal(await sender(true, { data: null, error: { message: 'server' }, status: 503 }), 'retry');
});
