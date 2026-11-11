// Driver documents and photos: which papers each vehicle needs (mirrors required_documents() on
// the server), and taking a photo and storing it in the private driver-documents bucket. Only
// the driver and reviewing staff can read that bucket; passengers never see these files.
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from './api';

export const ALL_DOCS = ['licence', 'rc', 'permit', 'insurance', 'pollution', 'fitness', 'photo'] as const;
export type Doc = (typeof ALL_DOCS)[number];

export function requiredDocs(vehicle: string): Doc[] {
  const needsFitness = vehicle === 'auto' || vehicle.startsWith('cab-');
  return ALL_DOCS.filter((d) => d !== 'fitness' || needsFitness);
}

/** Papers with a validity date; the RC and the profile photo have none. */
export const expires = (doc: string) => doc !== 'rc' && doc !== 'photo';

/** "2027-03-31" → a real date in the future, else null. */
export function futureDate(value: string): string | null {
  const v = value.trim();
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)) return null;
  const [y = 0, m = 0, day = 0] = v.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null; // e.g. 2027-02-30
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d > today ? v : null;
}

/** Days until a YYYY-MM-DD date (negative once it has passed). */
export const daysUntil = (date: string) => Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86_400_000);

export type PickResult = { path: string } | { error: 'camera_denied' | 'network' } | null;

/** Takes (or picks) a photo and uploads it under `<uid>/<name>-<time>.jpg`. Null if cancelled. */
export async function photoUpload(uid: string, name: string, camera: boolean): Promise<PickResult> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
  // Browsers have no reliable camera capture here; they get the file picker instead.
  if (Platform.OS === 'web') camera = false;
  if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return { error: 'camera_denied' };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  try {
    const bytes = await (await fetch(asset.uri)).arrayBuffer();
    const path = `${uid}/${name}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('driver-documents').upload(path, bytes, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });
    if (error) throw error;
    return { path };
  } catch {
    return { error: 'network' };
  }
}
