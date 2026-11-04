import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Calls `fn` now and every `ms` while the app is in the foreground and `enabled` is true. */
export function usePoll(fn: () => Promise<unknown> | void, ms: number, enabled = true) {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const run = async () => {
      if (stopped) return;
      if (AppState.currentState === 'active') {
        try {
          await latest.current();
        } catch {
          // screens report their own errors
        }
      }
      if (!stopped) timer = setTimeout(run, ms);
    };
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && timer) {
        clearTimeout(timer);
        run();
      }
    });
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [ms, enabled]);
}
