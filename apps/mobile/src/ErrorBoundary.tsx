import { t } from '@thozhan/i18n';
import { useSegments } from 'expo-router';
import { Component, Fragment, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reporter, setErrorScreen } from './error-reporting';
import { C } from './ui';

/** Keeps the current route pattern available for error reports. */
export function ScreenTracker() {
  const screen = useSegments().join('/') || 'index';
  useEffect(() => setErrorScreen(screen), [screen]);
  return null;
}

// In both languages and without the app's providers, because any of them may be what failed.
function CrashScreen({ onRetry }: { onRetry(): void }) {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>{t('ta', 'm.crash.title')}</Text>
      <Text style={styles.title}>{t('en', 'm.crash.title')}</Text>
      <Text style={styles.body}>{t('ta', 'm.crash.body')}</Text>
      <Text style={styles.body}>{t('en', 'm.crash.body')}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>
          {t('ta', 'm.retry')} / {t('en', 'm.retry')}
        </Text>
      </Pressable>
    </View>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; attempt: number }> {
  override state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    void reporter.capture('boundary', error, { componentStack: info.componentStack });
  }

  retry = () => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));

  override render() {
    if (this.state.failed) return <CrashScreen onRetry={this.retry} />;
    // A new key remounts the tree, so a retry does not start from the state that crashed.
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', padding: 28, gap: 10, backgroundColor: C.bg },
  title: { fontSize: 22, fontWeight: '700', color: C.ink },
  body: { fontSize: 16, lineHeight: 24, color: C.muted },
  button: { marginTop: 14, minHeight: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, backgroundColor: C.brand },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
});
