// Small UI kit: the Thozhan look (deep green, lime accent, Noto-friendly line heights so Tamil
// text never clips), arranged as a full map with a bottom sheet on the booking screens.
import Feather from '@expo/vector-icons/Feather';
import type { FareBreakdown } from '@thozhan/tariff';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from './i18n';

export const C = {
  ink: '#14201b',
  muted: '#5d6b64',
  line: '#e6ebe6',
  bg: '#f5f7f3',
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

const SHADOW = '0px 4px 18px rgba(20, 32, 27, 0.09)';

export type IconName = ComponentProps<typeof Feather>['name'];
/** Decorative: hidden from screen readers, so a button reads as its words only. */
export const Icon = ({ name, size = 22, color = C.ink }: { name: IconName; size?: number; color?: string }) => (
  <Feather name={name} size={size} color={color} accessible={false} importantForAccessibility="no" accessibilityElementsHidden />
);

/**
 * Keeps the focused field and the button under it above the on-screen keyboard. The app draws
 * edge to edge, so Android no longer resizes the window for the keyboard; this pads by however
 * much of the view the keyboard actually covers (zero if the window did resize).
 */
export const KeyboardSafe = ({ children }: { children: ReactNode }) => (
  <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    {children}
  </KeyboardAvoidingView>
);

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      <KeyboardSafe>
        {scroll ? (
          <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[s.screen, { flex: 1 }]}>{children}</View>
        )}
      </KeyboardSafe>
    </SafeAreaView>
  );
}

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** A title with a back arrow, for screens opened from another screen. */
export function Header({ title, onBack = goBack }: { title: string; onBack?: () => void }) {
  const { t } = useI18n();
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('m.back')} hitSlop={10} style={s.headerBack}>
        <Icon name="arrow-left" />
      </Pressable>
      <Text style={[s.h1, { flex: 1 }]} accessibilityRole="header">
        {title}
      </Text>
    </View>
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
      ? { backgroundColor: C.brand }
      : tone === 'warn'
        ? { backgroundColor: C.warnSoft }
        : tone === 'danger'
          ? { backgroundColor: C.dangerSoft }
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
  icon,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'lime';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: IconName;
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
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [s.button, { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.55 : pressed ? 0.85 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={palette.fg} /> : null}
          <Text style={[s.buttonText, { color: palette.fg }]}>{title}</Text>
        </>
      )}
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
      <Text style={[s.p, s.strong, { flexShrink: 1, maxWidth: '58%', textAlign: 'right' }, strong && { fontSize: 20 }]}>{value}</Text>
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

/** The white panel that rises over the map. Its content scrolls; `footer` stays pinned below it. */
export function Sheet({ children, footer, maxHeight = '62%' }: { children: ReactNode; footer?: ReactNode; maxHeight?: `${number}%` }) {
  return (
    <View style={[s.sheet, { maxHeight }]}>
      <View style={s.grabber} />
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={s.sheetFooter}>{footer}</View> : null}
    </View>
  );
}

/** A round white button that floats over the map. */
export function RoundButton({ icon, label, onPress, style }: { icon: IconName; label: string; onPress(): void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[s.round, style]}>
      <Icon name={icon} />
    </Pressable>
  );
}

/** Pushes floating map controls clear of the status bar. */
export const useTopInset = () => useSafeAreaInsets().top + 10;

/** One line of a menu or list: icon, title, optional subtitle, optional control on the right. */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  divider = true,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  divider?: boolean;
}) {
  return (
    <View style={[s.listRow, divider && s.listDivider]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        style={s.listMain}
      >
        {icon ? <Icon name={icon} color={C.muted} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={s.listTitle} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? <Text style={s.listSub}>{subtitle}</Text> : null}
        </View>
        {!right && onPress ? <Icon name="chevron-right" size={20} color={C.muted} /> : null}
      </Pressable>
      {right}
    </View>
  );
}

/** Pickup to drop, with the coloured stops joined by a line. */
export function RouteStops({ pickup, drop, pickupLabel, dropLabel }: { pickup: string; drop: string; pickupLabel: string; dropLabel: string }) {
  return (
    <View>
      <View style={s.stop}>
        <View style={s.stopRail}>
          <View style={[s.stopDot, { borderColor: C.brand }]} />
          <View style={s.stopLine} />
        </View>
        <View style={{ flex: 1, paddingBottom: 12 }}>
          <Text style={s.listSub}>{pickupLabel}</Text>
          <Text style={s.listTitle}>{pickup}</Text>
        </View>
      </View>
      <View style={s.stop}>
        <View style={s.stopRail}>
          <View style={[s.stopDot, { borderColor: C.danger }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.listSub}>{dropLabel}</Text>
          <Text style={s.listTitle}>{drop}</Text>
        </View>
      </View>
    </View>
  );
}

/** The green banner at the top of a receipt. */
export function ReceiptHero({ title, amount, code }: { title: string; amount?: string | null; code?: string | null }) {
  return (
    <Card tone="brand" style={{ alignItems: 'center', paddingVertical: 22 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={28} color={C.brand} />
      </View>
      <Text style={{ color: '#d5e4dc', fontSize: 15, lineHeight: 22 }} accessibilityRole="header">
        {title}
      </Text>
      {amount ? <Text style={{ color: '#fff', fontSize: 44, lineHeight: 56, fontWeight: '800' }}>{amount}</Text> : null}
      {code ? <Text style={{ color: C.lime, fontSize: 14, lineHeight: 21, fontWeight: '700' }}>{code}</Text> : null}
    </Card>
  );
}

const ART = {
  auto: require('../assets/illustrations/auto.png'),
  bike: require('../assets/illustrations/bike.png'),
  scooter: require('../assets/illustrations/scooter.png'),
  cab: require('../assets/illustrations/cab.png'),
  parcel: require('../assets/illustrations/parcel.png'),
  'parcel-auto': require('../assets/illustrations/parcel-auto.png'),
};

const artFor = (categoryId: string) => (categoryId.startsWith('cab') ? ART.cab : (ART[categoryId as keyof typeof ART] ?? ART.parcel));

export const VehicleArt = ({ category, size = 72 }: { category: string; size?: number }) => (
  <Image source={artFor(category)} style={{ width: size, height: size * 0.75 }} resizeMode="contain" accessibilityIgnoresInvertColors />
);

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
      <View style={{ height: 1, backgroundColor: C.line, marginVertical: 2 }} />
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

/** A labelled on/off row; the whole row is the touch target. */
export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange(v: boolean): void }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} style={s.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={[s.p, { fontWeight: '600' }]}>{label}</Text>
        {hint ? <Text style={s.listSub}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.brand }} />
    </Pressable>
  );
}

/** Five tappable stars, or a read-only average when no onChange is given. */
export function Stars({ value, onChange, size = 34 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const { t } = useI18n();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole={onChange ? 'adjustable' : 'text'} accessibilityLabel={t('m.rate.stars', { n: value })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={onChange ? () => onChange(n) : undefined} disabled={!onChange} hitSlop={4} accessibilityLabel={t('m.rate.stars', { n })}>
          <Text style={{ fontSize: size, lineHeight: size * 1.25, color: n <= Math.round(value) ? '#e3a008' : '#cfd8d3' }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** A tappable chip that can be on or off, e.g. a rating compliment. */
export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress(): void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={[s.chip, on && { backgroundColor: C.brand, borderColor: C.brand }]}
    >
      <Text style={[s.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  chip: { minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#fff' },
  chipText: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: C.ink },
  screen: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBack: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  h1: { fontSize: 26, lineHeight: 36, fontWeight: '800', color: C.ink },
  h2: { fontSize: 18, lineHeight: 27, fontWeight: '700', color: C.ink },
  p: { fontSize: 15, lineHeight: 23, color: C.ink },
  strong: { fontWeight: '700' },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 16, gap: 10, boxShadow: SHADOW },
  button: {
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  buttonText: { fontSize: 16, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  label: { fontSize: 14, lineHeight: 20, color: C.muted, fontWeight: '600' },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 14, fontSize: 16, color: C.ink },
  segment: { flexDirection: 'row', backgroundColor: C.brandSoft, borderRadius: 14, padding: 4, gap: 4 },
  segmentItem: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentOn: { backgroundColor: C.brand },
  segmentText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: C.brand, textAlign: 'center' },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  notice: { borderRadius: 14, padding: 12 },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -22, boxShadow: '0px -6px 20px rgba(20, 32, 27, 0.10)' },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginTop: 10, marginBottom: 6 },
  sheetBody: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 6, gap: 12 },
  sheetFooter: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.card },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58 },
  listMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingVertical: 8 },
  listDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  listTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: C.ink },
  listSub: { fontSize: 13, lineHeight: 19, color: C.muted },
  stop: { flexDirection: 'row', gap: 12 },
  stopRail: { width: 14, alignItems: 'center', paddingTop: 4 },
  stopDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 4, backgroundColor: '#fff' },
  stopLine: { flex: 1, width: 2, backgroundColor: C.line, marginTop: 2 },
});
