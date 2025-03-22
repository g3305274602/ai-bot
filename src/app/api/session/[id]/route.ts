import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 获取会话信息
    const { rows: sessionRows } = await sql`
      SELECT id, created_at, title
      FROM sessions
      WHERE id = ${context.params.id}
    `;

    if (sessionRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '会话不存在'
      }, { status: 404 });
    }

    // 获取会话的消息
    const { rows: messageRows } = await sql`
      SELECT id, content, role, created_at
      FROM messages
      WHERE session_id = ${context.params.id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      success: true,
      sessionId: context.params.id,
      session: sessionRows[0],
      messages: messageRows
    });
  } catch (error) {
    console.error('获取会话失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取会话失败'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json({
        success: false,
        error: '标题不能为空'
      }, { status: 400 });
    }

    // 更新会话标题
    await sql`
      UPDATE sessions
      SET title = ${title}
      WHERE id = ${context.params.id}
    `;

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('更新会话标题失败:', error);
    return NextResponse.json({
      success: false,
      error: '更新会话标题失败'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 首先删除会话相关的所有消息
    await sql`
      DELETE FROM messages 
      WHERE session_id = ${context.params.id}
    `;

    // 然后删除会话本身
    await sql`
      DELETE FROM sessions 
      WHERE id = ${context.params.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除会话失败:', error);
    return NextResponse.json({
      success: false,
      error: '删除会话失败'
    }, { status: 500 });
  }
} 