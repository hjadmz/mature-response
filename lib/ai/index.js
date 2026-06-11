// Orchestration: build the prompt → call the model → parse → re-impose rules.
// The public surface of the AI layer is analyzeMessage + getAvailableModels.
import { COACHING_TAGS } from '@/lib/constants';
import { RESPONSE_SYSTEM_PROMPT, COMMUNICATION_SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import { robustJsonParse } from './parse';
import { deriveClarity, enforceDecisionRules, fallbackCoachingInsight } from './rules';
import { callModel, getAvailableModels } from './ollama';

export { getAvailableModels };

const TAG_KEYS = Object.keys(COACHING_TAGS);
const VALID_INTENTS = ['curiosity', 'ego', 'provocation', 'humor', 'unclear', 'constructive'];
const VALID_ENGAGEMENT = ['ignore', 'wait', 'short_reply', 'clarify', 'boundary_set', 'direct_conversation'];
const VALID_RISK = ['low', 'medium', 'high'];
const MAX_ATTEMPTS = 2;

export async function analyzeMessage({
  message_text,
  context_type,
  perceived_tone,
  emotional_reaction,
  feeling,
  optional_note,
  desired_outcome,
  outcomePriors,
  mode = 'response',
  model = 'llama3:8b',
}) {
  const systemPrompt = mode === 'communication' ? COMMUNICATION_SYSTEM_PROMPT : RESPONSE_SYSTEM_PROMPT;
  const userPrompt = buildUserPrompt({ mode, message_text, context_type, perceived_tone, emotional_reaction, feeling, optional_note, desired_outcome, outcomePriors });
  const intensity = Number(emotional_reaction) || 0;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const content = await callModel({ model, systemPrompt, userPrompt, temperature: attempt === 1 ? 0.3 : 0.1 });
      const parsed = robustJsonParse(content);

      const requiredFields = ['intent_guess', 'engagement_level', 'recommended_response', 'reason', 'risk_level', 'confidence', 'coaching_insight'];
      for (const field of requiredFields) {
        if (!(field in parsed)) throw new Error(`Missing required field: ${field}`);
      }

      // Normalize enums.
      if (!VALID_INTENTS.includes(parsed.intent_guess)) parsed.intent_guess = 'unclear';
      if (!VALID_ENGAGEMENT.includes(parsed.engagement_level)) parsed.engagement_level = 'wait';
      if (!VALID_RISK.includes(parsed.risk_level)) parsed.risk_level = 'medium';
      if (!TAG_KEYS.includes(parsed.coaching_tag)) parsed.coaching_tag = '';

      // Calibration guardrail: a clearly constructive/curious/playful message is rarely high-risk.
      if (['constructive', 'curiosity', 'humor'].includes(parsed.intent_guess) && parsed.risk_level === 'high') {
        parsed.risk_level = 'medium';
      }

      const informationSufficient = parsed.information_sufficient !== false;
      const { confidence, needClarify } = deriveClarity(
        { message_text, perceived_tone, desired_outcome, mode },
        Math.round(Number(parsed.confidence)),
        informationSufficient
      );
      parsed.confidence = confidence;

      if (typeof parsed.coaching_insight !== 'string' || !parsed.coaching_insight.trim()) {
        parsed.coaching_insight = fallbackCoachingInsight(mode);
      }

      // Quality gate: reject a truncated reason (observed: reason "you"), retry,
      // and only fall back to a generic line as a last resort.
      const reasonText = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';
      const reasonDegenerate = reasonText.length < 8 || reasonText.split(/\s+/).filter(Boolean).length < 2;
      if (reasonDegenerate) {
        if (attempt < MAX_ATTEMPTS) throw new Error('degenerate reason field — retrying');
        parsed.reason = mode === 'communication'
          ? 'This keeps the message calm and specific while leaving room for their response.'
          : 'A measured response protects the outcome you want more than a quick reaction would.';
      }

      const enforced = enforceDecisionRules(parsed, { mode, emotional_reaction: intensity, feeling, needClarify });
      enforced.mode = mode;
      delete enforced.information_sufficient; // transient, not persisted
      return enforced;
    } catch (error) {
      if (error.name === 'AbortError') { lastError = new Error('TIMEOUT'); break; }
      lastError = error;
      // Fatal (crash / missing model) or Ollama unreachable: retrying is futile.
      if (error.fatal || /fetch failed|ECONNREFUSED|Failed to fetch/i.test(error.message)) break;
      console.error(`AI analysis error (attempt ${attempt}/${MAX_ATTEMPTS}):`, error.message);
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Translate low-level failures into stable codes the API layer maps to guidance.
  const m = (lastError && lastError.message) || '';
  if (/fetch failed|ECONNREFUSED|Failed to fetch|not reachable/i.test(m)) {
    throw new Error('OLLAMA_UNREACHABLE');
  }
  throw lastError || new Error('ANALYSIS_FAILED');
}
