import { analyzeMessage } from '@/lib/ai';
import { insertEntry, getTagCount, getOutcomePriors } from '@/lib/db';
import { CONTEXT_TYPES, PERCEIVED_TONES, FEELINGS, DESIRED_OUTCOME_LABELS } from '@/lib/constants';
import { NextResponse } from 'next/server';

// The UI constrains every field, but the API is its own surface: clamp and
// whitelist here too so a hand-rolled request cannot push junk into the
// prompt or the database. Unknown enum values fall back to safe defaults.
const VALID_CONTEXTS = new Set(CONTEXT_TYPES.map((c) => c.value));
const VALID_TONES = new Set(PERCEIVED_TONES.map((t) => t.value));
const VALID_FEELINGS = new Set(FEELINGS.map((f) => f.value));
const MAX_MESSAGE_CHARS = 2000; // UI caps at 1000; allow headroom, reject abuse
const MAX_NOTE_CHARS = 1000;

export async function POST(request) {
  try {
    const body = await request.json();
    const { message_text, context_type, perceived_tone, emotional_reaction, feeling, optional_note, desired_outcome, mode, model } = body;

    // Validate
    if (!message_text || typeof message_text !== 'string' || !message_text.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }
    if (message_text.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE_CHARS} characters).` }, { status: 400 });
    }

    const selectedModel = typeof model === 'string' && model.trim() ? model.trim() : 'llama3:8b';
    const selectedMode = mode === 'communication' ? 'communication' : 'response';
    const safeContext = VALID_CONTEXTS.has(context_type) ? context_type : 'online';
    const safeTone = selectedMode === 'communication' ? null : (VALID_TONES.has(perceived_tone) ? perceived_tone : 'unclear');
    const safeFeeling = VALID_FEELINGS.has(feeling) ? feeling : 'calm';
    const safeOutcome = desired_outcome in DESIRED_OUTCOME_LABELS ? desired_outcome : '';
    const safeIntensity = Math.min(10, Math.max(1, Math.round(Number(emotional_reaction)) || 5));
    const safeNote = typeof optional_note === 'string' ? optional_note.slice(0, MAX_NOTE_CHARS) : '';

    // Real feedback loop: what has actually worked for this user shapes the read.
    const outcomePriors = getOutcomePriors();

    // AI Analysis
    const analysis = await analyzeMessage({
      message_text,
      context_type: safeContext,
      perceived_tone: safeTone,
      emotional_reaction: safeIntensity,
      feeling: safeFeeling,
      optional_note: safeNote,
      desired_outcome: safeOutcome,
      outcomePriors,
      mode: selectedMode,
      model: selectedModel,
    });

    // How many times this lesson has come up before (prior to this entry)
    const tagSeenCount = getTagCount(analysis.coaching_tag);

    // Store in DB (the sanitized values — what was actually analyzed)
    const entryId = insertEntry({
      message_text,
      context_type: safeContext,
      perceived_tone: safeTone,
      emotional_reaction: safeIntensity,
      feeling: safeFeeling,
      optional_note: safeNote,
      desired_outcome: safeOutcome,
      model_used: selectedModel,
      ...analysis,
    });

    return NextResponse.json({
      id: entryId,
      tag_seen_count: tagSeenCount,
      desired_outcome: safeOutcome, // echo back so the result view can show the goal chip
      ...analysis,
    });
  } catch (error) {
    console.error('Analyze error:', error);
    const msg = (error && error.message) || '';
    let friendly = 'Analysis failed.';
    let hint = 'Try again in a moment.';
    if (msg.includes('MODEL_CRASH')) {
      friendly = 'The model stopped — most likely out of memory.';
      hint = 'Pick a smaller model from the Model menu (llama3:8b is a safe default), or close other apps to free RAM. Large models like 70b need a lot of memory.';
    } else if (msg.includes('MODEL_NOT_FOUND')) {
      friendly = 'That model is not installed in Ollama.';
      hint = 'Install it first — run: ollama pull <model> — then reload.';
    } else if (msg.includes('TIMEOUT')) {
      friendly = 'The model took too long to respond.';
      hint = 'Large models are slow on the first run while they load into memory. Try again, or pick a smaller model.';
    } else if (msg.includes('OLLAMA_UNREACHABLE')) {
      friendly = 'Cannot reach Ollama.';
      hint = 'Start Ollama first — run: ollama serve — then try again.';
    }
    return NextResponse.json({ error: friendly, hint, details: msg }, { status: 503 });
  }
}
