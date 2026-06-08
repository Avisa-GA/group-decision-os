import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getToken, identify, setSession } from '../lib/api';
import { BRAND } from './_layout';

export default function IdentifyScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // If we already have a session, skip straight to the decisions list.
  useEffect(() => {
    getToken().then((token) => {
      if (token) router.replace('/decisions');
      else setChecking(false);
    });
  }, []);

  async function onContinue() {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await identify(name.trim());
      await setSession(token, user.name);
      router.replace('/decisions');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Group Decision OS</Text>
      <Text style={styles.subtitle}>
        Structure choices, vote, and reach a clear outcome.
      </Text>

      <Text style={styles.label}>Your name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Alice"
        value={name}
        onChangeText={setName}
        autoFocus
        onSubmitEditing={onContinue}
        returnKeyType="go"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={onContinue}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? 'Please wait…' : 'Continue'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  center: { alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: BRAND },
  subtitle: { fontSize: 15, color: '#475569', marginTop: 8, marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: '#dc2626', marginTop: 10 },
  button: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
