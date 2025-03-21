import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const rootDir = process.cwd();
    const envPath = join(rootDir, '.env.local');

    // 检查所有相关的环境变量
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL?.slice(0, 10) + '...',
      POSTGRES_URL: process.env.POSTGRES_URL?.slice(0, 10) + '...',
      NODE_ENV: process.env.NODE_ENV,
      PWD: rootDir,
      ENV_FILE_EXISTS: existsSync(envPath),
      ENV_FILE_CONTENT_PREVIEW: existsSync(envPath) 
        ? readFileSync(envPath, 'utf8').split('\n').slice(0, 3).join('\n') + '...'
        : null,
    };

    console.log('完整环境变量状态:', envVars);

    return NextResponse.json({
      message: '环境变量调试信息',
      envVars,
      processEnv: {
        ...Object.fromEntries(
          Object.entries(process.env)
            .filter(([key]) => key.includes('POSTGRES') || key.includes('DATABASE'))
            .map(([key, value]) => [key, value ? '已设置' : '未设置'])
        ),
      },
    });
  } catch (error) {
    console.error('环境变量检查出错:', error);
    return NextResponse.json({ error: '环境变量检查失败' }, { status: 500 });
  }
} 