// Rate the other person after a finished trip (UX handoff §12, §18): stars, a few tags and an
// optional comment. The passenger rates the driver and the driver rates the passenger.
import { useState } from 'react';
import { View } from 'react-native';
import { rpc, type Trip } from './api';
import { errorText, useI18n } from './i18n';
import { Button, Card, Chip, Field, H2, Notice, P, Stars } from './ui';

const TAGS = {
  rider: { good: ['safe_driving', 'polite', 'clean_vehicle', 'on_time', 'fair_fare'], bad: ['rash_driving', 'rude', 'asked_extra', 'late'] },
  driver: { good: ['polite', 'on_time', 'correct_pickup'], bad: ['late', 'rude', 'wrong_pickup'] },
};

export function RateCard({ trip, by, onRated }: { trip: Trip; by: 'rider' | 'driver'; onRated?(trip: Trip): void }) {
  const { t } = useI18n();
  const [stars, setStars] = useState(trip.myRating?.stars ?? 0);
  const [tags, setTags] = useState<string[]>(trip.myRating?.tags ?? []);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(!!trip.myRating);
  const options = stars >= 4 ? TAGS[by].good : stars > 0 ? TAGS[by].bad : [];

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next = await rpc<Trip>('rate_trip', { p_trip: trip.id, p_stars: stars, p_tags: tags.filter((x) => options.includes(x)), p_comment: comment.trim() || null });
      setSaved(true);
      onRated?.(next);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <H2>{by === 'rider' ? t('m.rate.driver') : t('m.rate.passenger')}</H2>
      <Stars
        value={stars}
        onChange={(v) => {
          setStars(v);
          setSaved(false);
        }}
      />
      {options.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {options.map((tag) => (
            <Chip
              key={tag}
              label={t(`m.rate.tag.${tag}`)}
              on={tags.includes(tag)}
              onPress={() => {
                setSaved(false);
                setTags(tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag]);
              }}
            />
          ))}
        </View>
      ) : null}
      {stars > 0 && !saved ? <Field label={t('m.rate.comment')} value={comment} onChangeText={setComment} maxLength={500} multiline /> : null}
      <Notice text={error} />
      {saved ? (
        <P small muted>
          {t('m.rate.thanks')}
        </P>
      ) : (
        <Button title={t('m.rate.submit')} onPress={save} loading={busy} disabled={stars === 0} />
      )}
    </Card>
  );
}
