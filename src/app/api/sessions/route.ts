import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT id, created_at, title 
      FROM sessions 
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      sessions: rows
    });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取会话列表失败'
    }, { status: 500 });
  }
} 