import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 打印所有环境变量（注意不要包含敏感信息）
    const envStatus = {
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    };

    console.log('Environment variables status:', envStatus);

    return NextResponse.json(envStatus);
  } catch (error) {
    console.error('Error in test-env route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 