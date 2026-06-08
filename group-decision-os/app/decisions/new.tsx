import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { createDecision } from '../../lib/api';
import { BRAND } from '../_layout';

export default function NewDecisionScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    if (!title.trim()) {
      setError('Give your decision a title');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { id } = await createDecision(title.trim(), description.trim() || undefined);
      router.replace(`/decisions/${id}`);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Where should we go for dinner?"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Any context for the group…"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={onCreate}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? 'Creating…' : 'Create decision'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  error: { color: '#dc2626', marginTop: 12 },
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
