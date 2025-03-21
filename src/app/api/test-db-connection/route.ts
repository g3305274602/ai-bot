import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 打印环境变量信息（不包含敏感数据）
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      HAS_POSTGRES_URL: !!process.env.POSTGRES_URL,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      POSTGRES_URL_PREFIX: process.env.POSTGRES_URL?.substring(0, 10) + '...',
      DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 10) + '...',
    };

    console.log('环境变量信息:', envInfo);

    // 尝试解析连接字符串
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('未找到数据库连接字符串');
    }

    // 解析连接字符串（移除敏感信息）
    const url = new URL(connectionString);
    const connectionInfo = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      // 不包含用户名和密码
    };

    return NextResponse.json({
      status: 'success',
      env: envInfo,
      connection: connectionInfo,
    });
  } catch (error) {
    console.error('Error in test-db-connection:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: error instanceof Error ? error.message : '未知错误',
      }, 
      { status: 500 }
    );
  }
} 