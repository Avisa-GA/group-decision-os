import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { DecisionSummary, listDecisions } from '../../lib/api';
import { BRAND } from '../_layout';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#64748b',
  VOTING: '#2563eb',
  LOCKED: '#16a34a',
};

export default function DecisionsScreen() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<DecisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reload every time the screen regains focus (e.g. after creating one).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      listDecisions()
        .then((d) => active && setDecisions(d))
        .catch((e) => active && setError(e.message))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.newButton} onPress={() => router.push('/decisions/new')}>
        <Text style={styles.newButtonText}>+ New decision</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : decisions.length === 0 ? (
        <Text style={styles.empty}>No decisions yet. Create your first one.</Text>
      ) : (
        <FlatList
          data={decisions}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => (
            <Link href={`/decisions/${item.id}`} asChild>
              <Pressable style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMeta}>
                    {item._count.options} options · {item._count.votes} votes
                  </Text>
                </View>
                <View
                  style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] }]}
                >
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  newButton: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  newButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: '#dc2626', marginTop: 24, textAlign: 'center' },
  empty: { color: '#64748b', marginTop: 40, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardMeta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
