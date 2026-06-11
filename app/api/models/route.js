import { getAvailableModels } from '@/lib/ai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const models = await getAvailableModels();
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch models', details: error.message },
      { status: 500 }
    );
  }
}
