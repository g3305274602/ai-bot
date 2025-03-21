import { sql } from '@vercel/postgres';
import { Message } from '@/app/components/chat/chat';

export interface DbMessage extends Omit<Message, 'timestamp'> {
  sessionId: string;
  created_at: string;
}

// 测试数据库连接
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('Database connection successful:', result);
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

export async function createTables() {
  try {
    // 首先测试连接
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Could not connect to database');
    }

    await sql`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        role TEXT NOT NULL,
        session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

export async function createSession(): Promise<string | null> {
  try {
    const sessionId = Date.now().toString();
    await sql`
      INSERT INTO chat_sessions (id)
      VALUES (${sessionId})
    `;
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

export async function saveMessage(message: Message & { sessionId: string }) {
  try {
    await sql`
      INSERT INTO chat_messages (id, content, role, session_id)
      VALUES (${message.id}, ${message.content}, ${message.role}, ${message.sessionId})
    `;
    return true;
  } catch (error) {
    console.error('Error saving message:', error);
    return false;
  }
}

export async function getSessionMessages(sessionId: string): Promise<DbMessage[]> {
  try {
    const { rows } = await sql<DbMessage>`
      SELECT * FROM chat_messages 
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `;
    return rows;
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
} 