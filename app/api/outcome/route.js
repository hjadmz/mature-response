import { updateOutcome } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { entry_id, outcome, outcome_notes } = body;

    if (!entry_id || !outcome) {
      return NextResponse.json(
        { error: 'entry_id and outcome are required' },
        { status: 400 }
      );
    }

    const validOutcomes = ['successful', 'neutral', 'escalated', 'ignored', 'unsure'];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: 'Invalid outcome value' },
        { status: 400 }
      );
    }

    updateOutcome(entry_id, outcome, outcome_notes);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Outcome update error:', error);
    return NextResponse.json(
      { error: 'Failed to update outcome', details: error.message },
      { status: 500 }
    );
  }
}
