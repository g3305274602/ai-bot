import { createPool, VercelPool } from '@vercel/postgres';
import { Message } from '@/app/components/chat/chat';

export interface DbMessage extends Omit<Message, 'timestamp'> {
  sessionId: string;
  created_at: string;
}

// 获取数据库连接字符串
const getConnectionString = () => {
  // 使用主要的数据库连接字符串
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('数据库连接字符串未配置！');
    console.error('环境变量状态:', {
      NODE_ENV: process.env.NODE_ENV,
      CWD: process.cwd(),
      ENV_VARS: {
        DATABASE_URL: process.env.DATABASE_URL ? '已设置' : '未设置',
        POSTGRES_URL: process.env.POSTGRES_URL ? '已设置' : '未设置',
        DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED ? '已设置' : '未设置',
      }
    });
    throw new Error('数据库连接字符串未配置。请检查 DATABASE_URL 环境变量');
  }

  return connectionString;
};

// 创建数据库连接池
const createDbPool = (): VercelPool => {
  try {
    const connectionString = getConnectionString();
    console.log('创建新的数据库连接池...');
    
    return createPool({
      connectionString,
      ssl: true,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  } catch (error) {
    console.error('创建数据库连接池失败:', error);
    throw error;
  }
};

// 延迟初始化连接池
let pool: VercelPool | null = null;

// 重置连接池
export function resetPool() {
  if (pool) {
    console.log('正在重置数据库连接池...');
    pool = null;
  }
}

// 获取连接池的函数
const getPool = (): VercelPool => {
  if (!pool) {
    pool = createDbPool();
  }
  return pool;
};

// 测试数据库连接
export async function testConnection() {
  try {
    console.log('测试数据库连接...');
    const pool = getPool();
    await pool.sql`SELECT NOW()`;
    console.log('数据库连接测试成功');
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    resetPool();
    return false;
  }
}

// 重试函数
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`操作失败，尝试次数 ${i + 1}/${maxRetries}:`, error);
      lastError = error;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        resetPool();
      }
    }
  }
  
  throw lastError;
}

// 清理所有会话
export async function cleanupSessions() {
  return withRetry(async () => {
    const pool = getPool();
    await pool.sql`TRUNCATE chat_sessions CASCADE`;
    return true;
  });
}

export async function createTables() {
  return withRetry(async () => {
    const pool = getPool();
    console.log('开始创建数据库表...');
    
    await pool.sql`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await pool.sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        role TEXT NOT NULL,
        session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('数据库表创建成功');
    return true;
  });
}

export async function createSession(): Promise<string | null> {
  return withRetry(async () => {
    const pool = getPool();
    const sessionId = Date.now().toString();
    await pool.sql`
      INSERT INTO chat_sessions (id)
      VALUES (${sessionId})
    `;
    console.log('新会话创建成功:', sessionId);
    return sessionId;
  });
}

export async function saveMessage(message: Message & { sessionId: string }): Promise<boolean> {
  return withRetry(async () => {
    const pool = getPool();
    await pool.sql`
      INSERT INTO chat_messages (id, content, role, session_id)
      VALUES (${message.id}, ${message.content}, ${message.role}, ${message.sessionId})
    `;
    return true;
  });
}

export async function getSessionMessages(sessionId: string): Promise<DbMessage[]> {
  return withRetry(async () => {
    const pool = getPool();
    const { rows } = await pool.sql<DbMessage>`
      SELECT * FROM chat_messages 
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `;
    return rows;
  });
} 