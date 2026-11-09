import '../src/error-reporting'; // first, so errors while the rest loads are caught too
import '../src/location'; // registers the background location task at startup
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary, ScreenTracker } from '../src/ErrorBoundary';
import { LocaleProvider } from '../src/i18n';
import { SessionProvider } from '../src/session';
import { C } from '../src/ui';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <LocaleProvider>
          <SessionProvider>
            <StatusBar style="dark" />
            <ScreenTracker />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
          </SessionProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
