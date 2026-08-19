import { updateOutcome } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
  // A cross-origin page can POST text/plain to loopback with no preflight, so
  // requiring JSON is what actually stops a silent write from another site.
  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return NextResponse.json({ error: 'Expected application/json' }, { status: 415 });
  }


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

    if (!Number.isInteger(entry_id) || entry_id <= 0) {
      return NextResponse.json({ error: 'entry_id must be a positive integer' }, { status: 400 });
    }
    const safeNotes = typeof outcome_notes === 'string' ? outcome_notes.slice(0, 500) : null;

    const result = updateOutcome(entry_id, outcome, safeNotes);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Outcome update error:', error);
    return NextResponse.json(
      { error: 'Failed to update outcome' },
      { status: 500 }
    );
  }
}
