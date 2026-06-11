// Rules: deterministic judgment re-imposed in code. A small local model cannot
// talk itself out of these, and confidence is computed from real signals here
// rather than trusting the model's (poorly calibrated) self-report.

export function fallbackCoachingInsight(mode) {
  return mode === 'communication'
    ? 'Focus on the outcome you want, not the reaction you feel.'
    : 'A message that provokes a reaction is not the same as one that deserves one.';
}

export function clarifyFallback(mode) {
  return mode === 'communication'
    ? 'Do you have a few minutes? There is something I would like to talk through with you.'
    : 'I want to make sure I read this right — what did you mean by that?';
}

/**
 * Confidence from REAL signals, not the model's self-report (which clusters at
 * 70–80 regardless of ambiguity). The model number can only LOWER the ceiling
 * the signals set — never inflate it.
 */
export function deriveClarity({ message_text, perceived_tone, desired_outcome, mode }, modelConfidence, informationSufficient) {
  const text = (message_text || '').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const tooShort = text.length < 12 || words < 3;
  const toneUnclear = perceived_tone === 'unclear';
  const isComm = mode === 'communication';
  const commMissingGoal = isComm && !desired_outcome;

  let ceiling = 100;
  if (!informationSufficient) ceiling -= 40;
  // A short input hurts more in Communicate mode (there is nothing to draft
  // from) than in Respond mode (short messages like "k." or "fine." are
  // complete inputs — terse, but real; context fields fill in the rest).
  if (tooShort) ceiling -= isComm ? 35 : 25;
  if (toneUnclear) ceiling -= 15;
  if (commMissingGoal) ceiling -= 10;
  ceiling = Math.max(10, ceiling);

  const base = Number.isFinite(modelConfidence) ? modelConfidence : 60;
  const confidence = Math.max(5, Math.min(base, ceiling));

  // Force "clarify" only when there is genuinely nothing to work with: the
  // model flagged the input as insufficient, or a Communicate request is
  // near-empty. A short RECEIVED message must NOT force clarify — telling the
  // user to ask "what did you mean?" in reply to "k." is bad advice; the low
  // confidence above already keeps the engagement conservative (rule 4).
  const needClarify = !informationSufficient || (isComm && tooShort);
  return { confidence, needClarify };
}

/**
 * Hard rules, in precedence order.
 */
export function enforceDecisionRules(parsed, { mode, emotional_reaction, feeling, needClarify }) {
  // 0. Mode sanity — "ignore" is not an answer to "help me say this". The
  //    prompt forbids it, but small models drift; map it to the nearest
  //    sensible action instead of showing "Ignore" for a Communicate request.
  if (mode === 'communication' && parsed.engagement_level === 'ignore') {
    parsed.engagement_level = 'wait';
  }

  // 1. Safety — never engage a high-risk provocation.
  if (parsed.risk_level === 'high' && parsed.intent_guess === 'provocation') {
    parsed.engagement_level = 'ignore';
    parsed.recommended_response = '';
    return parsed;
  }

  // 2. Missing information — ask, never fabricate.
  if (needClarify) {
    parsed.engagement_level = 'clarify';
    if (!parsed.recommended_response || !parsed.recommended_response.trim()) {
      parsed.recommended_response = clarifyFallback(mode);
    }
    return parsed;
  }

  // 3. High emotion — don't respond from peak feeling. WHY differs by emotion:
  //    anger/frustration escalates (Gottman flooding); hurt/sad/anxious/embarrassed
  //    distorts judgment. Calm never triggers, however intense — being very sure
  //    is not flooding.
  const ACTIVATION = ['angry', 'frustrated'];
  const DISTRESS = ['anxious', 'hurt', 'sad', 'embarrassed'];
  const activated = ACTIVATION.includes(feeling);
  const distressed = DISTRESS.includes(feeling);
  if (emotional_reaction >= 8 && (activated || distressed)) {
    const note = activated
      ? 'You rated this high — when you are this activated, replying tends to escalate things. Give it twenty minutes.'
      : "You rated this high — you are in a raw place right now. Don't answer from peak emotion; let it settle, then come back to it.";
    if (mode === 'communication') {
      parsed.engagement_level = 'wait'; // draft stays; advise cooling off
      parsed.reason = `${parsed.reason} The words are ready, but ${activated ? 'wait until you have cooled down' : 'wait until you feel steadier'} before sending them.`;
      return parsed;
    }
    if (['short_reply', 'boundary_set', 'direct_conversation'].includes(parsed.engagement_level)) {
      parsed.engagement_level = 'wait';
      parsed.recommended_response = '';
      parsed.reason = `${parsed.reason} ${note}`;
      return parsed;
    }
  }

  // 4. Low clarity — do not overreach.
  if (parsed.confidence < 60) {
    if (mode === 'communication') {
      parsed.engagement_level = 'clarify';
      if (!parsed.recommended_response || !parsed.recommended_response.trim()) {
        parsed.recommended_response = clarifyFallback(mode);
      }
      return parsed;
    }
    if (!['ignore', 'wait', 'clarify'].includes(parsed.engagement_level)) {
      parsed.engagement_level = 'wait';
    }
  }

  // 5. ignore / wait have nothing to send (response mode).
  if (mode !== 'communication' && (parsed.engagement_level === 'ignore' || parsed.engagement_level === 'wait')) {
    parsed.recommended_response = '';
  }

  return parsed;
}
