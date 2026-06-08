/**
 * Pure result engine — the heart of Group Decision OS.
 *
 * Converts a set of options + votes into an outcome. No I/O, no framework
 * imports: takes plain data, returns plain data, so it is exhaustively
 * unit-testable. The HTTP/DB layers (DecisionsService) call this and persist
 * the returned snapshot.
 */

export type VoteMode = 'SIMPLE' | 'RANKED' | 'WEIGHTED';

export interface EngineOption {
  id: string;
}

export interface EngineVote {
  optionId: string;
  weight: number;
}

export interface TallyEntry {
  optionId: string;
  total: number;
}

export interface TallyResult {
  /** The single winning option, or null when there is a tie or no votes. */
  winningOptionId: string | null;
  tie: boolean;
  breakdown: TallyEntry[];
}

/**
 * Tally votes for a decision.
 *
 * SIMPLE mode: each vote contributes `weight` (1 by default) to its option;
 * the option with the strictly highest total wins. A draw between the top
 * options is reported as a tie with `winningOptionId = null` rather than being
 * resolved arbitrarily. Zero votes likewise yields no winner.
 *
 * RANKED / WEIGHTED are reserved for a later iteration and throw for now.
 */
export function tally(
  options: EngineOption[],
  votes: EngineVote[],
  mode: VoteMode = 'SIMPLE',
): TallyResult {
  if (mode !== 'SIMPLE') {
    throw new Error(`Vote mode "${mode}" is not implemented yet`);
  }

  const totals = new Map<string, number>();
  for (const option of options) {
    totals.set(option.id, 0);
  }

  for (const vote of votes) {
    // Ignore votes that reference an option not in this decision.
    if (!totals.has(vote.optionId)) continue;
    totals.set(vote.optionId, totals.get(vote.optionId)! + vote.weight);
  }

  const breakdown: TallyEntry[] = options.map((option) => ({
    optionId: option.id,
    total: totals.get(option.id)!,
  }));

  let highest = 0;
  let winners: string[] = [];
  for (const entry of breakdown) {
    if (entry.total > highest) {
      highest = entry.total;
      winners = [entry.optionId];
    } else if (entry.total === highest && highest > 0) {
      winners.push(entry.optionId);
    }
  }

  // No votes cast, or no options → no winner.
  if (highest === 0) {
    return { winningOptionId: null, tie: false, breakdown };
  }

  const tie = winners.length > 1;
  return {
    winningOptionId: tie ? null : winners[0],
    tie,
    breakdown,
  };
}
