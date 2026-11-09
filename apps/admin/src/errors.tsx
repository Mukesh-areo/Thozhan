// Error reports from the dashboard and the public tracking page. Installed by importing this
// file from main.tsx. Reports from signed-out visitors stay in their browser until a staff
// member signs in, because the report function accepts signed-in callers only.
import { t } from '@thozhan/i18n';
import { createErrorReporter, listenToWindowErrors, rpcSender } from '@thozhan/shared';
import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { version } from '../package.json';
import { supabase } from './lib.tsx';

const QUEUE_KEY = 'thozhan.errorQueue';

// Page names only: a /track/ path holds a share token.
const currentScreen = () => (location.pathname.startsWith('/track/') ? 'track' : location.hash.slice(1) || 'overview');

const reporter = createErrorReporter({
  screen: currentScreen,
  store: {
    read: () => localStorage.getItem(QUEUE_KEY),
    write: (value) => localStorage.setItem(QUEUE_KEY, value),
  },
  send: rpcSender({
    app: 'admin',
    appVersion: version,
    platform: 'web',
    hasSession: async () => !!(await supabase.auth.getSession()).data.session,
    rpc: (args) => supabase.rpc('report_client_error', args),
  }),
});

listenToWindowErrors(window, reporter);
addEventListener('online', () => void reporter.flush());
// Deferred: supabase-js deadlocks if its own calls are made inside this callback.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) setTimeout(() => void reporter.flush(), 0);
});

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; attempt: number }> {
  override state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    void reporter.capture('boundary', error, { componentStack: info.componentStack });
  }

  override render() {
    if (!this.state.failed) return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
    return (
      <div className="center">
        <div className="card narrow" role="alert">
          <h2>{t('ta', 'm.crash.title')}</h2>
          <h2>{t('en', 'm.crash.title')}</h2>
          <p>{t('ta', 'm.crash.body')}</p>
          <p>{t('en', 'm.crash.body')}</p>
          <button onClick={() => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }))}>
            {t('ta', 'm.retry')} / {t('en', 'm.retry')}
          </button>
        </div>
      </div>
    );
  }
}
