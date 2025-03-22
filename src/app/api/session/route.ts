import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    const sessionId = uuidv4();
    
    // 创建新会话
    await sql`
      INSERT INTO sessions (id, created_at)
      VALUES (${sessionId}, NOW())
    `;

    return NextResponse.json({
      success: true,
      sessionId
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    return NextResponse.json({
      success: false,
      error: '创建会话失败'
    }, { status: 500 });
  }
} 