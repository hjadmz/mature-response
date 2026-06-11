// Tests for the deterministic judgment layer — the rules the model cannot
// talk its way out of. Run with: npm test (Node 18.18+, no dependencies).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveClarity, enforceDecisionRules, clarifyFallback } from '../lib/ai/rules.js';

// ─── deriveClarity ──────────────────────────────────────────

test('short RECEIVED message does not force clarify (terse texts are real inputs)', () => {
  const { needClarify } = deriveClarity(
    { message_text: 'k.', perceived_tone: 'neutral', desired_outcome: '', mode: 'response' },
    80,
    true
  );
  assert.equal(needClarify, false);
});

test('short received message still lowers the confidence ceiling', () => {
  const { confidence } = deriveClarity(
    { message_text: 'k.', perceived_tone: 'neutral', desired_outcome: '', mode: 'response' },
    95,
    true
  );
  assert.ok(confidence <= 75, `expected <= 75, got ${confidence}`);
});

test('near-empty Communicate input forces clarify (nothing to draft from)', () => {
  const { needClarify } = deriveClarity(
    { message_text: 'tell him', perceived_tone: null, desired_outcome: '', mode: 'communication' },
    80,
    true
  );
  assert.equal(needClarify, true);
});

test('model-flagged insufficient information forces clarify in any mode', () => {
  for (const mode of ['response', 'communication']) {
    const { needClarify } = deriveClarity(
      { message_text: 'A perfectly long and detailed message about a real situation.', perceived_tone: 'neutral', desired_outcome: '', mode },
      80,
      false
    );
    assert.equal(needClarify, true, `mode=${mode}`);
  }
});

test('model confidence can lower but never exceed the signal ceiling', () => {
  const args = { message_text: 'short', perceived_tone: 'unclear', desired_outcome: '', mode: 'response' };
  const high = deriveClarity(args, 99, true);
  const low = deriveClarity(args, 20, true);
  assert.ok(high.confidence <= 60, 'ceiling applies'); // 100 - 25 (short) - 15 (unclear tone)
  assert.equal(low.confidence, 20, 'a lower self-report is respected');
});

test('non-numeric model confidence falls back to a neutral base', () => {
  const { confidence } = deriveClarity(
    { message_text: 'A long, clear, specific message with plenty of words.', perceived_tone: 'neutral', desired_outcome: '', mode: 'response' },
    NaN,
    true
  );
  assert.equal(confidence, 60);
});

test('confidence never drops below the floor', () => {
  const { confidence } = deriveClarity(
    { message_text: 'hm', perceived_tone: 'unclear', desired_outcome: '', mode: 'communication' },
    0,
    false
  );
  assert.ok(confidence >= 5);
});

// ─── enforceDecisionRules ───────────────────────────────────

function base(overrides = {}) {
  return {
    intent_guess: 'unclear',
    risk_level: 'medium',
    confidence: 75,
    engagement_level: 'short_reply',
    recommended_response: 'Sure, that works.',
    reason: 'A short reply closes this politely.',
    coaching_insight: 'Match your response to the stakes.',
    coaching_tag: 'match-response-to-stakes',
    ...overrides,
  };
}

test('rule 0: Communicate mode never returns "ignore"', () => {
  const out = enforceDecisionRules(base({ engagement_level: 'ignore' }), {
    mode: 'communication', emotional_reaction: 3, feeling: 'calm', needClarify: false,
  });
  assert.equal(out.engagement_level, 'wait');
});

test('rule 1: high-risk provocation is never engaged', () => {
  const out = enforceDecisionRules(
    base({ risk_level: 'high', intent_guess: 'provocation', engagement_level: 'direct_conversation' }),
    { mode: 'response', emotional_reaction: 3, feeling: 'calm', needClarify: false }
  );
  assert.equal(out.engagement_level, 'ignore');
  assert.equal(out.recommended_response, '');
});

test('rule 1 outranks rule 2: a vague provocation is ignored, not clarified', () => {
  const out = enforceDecisionRules(
    base({ risk_level: 'high', intent_guess: 'provocation' }),
    { mode: 'response', emotional_reaction: 3, feeling: 'calm', needClarify: true }
  );
  assert.equal(out.engagement_level, 'ignore');
});

test('rule 2: missing information asks instead of fabricating', () => {
  const out = enforceDecisionRules(base({ recommended_response: '' }), {
    mode: 'response', emotional_reaction: 3, feeling: 'calm', needClarify: true,
  });
  assert.equal(out.engagement_level, 'clarify');
  assert.equal(out.recommended_response, clarifyFallback('response'));
});

test('rule 2 keeps a model-provided clarifying question', () => {
  const out = enforceDecisionRules(base({ recommended_response: 'What part should I focus on?' }), {
    mode: 'response', emotional_reaction: 3, feeling: 'calm', needClarify: true,
  });
  assert.equal(out.recommended_response, 'What part should I focus on?');
});

test('rule 3: flooded anger blocks sending in Respond mode', () => {
  const out = enforceDecisionRules(base({ engagement_level: 'boundary_set' }), {
    mode: 'response', emotional_reaction: 9, feeling: 'angry', needClarify: false,
  });
  assert.equal(out.engagement_level, 'wait');
  assert.equal(out.recommended_response, '');
  assert.match(out.reason, /escalate/i);
});

test('rule 3: flooded Communicate keeps the draft but advises waiting', () => {
  const out = enforceDecisionRules(base({ engagement_level: 'boundary_set' }), {
    mode: 'communication', emotional_reaction: 9, feeling: 'hurt', needClarify: false,
  });
  assert.equal(out.engagement_level, 'wait');
  assert.equal(out.recommended_response, 'Sure, that works.', 'draft is preserved');
  assert.match(out.reason, /wait until/i);
});

test('rule 3: intense calm is not flooding — nothing changes', () => {
  const out = enforceDecisionRules(base(), {
    mode: 'response', emotional_reaction: 10, feeling: 'calm', needClarify: false,
  });
  assert.equal(out.engagement_level, 'short_reply');
});

test('rule 3: below the threshold the gate stays open', () => {
  const out = enforceDecisionRules(base(), {
    mode: 'response', emotional_reaction: 7, feeling: 'angry', needClarify: false,
  });
  assert.equal(out.engagement_level, 'short_reply');
});

test('rule 4: low confidence demotes high-engagement actions to wait', () => {
  const out = enforceDecisionRules(base({ confidence: 45, engagement_level: 'direct_conversation' }), {
    mode: 'response', emotional_reaction: 3, feeling: 'calm', needClarify: false,
  });
  assert.equal(out.engagement_level, 'wait');
});

test('rule 4: low confidence in Communicate mode becomes clarify', () => {
  const out = enforceDecisionRules(base({ confidence: 45 }), {
    mode: 'communication', emotional_reaction: 3, feeling: 'calm', needClarify: false,
  });
  assert.equal(out.engagement_level, 'clarify');
});

test('rule 5: ignore/wait carry no response text in Respond mode', () => {
  for (const engagement_level of ['ignore', 'wait']) {
    const out = enforceDecisionRules(base({ engagement_level }), {
      mode: 'response', emotional_reaction: 3, feeling: 'calm', needClarify: false,
    });
    assert.equal(out.recommended_response, '', engagement_level);
  }
});

test('happy path: a clear, calm, confident result passes through untouched', () => {
  const out = enforceDecisionRules(base(), {
    mode: 'response', emotional_reaction: 4, feeling: 'calm', needClarify: false,
  });
  assert.equal(out.engagement_level, 'short_reply');
  assert.equal(out.recommended_response, 'Sure, that works.');
});
