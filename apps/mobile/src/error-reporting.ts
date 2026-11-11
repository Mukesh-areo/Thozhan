// Reports uncaught errors and unhandled promise rejections to the backend. Importing this file
// installs the handlers, so it is the first import in app/_layout.tsx.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createErrorReporter, listenToWindowErrors, rpcSender } from '@thozhan/shared';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { supabase } from './api';

const QUEUE_KEY = 'thozhan-error-queue';
const FATAL_SAVE_MS = 500;

let screen: string | null = null;
/** Pass route patterns such as receipt/[id], never real paths with ids in them. */
export function setErrorScreen(next: string) {
  screen = next;
}

export const reporter = createErrorReporter({
  screen: () => screen,
  store: {
    read: () => AsyncStorage.getItem(QUEUE_KEY),
    write: (value) => AsyncStorage.setItem(QUEUE_KEY, value),
  },
  send: rpcSender({
    app: 'mobile',
    appVersion: Constants.expoConfig?.version ?? null,
    platform: Platform.OS === 'web' ? 'web' : `${Platform.OS} ${Platform.Version}`,
    hasSession: async () => !!(await supabase.auth.getSession()).data.session,
    rpc: (args) => supabase.rpc('report_client_error', args),
  }),
});

interface NativeGlobals {
  __thozhanErrorsInstalled?: boolean;
  ErrorUtils?: {
    getGlobalHandler(): ((error: unknown, isFatal?: boolean) => void) | undefined;
    setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
  };
  HermesInternal?: {
    enablePromiseRejectionTracker?(options: { allRejections: boolean; onUnhandled(id: number, error: unknown): void; onHandled(id: number): void }): void;
  };
}

function installNativeHandlers(globals: NativeGlobals) {
  const previous = globals.ErrorUtils?.getGlobalHandler();
  globals.ErrorUtils?.setGlobalHandler((error, isFatal) => {
    const saved = reporter.capture('uncaught', error);
    if (!isFatal) return previous?.(error, isFatal);
    // React Native ends the app after a fatal error, so give the report time to reach storage.
    // It is then sent on the next launch if it could not be sent now.
    void Promise.race([saved, new Promise((resolve) => setTimeout(resolve, FATAL_SAVE_MS))]).then(() => previous?.(error, isFatal));
  });

  // React Native tracks rejections only in development; this tracker replaces that one.
  globals.HermesInternal?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id, error) => {
      if (__DEV__) console.warn('Unhandled promise rejection', error);
      void reporter.capture('rejection', error);
    },
    onHandled: () => {},
  });
}

const globals = globalThis as unknown as NativeGlobals;
// Fast refresh runs this file again; the handlers must only be installed once.
if (!globals.__thozhanErrorsInstalled) {
  globals.__thozhanErrorsInstalled = true;
  if (Platform.OS === 'web') listenToWindowErrors(globalThis as never, reporter);
  else installNativeHandlers(globals);

  AppState.addEventListener('change', (state) => {
    if (state === 'active') void reporter.flush();
  });
  // Deferred: supabase-js deadlocks if its own calls are made inside this callback.
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) setTimeout(() => void reporter.flush(), 0);
  });
}
