import { Redirect, Stack } from 'expo-router';
import { BookingProvider } from '../../src/booking';
import { useSession } from '../../src/session';
import { C } from '../../src/ui';

/** The tabs, with search, vehicle choice and ride history opening full screen above them. */
export default function RiderLayout() {
  const { ready, session } = useSession();
  if (ready && !session) return <Redirect href="/login" />;
  return (
    <BookingProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
    </BookingProvider>
  );
}
