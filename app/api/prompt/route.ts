import { NextResponse } from 'next/server';
import { getPromptConfig } from '@/app/lib/promptLoader';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const promptId = searchParams.get('id') || 'becca';

  try {
    const config = getPromptConfig(promptId);
    
    if (!config) {
      return NextResponse.json(
        { error: `Prompt '${promptId}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error loading prompt:', error);
    return NextResponse.json(
      { error: 'Failed to load prompt configuration' },
      { status: 500 }
    );
  }
}
