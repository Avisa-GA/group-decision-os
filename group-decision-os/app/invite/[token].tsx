import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getToken,
  identify,
  joinInvite,
  previewInvite,
  setSession,
  InvitePreview,
} from '../../lib/api';
import { BRAND } from '../_layout';

type Phase = 'loading' | 'needName' | 'ready' | 'error';

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadPreview = useCallback(async () => {
    try {
      setPreview(await previewInvite(token));
      setPhase('ready');
    } catch (e: any) {
      setError(e.message ?? 'This invite is not valid');
      setPhase('error');
    }
  }, [token]);

  // If already signed in, go straight to preview; otherwise ask for a name.
  useEffect(() => {
    getToken().then((t) => (t ? loadPreview() : setPhase('needName')));
  }, [loadPreview]);

  async function onIdentify() {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { token: jwt, user } = await identify(name.trim());
      await setSession(jwt, user.name);
      setPhase('loading');
      await loadPreview();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    setBusy(true);
    setError(null);
    try {
      const { decisionId } = await joinInvite(token);
      router.replace(`/decisions/${decisionId}`);
    } catch (e: any) {
      setError(e.message ?? 'Could not join');
      setBusy(false);
    }
  }

  if (phase === 'loading') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.error}>{error ?? 'Invalid invite'}</Text>
      </View>
    );
  }

  if (phase === 'needName') {
    return (
      <View style={styles.container}>
        <Text style={styles.kicker}>You've been invited</Text>
        <Text style={styles.title}>Join a group decision</Text>
        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Sam"
          value={name}
          onChangeText={setName}
          autoFocus
          onSubmitEditing={onIdentify}
          returnKeyType="go"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={[styles.cta, busy && styles.disabled]} disabled={busy} onPress={onIdentify}>
          <Text style={styles.ctaText}>{busy ? 'Please wait…' : 'Continue'}</Text>
        </Pressable>
      </View>
    );
  }

  // ready
  const p = preview!;
  const canJoin = !p.full || p.alreadyIn;
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>{p.invitedBy} invited you to vote on</Text>
      <Text style={styles.title}>{p.title}</Text>
      {p.description ? <Text style={styles.desc}>{p.description}</Text> : null}

      <Text style={styles.meta}>
        {p.alreadyIn
          ? "You're already in this decision."
          : p.full
          ? 'This decision is full (5 people already joined).'
          : `${p.slotsLeft} of 5 spots left`}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {canJoin ? (
        <Pressable style={[styles.cta, busy && styles.disabled]} disabled={busy} onPress={onJoin}>
          <Text style={styles.ctaText}>
            {busy ? 'Joining…' : p.alreadyIn ? 'Open decision' : 'Join & vote'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  center: { alignItems: 'center' },
  kicker: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: BRAND, marginTop: 6 },
  desc: { fontSize: 15, color: '#475569', marginTop: 8 },
  meta: { fontSize: 14, color: '#334155', marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 24, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: '#dc2626', marginTop: 12 },
  cta: { backgroundColor: BRAND, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
