import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '../src/session';
import { C } from '../src/ui';

/** Sends each user to the right place: sign-in, first-run, driver or passenger home. */
export default function Index() {
  const { ready, session, me, mode } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;
  if (!me?.name) return <Redirect href="/welcome" />;
  if (mode === 'driver') return <Redirect href={me.driver?.status === 'approved' ? '/drive' : '/driver-register'} />;
  return <Redirect href="/book" />;
}
