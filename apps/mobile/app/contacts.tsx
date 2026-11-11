// Trusted contacts (UX handoff §20): up to five people to share live trips with.
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { rpc, type Contact } from '../src/api';
import { errorText, useI18n } from '../src/i18n';
import { Button, C, Card, Field, H2, Header, Icon, ListRow, Notice, P, Screen } from '../src/ui';

export default function Contacts() {
  const { t } = useI18n();
  const [list, setList] = useState<Contact[] | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    rpc<Contact[]>('my_contacts').then(setList, (e) => setError(errorText(t, e)));
  }, [t]);

  async function add() {
    setError(null);
    const digits = phone.replace(/[^0-9]/g, '').replace(/^91(?=[0-9]{10}$)/, '');
    if (!name.trim()) return setError(t('m.error.name_required'));
    if (!/^[6-9][0-9]{9}$/.test(digits)) return setError(t('m.error.bad_phone'));
    setBusy(true);
    try {
      setList(await rpc<Contact[]>('add_contact', { p_name: name.trim(), p_phone: digits }));
      setName('');
      setPhone('');
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      setList(await rpc<Contact[]>('remove_contact', { p_id: id }));
    } catch (e) {
      setError(errorText(t, e));
    }
  }

  return (
    <Screen>
      <Header title={t('m.contacts.title')} />
      <P muted>{t('m.contacts.intro')}</P>
      {list && list.length > 0 ? (
        <View>
          {list.map((c, i) => (
            <ListRow
              key={c.id}
              icon="user"
              title={c.name}
              subtitle={c.phone}
              divider={i < list.length - 1}
              right={
                <Pressable
                  onPress={() => remove(c.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('m.contacts.remove', { name: c.name })}
                  style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="trash-2" size={20} color={C.danger} />
                </Pressable>
              }
            />
          ))}
        </View>
      ) : list ? (
        <P muted>{t('m.contacts.empty')}</P>
      ) : null}
      {list === null || list.length < 5 ? (
        <Card>
          <H2>{t('m.contacts.add')}</H2>
          <Field label={t('m.contacts.name')} value={name} onChangeText={setName} autoCapitalize="words" maxLength={60} />
          <Field label={t('m.contacts.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={14} />
          <Notice text={error} />
          <Button title={t('m.contacts.save')} onPress={add} loading={busy} />
        </Card>
      ) : (
        <Notice tone="warn" text={t('m.error.too_many_contacts')} />
      )}
    </Screen>
  );
}
