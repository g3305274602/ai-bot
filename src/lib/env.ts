import { config } from 'dotenv';
import { join } from 'path';

// 加载环境变量
const loadEnv = () => {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const result = config({ path: envPath });
    
    console.log('环境变量加载状态:', {
      loaded: result.parsed ? true : false,
      envPath,
      hasDatabase: !!process.env.DATABASE_URL,
    });

    return result.parsed;
  } catch (error) {
    console.error('加载环境变量失败:', error);
    return null;
  }
};

export const env = loadEnv(); 