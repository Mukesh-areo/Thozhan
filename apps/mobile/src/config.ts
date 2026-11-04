// Where the backend lives. With no EXPO_PUBLIC_SUPABASE_URL set, the app talks to the local
// dev backend (`npm run dev:backend`) on the same computer that serves the app, so a phone
// running Expo Go on the same Wi-Fi finds it without configuration.
import Constants from 'expo-constants';

/** The dev backend's fixed anon key (a JWT for role anon, signed with the dev secret). */
const DEV_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0aG96aGFuLWRldiIsInJvbGUiOiJhbm9uIn0.rtK_i31JNT_MLElHe9BcDRvkZjLrhwQpmGfZBPxRzA4';

function devHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return hostUri.split(':')[0]!;
  if (typeof location !== 'undefined' && location.hostname) return location.hostname;
  return 'localhost';
}

export const USING_DEV_BACKEND = !process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? `http://${devHost()}:54321`;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? DEV_ANON_KEY;
/** Public page that shows a shared trip; the admin dashboard serves /track/<token>. */
export const SHARE_BASE_URL = process.env.EXPO_PUBLIC_SHARE_URL ?? `http://${devHost()}:5173/track/`;

/** Seconds between polls. Realtime subscriptions can replace these after the MVP. */
export const POLL = { rider: 3000, driver: 2500, ping: 3000 } as const;
