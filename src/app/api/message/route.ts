import { NextResponse } from 'next/server';
import { saveMessage } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const message = await request.json();
    
    if (!message.id || !message.content || !message.role || !message.sessionId) {
      return NextResponse.json(
        { success: false, error: '无效的消息数据' },
        { status: 400 }
      );
    }

    const success = await saveMessage(message);
    
    if (!success) {
      throw new Error('保存消息失败');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存消息失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '保存消息失败'
      },
      { status: 500 }
    );
  }
} 