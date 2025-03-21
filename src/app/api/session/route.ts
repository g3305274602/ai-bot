import { NextResponse } from 'next/server';
import { createSession, getSessionMessages } from '@/lib/db';

export async function POST() {
  try {
    const sessionId = await createSession();
    if (!sessionId) {
      throw new Error('创建会话失败');
    }

    const messages = await getSessionMessages(sessionId);
    
    return NextResponse.json({
      success: true,
      sessionId,
      messages
    });
  } catch (error) {
    console.error('会话创建失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '会话创建失败'
      },
      { status: 500 }
    );
  }
} 