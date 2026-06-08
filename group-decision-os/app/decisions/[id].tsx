import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  addOption,
  castVote,
  DecisionDetail,
  getDecision,
  lockDecision,
  openVoting,
} from '../../lib/api';
import { BRAND } from '../_layout';

export default function DecisionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [decision, setDecision] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOption, setNewOption] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function inviteUrl(token: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Strip the current /decisions/<id> (or /invite/...) to get the app base
      // (e.g. /group-decision-os on Pages, '' locally), then point at /invite.
      const base = window.location.pathname
        .replace(/\/(decisions|invite)\/.*$/, '')
        .replace(/\/$/, '');
      return `${window.location.origin}${base}/invite/${token}`;
    }
    return Linking.createURL(`/invite/${token}`);
  }

  async function copyInvite(token: string) {
    const url = inviteUrl(token);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const load = useCallback(async () => {
    try {
      setDecision(await getDecision(id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function run(fn: () => Promise<any>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      if (updated && updated.options) setDecision(updated as DecisionDetail);
      else await load();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }
  if (!decision) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.error}>{error ?? 'Decision not found'}</Text>
      </View>
    );
  }

  const { status, options, isOwner } = decision;
  const winningId = decision.result?.winningOptionId ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <Text style={styles.title}>{decision.title}</Text>
        <View style={[styles.badge, styles[`badge_${status}`]]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>
      {decision.description ? (
        <Text style={styles.description}>{decision.description}</Text>
      ) : null}
      <Text style={styles.meta}>
        {decision.participantCount} {decision.participantCount === 1 ? 'person' : 'people'} ·{' '}
        {decision.totalVotes} votes
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* ---- Owner: share invite link ---- */}
      {isOwner && decision.inviteToken && status !== 'LOCKED' ? (
        <View style={styles.share}>
          <Text style={styles.shareLabel}>
            Invite up to 5 people ({decision.slotsLeft} spot
            {decision.slotsLeft === 1 ? '' : 's'} left)
          </Text>
          <View style={styles.shareRow}>
            <TextInput
              style={styles.shareInput}
              value={inviteUrl(decision.inviteToken)}
              editable={false}
              selectTextOnFocus
            />
            {Platform.OS === 'web' ? (
              <Pressable style={styles.copyButton} onPress={() => copyInvite(decision.inviteToken!)}>
                <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ---- DRAFT: add options (any participant) ---- */}
      {status === 'DRAFT' ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Add an option…"
            value={newOption}
            onChangeText={setNewOption}
            onSubmitEditing={() => {
              if (newOption.trim())
                run(() => addOption(id, newOption.trim())).then(() => setNewOption(''));
            }}
          />
          <Pressable
            style={styles.addButton}
            onPress={() => {
              if (newOption.trim())
                run(() => addOption(id, newOption.trim())).then(() => setNewOption(''));
            }}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      ) : null}

      {/* ---- Options list ---- */}
      <View style={{ marginTop: 16 }}>
        {options.length === 0 ? (
          <Text style={styles.empty}>No options yet.</Text>
        ) : (
          options.map((o) => {
            const isMine = decision.myVoteOptionId === o.id;
            const isWinner = winningId === o.id;
            const tappable = status === 'VOTING';
            return (
              <Pressable
                key={o.id}
                disabled={!tappable || busy}
                onPress={() => run(() => castVote(id, o.id))}
                style={[
                  styles.option,
                  isMine && styles.optionMine,
                  isWinner && styles.optionWinner,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>
                    {o.title}
                    {isWinner ? '  🏆' : ''}
                  </Text>
                  {isMine ? <Text style={styles.youVoted}>Your vote</Text> : null}
                </View>
                <Text style={styles.optionVotes}>{o.votes}</Text>
              </Pressable>
            );
          })
        )}
      </View>

      {/* ---- Actions per status ---- */}
      {status === 'DRAFT' && isOwner ? (
        <Pressable
          style={[styles.cta, busy && styles.disabled]}
          disabled={busy}
          onPress={() => run(() => openVoting(id))}
        >
          <Text style={styles.ctaText}>Start voting</Text>
        </Pressable>
      ) : null}

      {status === 'VOTING' ? (
        <>
          <Pressable
            style={[styles.secondary, busy && styles.disabled]}
            disabled={busy}
            onPress={() => run(load)}
          >
            <Text style={styles.secondaryText}>↻ Refresh results</Text>
          </Pressable>
          {isOwner ? (
            <Pressable
              style={[styles.cta, busy && styles.disabled]}
              disabled={busy}
              onPress={() => run(() => lockDecision(id))}
            >
              <Text style={styles.ctaText}>Lock result</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {status === 'LOCKED' ? (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Final outcome</Text>
          {decision.result?.tie ? (
            <Text style={styles.summaryTie}>It's a tie — no single winner.</Text>
          ) : (
            <Text style={styles.summaryWinner}>
              🏆 {options.find((o) => o.id === winningId)?.title ?? '—'}
            </Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#0f172a' },
  description: { fontSize: 15, color: '#475569', marginTop: 8 },
  meta: { fontSize: 13, color: '#94a3b8', marginTop: 8 },
  error: { color: '#dc2626', marginTop: 12 },
  empty: { color: '#94a3b8' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badge_DRAFT: { backgroundColor: '#64748b' },
  badge_VOTING: { backgroundColor: '#2563eb' },
  badge_LOCKED: { backgroundColor: '#16a34a' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  share: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  shareLabel: { fontSize: 13, fontWeight: '600', color: '#3730a3', marginBottom: 8 },
  shareRow: { flexDirection: 'row', gap: 8 },
  shareInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: '#334155',
  },
  copyButton: {
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  copyButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionMine: { borderColor: BRAND, borderWidth: 2 },
  optionWinner: { backgroundColor: '#ecfdf5', borderColor: '#16a34a' },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  youVoted: { fontSize: 12, color: BRAND, marginTop: 3, fontWeight: '600' },
  optionVotes: { fontSize: 18, fontWeight: '800', color: '#334155' },
  cta: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  summary: {
    marginTop: 20,
    padding: 20,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#16a34a',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: '#15803d', fontWeight: '700' },
  summaryWinner: { fontSize: 22, fontWeight: '800', color: '#166534', marginTop: 6 },
  summaryTie: { fontSize: 16, fontWeight: '700', color: '#166534', marginTop: 6 },
});
