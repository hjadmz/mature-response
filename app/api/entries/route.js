import { getEntries, deleteEntry, getAllEntriesForExport, deleteAllEntries } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Full export: the user's data as a downloadable JSON file.
    if (searchParams.get('export') === '1') {
      const entries = getAllEntriesForExport();
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), entries }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="mature-response-export-${stamp}.json"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const context_type = searchParams.get('context') || undefined;
    const search = searchParams.get('search') || undefined;
    const requested = parseInt(searchParams.get('limit') || '100', 10);
    const limit = Math.min(500, Math.max(1, Number.isFinite(requested) ? requested : 100));

    const entries = getEntries({ limit, context_type, search });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Entries fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Erase everything, permanently (WAL checkpoint + VACUUM behind it).
    if (searchParams.get('all') === 'true') {
      const deleted = deleteAllEntries();
      return NextResponse.json({ success: true, deleted });
    }

    const id = parseInt(searchParams.get('id'), 10);
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    deleteEntry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Entry delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}
