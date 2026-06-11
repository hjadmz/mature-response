// Tests for the defensive JSON layer — small local models wrap JSON in prose,
// fence it, truncate it, or break it. Run with: npm test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { robustJsonParse } from '../lib/ai/parse.js';

const VALID = {
  intent_guess: 'constructive',
  risk_level: 'low',
  confidence: 82,
  information_sufficient: true,
  engagement_level: 'short_reply',
  recommended_response: 'Thanks for flagging it — I will take a look today.',
  reason: 'A quick acknowledgment keeps this easy.',
  coaching_insight: 'Match your response to the stakes.',
  coaching_tag: 'match-response-to-stakes',
};

test('parses clean JSON', () => {
  const out = robustJsonParse(JSON.stringify(VALID));
  assert.deepEqual(out, VALID);
});

test('strips markdown code fences', () => {
  const out = robustJsonParse('```json\n' + JSON.stringify(VALID) + '\n```');
  assert.equal(out.engagement_level, 'short_reply');
  assert.equal(out.confidence, 82);
});

test('extracts JSON wrapped in prose', () => {
  const out = robustJsonParse('Here is my analysis:\n' + JSON.stringify(VALID) + '\nHope that helps!');
  assert.equal(out.intent_guess, 'constructive');
});

test('repairs trailing commas', () => {
  const broken = '{"intent_guess": "humor", "risk_level": "low", "confidence": 70,}';
  const out = robustJsonParse(broken);
  assert.equal(out.intent_guess, 'humor');
  assert.equal(out.confidence, 70);
});

test('falls back to field extraction when the JSON is structurally broken', () => {
  // Unbalanced brace + raw newline: JSON.parse and repair both fail.
  const mangled = '{"intent_guess": "curiosity", "confidence": 64, "engagement_level": "clarify", "recommended_response": "What did you mean?", "reason": "It is ambiguous"';
  const out = robustJsonParse(mangled);
  assert.equal(out.intent_guess, 'curiosity');
  assert.equal(out.confidence, 64);
  assert.equal(out.engagement_level, 'clarify');
  assert.equal(out.recommended_response, 'What did you mean?');
});

test('field extraction supplies safe defaults for anything missing', () => {
  const out = robustJsonParse('{"intent_guess": "humor"'); // hopeless fragment
  assert.equal(out.intent_guess, 'humor');
  assert.equal(out.risk_level, 'medium');
  assert.equal(out.engagement_level, 'wait');
  assert.equal(out.information_sufficient, true);
  assert.equal(typeof out.reason, 'string');
});
