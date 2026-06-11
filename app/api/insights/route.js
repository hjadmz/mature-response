import { getInsights } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const insights = getInsights();
    return NextResponse.json(insights);
  } catch (error) {
    console.error('Insights fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights', details: error.message },
      { status: 500 }
    );
  }
}
