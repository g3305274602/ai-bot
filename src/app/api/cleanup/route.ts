import { NextResponse } from 'next/server';
import { resetPool, testConnection } from '@/lib/db';

export async function POST() {
  try {
    // 重置数据库连接池
    resetPool();
    
    // 测试新的连接
    const isConnected = await testConnection();
    
    return NextResponse.json({
      success: true,
      connected: isConnected,
      message: '数据库连接已重置'
    });
  } catch (error) {
    console.error('清理过程出错:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 