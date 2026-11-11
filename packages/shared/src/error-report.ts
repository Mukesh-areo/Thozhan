// Client side of the built-in error reporting: both apps use this with their own storage and
// their own supabase client. Reports wait in a small persistent queue, so a crash on a phone
// with no signal is delivered when the phone is back online and signed in.

export type ErrorKind = 'uncaught' | 'rejection' | 'boundary';

export interface ErrorReport {
  kind: ErrorKind;
  message: string;
  stack: string | null;
  code: string | null;
  screen: string | null;
  occurredAt: string;
}

/**
 * sent / drop: finished with this report. retry: try again after a delay.
 * wait: no signed-in user yet, so hold everything until the next flush().
 */
export type SendResult = 'sent' | 'drop' | 'retry' | 'wait';

export interface ReportStore {
  read(): Promise<string | null> | string | null;
  write(value: string): Promise<void> | void;
}

export interface ErrorReporterOptions {
  send(report: ErrorReport): Promise<SendResult>;
  store: ReportStore;
  screen(): string | null;
  now?(): number;
}

export interface ErrorReporter {
  /** Records an error. Never throws; resolves once the report is saved to the queue. */
  capture(kind: ErrorKind, error: unknown, info?: { componentStack?: string | null }): Promise<void>;
  /** Sends what is queued. Call it when the app returns to the foreground or the user signs in. */
  flush(): Promise<void>;
}

const MAX_MESSAGE = 2000;
const MAX_STACK = 8000;
const MAX_SCREEN = 120;
const MAX_QUEUED = 30;
const REPEAT_WINDOW_MS = 60_000;
const RETRY_MIN_MS = 30_000;
const RETRY_MAX_MS = 5 * 60_000;

// Keep in step with scrub_client_text in supabase/migrations/20261109000003_client_errors.sql;
// supabase/test/client-errors.test.ts checks that both give the same result.
const SCRUBS: readonly [RegExp, string][] = [
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?/g, '[token]'],
  [/bearer\s+[^\s"',;]+/gi, 'Bearer [token]'],
  [/(access_token|refresh_token|id_token|token|api_?key|authorization|password|secret)(["']?\s*[:=]\s*["']?)[^\s"'&,;)}]+/gi, '$1$2[redacted]'],
  [/\/track\/[^\s"'?#)]+/gi, '/track/[token]'],
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]'],
  [/(?<![A-Za-z0-9_.])\+?\d(?:[ -]?\d){9,14}(?![A-Za-z0-9_])/g, '[phone]'],
  [/(?<![A-Za-z0-9_.])-?\d{1,3}\.\d{3,}(?![A-Za-z0-9_.])/g, '[coord]'],
  [/(otp|pin|passcode|code)[^0-9a-z]{0,4}(is[^0-9a-z]{1,3})?\d{4,8}(?![0-9])/gi, '$1 [otp]'],
  [/(?<![A-Za-z0-9_.:/-])\d{4,8}(?![A-Za-z0-9_:.-])/g, '[num]'],
];

/** Removes OTPs, phone numbers, coordinates, tokens and ids from text that leaves the device. */
export function scrubErrorText(input: string): string {
  return SCRUBS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), input.replace(/\0/g, ''));
}

const clean = (value: string | null | undefined, max: number): string | null => (value ? scrubErrorText(value).slice(0, max) : null);

function describe(error: unknown): { message: string; stack: string | null; code: string | null } {
  if (typeof error === 'object' && error !== null) {
    const e = error as { name?: unknown; message?: unknown; stack?: unknown; code?: unknown };
    if (typeof e.message === 'string') {
      const prefix = typeof e.name === 'string' && e.name !== 'Error' ? `${e.name}: ` : '';
      return {
        message: prefix + e.message,
        stack: typeof e.stack === 'string' ? e.stack : null,
        code: typeof e.code === 'string' && /^[A-Za-z][\w.-]{0,63}$/.test(e.code) ? e.code : null,
      };
    }
    try {
      return { message: JSON.stringify(error), stack: null, code: null };
    } catch {
      return { message: 'unserialisable error', stack: null, code: null };
    }
  }
  return { message: String(error), stack: null, code: null };
}

export function createErrorReporter(options: ErrorReporterOptions): ErrorReporter {
  const { send, store, screen, now = Date.now } = options;
  const recent = new Map<string, number>();
  let queue: ErrorReport[] = [];
  let flushing: Promise<void> | null = null;
  let retryDelay = RETRY_MIN_MS;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const loaded = (async () => {
    try {
      const saved: unknown = JSON.parse((await store.read()) ?? '[]');
      if (Array.isArray(saved)) queue = saved as ErrorReport[];
    } catch {
      queue = [];
    }
  })();

  async function persist() {
    try {
      await store.write(JSON.stringify(queue));
    } catch {
      // Storage is full or gone. The reports in memory can still be sent.
    }
  }

  function scheduleRetry() {
    if (retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void flush();
    }, retryDelay);
    (retryTimer as { unref?: () => void }).unref?.();
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
  }

  async function drain() {
    await loaded;
    while (queue[0]) {
      const report = queue[0];
      let result: SendResult;
      try {
        result = await send(report);
      } catch {
        result = 'retry';
      }
      if (result === 'wait') return;
      if (result === 'retry') return scheduleRetry();
      retryDelay = RETRY_MIN_MS;
      queue = queue.filter((r) => r !== report);
      await persist();
    }
  }

  function flush(): Promise<void> {
    flushing ??= drain()
      .catch(() => {})
      .finally(() => {
        flushing = null;
      });
    return flushing;
  }

  async function capture(kind: ErrorKind, error: unknown, info?: { componentStack?: string | null }) {
    try {
      const { message, stack, code } = describe(error);
      if (!message.trim()) return;

      // A render loop or a failing poll would otherwise send the same report many times a minute.
      const time = now();
      if (time - (recent.get(message) ?? -Infinity) < REPEAT_WINDOW_MS) return;
      if (recent.size > 50) recent.clear();
      recent.set(message, time);

      const fullStack = [stack, info?.componentStack ? `Components:${info.componentStack}` : null].filter(Boolean).join('\n');
      await loaded;
      queue = [
        ...queue,
        {
          kind,
          message: clean(message, MAX_MESSAGE) ?? 'unknown error',
          stack: clean(fullStack, MAX_STACK),
          code,
          screen: clean(screen(), MAX_SCREEN),
          occurredAt: new Date(time).toISOString(),
        },
      ].slice(-MAX_QUEUED);
      await persist();
      void flush();
    } catch {
      // Reporting must never become a new source of errors.
    }
  }

  void flush();
  return { capture, flush };
}

/** Browser `window` events. Events with no error object are browser noise or cross-origin scripts. */
export function listenToWindowErrors(target: { addEventListener(type: string, listener: (event: any) => void): void }, reporter: ErrorReporter) {
  target.addEventListener('error', (event: { error?: unknown }) => {
    if (event.error) void reporter.capture('uncaught', event.error);
  });
  target.addEventListener('unhandledrejection', (event: { reason?: unknown }) => {
    void reporter.capture('rejection', event.reason);
  });
}

export interface RpcSenderOptions {
  app: 'mobile' | 'admin';
  appVersion: string | null;
  platform: string | null;
  hasSession(): Promise<boolean>;
  rpc(args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null; status: number }>;
}

/** Sends one report through the report_client_error database function. */
export function rpcSender(options: RpcSenderOptions): (report: ErrorReport) => Promise<SendResult> {
  return async (report) => {
    if (!(await options.hasSession())) return 'wait';
    const { data, error, status } = await options.rpc({
      p_app: options.app,
      p_kind: report.kind,
      p_message: report.message,
      p_stack: report.stack,
      p_code: report.code,
      p_screen: report.screen,
      p_platform: options.platform,
      p_app_version: options.appVersion,
      p_occurred_at: report.occurredAt,
    });
    if (!error) return data === false ? 'drop' : 'sent';
    // A 400 from the function means this report can never be accepted; other failures can pass.
    const signedOut = error.message === 'not_signed_in' || error.message === 'no_profile';
    return status === 400 && !signedOut ? 'drop' : 'retry';
  };
}
