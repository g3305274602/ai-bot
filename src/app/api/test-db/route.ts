import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function GET() {
  try {
    const isConnected = await testConnection();
    return NextResponse.json({
      success: isConnected,
      env: {
        hasUrl: !!process.env.POSTGRES_URL,
        url: process.env.POSTGRES_URL?.substring(0, 20) + '...',
      }
    });
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({ error: 'Database test failed', details: error }, { status: 500 });
  }
} 