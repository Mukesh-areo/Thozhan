// What the passenger is booking, shared by the Ride, Parcel, place-search and vehicle screens,
// and the live trip that replaces them once a booking is made.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { rpc, type Place, type Trip, type TripOptions } from './api';
import { POLL } from './config';
import { useI18n } from './i18n';
import { placesFor } from './places';
import { usePoll } from './usePoll';

export type BookingFlow = 'ride' | 'parcel';
export interface ParcelDetails {
  receiverName: string;
  receiverPhone: string;
  weightKg: string;
  item: string;
  category: string;
  declaredValue: string;
  /** Length × width × height in cm, for auto parcels. */
  dimensions: [string, string, string];
  packages: string;
  loadingHelp: boolean;
  fragile: boolean;
  prohibitedAck: boolean;
}

export const PARCEL_ITEMS = ['documents', 'clothes', 'food', 'electronics', 'household', 'other'] as const;

const EMPTY_OPTIONS: TripOptions = {
  pickupNote: '',
  safety: { onePassenger: false, helmet: false, noLuggage: false, conditions: false },
  cab: { passengers: 1, luggage: 'none', ac: false, assistance: false, pet: false },
};

const FAVOURITES_KEY = 'thozhan-favourite-places';
const EMPTY_PARCEL: ParcelDetails = {
  receiverName: '',
  receiverPhone: '',
  weightKg: '2',
  item: '',
  category: 'documents',
  declaredValue: '',
  dimensions: ['', '', ''],
  packages: '1',
  loadingHelp: false,
  fragile: false,
  prohibitedAck: false,
};

interface BookingState {
  trip: Trip | null;
  setTrip(trip: Trip | null): void;
  /** Records a trip this phone has just booked, so its end is noticed. */
  follow(trip: Trip): void;
  loaded: boolean;
  flags: Record<string, boolean>;
  places: Place[];
  pickup: Place | null;
  setPickup(place: Place | null): void;
  drop: Place | null;
  setDrop(place: Place | null): void;
  swap(): void;
  flow: BookingFlow;
  setFlow(flow: BookingFlow): void;
  category: string;
  setCategory(id: string): void;
  parcel: ParcelDetails;
  setParcel(next: Partial<ParcelDetails>): void;
  /** Pickup note, bike safety checks and cab preferences for the next booking. */
  options: TripOptions;
  setOptions(next: Partial<TripOptions>): void;
  /** Clears the destination and parcel form once a booking is placed. */
  reset(): void;
  info: string | null;
  setInfo(text: string | null): void;
  recents: Place[];
  favourites: Place[];
  isFavourite(place: Place): boolean;
  toggleFavourite(place: Place): void;
}

const Context = createContext<BookingState | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const places = useMemo(() => placesFor(locale), [locale]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastTrip = useRef<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({ auto: true });
  const [pickup, setPickup] = useState<Place | null>(places[0] ?? null);
  const [drop, setDrop] = useState<Place | null>(null);
  const [flow, setFlow] = useState<BookingFlow>('ride');
  const [category, setCategory] = useState('auto');
  const [parcel, setParcelState] = useState<ParcelDetails>(EMPTY_PARCEL);
  const [options, setOptionsState] = useState<TripOptions>(EMPTY_OPTIONS);
  const [info, setInfo] = useState<string | null>(null);
  const [recents, setRecents] = useState<Place[]>([]);
  const [favourites, setFavourites] = useState<Place[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(FAVOURITES_KEY)
      .then((saved) => saved && setFavourites(JSON.parse(saved)))
      .catch(() => {});
  }, []);

  usePoll(async () => {
    const state = await rpc<{ trip: Trip | null }>('rider_state');
    setLoaded(true);
    if (state.trip) {
      lastTrip.current = state.trip.id;
      setTrip(state.trip);
      return;
    }
    setTrip(null);
    if (lastTrip.current) {
      // The trip just ended: show the receipt, or why it stopped.
      const ended = await rpc<Trip>('get_trip', { p_trip: lastTrip.current });
      lastTrip.current = null;
      if (ended.status === 'COMPLETED' || ended.status === 'DELIVERED') router.push(`/receipt/${ended.id}`);
      else setInfo(ended.cancelReason === 'no_driver' ? t('m.trip.noDriver') : t('m.trip.cancelled'));
    }
  }, POLL.rider);
  usePoll(async () => setFlags(await rpc<Record<string, boolean>>('service_flags')), 60000);
  usePoll(async () => {
    const trips = await rpc<Trip[]>('my_trips', { p_limit: 20 });
    const seen = new Set<string>();
    const unique: Place[] = [];
    for (const past of trips) {
      if (past.dropoff && !seen.has(past.dropoff.name)) {
        seen.add(past.dropoff.name);
        unique.push(past.dropoff);
      }
    }
    setRecents(unique.slice(0, 3));
  }, 30000);

  // A landmark saved in one language must not appear again under its name in the other.
  const localise = (place: Place) => places.find((p) => p.lat === place.lat && p.lon === place.lon) ?? place;

  const value: BookingState = {
    trip,
    setTrip,
    follow: (made) => {
      lastTrip.current = made.id;
      setTrip(made);
    },
    loaded,
    flags,
    places,
    pickup,
    setPickup,
    drop,
    setDrop,
    swap: () => {
      setPickup(drop);
      setDrop(pickup);
    },
    flow,
    setFlow,
    category,
    setCategory,
    parcel,
    setParcel: (next) => setParcelState((current) => ({ ...current, ...next })),
    options,
    setOptions: (next) => setOptionsState((current) => ({ ...current, ...next })),
    reset: () => {
      setDrop(null);
      setParcelState(EMPTY_PARCEL);
      setOptionsState(EMPTY_OPTIONS);
    },
    info,
    setInfo,
    recents: recents.map(localise),
    favourites: favourites.map(localise),
    isFavourite: (place) => favourites.some((f) => f.lat === place.lat && f.lon === place.lon),
    toggleFavourite: (place) => {
      const same = (f: Place) => f.lat === place.lat && f.lon === place.lon;
      const next = favourites.some(same) ? favourites.filter((f) => !same(f)) : [place, ...favourites];
      setFavourites(next);
      AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(next)).catch(() => {});
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBooking() {
  const state = useContext(Context);
  if (!state) throw new Error('useBooking must be used inside BookingProvider');
  return state;
}
