import { NextResponse } from 'next/server';
import { resetPool, testConnection, createTables, cleanupSessions } from '@/lib/db';

async function initializeDatabase() {
  try {
    console.log('开始数据库初始化...');
    
    // 重置连接池
    resetPool();
    
    // 测试连接
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('数据库连接测试失败');
    }
    
    // 创建表
    await createTables();
    
    // 清理旧会话
    await cleanupSessions();
    
    return {
      success: true,
      message: '数据库初始化成功'
    };
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

export async function GET() {
  const result = await initializeDatabase();
  return NextResponse.json(result, {
    status: result.success ? 200 : 500
  });
}

export async function POST() {
  const result = await initializeDatabase();
  return NextResponse.json(result, {
    status: result.success ? 200 : 500
  });
} 