import '../src/location'; // registers the background location task at startup
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocaleProvider } from '../src/i18n';
import { SessionProvider, useSession } from '../src/session';
import { C } from '../src/ui';

/** Screens read the profile once when they mount, so none may mount before it has loaded. */
function Routes() {
  const { ready } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <SessionProvider>
          <StatusBar style="dark" />
          <Routes />
        </SessionProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
