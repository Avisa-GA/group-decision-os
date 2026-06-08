import { tally, EngineOption, EngineVote } from './result.engine';

const opts = (...ids: string[]): EngineOption[] => ids.map((id) => ({ id }));
const votes = (...optionIds: string[]): EngineVote[] =>
  optionIds.map((optionId) => ({ optionId, weight: 1 }));

describe('result engine — SIMPLE mode', () => {
  it('picks the option with the most votes', () => {
    const r = tally(opts('a', 'b', 'c'), votes('a', 'b', 'a', 'a', 'c'));
    expect(r.winningOptionId).toBe('a');
    expect(r.tie).toBe(false);
    expect(r.breakdown).toEqual([
      { optionId: 'a', total: 3 },
      { optionId: 'b', total: 1 },
      { optionId: 'c', total: 1 },
    ]);
  });

  it('reports a tie (no winner) when the top options are level', () => {
    const r = tally(opts('a', 'b'), votes('a', 'b'));
    expect(r.winningOptionId).toBeNull();
    expect(r.tie).toBe(true);
    expect(r.breakdown).toEqual([
      { optionId: 'a', total: 1 },
      { optionId: 'b', total: 1 },
    ]);
  });

  it('returns no winner when there are zero votes', () => {
    const r = tally(opts('a', 'b'), []);
    expect(r.winningOptionId).toBeNull();
    expect(r.tie).toBe(false);
    expect(r.breakdown).toEqual([
      { optionId: 'a', total: 0 },
      { optionId: 'b', total: 0 },
    ]);
  });

  it('handles a single option with votes', () => {
    const r = tally(opts('only'), votes('only', 'only'));
    expect(r.winningOptionId).toBe('only');
    expect(r.tie).toBe(false);
  });

  it('handles no options at all', () => {
    const r = tally([], []);
    expect(r.winningOptionId).toBeNull();
    expect(r.tie).toBe(false);
    expect(r.breakdown).toEqual([]);
  });

  it('ignores votes for options not in the decision', () => {
    const r = tally(opts('a', 'b'), [
      ...votes('a'),
      { optionId: 'ghost', weight: 1 },
    ]);
    expect(r.winningOptionId).toBe('a');
    expect(r.breakdown).toEqual([
      { optionId: 'a', total: 1 },
      { optionId: 'b', total: 0 },
    ]);
  });

  it('respects vote weight when summing', () => {
    const r = tally(opts('a', 'b'), [
      { optionId: 'a', weight: 1 },
      { optionId: 'b', weight: 3 },
    ]);
    expect(r.winningOptionId).toBe('b');
  });
});

describe('result engine — unsupported modes', () => {
  it('throws for RANKED (reserved)', () => {
    expect(() => tally(opts('a'), votes('a'), 'RANKED')).toThrow(/not implemented/);
  });

  it('throws for WEIGHTED (reserved)', () => {
    expect(() => tally(opts('a'), votes('a'), 'WEIGHTED')).toThrow(/not implemented/);
  });
});
