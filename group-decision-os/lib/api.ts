import { storage } from './storage';

/**
 * Base URL of the GDO backend.
 *
 * Set EXPO_PUBLIC_API_URL at build time (e.g. the deployed Render URL on Vercel,
 * or your machine's LAN IP for a physical device). Defaults to localhost for
 * local web/simulator development.
 */
// Use `||` (not `??`) so an empty/unset build-time value falls back to
// localhost rather than becoming '' (which would make requests relative —
// e.g. a POST to a static host returns 405).
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'gdo.token';
const NAME_KEY = 'gdo.name';

export async function getToken() {
  return storage.get(TOKEN_KEY);
}

export async function setSession(token: string, name: string) {
  await storage.set(TOKEN_KEY, token);
  await storage.set(NAME_KEY, name);
}

export async function getName() {
  return storage.get(NAME_KEY);
}

export async function clearSession() {
  await storage.remove(TOKEN_KEY);
  await storage.remove(NAME_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      // non-JSON error body; keep default message
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Types (mirror the backend responses) ----

export type DecisionStatus = 'DRAFT' | 'VOTING' | 'LOCKED';

export interface DecisionSummary {
  id: string;
  title: string;
  description?: string | null;
  status: DecisionStatus;
  _count: { options: number; votes: number };
}

export interface OptionView {
  id: string;
  title: string;
  metadata?: Record<string, unknown> | null;
  votes: number;
}

export interface DecisionDetail {
  id: string;
  title: string;
  description?: string | null;
  status: DecisionStatus;
  isOwner: boolean;
  totalVotes: number;
  myVoteOptionId: string | null;
  options: OptionView[];
  result: { winningOptionId: string | null; tie: boolean } | null;
}

// ---- API calls ----

export async function identify(name: string, email?: string) {
  const body = JSON.stringify(email ? { name, email } : { name });
  return request<{ token: string; user: { id: string; name: string } }>(
    '/auth/identify',
    { method: 'POST', body },
  );
}

export const listDecisions = () => request<DecisionSummary[]>('/decisions');

export const getDecision = (id: string) =>
  request<DecisionDetail>(`/decisions/${id}`);

export const createDecision = (title: string, description?: string) =>
  request<{ id: string }>('/decisions', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  });

export const addOption = (id: string, title: string) =>
  request<unknown>(`/decisions/${id}/options`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

export const openVoting = (id: string) =>
  request<unknown>(`/decisions/${id}/open`, { method: 'POST' });

export const castVote = (id: string, optionId: string) =>
  request<DecisionDetail>(`/decisions/${id}/votes`, {
    method: 'POST',
    body: JSON.stringify({ optionId }),
  });

export const lockDecision = (id: string) =>
  request<DecisionDetail>(`/decisions/${id}/lock`, { method: 'POST' });
