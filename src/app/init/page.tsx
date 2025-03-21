'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function InitPage() {
  const [status, setStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    error?: string;
  }>({ loading: false });

  const initializeDatabase = async () => {
    try {
      setStatus({ loading: true });
      const response = await fetch('/api/init-db');
      const data = await response.json();
      
      setStatus({
        loading: false,
        success: data.success,
        message: data.message,
        error: data.error
      });
    } catch (error) {
      setStatus({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : '初始化过程中发生错误'
      });
    }
  };

  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          数据库初始化
        </h1>
        
        <div className="space-y-4">
          {status.loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span>正在初始化数据库...</span>
            </div>
          ) : status.success ? (
            <div className="text-green-600 bg-green-50 p-4 rounded-lg">
              <p className="font-medium">✓ {status.message}</p>
            </div>
          ) : status.error ? (
            <div className="text-red-600 bg-red-50 p-4 rounded-lg">
              <p className="font-medium">✗ 初始化失败</p>
              <p className="text-sm mt-1">{status.error}</p>
            </div>
          ) : null}
          
          <Button
            onClick={initializeDatabase}
            className="w-full"
            disabled={status.loading}
          >
            {status.loading ? '初始化中...' : '重新初始化'}
          </Button>
        </div>
      </Card>
    </div>
  );
} 