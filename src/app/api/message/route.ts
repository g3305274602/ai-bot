import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, role, sessionId, timestamp } = body;

    if (!content || !role || !sessionId) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }

    // 检查会话是否存在
    const { rows: sessionRows } = await sql`
      SELECT id FROM sessions WHERE id = ${sessionId}
    `;

    if (sessionRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '会话不存在'
      }, { status: 404 });
    }

    const messageId = uuidv4();
    const createdAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    await sql`
      INSERT INTO messages (id, session_id, content, role, created_at)
      VALUES (${messageId}, ${sessionId}, ${content}, ${role}, ${createdAt})
    `;

    return NextResponse.json({
      success: true,
      messageId
    });
  } catch (error) {
    console.error('保存消息失败:', error);
    return NextResponse.json({
      success: false,
      error: '保存消息失败'
    }, { status: 500 });
  }
} 