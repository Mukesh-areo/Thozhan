// Small UI kit: the Thozhan look from the web prototype (deep green, lime accent, Noto-friendly
// line heights so Tamil text never clips).
import type { FareBreakdown } from '@thozhan/tariff';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from './i18n';

export const C = {
  ink: '#14201b',
  muted: '#5d6b64',
  line: '#dfe5df',
  bg: '#f4f6f1',
  card: '#ffffff',
  brand: '#174a3b',
  brandSoft: '#e5efe9',
  lime: '#c8f169',
  danger: '#b3261e',
  dangerSoft: '#fbeae8',
  warn: '#a15c00',
  warnSoft: '#fff3df',
  ok: '#1e7a46',
  okSoft: '#e3f4ea',
};

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[s.screen, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export const H1 = ({ children }: { children: ReactNode }) => <Text style={s.h1}>{children}</Text>;
export const H2 = ({ children }: { children: ReactNode }) => <Text style={s.h2}>{children}</Text>;
export const P = ({ children, muted, small, center }: { children: ReactNode; muted?: boolean; small?: boolean; center?: boolean }) => (
  <Text style={[s.p, muted && { color: C.muted }, small && { fontSize: 13, lineHeight: 19 }, center && { textAlign: 'center' }]}>{children}</Text>
);

export function Card({ children, style, tone }: { children: ReactNode; style?: ViewStyle; tone?: 'brand' | 'warn' | 'danger' }) {
  const toneStyle =
    tone === 'brand'
      ? { backgroundColor: C.brand, borderColor: C.brand }
      : tone === 'warn'
        ? { backgroundColor: C.warnSoft, borderColor: '#f1d9a8' }
        : tone === 'danger'
          ? { backgroundColor: C.dangerSoft, borderColor: '#f2c4bf' }
          : null;
  return <View style={[s.card, toneStyle, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'lime';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const palette = {
    primary: { bg: C.brand, fg: '#fff', border: C.brand },
    secondary: { bg: C.card, fg: C.brand, border: C.line },
    danger: { bg: C.danger, fg: '#fff', border: C.danger },
    ghost: { bg: 'transparent', fg: C.brand, border: 'transparent' },
    lime: { bg: C.lime, fg: C.brand, border: C.lime },
  }[kind];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [s.button, { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.55 : pressed ? 0.85 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : <Text style={[s.buttonText, { color: palette.fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#98a39d" style={s.input} {...input} />
      {hint ? (
        <P small muted>
          {hint}
        </P>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange(v: T): void }) {
  return (
    <View style={s.segment}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[s.segmentItem, o.value === value && s.segmentOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
        >
          <Text style={[s.segmentText, o.value === value && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Badge({ text, tone = 'ok' }: { text: string; tone?: 'ok' | 'warn' | 'muted' | 'danger' }) {
  const palette = { ok: [C.okSoft, C.ok], warn: [C.warnSoft, C.warn], muted: [C.brandSoft, C.muted], danger: [C.dangerSoft, C.danger] }[tone];
  return (
    <View style={[s.badge, { backgroundColor: palette[0] }]}>
      <Text style={[s.badgeText, { color: palette[1] }]}>{text}</Text>
    </View>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={[s.p, { flex: 1 }, strong && s.strong]}>{label}</Text>
      <Text style={[s.p, s.strong, strong && { fontSize: 20 }]}>{value}</Text>
    </View>
  );
}

export function Notice({ text, tone = 'danger' }: { text: string | null; tone?: 'danger' | 'ok' | 'warn' }) {
  if (!text) return null;
  const palette = { danger: [C.dangerSoft, C.danger], ok: [C.okSoft, C.ok], warn: [C.warnSoft, C.warn] }[tone];
  return (
    <View style={[s.notice, { backgroundColor: palette[0] }]} accessibilityLiveRegion="polite">
      <Text style={{ color: palette[1], fontSize: 14, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}

export const Gap = ({ h = 12 }: { h?: number }) => <View style={{ height: h }} />;

/** Every fare line with its quantity, the legal source and the open assumptions. */
export function FareLines({ fare, flags = [] }: { fare: FareBreakdown; flags?: string[] }) {
  const { t, money, km } = useI18n();
  // Line labels carry their own quantities, e.g. "Additional distance ({km} km)".
  const label = (line: FareBreakdown['lines'][number]) =>
    t(`fare.line.${line.code}`, { km: km(line.detail?.meters ?? 0, 2), minutes: line.detail?.minutes ?? 0 });
  return (
    <View style={{ gap: 8 }}>
      <Badge text={t(`tariff.status.${fare.status}`)} tone={fare.status === 'OFFICIAL' ? 'ok' : 'warn'} />
      {fare.lines.map((line, i) => (
        <Row key={i} label={label(line)} value={money(line.amountPaise)} />
      ))}
      <View style={{ height: 2, backgroundColor: C.ink, marginVertical: 2 }} />
      <Row label={t('fare.total')} value={money(fare.totalPaise)} strong />
      {fare.legalReference ? (
        <P small muted>
          {t('tariff.source', { reference: fare.legalReference })}
        </P>
      ) : null}
      {[...fare.assumptions.map((a) => t(`tariff.assumption.${a}`)), ...flags.map((f) => t(`meter.flag.${f}`))].map((text, i) => (
        <P key={i} small muted>
          • {text}
        </P>
      ))}
      {!fare.verifiedForBilling ? <P small>{t('fare.notBillable')}</P> : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { padding: 16, gap: 14, paddingBottom: 40 },
  h1: { fontSize: 26, lineHeight: 36, fontWeight: '800', color: C.ink },
  h2: { fontSize: 18, lineHeight: 27, fontWeight: '700', color: C.ink },
  p: { fontSize: 15, lineHeight: 23, color: C.ink },
  strong: { fontWeight: '700' },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: C.line },
  button: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1 },
  buttonText: { fontSize: 16, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  label: { fontSize: 14, lineHeight: 20, color: C.muted, fontWeight: '600' },
  input: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#fbfcfa',
    paddingHorizontal: 14,
    fontSize: 16,
    color: C.ink,
  },
  segment: { flexDirection: 'row', backgroundColor: C.brandSoft, borderRadius: 12, padding: 4, gap: 4 },
  segmentItem: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentOn: { backgroundColor: C.brand },
  segmentText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: C.brand, textAlign: 'center' },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  notice: { borderRadius: 12, padding: 12 },
});
