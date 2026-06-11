// Labels only. No emoji (brand refusal), no decorative color — semantic
// color is applied in CSS, and only where content is genuine status.

export const CONTEXT_TYPES = [
  { value: 'friend', label: 'Friend' },
  { value: 'stranger', label: 'Stranger' },
  { value: 'online', label: 'Online' },
  { value: 'dating', label: 'Dating' },
  { value: 'work', label: 'Work' },
  { value: 'family', label: 'Family' },
];

export const PERCEIVED_TONES = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'joking', label: 'Joking' },
  { value: 'unclear', label: 'Unclear' },
];

// What the user is feeling, separate from how strongly (the intensity slider).
// Emotion type matters: anger escalates, distress distorts — they need different
// coaching, so the reasoning keys off both the feeling and the intensity.
export const FEELINGS = [
  { value: 'calm', label: 'Calm' },
  { value: 'angry', label: 'Angry' },
  { value: 'frustrated', label: 'Frustrated' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'hurt', label: 'Hurt' },
  { value: 'sad', label: 'Sad' },
  { value: 'embarrassed', label: 'Embarrassed' },
];

export const INTENT_TYPES = {
  curiosity: { label: 'Curiosity' },
  ego: { label: 'Ego' },
  provocation: { label: 'Provocation' },
  humor: { label: 'Humor' },
  unclear: { label: 'Unclear' },
  constructive: { label: 'Constructive' },
};

export const ENGAGEMENT_LEVELS = {
  ignore: { label: 'Ignore', description: 'Do not respond' },
  wait: { label: 'Wait', description: 'Delay your response' },
  short_reply: { label: 'Short Reply', description: 'Brief, neutral response' },
  clarify: { label: 'Clarify', description: 'Ask for clarity' },
  boundary_set: { label: 'Set Boundary', description: 'Establish a limit' },
  direct_conversation: { label: 'Direct Conversation', description: 'Have an honest discussion' },
};

export const RISK_LEVELS = {
  low: { label: 'Low Risk' },
  medium: { label: 'Medium Risk' },
  high: { label: 'High Risk' },
};

export const OUTCOME_OPTIONS = [
  { value: 'successful', label: 'Successful' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'ignored', label: 'Ignored' },
  { value: 'unsure', label: 'Unsure' },
];

// Canonical, transferable lessons. The model tags each analysis with the
// closest one so recurring lessons can be surfaced over time (the learning
// loop). Key = stored tag; value = the human-facing lesson.
export const COACHING_TAGS = {
  'tone-vs-intent': 'A harsh tone can still carry a fair point',
  'not-every-message-needs-a-reply': 'Not every message deserves a response',
  'clarify-before-concluding': 'Ask before you conclude when it is ambiguous',
  'name-the-feeling': 'Name your own feeling, not their fault',
  'calm-specific-boundaries': 'Calm, specific boundaries are easier to respect',
  'cool-off-when-flooded': 'When you are flooded, wait before you act',
  'outcomes-over-winning': 'Aim for the outcome, not the last word',
  'silence-is-strength': 'Silence is often the strongest reply',
  'match-response-to-stakes': 'Match your response to the actual stakes',
  'lead-with-curiosity': 'Lead with a question, not an assumption',
};

// The two ways the tool can be used.
export const MODES = {
  response: {
    value: 'response',
    label: 'Respond',
    tagline: 'I received something',
    description: 'You got a message and want help deciding whether and how to respond.',
  },
  communication: {
    value: 'communication',
    label: 'Communicate',
    tagline: 'I want to say something',
    description: 'You want to express something to another person and want help saying it clearly.',
  },
};

// Optional steering goal. Empty value = let the coach decide.
export const DESIRED_OUTCOMES = [
  { value: '', label: 'Not sure — let the coach decide' },
  { value: 'preserve_relationship', label: 'Preserve the relationship' },
  { value: 'set_boundary', label: 'Set a boundary' },
  { value: 'end_conversation', label: 'End the conversation' },
  { value: 'learn_more', label: 'Understand them better' },
  { value: 'resolve_conflict', label: 'Resolve a conflict' },
  { value: 'decline_politely', label: 'Decline politely' },
  { value: 'express_feelings', label: 'Express how I feel' },
  { value: 'apologize', label: 'Apologize' },
  { value: 'exit_relationship', label: 'Exit the relationship' },
  { value: 'maintain_professionalism', label: 'Stay professional' },
  { value: 'ask_clarification', label: 'Ask for clarification' },
  { value: 'negotiate', label: 'Negotiate respectfully' },
  { value: 'express_disagreement', label: 'Disagree respectfully' },
];

export const DESIRED_OUTCOME_LABELS = Object.fromEntries(
  DESIRED_OUTCOMES.filter((o) => o.value).map((o) => [o.value, o.label])
);

// First-run examples. One tap fills the form with a realistic situation so a
// blank screen is never the first impression. Keyed by mode; each preset seeds
// the fields the reasoning actually uses. Kept short and true-to-life.
export const EXAMPLE_SITUATIONS = {
  response: [
    {
      label: 'Vague late-night text',
      message: 'We need to talk tomorrow.',
      context_type: 'work',
      perceived_tone: 'unclear',
      feeling: 'anxious',
      emotional_reaction: 7,
      desired_outcome: 'maintain_professionalism',
    },
    {
      label: 'Passive-aggressive friend',
      message: 'Wow, must be nice to have time for everyone except me.',
      context_type: 'friend',
      perceived_tone: 'aggressive',
      feeling: 'hurt',
      emotional_reaction: 6,
      desired_outcome: 'preserve_relationship',
    },
    {
      label: 'Blunt work critique',
      message: 'This is not what I asked for. Please redo it.',
      context_type: 'work',
      perceived_tone: 'aggressive',
      feeling: 'frustrated',
      emotional_reaction: 6,
      desired_outcome: 'maintain_professionalism',
    },
  ],
  communication: [
    {
      label: 'Set a boundary',
      message: 'My roommate plays loud music past midnight and I can’t sleep before work.',
      context_type: 'friend',
      feeling: 'frustrated',
      emotional_reaction: 5,
      desired_outcome: 'set_boundary',
    },
    {
      label: 'Ask for a raise',
      message: 'I’ve taken on more responsibility this year and I want to talk about my compensation.',
      context_type: 'work',
      feeling: 'anxious',
      emotional_reaction: 5,
      desired_outcome: 'negotiate',
    },
    {
      label: 'Apologize to a friend',
      message: 'I snapped at my friend yesterday and I feel bad about how I left it.',
      context_type: 'friend',
      feeling: 'embarrassed',
      emotional_reaction: 4,
      desired_outcome: 'apologize',
    },
  ],
};
