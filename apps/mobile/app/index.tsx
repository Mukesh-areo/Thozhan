import { Redirect } from 'expo-router';
import { useSession } from '../src/session';

/** Sends each user to the right place: sign-in, first-run, driver or passenger home. */
export default function Index() {
  const { session, me, mode } = useSession();
  if (!session) return <Redirect href="/login" />;
  if (!me?.name) return <Redirect href="/welcome" />;
  if (mode === 'driver') return <Redirect href={me.driver?.status === 'approved' ? '/drive' : '/driver-register'} />;
  return <Redirect href="/book" />;
}
